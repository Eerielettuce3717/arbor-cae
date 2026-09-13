use crate::db::CadDb;
use crate::pdm::models::*;
use crate::pdm::{release, versions, workspace};
use serde_json::Value;
use tauri::State;

fn map_err(e: impl ToString) -> String {
    e.to_string()
}

// —— Projects / versions / history ————————————————————————————————

#[tauri::command]
pub fn pdm_create_project(
    db: State<'_, CadDb>,
    name: String,
    description: String,
    root_path: String,
    owner_id: String,
) -> Result<Project, String> {
    versions::create_project(
        &db,
        CreateProjectInput {
            name,
            description,
            root_path,
            owner_id,
        },
    )
    .map_err(map_err)
}

#[tauri::command]
pub fn pdm_list_projects(db: State<'_, CadDb>) -> Result<Vec<Project>, String> {
    versions::list_projects(&db).map_err(map_err)
}

#[tauri::command]
pub fn pdm_list_branches(db: State<'_, CadDb>, project_id: String) -> Result<Vec<Branch>, String> {
    versions::list_branches(&db, &project_id).map_err(map_err)
}

#[tauri::command]
pub fn pdm_create_branch(
    db: State<'_, CadDb>,
    project_id: String,
    name: String,
    from_commit_id: Option<String>,
    protect: bool,
) -> Result<Branch, String> {
    versions::create_branch(
        &db,
        &project_id,
        &name,
        from_commit_id.as_deref(),
        protect,
    )
    .map_err(map_err)
}

#[tauri::command]
pub fn pdm_set_branch_protection(
    db: State<'_, CadDb>,
    branch_id: String,
    protected: bool,
) -> Result<Branch, String> {
    versions::set_branch_protection(&db, &branch_id, protected).map_err(map_err)
}

#[tauri::command]
pub fn pdm_create_commit(
    db: State<'_, CadDb>,
    project_id: String,
    branch_id: String,
    message: String,
    author_id: String,
    author_name: String,
    document_id: String,
    feature_tree: Value,
) -> Result<Commit, String> {
    versions::create_commit(
        &db,
        CreateCommitInput {
            project_id,
            branch_id,
            message,
            author_id,
            author_name,
            document_id,
            feature_tree,
        },
    )
    .map_err(map_err)
}

#[tauri::command]
pub fn pdm_list_commits(
    db: State<'_, CadDb>,
    project_id: String,
    branch_id: Option<String>,
) -> Result<Vec<Commit>, String> {
    versions::list_commits(&db, &project_id, branch_id.as_deref()).map_err(map_err)
}

#[tauri::command]
pub fn pdm_get_branch_graph(
    db: State<'_, CadDb>,
    project_id: String,
) -> Result<BranchGraph, String> {
    versions::build_branch_graph(&db, &project_id).map_err(map_err)
}

#[tauri::command]
pub fn pdm_compare_commits(
    db: State<'_, CadDb>,
    left_commit_id: String,
    right_commit_id: String,
) -> Result<CommitDiff, String> {
    versions::compare_commits(&db, &left_commit_id, &right_commit_id).map_err(map_err)
}

#[tauri::command]
pub fn pdm_repair_commit(
    db: State<'_, CadDb>,
    commit_id: String,
    repaired_tree: Value,
    author_id: String,
) -> Result<Commit, String> {
    versions::repair_commit(&db, &commit_id, repaired_tree, &author_id).map_err(map_err)
}

#[tauri::command]
pub fn pdm_restore_commit(
    db: State<'_, CadDb>,
    branch_id: String,
    commit_id: String,
    author_id: String,
    author_name: String,
) -> Result<Commit, String> {
    versions::restore_commit(&db, &branch_id, &commit_id, &author_id, &author_name).map_err(map_err)
}

#[tauri::command]
pub fn pdm_merge_branches(
    db: State<'_, CadDb>,
    project_id: String,
    source_branch_id: String,
    target_branch_id: String,
    author_id: String,
    author_name: String,
    message: String,
) -> Result<MergeResult, String> {
    versions::merge_branches(
        &db,
        &project_id,
        &source_branch_id,
        &target_branch_id,
        &author_id,
        &author_name,
        &message,
    )
    .map_err(map_err)
}

