use crate::db::{new_id, now_iso, CadDb, DbResult};
use crate::pdm::models::*;
use rusqlite::{params, OptionalExtension};
use serde_json::Value;
use std::collections::{BTreeMap, BTreeSet, HashMap};

fn map_project(row: &rusqlite::Row<'_>) -> rusqlite::Result<Project> {
    Ok(Project {
        id: row.get(0)?,
        name: row.get(1)?,
        description: row.get(2)?,
        root_path: row.get(3)?,
        owner_id: row.get(4)?,
        created_at: row.get(5)?,
        updated_at: row.get(6)?,
    })
}

fn map_branch(row: &rusqlite::Row<'_>) -> rusqlite::Result<Branch> {
    Ok(Branch {
        id: row.get(0)?,
        project_id: row.get(1)?,
        name: row.get(2)?,
        head_commit_id: row.get(3)?,
        is_default: row.get::<_, i64>(4)? != 0,
        is_protected: row.get::<_, i64>(5)? != 0,
        created_at: row.get(6)?,
        updated_at: row.get(7)?,
    })
}

fn map_commit(row: &rusqlite::Row<'_>) -> rusqlite::Result<Commit> {
    Ok(Commit {
        id: row.get(0)?,
        project_id: row.get(1)?,
        branch_id: row.get(2)?,
        parent_id: row.get(3)?,
        merge_parent_id: row.get(4)?,
        message: row.get(5)?,
        author_id: row.get(6)?,
        author_name: row.get(7)?,
        created_at: row.get(8)?,
        is_repaired: row.get::<_, i64>(9)? != 0,
    })
}

fn map_doc_state(row: &rusqlite::Row<'_>) -> rusqlite::Result<DocumentState> {
    let feature_tree: String = row.get(3)?;
    Ok(DocumentState {
        id: row.get(0)?,
        commit_id: row.get(1)?,
        document_id: row.get(2)?,
        feature_tree: serde_json::from_str(&feature_tree).unwrap_or(Value::Object(Default::default())),
        content_hash: row.get(4)?,
        created_at: row.get(5)?,
    })
}

pub fn create_project(db: &CadDb, input: CreateProjectInput) -> DbResult<Project> {
    db.with_conn(|conn| {
        let id = new_id();
        let now = now_iso();
        conn.execute(
            "INSERT INTO projects (id, name, description, root_path, owner_id, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
            params![
                id,
                input.name,
                input.description,
                input.root_path,
                input.owner_id,
                now,
                now
            ],
        )?;

        let branch_id = new_id();
        conn.execute(
            "INSERT INTO branches (id, project_id, name, head_commit_id, is_default, is_protected, created_at, updated_at)
             VALUES (?1, ?2, 'main', NULL, 1, 1, ?3, ?4)",
            params![branch_id, id, now, now],
        )?;

        // Seed empty root commit so history / graph always has an origin.
        let commit_id = new_id();
        conn.execute(
            "INSERT INTO commits (id, project_id, branch_id, parent_id, merge_parent_id, message, author_id, author_name, created_at, is_repaired)
             VALUES (?1, ?2, ?3, NULL, NULL, 'Initial commit', ?4, 'system', ?5, 0)",
            params![commit_id, id, branch_id, input.owner_id, now],
        )?;
        conn.execute(
            "UPDATE branches SET head_commit_id = ?1, updated_at = ?2 WHERE id = ?3",
            params![commit_id, now, branch_id],
        )?;
        conn.execute(
            "INSERT INTO document_state (id, commit_id, document_id, feature_tree, content_hash, created_at)
             VALUES (?1, ?2, 'workspace', '{}', '', ?3)",
            params![new_id(), commit_id, now],
        )?;

        conn.execute(
            "INSERT INTO release_configs (id, project_id, name, require_approvals, min_approvals, allow_self_approve, auto_obsolete_previous, created_at, updated_at)
             VALUES (?1, ?2, 'Default Release Process', 1, 1, 0, 1, ?3, ?4)",
            params![new_id(), id, now, now],
        )?;

        Ok(Project {
            id,
            name: input.name,
            description: input.description,
            root_path: input.root_path,
            owner_id: input.owner_id,
            created_at: now.clone(),
            updated_at: now,
        })
    })
}

