use crate::db::{new_id, now_iso, CadDb, DbResult};
use crate::pdm::models::*;
use rusqlite::{params, OptionalExtension};
use serde_json::{json, Value};

fn map_config(row: &rusqlite::Row<'_>) -> rusqlite::Result<ReleaseConfig> {
    Ok(ReleaseConfig {
        id: row.get(0)?,
        project_id: row.get(1)?,
        name: row.get(2)?,
        require_approvals: row.get::<_, i64>(3)? != 0,
        min_approvals: row.get(4)?,
        allow_self_approve: row.get::<_, i64>(5)? != 0,
        auto_obsolete_previous: row.get::<_, i64>(6)? != 0,
        created_at: row.get(7)?,
        updated_at: row.get(8)?,
    })
}

fn map_approver(row: &rusqlite::Row<'_>) -> rusqlite::Result<ReleaseApprover> {
    Ok(ReleaseApprover {
        id: row.get(0)?,
        release_config_id: row.get(1)?,
        user_id: row.get(2)?,
        user_name: row.get(3)?,
        role: row.get(4)?,
    })
}

fn map_candidate(row: &rusqlite::Row<'_>) -> rusqlite::Result<ReleaseCandidate> {
    Ok(ReleaseCandidate {
        id: row.get(0)?,
        project_id: row.get(1)?,
        commit_id: row.get(2)?,
        name: row.get(3)?,
        revision: row.get(4)?,
        status: row.get(5)?,
        configuration: row.get(6)?,
        created_by: row.get(7)?,
        created_at: row.get(8)?,
        updated_at: row.get(9)?,
        released_at: row.get(10)?,
        obsolete_at: row.get(11)?,
        notes: row.get(12)?,
    })
}

fn map_part(row: &rusqlite::Row<'_>) -> rusqlite::Result<ReleaseCandidatePart> {
    Ok(ReleaseCandidatePart {
        id: row.get(0)?,
        release_candidate_id: row.get(1)?,
        document_id: row.get(2)?,
        document_name: row.get(3)?,
        part_number: row.get(4)?,
    })
}

fn map_review(row: &rusqlite::Row<'_>) -> rusqlite::Result<ReleaseReview> {
    Ok(ReleaseReview {
        id: row.get(0)?,
        release_candidate_id: row.get(1)?,
        reviewer_id: row.get(2)?,
        reviewer_name: row.get(3)?,
        decision: row.get(4)?,
        comment: row.get(5)?,
        created_at: row.get(6)?,
    })
}

fn map_package(row: &rusqlite::Row<'_>) -> rusqlite::Result<ReleasePackage> {
    let manifest: String = row.get(7)?;
    Ok(ReleasePackage {
        id: row.get(0)?,
        project_id: row.get(1)?,
        source_candidate_id: row.get(2)?,
        name: row.get(3)?,
        cloned_from_id: row.get(4)?,
        created_by: row.get(5)?,
        created_at: row.get(6)?,
        manifest_json: serde_json::from_str(&manifest).unwrap_or(Value::Object(Default::default())),
    })
}

pub fn get_release_config(db: &CadDb, project_id: &str) -> DbResult<Option<ReleaseConfig>> {
    db.with_conn(|conn| {
        conn.query_row(
            "SELECT id, project_id, name, require_approvals, min_approvals, allow_self_approve, auto_obsolete_previous, created_at, updated_at
             FROM release_configs WHERE project_id = ?1",
            params![project_id],
            map_config,
        )
        .optional()
        .map_err(Into::into)
    })
}

pub fn setup_release_management(
    db: &CadDb,
    project_id: &str,
    name: &str,
    require_approvals: bool,
    min_approvals: i64,
    allow_self_approve: bool,
    auto_obsolete_previous: bool,
) -> DbResult<ReleaseConfig> {
    db.with_conn(|conn| {
        let now = now_iso();
        let existing: Option<String> = conn
            .query_row(
                "SELECT id FROM release_configs WHERE project_id = ?1",
                params![project_id],
                |r| r.get(0),
            )
            .optional()?;

        let had_existing = existing.is_some();
        let id = existing.unwrap_or_else(new_id);
        if had_existing {
            conn.execute(
                "UPDATE release_configs SET name = ?1, require_approvals = ?2, min_approvals = ?3,
                 allow_self_approve = ?4, auto_obsolete_previous = ?5, updated_at = ?6 WHERE id = ?7",
                params![
                    name,
                    require_approvals as i64,
                    min_approvals,
                    allow_self_approve as i64,
                    auto_obsolete_previous as i64,
                    now,
                    id
                ],
            )?;
        } else {
            conn.execute(
                "INSERT INTO release_configs (id, project_id, name, require_approvals, min_approvals, allow_self_approve, auto_obsolete_previous, created_at, updated_at)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
                params![
                    id,
                    project_id,
                    name,
                    require_approvals as i64,
                    min_approvals,
                    allow_self_approve as i64,
                    auto_obsolete_previous as i64,
                    now,
                    now
                ],
            )?;
        }

        Ok(ReleaseConfig {
            id,
            project_id: project_id.to_string(),
            name: name.to_string(),
            require_approvals,
            min_approvals,
            allow_self_approve,
            auto_obsolete_previous,
            created_at: now.clone(),
            updated_at: now,
        })
    })
}