#[tauri::command]
pub fn pdm_get_document_state(
    db: State<'_, CadDb>,
    commit_id: String,
) -> Result<Option<DocumentState>, String> {
    versions::get_document_state(&db, &commit_id).map_err(map_err)
}

#[tauri::command]
pub fn pdm_upsert_note(
    db: State<'_, CadDb>,
    project_id: String,
    document_id: String,
    commit_id: Option<String>,
    author_id: String,
    body: String,
) -> Result<DocumentNote, String> {
    versions::upsert_note(
        &db,
        &project_id,
        &document_id,
        commit_id.as_deref(),
        &author_id,
        &body,
    )
    .map_err(map_err)
}

#[tauri::command]
pub fn pdm_upsert_property(
    db: State<'_, CadDb>,
    project_id: String,
    document_id: String,
    key: String,
    value: String,
    value_type: String,
    unit: Option<String>,
) -> Result<PropertyMeta, String> {
    versions::upsert_property(
        &db,
        &project_id,
        &document_id,
        &key,
        &value,
        &value_type,
        unit.as_deref(),
    )
    .map_err(map_err)
}

// —— Workspace protections & ownership ————————————————————————————

#[tauri::command]
pub fn pdm_acquire_lock(
    db: State<'_, CadDb>,
    project_id: String,
    document_id: String,
    owner_id: String,
    owner_name: String,
    lock_kind: String,
) -> Result<WorkspaceLock, String> {
    workspace::acquire_lock(&db, &project_id, &document_id, &owner_id, &owner_name, &lock_kind)
        .map_err(map_err)
}

#[tauri::command]
pub fn pdm_release_lock(
    db: State<'_, CadDb>,
    project_id: String,
    document_id: String,
    owner_id: String,
) -> Result<bool, String> {
    workspace::release_lock(&db, &project_id, &document_id, &owner_id).map_err(map_err)
}

#[tauri::command]
pub fn pdm_list_locks(db: State<'_, CadDb>, project_id: String) -> Result<Vec<WorkspaceLock>, String> {
    workspace::list_locks(&db, &project_id).map_err(map_err)
}

#[tauri::command]
pub fn pdm_request_ownership_transfer(
    db: State<'_, CadDb>,
    project_id: String,
    document_id: String,
    from_owner_id: String,
    to_owner_id: String,
    to_owner_name: String,
) -> Result<OwnershipTransfer, String> {
    workspace::request_ownership_transfer(
        &db,
        &project_id,
        &document_id,
        &from_owner_id,
        &to_owner_id,
        &to_owner_name,
    )
    .map_err(map_err)
}

#[tauri::command]
pub fn pdm_resolve_ownership_transfer(
    db: State<'_, CadDb>,
    transfer_id: String,
    accept: bool,
) -> Result<OwnershipTransfer, String> {
    workspace::resolve_ownership_transfer(&db, &transfer_id, accept).map_err(map_err)
}

#[tauri::command]
pub fn pdm_list_ownership_transfers(
    db: State<'_, CadDb>,
    project_id: String,
) -> Result<Vec<OwnershipTransfer>, String> {
    workspace::list_ownership_transfers(&db, &project_id).map_err(map_err)
}

// —— Release management ————————————————————————————————————————————

#[tauri::command]
pub fn pdm_get_release_config(
    db: State<'_, CadDb>,
    project_id: String,
) -> Result<Option<ReleaseConfig>, String> {
    release::get_release_config(&db, &project_id).map_err(map_err)
}

#[tauri::command]
pub fn pdm_setup_release_management(
    db: State<'_, CadDb>,
    project_id: String,
    name: String,
    require_approvals: bool,
    min_approvals: i64,
    allow_self_approve: bool,
    auto_obsolete_previous: bool,
) -> Result<ReleaseConfig, String> {
    release::setup_release_management(
        &db,
        &project_id,
        &name,
        require_approvals,
        min_approvals,
        allow_self_approve,
        auto_obsolete_previous,
    )
    .map_err(map_err)
}