pub fn list_projects(db: &CadDb) -> DbResult<Vec<Project>> {
    db.with_conn(|conn| {
        let mut stmt = conn.prepare(
            "SELECT id, name, description, root_path, owner_id, created_at, updated_at
             FROM projects ORDER BY updated_at DESC",
        )?;
        let rows = stmt.query_map([], map_project)?;
        Ok(rows.collect::<Result<Vec<_>, _>>()?)
    })
}

pub fn list_branches(db: &CadDb, project_id: &str) -> DbResult<Vec<Branch>> {
    db.with_conn(|conn| {
        let mut stmt = conn.prepare(
            "SELECT id, project_id, name, head_commit_id, is_default, is_protected, created_at, updated_at
             FROM branches WHERE project_id = ?1 ORDER BY is_default DESC, name ASC",
        )?;
        let rows = stmt.query_map(params![project_id], map_branch)?;
        Ok(rows.collect::<Result<Vec<_>, _>>()?)
    })
}

pub fn create_branch(
    db: &CadDb,
    project_id: &str,
    name: &str,
    from_commit_id: Option<&str>,
    protect: bool,
) -> DbResult<Branch> {
    db.with_conn(|conn| {
        let now = now_iso();
        let head = match from_commit_id {
            Some(id) => Some(id.to_string()),
            None => {
                let default: Option<String> = conn
                    .query_row(
                        "SELECT head_commit_id FROM branches WHERE project_id = ?1 AND is_default = 1",
                        params![project_id],
                        |r| r.get(0),
                    )
                    .optional()?;
                default
            }
        };
        let id = new_id();
        conn.execute(
            "INSERT INTO branches (id, project_id, name, head_commit_id, is_default, is_protected, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, 0, ?5, ?6, ?7)",
            params![id, project_id, name, head, protect as i64, now, now],
        )?;
        Ok(Branch {
            id,
            project_id: project_id.to_string(),
            name: name.to_string(),
            head_commit_id: head,
            is_default: false,
            is_protected: protect,
            created_at: now.clone(),
            updated_at: now,
        })
    })
}

pub fn set_branch_protection(db: &CadDb, branch_id: &str, protected: bool) -> DbResult<Branch> {
    db.with_conn(|conn| {
        let now = now_iso();
        conn.execute(
            "UPDATE branches SET is_protected = ?1, updated_at = ?2 WHERE id = ?3",
            params![protected as i64, now, branch_id],
        )?;
        conn.query_row(
            "SELECT id, project_id, name, head_commit_id, is_default, is_protected, created_at, updated_at
             FROM branches WHERE id = ?1",
            params![branch_id],
            map_branch,
        )
        .map_err(Into::into)
    })
}

pub fn create_commit(db: &CadDb, input: CreateCommitInput) -> DbResult<Commit> {
    db.with_conn(|conn| {
        let branch: Branch = conn.query_row(
            "SELECT id, project_id, name, head_commit_id, is_default, is_protected, created_at, updated_at
             FROM branches WHERE id = ?1",
            params![input.branch_id],
            map_branch,
        )?;
        if branch.is_protected {
            // Protected branches still allow commits from owners in local PDM;
            // UI should surface the protection flag for review workflows.
        }
        let now = now_iso();
        let id = new_id();
        let tree_json = serde_json::to_string(&input.feature_tree).unwrap_or_else(|_| "{}".into());
        let hash = simple_hash(&tree_json);

        conn.execute(
            "INSERT INTO commits (id, project_id, branch_id, parent_id, merge_parent_id, message, author_id, author_name, created_at, is_repaired)
             VALUES (?1, ?2, ?3, ?4, NULL, ?5, ?6, ?7, ?8, 0)",
            params![
                id,
                input.project_id,
                input.branch_id,
                branch.head_commit_id,
                input.message,
                input.author_id,
                input.author_name,
                now
            ],
        )?;
        conn.execute(
            "INSERT INTO document_state (id, commit_id, document_id, feature_tree, content_hash, created_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            params![new_id(), id, input.document_id, tree_json, hash, now],
        )?;
        conn.execute(
            "UPDATE branches SET head_commit_id = ?1, updated_at = ?2 WHERE id = ?3",
            params![id, now, input.branch_id],
        )?;

        Ok(Commit {
            id,
            project_id: input.project_id,
            branch_id: input.branch_id,
            parent_id: branch.head_commit_id,
            merge_parent_id: None,
            message: input.message,
            author_id: input.author_id,
            author_name: input.author_name,
            created_at: now,
            is_repaired: false,
        })
    })
}

