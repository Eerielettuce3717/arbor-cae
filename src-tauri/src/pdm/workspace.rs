use crate::db::{new_id, now_iso, CadDb, DbResult};
use crate::pdm::models::{OwnershipTransfer, WorkspaceLock};
use rusqlite::{params, OptionalExtension};

fn map_lock(row: &rusqlite::Row<'_>) -> rusqlite::Result<WorkspaceLock> {
    Ok(WorkspaceLock {
        id: row.get(0)?,
        project_id: row.get(1)?,
        document_id: row.get(2)?,
        owner_id: row.get(3)?,
        owner_name: row.get(4)?,
        lock_kind: row.get(5)?,
        acquired_at: row.get(6)?,
    })
}

fn map_transfer(row: &rusqlite::Row<'_>) -> rusqlite::Result<OwnershipTransfer> {
    Ok(OwnershipTransfer {
        id: row.get(0)?,
        project_id: row.get(1)?,
        document_id: row.get(2)?,
        from_owner_id: row.get(3)?,
        to_owner_id: row.get(4)?,
        to_owner_name: row.get(5)?,
        status: row.get(6)?,
        requested_at: row.get(7)?,
        resolved_at: row.get(8)?,
    })
}

pub fn acquire_lock(
    db: &CadDb,
    project_id: &str,
    document_id: &str,
    owner_id: &str,
    owner_name: &str,
    lock_kind: &str,
) -> DbResult<WorkspaceLock> {
    db.with_conn(|conn| {
        let existing: Option<WorkspaceLock> = conn
            .query_row(
                "SELECT id, project_id, document_id, owner_id, owner_name, lock_kind, acquired_at
                 FROM workspace_locks WHERE project_id = ?1 AND document_id = ?2",
                params![project_id, document_id],
                map_lock,
            )
            .optional()?;

        if let Some(lock) = existing {
            if lock.owner_id != owner_id {
                return Err(crate::db::DbError::Message(format!(
                    "document locked by {}",
                    lock.owner_name
                )));
            }
            return Ok(lock);
        }

        let id = new_id();
        let now = now_iso();
        conn.execute(
            "INSERT INTO workspace_locks (id, project_id, document_id, owner_id, owner_name, lock_kind, acquired_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
            params![id, project_id, document_id, owner_id, owner_name, lock_kind, now],
        )?;

        Ok(WorkspaceLock {
            id,
            project_id: project_id.to_string(),
            document_id: document_id.to_string(),
            owner_id: owner_id.to_string(),
            owner_name: owner_name.to_string(),
            lock_kind: lock_kind.to_string(),
            acquired_at: now,
        })
    })
}

pub fn release_lock(db: &CadDb, project_id: &str, document_id: &str, owner_id: &str) -> DbResult<bool> {
    db.with_conn(|conn| {
        let changed = conn.execute(
            "DELETE FROM workspace_locks WHERE project_id = ?1 AND document_id = ?2 AND owner_id = ?3",
            params![project_id, document_id, owner_id],
        )?;
        Ok(changed > 0)
    })
}

pub fn list_locks(db: &CadDb, project_id: &str) -> DbResult<Vec<WorkspaceLock>> {
    db.with_conn(|conn| {
        let mut stmt = conn.prepare(
            "SELECT id, project_id, document_id, owner_id, owner_name, lock_kind, acquired_at
             FROM workspace_locks WHERE project_id = ?1 ORDER BY acquired_at DESC",
        )?;
        let rows = stmt.query_map(params![project_id], map_lock)?;
        Ok(rows.collect::<Result<Vec<_>, _>>()?)
    })
}

pub fn request_ownership_transfer(
    db: &CadDb,
    project_id: &str,
    document_id: &str,
    from_owner_id: &str,
    to_owner_id: &str,
    to_owner_name: &str,
) -> DbResult<OwnershipTransfer> {
    db.with_conn(|conn| {
        let id = new_id();
        let now = now_iso();
        conn.execute(
            "INSERT INTO ownership_transfers (id, project_id, document_id, from_owner_id, to_owner_id, to_owner_name, status, requested_at, resolved_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, 'pending', ?7, NULL)",
            params![
                id,
                project_id,
                document_id,
                from_owner_id,
                to_owner_id,
                to_owner_name,
                now
            ],
        )?;
        Ok(OwnershipTransfer {
            id,
            project_id: project_id.to_string(),
            document_id: document_id.to_string(),
            from_owner_id: from_owner_id.to_string(),
            to_owner_id: to_owner_id.to_string(),
            to_owner_name: to_owner_name.to_string(),
            status: "pending".into(),
            requested_at: now,
            resolved_at: None,
        })
    })
}

pub fn resolve_ownership_transfer(
    db: &CadDb,
    transfer_id: &str,
    accept: bool,
) -> DbResult<OwnershipTransfer> {
    db.with_conn(|conn| {
        let mut transfer: OwnershipTransfer = conn.query_row(
            "SELECT id, project_id, document_id, from_owner_id, to_owner_id, to_owner_name, status, requested_at, resolved_at
             FROM ownership_transfers WHERE id = ?1",
            params![transfer_id],
            map_transfer,
        )?;
        if transfer.status != "pending" {
            return Err(crate::db::DbError::Message("transfer already resolved".into()));
        }

        let now = now_iso();
        let status = if accept { "accepted" } else { "rejected" };
        conn.execute(
            "UPDATE ownership_transfers SET status = ?1, resolved_at = ?2 WHERE id = ?3",
            params![status, now, transfer_id],
        )?;

        if accept {
            // Move lock ownership if present; otherwise create a lock for the new owner.
            let existing: Option<WorkspaceLock> = conn
                .query_row(
                    "SELECT id, project_id, document_id, owner_id, owner_name, lock_kind, acquired_at
                     FROM workspace_locks WHERE project_id = ?1 AND document_id = ?2",
                    params![transfer.project_id, transfer.document_id],
                    map_lock,
                )
                .optional()?;

            if let Some(lock) = existing {
                conn.execute(
                    "UPDATE workspace_locks SET owner_id = ?1, owner_name = ?2, acquired_at = ?3 WHERE id = ?4",
                    params![transfer.to_owner_id, transfer.to_owner_name, now, lock.id],
                )?;
            } else {
                conn.execute(
                    "INSERT INTO workspace_locks (id, project_id, document_id, owner_id, owner_name, lock_kind, acquired_at)
                     VALUES (?1, ?2, ?3, ?4, ?5, 'exclusive', ?6)",
                    params![
                        new_id(),
                        transfer.project_id,
                        transfer.document_id,
                        transfer.to_owner_id,
                        transfer.to_owner_name,
                        now
                    ],
                )?;
            }
        }

        transfer.status = status.into();
        transfer.resolved_at = Some(now);
        Ok(transfer)
    })
}

pub fn list_ownership_transfers(db: &CadDb, project_id: &str) -> DbResult<Vec<OwnershipTransfer>> {
    db.with_conn(|conn| {
        let mut stmt = conn.prepare(
            "SELECT id, project_id, document_id, from_owner_id, to_owner_id, to_owner_name, status, requested_at, resolved_at
             FROM ownership_transfers WHERE project_id = ?1 ORDER BY requested_at DESC",
        )?;
        let rows = stmt.query_map(params![project_id], map_transfer)?;
        Ok(rows.collect::<Result<Vec<_>, _>>()?)
    })
}