#[tauri::command]
pub fn pdm_add_approver(
    db: State<'_, CadDb>,
    release_config_id: String,
    user_id: String,
    user_name: String,
    role: String,
) -> Result<ReleaseApprover, String> {
    release::add_approver(&db, &release_config_id, &user_id, &user_name, &role).map_err(map_err)
}

#[tauri::command]
pub fn pdm_list_approvers(
    db: State<'_, CadDb>,
    release_config_id: String,
) -> Result<Vec<ReleaseApprover>, String> {
    release::list_approvers(&db, &release_config_id).map_err(map_err)
}

#[tauri::command]
pub fn pdm_remove_approver(db: State<'_, CadDb>, approver_id: String) -> Result<bool, String> {
    release::remove_approver(&db, &approver_id).map_err(map_err)
}

#[tauri::command]
pub fn pdm_create_release_candidate(
    db: State<'_, CadDb>,
    project_id: String,
    commit_id: String,
    name: String,
    revision: String,
    configuration: String,
    created_by: String,
    notes: String,
    parts: Vec<(String, String, Option<String>)>,
) -> Result<ReleaseCandidate, String> {
    release::create_release_candidate(
        &db,
        &project_id,
        &commit_id,
        &name,
        &revision,
        &configuration,
        &created_by,
        &notes,
        parts,
    )
    .map_err(map_err)
}

#[tauri::command]
pub fn pdm_list_release_candidates(
    db: State<'_, CadDb>,
    project_id: String,
) -> Result<Vec<ReleaseCandidate>, String> {
    release::list_release_candidates(&db, &project_id).map_err(map_err)
}

#[tauri::command]
pub fn pdm_list_candidate_parts(
    db: State<'_, CadDb>,
    candidate_id: String,
) -> Result<Vec<ReleaseCandidatePart>, String> {
    release::list_candidate_parts(&db, &candidate_id).map_err(map_err)
}

#[tauri::command]
pub fn pdm_review_candidate(
    db: State<'_, CadDb>,
    candidate_id: String,
    reviewer_id: String,
    reviewer_name: String,
    decision: String,
    comment: String,
) -> Result<ReleaseCandidate, String> {
    release::review_candidate(
        &db,
        &candidate_id,
        &reviewer_id,
        &reviewer_name,
        &decision,
        &comment,
    )
    .map_err(map_err)
}

#[tauri::command]
pub fn pdm_release_candidate(
    db: State<'_, CadDb>,
    candidate_id: String,
) -> Result<ReleaseCandidate, String> {
    release::release_candidate(&db, &candidate_id).map_err(map_err)
}

#[tauri::command]
pub fn pdm_obsolete_candidate(
    db: State<'_, CadDb>,
    candidate_id: String,
) -> Result<ReleaseCandidate, String> {
    release::obsolete_candidate(&db, &candidate_id).map_err(map_err)
}

#[tauri::command]
pub fn pdm_clone_release_package(
    db: State<'_, CadDb>,
    candidate_id: String,
    name: String,
    created_by: String,
    cloned_from_id: Option<String>,
) -> Result<ReleasePackage, String> {
    release::clone_release_package(
        &db,
        &candidate_id,
        &name,
        &created_by,
        cloned_from_id.as_deref(),
    )
    .map_err(map_err)
}

#[tauri::command]
pub fn pdm_list_release_packages(
    db: State<'_, CadDb>,
    project_id: String,
) -> Result<Vec<ReleasePackage>, String> {
    release::list_release_packages(&db, &project_id).map_err(map_err)
}

#[tauri::command]
pub fn pdm_list_reviews(
    db: State<'_, CadDb>,
    candidate_id: String,
) -> Result<Vec<ReleaseReview>, String> {
    release::list_reviews(&db, &candidate_id).map_err(map_err)
}

