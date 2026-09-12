//! Git-like PDM schema for the local `.cad_db` SQLite store.

pub const SCHEMA_SQL: &str = r#"
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS projects (
    id              TEXT PRIMARY KEY NOT NULL,
    name            TEXT NOT NULL,
    description     TEXT NOT NULL DEFAULT '',
    root_path       TEXT NOT NULL DEFAULT '',
    owner_id        TEXT NOT NULL,
    created_at      TEXT NOT NULL,
    updated_at      TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS branches (
    id              TEXT PRIMARY KEY NOT NULL,
    project_id      TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name            TEXT NOT NULL,
    head_commit_id  TEXT,
    is_default      INTEGER NOT NULL DEFAULT 0,
    is_protected    INTEGER NOT NULL DEFAULT 0,
    created_at      TEXT NOT NULL,
    updated_at      TEXT NOT NULL,
    UNIQUE(project_id, name)
);

CREATE TABLE IF NOT EXISTS commits (
    id              TEXT PRIMARY KEY NOT NULL,
    project_id      TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    branch_id       TEXT NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    parent_id       TEXT REFERENCES commits(id) ON DELETE SET NULL,
    merge_parent_id TEXT REFERENCES commits(id) ON DELETE SET NULL,
    message         TEXT NOT NULL,
    author_id       TEXT NOT NULL,
    author_name     TEXT NOT NULL,
    created_at      TEXT NOT NULL,
    is_repaired     INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS document_state (
    id              TEXT PRIMARY KEY NOT NULL,
    commit_id       TEXT NOT NULL UNIQUE REFERENCES commits(id) ON DELETE CASCADE,
    document_id     TEXT NOT NULL,
    feature_tree    TEXT NOT NULL DEFAULT '{}',
    content_hash    TEXT NOT NULL DEFAULT '',
    created_at      TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS document_notes (
    id              TEXT PRIMARY KEY NOT NULL,
    project_id      TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    document_id     TEXT NOT NULL,
    commit_id       TEXT REFERENCES commits(id) ON DELETE SET NULL,
    author_id       TEXT NOT NULL,
    body            TEXT NOT NULL,
    created_at      TEXT NOT NULL,
    updated_at      TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS properties_metadata (
    id              TEXT PRIMARY KEY NOT NULL,
    project_id      TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    document_id     TEXT NOT NULL,
    key             TEXT NOT NULL,
    value           TEXT NOT NULL DEFAULT '',
    value_type      TEXT NOT NULL DEFAULT 'string',
    unit            TEXT,
    updated_at      TEXT NOT NULL,
    UNIQUE(project_id, document_id, key)
);

CREATE TABLE IF NOT EXISTS workspace_locks (
    id              TEXT PRIMARY KEY NOT NULL,
    project_id      TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    document_id     TEXT NOT NULL,
    owner_id        TEXT NOT NULL,
    owner_name      TEXT NOT NULL,
    lock_kind       TEXT NOT NULL DEFAULT 'exclusive',
    acquired_at     TEXT NOT NULL,
    UNIQUE(project_id, document_id)
);

CREATE TABLE IF NOT EXISTS ownership_transfers (
    id              TEXT PRIMARY KEY NOT NULL,
    project_id      TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    document_id     TEXT NOT NULL,
    from_owner_id   TEXT NOT NULL,
    to_owner_id     TEXT NOT NULL,
    to_owner_name   TEXT NOT NULL,
    status          TEXT NOT NULL DEFAULT 'pending',
    requested_at    TEXT NOT NULL,
    resolved_at     TEXT
);

CREATE TABLE IF NOT EXISTS release_configs (
    id              TEXT PRIMARY KEY NOT NULL,
    project_id      TEXT NOT NULL UNIQUE REFERENCES projects(id) ON DELETE CASCADE,
    name            TEXT NOT NULL DEFAULT 'Default Release Process',
    require_approvals INTEGER NOT NULL DEFAULT 1,
    min_approvals   INTEGER NOT NULL DEFAULT 1,
    allow_self_approve INTEGER NOT NULL DEFAULT 0,
    auto_obsolete_previous INTEGER NOT NULL DEFAULT 1,
    created_at      TEXT NOT NULL,
    updated_at      TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS release_approvers (
    id              TEXT PRIMARY KEY NOT NULL,
    release_config_id TEXT NOT NULL REFERENCES release_configs(id) ON DELETE CASCADE,
    user_id         TEXT NOT NULL,
    user_name       TEXT NOT NULL,
    role            TEXT NOT NULL DEFAULT 'approver',
    UNIQUE(release_config_id, user_id)
);

CREATE TABLE IF NOT EXISTS release_candidates (
    id              TEXT PRIMARY KEY NOT NULL,
    project_id      TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    commit_id       TEXT NOT NULL REFERENCES commits(id) ON DELETE CASCADE,
    name            TEXT NOT NULL,
    revision        TEXT NOT NULL,
    status          TEXT NOT NULL DEFAULT 'draft',
    configuration   TEXT NOT NULL DEFAULT 'default',
    created_by      TEXT NOT NULL,
    created_at      TEXT NOT NULL,
    updated_at      TEXT NOT NULL,
    released_at     TEXT,
    obsolete_at     TEXT,
    notes           TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS release_candidate_parts (
    id              TEXT PRIMARY KEY NOT NULL,
    release_candidate_id TEXT NOT NULL REFERENCES release_candidates(id) ON DELETE CASCADE,
    document_id     TEXT NOT NULL,
    document_name   TEXT NOT NULL,
    part_number     TEXT,
    UNIQUE(release_candidate_id, document_id)
);

CREATE TABLE IF NOT EXISTS release_reviews (
    id              TEXT PRIMARY KEY NOT NULL,
    release_candidate_id TEXT NOT NULL REFERENCES release_candidates(id) ON DELETE CASCADE,
    reviewer_id     TEXT NOT NULL,
    reviewer_name   TEXT NOT NULL,
    decision        TEXT NOT NULL,
    comment         TEXT NOT NULL DEFAULT '',
    created_at      TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS release_packages (
    id              TEXT PRIMARY KEY NOT NULL,
    project_id      TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    source_candidate_id TEXT NOT NULL REFERENCES release_candidates(id) ON DELETE CASCADE,
    name            TEXT NOT NULL,
    cloned_from_id  TEXT REFERENCES release_packages(id) ON DELETE SET NULL,
    created_by      TEXT NOT NULL,
    created_at      TEXT NOT NULL,
    manifest_json   TEXT NOT NULL DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_branches_project ON branches(project_id);
CREATE INDEX IF NOT EXISTS idx_commits_branch ON commits(branch_id);
CREATE INDEX IF NOT EXISTS idx_commits_parent ON commits(parent_id);
CREATE INDEX IF NOT EXISTS idx_document_state_doc ON document_state(document_id);
CREATE INDEX IF NOT EXISTS idx_notes_document ON document_notes(document_id);
CREATE INDEX IF NOT EXISTS idx_props_document ON properties_metadata(document_id);
CREATE INDEX IF NOT EXISTS idx_rc_project ON release_candidates(project_id);
CREATE INDEX IF NOT EXISTS idx_rc_status ON release_candidates(status);
"#;
