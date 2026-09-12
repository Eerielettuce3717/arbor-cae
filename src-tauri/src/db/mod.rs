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
}