#[tauri::command]
pub fn pdm_db_path(db: State<'_, CadDb>) -> Result<String, String> {
    Ok(db.path().display().to_string())
}

/// Allowlisted export folders under the Arbor workspace root.
const WRITE_SUBDIRS: &[&str] = &["cam_output", "pcb_output"];

/// Write a text file under `<workspace>/<subdir>/` (CAM G-code / NC export).
///
/// `subdir` must be one of the allowlisted export folders (or omitted for the
/// workspace root). `file_name` is stripped to its final path component so
/// callers cannot escape via `../` or absolute paths.
#[tauri::command]
pub fn write_text_file(
    file_name: String,
    contents: String,
    subdir: Option<String>,
) -> Result<String, String> {
    let workspace = crate::resolve_workspace_root();
    std::fs::create_dir_all(&workspace).map_err(map_err)?;
    let workspace_canon = std::fs::canonicalize(&workspace).map_err(map_err)?;

    let dir = match subdir.as_deref().map(str::trim).filter(|s| !s.is_empty()) {
        None => workspace_canon.clone(),
        Some(name) => {
            if !WRITE_SUBDIRS.contains(&name) {
                return Err(format!(
                    "subdir must be one of: {}",
                    WRITE_SUBDIRS.join(", ")
                ));
            }
            let candidate = workspace_canon.join(name);
            std::fs::create_dir_all(&candidate).map_err(map_err)?;
            let canon = std::fs::canonicalize(&candidate).map_err(map_err)?;
            if !canon.starts_with(&workspace_canon) {
                return Err("subdir escapes workspace".to_string());
            }
            canon
        }
    };

    let safe = std::path::Path::new(&file_name)
        .file_name()
        .ok_or_else(|| "invalid file name".to_string())?;
    let path = dir.join(safe);
    if path.components().any(|c| matches!(c, std::path::Component::ParentDir)) {
        return Err("invalid file name".to_string());
    }

    write_atomic(&path, contents.as_bytes()).map_err(map_err)?;
    Ok(path.display().to_string())
}

/// Write `bytes` to `path` atomically: temp file in the same directory, flushed
/// and fsynced, then renamed over the target.
///
/// `fs::write` truncates the destination and then streams into it, so a crash or
/// power loss mid-write leaves a partial file at the final path. These exports
/// are G-code and NC programs fed to machine controllers, where a silently
/// truncated program is a physical hazard rather than just lost data. A rename
/// over a fully-synced temp file means a reader sees either the old contents or
/// the complete new contents, never a partial program.
fn write_atomic(path: &std::path::Path, bytes: &[u8]) -> std::io::Result<()> {
    use std::io::Write;

    let dir = path.parent().ok_or_else(|| {
        std::io::Error::new(std::io::ErrorKind::InvalidInput, "path has no parent directory")
    })?;

    // Same directory as the target, so the rename cannot cross a filesystem.
    let file_name = path
        .file_name()
        .and_then(|n| n.to_str())
        .ok_or_else(|| {
            std::io::Error::new(std::io::ErrorKind::InvalidInput, "invalid file name")
        })?;
    let tmp_path = dir.join(format!(".{file_name}.{}.tmp", std::process::id()));

    // Scoped so the handle is closed before the rename (required on Windows).
    {
        let mut tmp = std::fs::File::create(&tmp_path)?;
        if let Err(err) = tmp.write_all(bytes).and_then(|()| tmp.sync_all()) {
            let _ = std::fs::remove_file(&tmp_path);
            return Err(err);
        }
    }

    if let Err(err) = std::fs::rename(&tmp_path, path) {
        let _ = std::fs::remove_file(&tmp_path);
        return Err(err);
    }

    // Persist the directory entry itself, so the rename survives a crash too.
    // Not supported on every platform or filesystem; a failure here does not
    // invalidate the data already written and synced.
    if let Ok(dir_handle) = std::fs::File::open(dir) {
        let _ = dir_handle.sync_all();
    }

    Ok(())
}