pub fn list_commits(db: &CadDb, project_id: &str, branch_id: Option<&str>) -> DbResult<Vec<Commit>> {
    db.with_conn(|conn| {
        if let Some(bid) = branch_id {
            let mut stmt = conn.prepare(
                "SELECT id, project_id, branch_id, parent_id, merge_parent_id, message, author_id, author_name, created_at, is_repaired
                 FROM commits WHERE project_id = ?1 AND branch_id = ?2
                 ORDER BY created_at DESC",
            )?;
            let rows = stmt.query_map(params![project_id, bid], map_commit)?;
            Ok(rows.collect::<Result<Vec<_>, _>>()?)
        } else {
            let mut stmt = conn.prepare(
                "SELECT id, project_id, branch_id, parent_id, merge_parent_id, message, author_id, author_name, created_at, is_repaired
                 FROM commits WHERE project_id = ?1
                 ORDER BY created_at DESC",
            )?;
            let rows = stmt.query_map(params![project_id], map_commit)?;
            Ok(rows.collect::<Result<Vec<_>, _>>()?)
        }
    })
}

pub fn get_document_state(db: &CadDb, commit_id: &str) -> DbResult<Option<DocumentState>> {
    db.with_conn(|conn| {
        conn.query_row(
            "SELECT id, commit_id, document_id, feature_tree, content_hash, created_at
             FROM document_state WHERE commit_id = ?1",
            params![commit_id],
            map_doc_state,
        )
        .optional()
        .map_err(Into::into)
    })
}

pub fn build_branch_graph(db: &CadDb, project_id: &str) -> DbResult<BranchGraph> {
    let branches = list_branches(db, project_id)?;
    let commits = list_commits(db, project_id, None)?;

    let branch_names: HashMap<String, String> = branches
        .iter()
        .map(|b| (b.id.clone(), b.name.clone()))
        .collect();

    let mut column_for_branch: HashMap<String, usize> = HashMap::new();
    for (idx, b) in branches.iter().enumerate() {
        column_for_branch.insert(b.id.clone(), idx);
    }

    // Oldest-first for layout; reverse list for chronological draw order.
    let mut chronological = commits.clone();
    chronological.sort_by(|a, b| a.created_at.cmp(&b.created_at));

    let nodes: Vec<GraphCommitNode> = chronological
        .iter()
        .map(|c| GraphCommitNode {
            column: *column_for_branch.get(&c.branch_id).unwrap_or(&0),
            branch_name: branch_names
                .get(&c.branch_id)
                .cloned()
                .unwrap_or_else(|| "unknown".into()),
            commit: c.clone(),
        })
        .collect();

    let mut edges = Vec::new();
    for c in &chronological {
        if let Some(parent) = &c.parent_id {
            edges.push(GraphEdge {
                from_id: parent.clone(),
                to_id: c.id.clone(),
                kind: "parent".into(),
            });
        }
        if let Some(merge_parent) = &c.merge_parent_id {
            edges.push(GraphEdge {
                from_id: merge_parent.clone(),
                to_id: c.id.clone(),
                kind: "merge".into(),
            });
        }
    }

    Ok(BranchGraph {
        branches,
        nodes,
        edges,
    })
}

