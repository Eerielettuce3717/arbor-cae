use serde::{Deserialize, Serialize};
use serde_json::Value;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Project {
    pub id: String,
    pub name: String,
    pub description: String,
    pub root_path: String,
    pub owner_id: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Branch {
    pub id: String,
    pub project_id: String,
    pub name: String,
    pub head_commit_id: Option<String>,
    pub is_default: bool,
    pub is_protected: bool,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Commit {
    pub id: String,
    pub project_id: String,
    pub branch_id: String,
    pub parent_id: Option<String>,
    pub merge_parent_id: Option<String>,
    pub message: String,
    pub author_id: String,
    pub author_name: String,
    pub created_at: String,
    pub is_repaired: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DocumentState {
    pub id: String,
    pub commit_id: String,
    pub document_id: String,
    pub feature_tree: Value,
    pub content_hash: String,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DocumentNote {
    pub id: String,
    pub project_id: String,
    pub document_id: String,
    pub commit_id: Option<String>,
    pub author_id: String,
    pub body: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PropertyMeta {
    pub id: String,
    pub project_id: String,
    pub document_id: String,
    pub key: String,
    pub value: String,
    pub value_type: String,
    pub unit: Option<String>,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkspaceLock {
    pub id: String,
    pub project_id: String,
    pub document_id: String,
    pub owner_id: String,
    pub owner_name: String,
    pub lock_kind: String,
    pub acquired_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct OwnershipTransfer {
    pub id: String,
    pub project_id: String,
    pub document_id: String,
    pub from_owner_id: String,
    pub to_owner_id: String,
    pub to_owner_name: String,
    pub status: String,
    pub requested_at: String,
    pub resolved_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ReleaseConfig {
    pub id: String,
    pub project_id: String,
    pub name: String,
    pub require_approvals: bool,
    pub min_approvals: i64,
    pub allow_self_approve: bool,
    pub auto_obsolete_previous: bool,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ReleaseApprover {
    pub id: String,
    pub release_config_id: String,
    pub user_id: String,
    pub user_name: String,
    pub role: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ReleaseCandidate {
    pub id: String,
    pub project_id: String,
    pub commit_id: String,
    pub name: String,
    pub revision: String,
    pub status: String,
    pub configuration: String,
    pub created_by: String,
    pub created_at: String,
    pub updated_at: String,
    pub released_at: Option<String>,
    pub obsolete_at: Option<String>,
    pub notes: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ReleaseCandidatePart {
    pub id: String,
    pub release_candidate_id: String,
    pub document_id: String,
    pub document_name: String,
    pub part_number: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ReleaseReview {
    pub id: String,
    pub release_candidate_id: String,
    pub reviewer_id: String,
    pub reviewer_name: String,
    pub decision: String,
    pub comment: String,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ReleasePackage {
    pub id: String,
    pub project_id: String,
    pub source_candidate_id: String,
    pub name: String,
    pub cloned_from_id: Option<String>,
    pub created_by: String,
    pub created_at: String,
    pub manifest_json: Value,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GraphCommitNode {
    pub commit: Commit,
    pub branch_name: String,
    pub column: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BranchGraph {
    pub branches: Vec<Branch>,
    pub nodes: Vec<GraphCommitNode>,
    pub edges: Vec<GraphEdge>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GraphEdge {
    pub from_id: String,
    pub to_id: String,
    pub kind: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CommitDiff {
    pub left_commit_id: String,
    pub right_commit_id: String,
    pub left_tree: Value,
    pub right_tree: Value,
    pub added_keys: Vec<String>,
    pub removed_keys: Vec<String>,
    pub changed_keys: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MergeResult {
    /// `None` when the merge was refused because of conflicts; nothing was written.
    pub commit: Option<Commit>,
    pub conflicts: Vec<String>,
    pub auto_merged: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateCommitInput {
    pub project_id: String,
    pub branch_id: String,
    pub message: String,
    pub author_id: String,
    pub author_name: String,
    pub document_id: String,
    pub feature_tree: Value,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateProjectInput {
    pub name: String,
    pub description: String,
    pub root_path: String,
    pub owner_id: String,
}