pub fn add_approver(
    db: &CadDb,
    release_config_id: &str,
    user_id: &str,
    user_name: &str,
    role: &str,
) -> DbResult<ReleaseApprover> {
    db.with_conn(|conn| {
        let id = new_id();
        conn.execute(
            "INSERT OR REPLACE INTO release_approvers (id, release_config_id, user_id, user_name, role)
             VALUES (
                COALESCE((SELECT id FROM release_approvers WHERE release_config_id = ?2 AND user_id = ?3), ?1),
                ?2, ?3, ?4, ?5
             )",
            params![id, release_config_id, user_id, user_name, role],
        )?;
        let real_id: String = conn.query_row(
            "SELECT id FROM release_approvers WHERE release_config_id = ?1 AND user_id = ?2",
            params![release_config_id, user_id],
            |r| r.get(0),
        )?;
        Ok(ReleaseApprover {
            id: real_id,
            release_config_id: release_config_id.to_string(),
            user_id: user_id.to_string(),
            user_name: user_name.to_string(),
            role: role.to_string(),
        })
    })
}

pub fn list_approvers(db: &CadDb, release_config_id: &str) -> DbResult<Vec<ReleaseApprover>> {
    db.with_conn(|conn| {
        let mut stmt = conn.prepare(
            "SELECT id, release_config_id, user_id, user_name, role
             FROM release_approvers WHERE release_config_id = ?1 ORDER BY user_name",
        )?;
        let rows = stmt.query_map(params![release_config_id], map_approver)?;
        Ok(rows.collect::<Result<Vec<_>, _>>()?)
    })
}

pub fn remove_approver(db: &CadDb, approver_id: &str) -> DbResult<bool> {
    db.with_conn(|conn| {
        let n = conn.execute(
            "DELETE FROM release_approvers WHERE id = ?1",
            params![approver_id],
        )?;
        Ok(n > 0)
    })
}

pub fn create_release_candidate(
    db: &CadDb,
    project_id: &str,
    commit_id: &str,
    name: &str,
    revision: &str,
    configuration: &str,
    created_by: &str,
    notes: &str,
    parts: Vec<(String, String, Option<String>)>,
) -> DbResult<ReleaseCandidate> {
    db.with_conn(|conn| {
        let id = new_id();
        let now = now_iso();
        conn.execute(
            "INSERT INTO release_candidates (id, project_id, commit_id, name, revision, status, configuration, created_by, created_at, updated_at, released_at, obsolete_at, notes)
             VALUES (?1, ?2, ?3, ?4, ?5, 'in_review', ?6, ?7, ?8, ?9, NULL, NULL, ?10)",
            params![
                id,
                project_id,
                commit_id,
                name,
                revision,
                configuration,
                created_by,
                now,
                now,
                notes
            ],
        )?;

        for (doc_id, doc_name, part_number) in parts {
            conn.execute(
                "INSERT INTO release_candidate_parts (id, release_candidate_id, document_id, document_name, part_number)
                 VALUES (?1, ?2, ?3, ?4, ?5)",
                params![new_id(), id, doc_id, doc_name, part_number],
            )?;
        }

        Ok(ReleaseCandidate {
            id,
            project_id: project_id.to_string(),
            commit_id: commit_id.to_string(),
            name: name.to_string(),
            revision: revision.to_string(),
            status: "in_review".into(),
            configuration: configuration.to_string(),
            created_by: created_by.to_string(),
            created_at: now.clone(),
            updated_at: now,
            released_at: None,
            obsolete_at: None,
            notes: notes.to_string(),
        })
    })
}

pub fn list_release_candidates(db: &CadDb, project_id: &str) -> DbResult<Vec<ReleaseCandidate>> {
    db.with_conn(|conn| {
        let mut stmt = conn.prepare(
            "SELECT id, project_id, commit_id, name, revision, status, configuration, created_by, created_at, updated_at, released_at, obsolete_at, notes
             FROM release_candidates WHERE project_id = ?1 ORDER BY created_at DESC",
        )?;
        let rows = stmt.query_map(params![project_id], map_candidate)?;
        Ok(rows.collect::<Result<Vec<_>, _>>()?)
    })
}