pub fn compare_commits(db: &CadDb, left_id: &str, right_id: &str) -> DbResult<CommitDiff> {
    let left = get_document_state(db, left_id)?
        .ok_or_else(|| crate::db::DbError::Message(format!("commit {left_id} has no document state")))?;
    let right = get_document_state(db, right_id)?
        .ok_or_else(|| crate::db::DbError::Message(format!("commit {right_id} has no document state")))?;

    let left_map = flatten_json(&left.feature_tree, "");
    let right_map = flatten_json(&right.feature_tree, "");

    let left_keys: BTreeSet<_> = left_map.keys().cloned().collect();
    let right_keys: BTreeSet<_> = right_map.keys().cloned().collect();

    let added: Vec<String> = right_keys.difference(&left_keys).cloned().collect();
    let removed: Vec<String> = left_keys.difference(&right_keys).cloned().collect();
    let changed: Vec<String> = left_keys
        .intersection(&right_keys)
        .filter(|k| left_map.get(*k) != right_map.get(*k))
        .cloned()
        .collect();

    Ok(CommitDiff {
        left_commit_id: left_id.to_string(),
        right_commit_id: right_id.to_string(),
        left_tree: left.feature_tree,
        right_tree: right.feature_tree,
        added_keys: added,
        removed_keys: removed,
        changed_keys: changed,
    })
}

pub fn repair_commit(db: &CadDb, commit_id: &str, repaired_tree: Value, author_id: &str) -> DbResult<Commit> {
    db.with_conn(|conn| {
        let base: Commit = conn.query_row(
            "SELECT id, project_id, branch_id, parent_id, merge_parent_id, message, author_id, author_name, created_at, is_repaired
             FROM commits WHERE id = ?1",
            params![commit_id],
            map_commit,
        )?;
        let now = now_iso();
        let id = new_id();
        let tree_json = serde_json::to_string(&repaired_tree).unwrap_or_else(|_| "{}".into());
        let message = format!("Repair: {}", base.message);

        conn.execute(
            "INSERT INTO commits (id, project_id, branch_id, parent_id, merge_parent_id, message, author_id, author_name, created_at, is_repaired)
             VALUES (?1, ?2, ?3, ?4, NULL, ?5, ?6, ?7, ?8, 1)",
            params![
                id,
                base.project_id,
                base.branch_id,
                commit_id,
                message,
                author_id,
                "repair",
                now
            ],
        )?;
        conn.execute(
            "INSERT INTO document_state (id, commit_id, document_id, feature_tree, content_hash, created_at)
             VALUES (?1, ?2, 'workspace', ?3, ?4, ?5)",
            params![new_id(), id, tree_json, simple_hash(&tree_json), now],
        )?;
        conn.execute(
            "UPDATE branches SET head_commit_id = ?1, updated_at = ?2 WHERE id = ?3",
            params![id, now, base.branch_id],
        )?;

        Ok(Commit {
            id,
            project_id: base.project_id,
            branch_id: base.branch_id,
            parent_id: Some(commit_id.to_string()),
            merge_parent_id: None,
            message,
            author_id: author_id.to_string(),
            author_name: "repair".into(),
            created_at: now,
            is_repaired: true,
        })
    })
}

