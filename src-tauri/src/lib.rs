mod commands;
mod db;
mod pdm;

use db::CadDb;
use std::path::PathBuf;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let db_root = resolve_db_root();
    let cad_db = CadDb::open(&db_root).expect("failed to open .cad_db");

    tauri::Builder::default()
        .manage(cad_db)
        .invoke_handler(tauri::generate_handler![
            commands::pdm_create_project,
            commands::pdm_list_projects,
            commands::pdm_list_branches,
            commands::pdm_create_branch,
            commands::pdm_set_branch_protection,
            commands::pdm_create_commit,
            commands::pdm_list_commits,
            commands::pdm_get_branch_graph,
            commands::pdm_compare_commits,
            commands::pdm_repair_commit,
            commands::pdm_restore_commit,
            commands::pdm_merge_branches,
            commands::pdm_get_document_state,
            commands::pdm_upsert_note,
            commands::pdm_upsert_property,
            commands::pdm_acquire_lock,
            commands::pdm_release_lock,
            commands::pdm_list_locks,
            commands::pdm_request_ownership_transfer,
            commands::pdm_resolve_ownership_transfer,
            commands::pdm_list_ownership_transfers,
            commands::pdm_get_release_config,
            commands::pdm_setup_release_management,
            commands::pdm_add_approver,
            commands::pdm_list_approvers,
            commands::pdm_remove_approver,
            commands::pdm_create_release_candidate,
            commands::pdm_list_release_candidates,
            commands::pdm_list_candidate_parts,
            commands::pdm_review_candidate,
            commands::pdm_release_candidate,
            commands::pdm_obsolete_candidate,
            commands::pdm_clone_release_package,
            commands::pdm_list_release_packages,
            commands::pdm_list_reviews,
            commands::pdm_db_path,
            commands::write_text_file,
        ])
        .run(tauri::generate_context!())
        .expect("error while running Arbor");
}

fn resolve_db_root() -> PathBuf {
    if let Ok(custom) = std::env::var("CAD_ENGINE_DB_ROOT") {
        let path = PathBuf::from(custom.trim());
        // Operator override only — reject empty, relative `..`, and bare relative paths
        // that could escape into surprising locations when cwd changes.
        if path.as_os_str().is_empty()
            || !path.is_absolute()
            || path
                .components()
                .any(|c| matches!(c, std::path::Component::ParentDir))
        {
            panic!(
                "CAD_ENGINE_DB_ROOT must be an absolute path without '..' components"
            );
        }
        return path;
    }
    dirs_fallback()
}

fn dirs_fallback() -> PathBuf {
    // Prefer a stable local workspace folder next to the binary / cwd.
    let cwd = std::env::current_dir().unwrap_or_else(|_| PathBuf::from("."));
    let workspace = cwd.join(".cad_workspace");
    let _ = std::fs::create_dir_all(&workspace);
    workspace
}