pub fn list_candidate_parts(db: &CadDb, candidate_id: &str) -> DbResult<Vec<ReleaseCandidatePart>> {
    db.with_conn(|conn| {
        let mut stmt = conn.prepare(
            "SELECT id, release_candidate_id, document_id, document_name, part_number
             FROM release_candidate_parts WHERE release_candidate_id = ?1 ORDER BY document_name",
        )?;
        let rows = stmt.query_map(params![candidate_id], map_part)?;
        Ok(rows.collect::<Result<Vec<_>, _>>()?)
    })
}

pub fn review_candidate(
    db: &CadDb,
    candidate_id: &str,
    reviewer_id: &str,
    reviewer_name: &str,
    decision: &str,
    comment: &str,
) -> DbResult<ReleaseCandidate> {
    if !matches!(decision, "approved" | "rejected") {
        return Err(crate::db::DbError::Message(
            "decision must be approved or rejected".into(),
        ));
    }

    db.with_conn(|conn| {
        let candidate: ReleaseCandidate = conn.query_row(
            "SELECT id, project_id, commit_id, name, revision, status, configuration, created_by, created_at, updated_at, released_at, obsolete_at, notes
             FROM release_candidates WHERE id = ?1",
            params![candidate_id],
            map_candidate,
        )?;

        if candidate.status == "released" || candidate.status == "obsolete" {
            return Err(crate::db::DbError::Message(
                "cannot review a released or obsolete candidate".into(),
            ));
        }

        let config: ReleaseConfig = conn.query_row(
            "SELECT id, project_id, name, require_approvals, min_approvals, allow_self_approve, auto_obsolete_previous, created_at, updated_at
             FROM release_configs WHERE project_id = ?1",
            params![candidate.project_id],
            map_config,
        )?;

        if !config.allow_self_approve && reviewer_id == candidate.created_by && decision == "approved"
        {
            return Err(crate::db::DbError::Message(
                "self-approval is disabled for this release process".into(),
            ));
        }

        let now = now_iso();
        conn.execute(
            "INSERT INTO release_reviews (id, release_candidate_id, reviewer_id, reviewer_name, decision, comment, created_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
            params![
                new_id(),
                candidate_id,
                reviewer_id,
                reviewer_name,
                decision,
                comment,
                now
            ],
        )?;

        let mut status = if decision == "rejected" {
            "rejected".to_string()
        } else {
            candidate.status.clone()
        };

        if decision == "approved" && config.require_approvals {
            let approvals: i64 = conn.query_row(
                "SELECT COUNT(*) FROM release_reviews WHERE release_candidate_id = ?1 AND decision = 'approved'",
                params![candidate_id],
                |r| r.get(0),
            )?;
            if approvals >= config.min_approvals {
                status = "approved".into();
            } else {
                status = "in_review".into();
            }
        } else if decision == "approved" {
            status = "approved".into();
        }

        conn.execute(
            "UPDATE release_candidates SET status = ?1, updated_at = ?2 WHERE id = ?3",
            params![status, now, candidate_id],
        )?;

        Ok(ReleaseCandidate {
            status,
            updated_at: now,
            ..candidate
        })
    })
}

pub fn release_candidate(db: &CadDb, candidate_id: &str) -> DbResult<ReleaseCandidate> {
    db.with_conn(|conn| {
        let mut candidate: ReleaseCandidate = conn.query_row(
            "SELECT id, project_id, commit_id, name, revision, status, configuration, created_by, created_at, updated_at, released_at, obsolete_at, notes
             FROM release_candidates WHERE id = ?1",
            params![candidate_id],
            map_candidate,
        )?;

        if candidate.status != "approved" && candidate.status != "in_review" {
            return Err(crate::db::DbError::Message(
                "candidate must be approved (or in review if approvals disabled) before release".into(),
            ));
        }

        let config: Option<ReleaseConfig> = conn
            .query_row(
                "SELECT id, project_id, name, require_approvals, min_approvals, allow_self_approve, auto_obsolete_previous, created_at, updated_at
                 FROM release_configs WHERE project_id = ?1",
                params![candidate.project_id],
                map_config,
            )
            .optional()?;

        if let Some(cfg) = &config {
            if cfg.require_approvals && candidate.status != "approved" {
                return Err(crate::db::DbError::Message(
                    "approvals required before release".into(),
                ));
            }
        }

        let now = now_iso();

        if config.as_ref().map(|c| c.auto_obsolete_previous).unwrap_or(false) {
            conn.execute(
                "UPDATE release_candidates SET status = 'obsolete', obsolete_at = ?1, updated_at = ?1
                 WHERE project_id = ?2 AND configuration = ?3 AND status = 'released' AND id != ?4",
                params![now, candidate.project_id, candidate.configuration, candidate_id],
            )?;
        }

        conn.execute(
            "UPDATE release_candidates SET status = 'released', released_at = ?1, updated_at = ?1 WHERE id = ?2",
            params![now, candidate_id],
        )?;

        candidate.status = "released".into();
        candidate.released_at = Some(now.clone());
        candidate.updated_at = now;
        Ok(candidate)
    })
}