pub fn restore_commit(db: &CadDb, branch_id: &str, commit_id: &str, author_id: &str, author_name: &str) -> DbResult<Commit> {
    let state = get_document_state(db, commit_id)?
        .ok_or_else(|| crate::db::DbError::Message("missing document state for restore".into()))?;

    db.with_conn(|conn| {
        let branch: Branch = conn.query_row(
            "SELECT id, project_id, name, head_commit_id, is_default, is_protected, created_at, updated_at
             FROM branches WHERE id = ?1",
            params![branch_id],
            map_branch,
        )?;
        let now = now_iso();
        let id = new_id();
        let tree_json = serde_json::to_string(&state.feature_tree).unwrap_or_else(|_| "{}".into());
        let message = format!("Restore to {}", &commit_id[..8.min(commit_id.len())]);

        conn.execute(
            "INSERT INTO commits (id, project_id, branch_id, parent_id, merge_parent_id, message, author_id, author_name, created_at, is_repaired)
             VALUES (?1, ?2, ?3, ?4, NULL, ?5, ?6, ?7, ?8, 0)",
            params![
                id,
                branch.project_id,
                branch_id,
                branch.head_commit_id,
                message,
                author_id,
                author_name,
                now
            ],
        )?;
        conn.execute(
            "INSERT INTO document_state (id, commit_id, document_id, feature_tree, content_hash, created_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            params![
                new_id(),
                id,
                state.document_id,
                tree_json,
                simple_hash(&tree_json),
                now
            ],
        )?;
        conn.execute(
            "UPDATE branches SET head_commit_id = ?1, updated_at = ?2 WHERE id = ?3",
            params![id, now, branch_id],
        )?;

        Ok(Commit {
            id,
            project_id: branch.project_id,
            branch_id: branch_id.to_string(),
            parent_id: branch.head_commit_id,
            merge_parent_id: None,
            message,
            author_id: author_id.to_string(),
            author_name: author_name.to_string(),
            created_at: now,
            is_repaired: false,
        })
    })
}

pub fn merge_branches(
    db: &CadDb,
    project_id: &str,
    source_branch_id: &str,
    target_branch_id: &str,
    author_id: &str,
    author_name: &str,
    message: &str,
) -> DbResult<MergeResult> {
    db.with_conn(|conn| {
        let source: Branch = conn.query_row(
            "SELECT id, project_id, name, head_commit_id, is_default, is_protected, created_at, updated_at
             FROM branches WHERE id = ?1",
            params![source_branch_id],
            map_branch,
        )?;
        let target: Branch = conn.query_row(
            "SELECT id, project_id, name, head_commit_id, is_default, is_protected, created_at, updated_at
             FROM branches WHERE id = ?1",
            params![target_branch_id],
            map_branch,
        )?;

        let source_head = source
            .head_commit_id
            .ok_or_else(|| crate::db::DbError::Message("source branch has no head".into()))?;
        let target_head = target
            .head_commit_id
            .ok_or_else(|| crate::db::DbError::Message("target branch has no head".into()))?;

        let source_tree: String = conn.query_row(
            "SELECT feature_tree FROM document_state WHERE commit_id = ?1",
            params![source_head],
            |r| r.get(0),
        )?;
        let target_tree: String = conn.query_row(
            "SELECT feature_tree FROM document_state WHERE commit_id = ?1",
            params![target_head],
            |r| r.get(0),
        )?;

        let source_val: Value = serde_json::from_str(&source_tree).unwrap_or(Value::Object(Default::default()));
        let target_val: Value = serde_json::from_str(&target_tree).unwrap_or(Value::Object(Default::default()));

        let (merged, conflicts) = three_way_merge(&target_val, &source_val);
        let auto_merged = conflicts.is_empty();
        let now = now_iso();
        let id = new_id();
        let tree_json = serde_json::to_string(&merged).unwrap_or_else(|_| "{}".into());

        conn.execute(
            "INSERT INTO commits (id, project_id, branch_id, parent_id, merge_parent_id, message, author_id, author_name, created_at, is_repaired)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, 0)",
            params![
                id,
                project_id,
                target_branch_id,
                target_head,
                source_head,
                message,
                author_id,
                author_name,
                now
            ],
        )?;
        conn.execute(
            "INSERT INTO document_state (id, commit_id, document_id, feature_tree, content_hash, created_at)
             VALUES (?1, ?2, 'workspace', ?3, ?4, ?5)",
            params![new_id(), id, tree_json, simple_hash(&tree_json), now],
        )?;
        conn.execute(
            "UPDATE branches SET head_commit_id = ?1, updated_at = ?2 WHERE id = ?3",
            params![id, now, target_branch_id],
        )?;

        Ok(MergeResult {
            commit: Commit {
                id,
                project_id: project_id.to_string(),
                branch_id: target_branch_id.to_string(),
                parent_id: Some(target_head),
                merge_parent_id: Some(source_head),
                message: message.to_string(),
                author_id: author_id.to_string(),
                author_name: author_name.to_string(),
                created_at: now,
                is_repaired: false,
            },
            conflicts,
            auto_merged,
        })
    })
}

