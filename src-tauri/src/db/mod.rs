mod schema;

pub use schema::SCHEMA_SQL;

use parking_lot::Mutex;
use rusqlite::Connection;
use std::path::{Path, PathBuf};
use thiserror::Error;

#[derive(Debug, Error)]
pub enum DbError {
    #[error("sqlite error: {0}")]
    Sqlite(#[from] rusqlite::Error),
    #[error("io error: {0}")]
    Io(#[from] std::io::Error),
    #[error("{0}")]
    Message(String),
}

pub type DbResult<T> = Result<T, DbError>;

/// Shared app database handle. Opens (or creates) `.cad_db` under the workspace root.
pub struct CadDb {
    path: PathBuf,
    conn: Mutex<Connection>,
}

impl CadDb {
    pub fn open(workspace_root: impl AsRef<Path>) -> DbResult<Self> {
        let root = workspace_root.as_ref();
        std::fs::create_dir_all(root)?;
        let path = root.join(".cad_db");
        let conn = Connection::open(&path)?;
        conn.execute_batch(
            "PRAGMA foreign_keys = ON;
             PRAGMA journal_mode = WAL;
             PRAGMA synchronous = NORMAL;",
        )?;
        conn.execute_batch(SCHEMA_SQL)?;
        Ok(Self {
            path,
            conn: Mutex::new(conn),
        })
    }

    pub fn path(&self) -> &Path {
        &self.path
    }

    pub fn with_conn<F, T>(&self, f: F) -> DbResult<T>
    where
        F: FnOnce(&Connection) -> DbResult<T>,
    {
        let conn = self.conn.lock();
        f(&conn)
    }

    /// Run `f` inside a single `BEGIN IMMEDIATE` transaction, rolling back on error.
    ///
    /// SQLite autocommits every statement individually, so a multi-statement
    /// operation interrupted partway through leaves the database in a state no
    /// complete operation would ever produce: a commit row whose branch head was
    /// never advanced, or an accepted ownership transfer whose lock never moved.
    /// Use this for any operation that writes more than one row.
    ///
    /// Not reentrant — the connection mutex is not recursive and SQLite rejects
    /// nested `BEGIN`, so `f` must not call back into `with_tx` or `with_conn`.
    pub fn with_tx<F, T>(&self, f: F) -> DbResult<T>
    where
        F: FnOnce(&Connection) -> DbResult<T>,
    {
        let conn = self.conn.lock();
        conn.execute_batch("BEGIN IMMEDIATE")?;
        match f(&conn) {
            Ok(value) => {
                conn.execute_batch("COMMIT")?;
                Ok(value)
            }
            Err(err) => {
                // Surface the original error: a rollback failure is a consequence
                // of it, not the cause, and hiding it would obscure the real fault.
                let _ = conn.execute_batch("ROLLBACK");
                Err(err)
            }
        }
    }
}

pub fn now_iso() -> String {
    chrono::Utc::now().to_rfc3339()
}

pub fn new_id() -> String {
    uuid::Uuid::new_v4().to_string()
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::pdm::models::CreateProjectInput;
    use crate::pdm::versions;

    #[test]
    fn opens_cad_db_and_creates_project_graph() {
        let dir = std::env::temp_dir().join(format!("cad_engine_test_{}", new_id()));
        let db = CadDb::open(&dir).expect("open db");
        assert!(db.path().ends_with(".cad_db"));

        let project = versions::create_project(
            &db,
            CreateProjectInput {
                name: "Test".into(),
                description: "".into(),
                root_path: dir.display().to_string(),
                owner_id: "u1".into(),
            },
        )
        .expect("create project");

        let graph = versions::build_branch_graph(&db, &project.id).expect("graph");
        assert_eq!(graph.branches.len(), 1);
        assert_eq!(graph.branches[0].name, "main");
        assert!(!graph.nodes.is_empty());

        let _ = std::fs::remove_dir_all(dir);
    }

    #[test]
    fn with_tx_rolls_back_every_write_when_the_closure_fails() {
        let dir = std::env::temp_dir().join(format!("cad_engine_tx_{}", new_id()));
        let db = CadDb::open(&dir).expect("open db");

        let count = |db: &CadDb| -> i64 {
            db.with_conn(|conn| {
                Ok(conn
                    .query_row("SELECT COUNT(*) FROM projects", [], |r| r.get(0))
                    .unwrap_or(0))
            })
            .unwrap_or(0)
        };

        let before = count(&db);

        // Two successful inserts followed by a failure: all three must vanish.
        let result: DbResult<()> = db.with_tx(|conn| {
            for name in ["tx-a", "tx-b"] {
                conn.execute(
                    "INSERT INTO projects (id, name, description, root_path, owner_id, created_at, updated_at)
                     VALUES (?1, ?2, '', '/tmp', 'u1', ?3, ?3)",
                    rusqlite::params![new_id(), name, now_iso()],
                )?;
            }
            Err(DbError::Message("simulated mid-operation failure".into()))
        });

        assert!(result.is_err(), "closure error must propagate");
        assert_eq!(
            count(&db),
            before,
            "failed transaction must leave no partial rows behind",
        );

        // The connection must still be usable after a rollback.
        let after_ok: DbResult<()> = db.with_tx(|conn| {
            conn.execute(
                "INSERT INTO projects (id, name, description, root_path, owner_id, created_at, updated_at)
                 VALUES (?1, 'tx-ok', '', '/tmp', 'u1', ?2, ?2)",
                rusqlite::params![new_id(), now_iso()],
            )?;
            Ok(())
        });
        assert!(after_ok.is_ok(), "connection must survive a rollback");
        assert_eq!(count(&db), before + 1);

        let _ = std::fs::remove_dir_all(dir);
    }
}