pub fn obsolete_candidate(db: &CadDb, candidate_id: &str) -> DbResult<ReleaseCandidate> {
    db.with_conn(|conn| {
        let now = now_iso();
        conn.execute(
            "UPDATE release_candidates SET status = 'obsolete', obsolete_at = ?1, updated_at = ?1 WHERE id = ?2",
            params![now, candidate_id],
        )?;
        conn.query_row(
            "SELECT id, project_id, commit_id, name, revision, status, configuration, created_by, created_at, updated_at, released_at, obsolete_at, notes
             FROM release_candidates WHERE id = ?1",
            params![candidate_id],
            map_candidate,
        )
        .map_err(Into::into)
    })
}

pub fn clone_release_package(
    db: &CadDb,
    candidate_id: &str,
    name: &str,
    created_by: &str,
    cloned_from_id: Option<&str>,
) -> DbResult<ReleasePackage> {
    db.with_conn(|conn| {
        let candidate: ReleaseCandidate = conn.query_row(
            "SELECT id, project_id, commit_id, name, revision, status, configuration, created_by, created_at, updated_at, released_at, obsolete_at, notes
             FROM release_candidates WHERE id = ?1",
            params![candidate_id],
            map_candidate,
        )?;

        let mut parts_stmt = conn.prepare(
            "SELECT document_id, document_name, part_number FROM release_candidate_parts WHERE release_candidate_id = ?1",
        )?;
        let parts: Vec<Value> = parts_stmt
            .query_map(params![candidate_id], |r| {
                Ok(json!({
                    "documentId": r.get::<_, String>(0)?,
                    "documentName": r.get::<_, String>(1)?,
                    "partNumber": r.get::<_, Option<String>>(2)?,
                }))
            })?
            .collect::<Result<Vec<_>, _>>()?;

        let manifest = json!({
            "candidateId": candidate.id,
            "revision": candidate.revision,
            "configuration": candidate.configuration,
            "commitId": candidate.commit_id,
            "parts": parts,
        });

        let id = new_id();
        let now = now_iso();
        let manifest_str = manifest.to_string();
        conn.execute(
            "INSERT INTO release_packages (id, project_id, source_candidate_id, name, cloned_from_id, created_by, created_at, manifest_json)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
            params![
                id,
                candidate.project_id,
                candidate_id,
                name,
                cloned_from_id,
                created_by,
                now,
                manifest_str
            ],
        )?;

        Ok(ReleasePackage {
            id,
            project_id: candidate.project_id,
            source_candidate_id: candidate_id.to_string(),
            name: name.to_string(),
            cloned_from_id: cloned_from_id.map(|s| s.to_string()),
            created_by: created_by.to_string(),
            created_at: now,
            manifest_json: manifest,
        })
    })
}

pub fn list_release_packages(db: &CadDb, project_id: &str) -> DbResult<Vec<ReleasePackage>> {
    db.with_conn(|conn| {
        let mut stmt = conn.prepare(
            "SELECT id, project_id, source_candidate_id, name, cloned_from_id, created_by, created_at, manifest_json
             FROM release_packages WHERE project_id = ?1 ORDER BY created_at DESC",
        )?;
        let rows = stmt.query_map(params![project_id], map_package)?;
        Ok(rows.collect::<Result<Vec<_>, _>>()?)
    })
}

pub fn list_reviews(db: &CadDb, candidate_id: &str) -> DbResult<Vec<ReleaseReview>> {
    db.with_conn(|conn| {
        let mut stmt = conn.prepare(
            "SELECT id, release_candidate_id, reviewer_id, reviewer_name, decision, comment, created_at
             FROM release_reviews WHERE release_candidate_id = ?1 ORDER BY created_at DESC",
        )?;
        let rows = stmt.query_map(params![candidate_id], map_review)?;
        Ok(rows.collect::<Result<Vec<_>, _>>()?)
    })
}