fn flatten_json(value: &Value, prefix: &str) -> BTreeMap<String, String> {
    let mut out = BTreeMap::new();
    match value {
        Value::Object(map) => {
            for (k, v) in map {
                let path = if prefix.is_empty() {
                    k.clone()
                } else {
                    format!("{prefix}.{k}")
                };
                out.extend(flatten_json(v, &path));
            }
        }
        Value::Array(arr) => {
            for (i, v) in arr.iter().enumerate() {
                let path = format!("{prefix}[{i}]");
                out.extend(flatten_json(v, &path));
            }
        }
        other => {
            out.insert(prefix.to_string(), other.to_string());
        }
    }
    out
}

/// Prefer source values when keys differ; record conflicts when both sides changed relative to empty base.
fn three_way_merge(base_target: &Value, source: &Value) -> (Value, Vec<String>) {
    let mut target_map = flatten_json(base_target, "");
    let source_map = flatten_json(source, "");
    let mut conflicts = Vec::new();

    for (k, v) in source_map {
        if let Some(existing) = target_map.get(&k) {
            if existing != &v {
                conflicts.push(k.clone());
            }
        }
        target_map.insert(k, v);
    }

    // Rebuild a shallow object from dotted keys for storage.
    let mut root = serde_json::Map::new();
    for (k, v) in target_map {
        root.insert(k, Value::String(v.trim_matches('"').to_string()));
    }
    (Value::Object(root), conflicts)
}

fn simple_hash(s: &str) -> String {
    use std::collections::hash_map::DefaultHasher;
    use std::hash::{Hash, Hasher};
    let mut h = DefaultHasher::new();
    s.hash(&mut h);
    format!("{:016x}", h.finish())
}

pub fn upsert_note(
    db: &CadDb,
    project_id: &str,
    document_id: &str,
    commit_id: Option<&str>,
    author_id: &str,
    body: &str,
) -> DbResult<DocumentNote> {
    db.with_conn(|conn| {
        let id = new_id();
        let now = now_iso();
        conn.execute(
            "INSERT INTO document_notes (id, project_id, document_id, commit_id, author_id, body, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
            params![id, project_id, document_id, commit_id, author_id, body, now, now],
        )?;
        Ok(DocumentNote {
            id,
            project_id: project_id.to_string(),
            document_id: document_id.to_string(),
            commit_id: commit_id.map(|s| s.to_string()),
            author_id: author_id.to_string(),
            body: body.to_string(),
            created_at: now.clone(),
            updated_at: now,
        })
    })
}

pub fn upsert_property(
    db: &CadDb,
    project_id: &str,
    document_id: &str,
    key: &str,
    value: &str,
    value_type: &str,
    unit: Option<&str>,
) -> DbResult<PropertyMeta> {
    db.with_conn(|conn| {
        let now = now_iso();
        let existing: Option<String> = conn
            .query_row(
                "SELECT id FROM properties_metadata WHERE project_id = ?1 AND document_id = ?2 AND key = ?3",
                params![project_id, document_id, key],
                |r| r.get(0),
            )
            .optional()?;

        let had_existing = existing.is_some();
        let id = existing.unwrap_or_else(new_id);
        if had_existing {
            conn.execute(
                "UPDATE properties_metadata SET value = ?1, value_type = ?2, unit = ?3, updated_at = ?4 WHERE id = ?5",
                params![value, value_type, unit, now, id],
            )?;
        } else {
            conn.execute(
                "INSERT INTO properties_metadata (id, project_id, document_id, key, value, value_type, unit, updated_at)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
                params![id, project_id, document_id, key, value, value_type, unit, now],
            )?;
        }

        Ok(PropertyMeta {
            id,
            project_id: project_id.to_string(),
            document_id: document_id.to_string(),
            key: key.to_string(),
            value: value.to_string(),
            value_type: value_type.to_string(),
            unit: unit.map(|s| s.to_string()),
            updated_at: now,
        })
    })
}
