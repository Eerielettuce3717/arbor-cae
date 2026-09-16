mod commands;
mod db;
mod mailer;
mod pdm;

use db::CadDb;
use std::path::{Path, PathBuf};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let db_root = resolve_workspace_root();
    let cad_db = CadDb::open(&db_root).unwrap_or_else(|err| {
        panic!(
            "failed to open Arbor database under {}: {err}",
            db_root.display()
        )
    });

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
            mailer::mailer_get_config,
            mailer::mailer_save_config,
            mailer::mailer_list_pushes,
            mailer::mailer_send,
        ])
        .run(tauri::generate_context!())
        .expect("error while running Arbor");
}

/// Stable on-disk root for SQLite PDM and CAM/PCB exports.
///
/// Finder launches set cwd to `/`, so a cwd-relative `.cad_workspace` fails on
/// the read-only system volume. Prefer the platform app-data directory.
pub fn resolve_workspace_root() -> PathBuf {
    if let Ok(custom) = std::env::var("CAD_ENGINE_DB_ROOT") {
        let path = PathBuf::from(custom.trim());
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
        let _ = std::fs::create_dir_all(&path);
        return path;
    }

    let dir = platform_app_data_dir();
    let _ = std::fs::create_dir_all(&dir);
    dir
}

fn platform_app_data_dir() -> PathBuf {
    #[cfg(target_os = "macos")]
    {
        if let Some(home) = std::env::var_os("HOME") {
            return PathBuf::from(home).join("Library/Application Support/Arbor");
        }
    }
    #[cfg(target_os = "windows")]
    {
        if let Ok(base) = std::env::var("LOCALAPPDATA") {
            return PathBuf::from(base).join("Arbor");
        }
    }
    #[cfg(not(any(target_os = "macos", target_os = "windows")))]
    {
        if let Some(home) = std::env::var_os("HOME") {
            return PathBuf::from(home).join(".local/share/Arbor");
        }
    }

    // Dev / odd environments: fall back next to cwd when writable.
    let cwd = std::env::current_dir().unwrap_or_else(|_| PathBuf::from("."));
    cwd.join(".cad_workspace")
}

#[allow(dead_code)]
pub fn workspace_join(relative: impl AsRef<Path>) -> PathBuf {
    resolve_workspace_root().join(relative)
}
