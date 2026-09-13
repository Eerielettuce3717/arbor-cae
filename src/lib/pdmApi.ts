import { invoke } from "@tauri-apps/api/core";

export interface Project {
  id: string;
  name: string;
  description: string;
  rootPath: string;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
}

export interface Branch {
  id: string;
  projectId: string;
  name: string;
  headCommitId: string | null;
  isDefault: boolean;
  isProtected: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Commit {
  id: string;
  projectId: string;
  branchId: string;
  parentId: string | null;
  mergeParentId: string | null;
  message: string;
  authorId: string;
  authorName: string;
  createdAt: string;
  isRepaired: boolean;
}

export interface GraphCommitNode {
  commit: Commit;
  branchName: string;
  column: number;
}

export interface GraphEdge {
  fromId: string;
  toId: string;
  kind: string;
}

export interface BranchGraph {
  branches: Branch[];
  nodes: GraphCommitNode[];
  edges: GraphEdge[];
}

export interface CommitDiff {
  leftCommitId: string;
  rightCommitId: string;
  leftTree: unknown;
  rightTree: unknown;
  addedKeys: string[];
  removedKeys: string[];
  changedKeys: string[];
}

export interface MergeResult {
  /** Null when the merge was refused because of conflicts; nothing was written. */
  commit: Commit | null;
  conflicts: string[];
  autoMerged: boolean;
}

export interface WorkspaceLock {
  id: string;
  projectId: string;
  documentId: string;
  ownerId: string;
  ownerName: string;
  lockKind: string;
  acquiredAt: string;
}

export interface OwnershipTransfer {
  id: string;
  projectId: string;
  documentId: string;
  fromOwnerId: string;
  toOwnerId: string;
  toOwnerName: string;
  status: string;
  requestedAt: string;
  resolvedAt: string | null;
}

export interface ReleaseConfig {
  id: string;
  projectId: string;
  name: string;
  requireApprovals: boolean;
  minApprovals: number;
  allowSelfApprove: boolean;
  autoObsoletePrevious: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ReleaseApprover {
  id: string;
  releaseConfigId: string;
  userId: string;
  userName: string;
  role: string;
}

export interface ReleaseCandidate {
  id: string;
  projectId: string;
  commitId: string;
  name: string;
  revision: string;
  status: string;
  configuration: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  releasedAt: string | null;
  obsoleteAt: string | null;
  notes: string;
}

export interface ReleaseCandidatePart {
  id: string;
  releaseCandidateId: string;
  documentId: string;
  documentName: string;
  partNumber: string | null;
}

export interface ReleasePackage {
  id: string;
  projectId: string;
  sourceCandidateId: string;
  name: string;
  clonedFromId: string | null;
  createdBy: string;
  createdAt: string;
  manifestJson: unknown;
}

export interface ReleaseReview {
  id: string;
  releaseCandidateId: string;
  reviewerId: string;
  reviewerName: string;
  decision: string;
  comment: string;
  createdAt: string;
}

/** Detect whether Tauri IPC is available (desktop shell vs plain browser). */
export function isTauriRuntime(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

async function call<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  if (!isTauriRuntime()) {
    throw new Error("PDM commands require the Tauri desktop runtime");
  }
  return invoke<T>(cmd, args);
}

export const pdm = {
  dbPath: () => call<string>("pdm_db_path"),
  createProject: (args: {
    name: string;
    description: string;
    rootPath: string;
    ownerId: string;
  }) => call<Project>("pdm_create_project", args),
  listProjects: () => call<Project[]>("pdm_list_projects"),
  listBranches: (projectId: string) =>
    call<Branch[]>("pdm_list_branches", { projectId }),
  createBranch: (args: {
    projectId: string;
    name: string;
    fromCommitId?: string | null;
    protect: boolean;
  }) => call<Branch>("pdm_create_branch", args),
  setBranchProtection: (branchId: string, protectedFlag: boolean) =>
    call<Branch>("pdm_set_branch_protection", {
      branchId,
      protected: protectedFlag,
    }),
  createCommit: (args: {
    projectId: string;
    branchId: string;
    message: string;
    authorId: string;
    authorName: string;
    documentId: string;
    featureTree: unknown;
  }) => call<Commit>("pdm_create_commit", args),
  listCommits: (projectId: string, branchId?: string | null) =>
    call<Commit[]>("pdm_list_commits", { projectId, branchId: branchId ?? null }),
  getBranchGraph: (projectId: string) =>
    call<BranchGraph>("pdm_get_branch_graph", { projectId }),
  compareCommits: (leftCommitId: string, rightCommitId: string) =>
    call<CommitDiff>("pdm_compare_commits", { leftCommitId, rightCommitId }),
  repairCommit: (commitId: string, repairedTree: unknown, authorId: string) =>
    call<Commit>("pdm_repair_commit", { commitId, repairedTree, authorId }),
  restoreCommit: (args: {
    branchId: string;
    commitId: string;
    authorId: string;
    authorName: string;
  }) => call<Commit>("pdm_restore_commit", args),
  mergeBranches: (args: {
    projectId: string;
    sourceBranchId: string;
    targetBranchId: string;
    authorId: string;
    authorName: string;
    message: string;
  }) => call<MergeResult>("pdm_merge_branches", args),
  acquireLock: (args: {
    projectId: string;
    documentId: string;
    ownerId: string;
    ownerName: string;
    lockKind: string;
  }) => call<WorkspaceLock>("pdm_acquire_lock", args),
  releaseLock: (projectId: string, documentId: string, ownerId: string) =>
    call<boolean>("pdm_release_lock", { projectId, documentId, ownerId }),
  listLocks: (projectId: string) =>
    call<WorkspaceLock[]>("pdm_list_locks", { projectId }),
  requestOwnershipTransfer: (args: {
    projectId: string;
    documentId: string;
    fromOwnerId: string;
    toOwnerId: string;
    toOwnerName: string;
  }) => call<OwnershipTransfer>("pdm_request_ownership_transfer", args),
  resolveOwnershipTransfer: (transferId: string, accept: boolean) =>
    call<OwnershipTransfer>("pdm_resolve_ownership_transfer", {
      transferId,
      accept,
    }),
  listOwnershipTransfers: (projectId: string) =>
    call<OwnershipTransfer[]>("pdm_list_ownership_transfers", { projectId }),
  getReleaseConfig: (projectId: string) =>
    call<ReleaseConfig | null>("pdm_get_release_config", { projectId }),
  setupReleaseManagement: (args: {
    projectId: string;
    name: string;
    requireApprovals: boolean;
    minApprovals: number;
    allowSelfApprove: boolean;
    autoObsoletePrevious: boolean;
  }) => call<ReleaseConfig>("pdm_setup_release_management", args),
  addApprover: (args: {
    releaseConfigId: string;
    userId: string;
    userName: string;
    role: string;
  }) => call<ReleaseApprover>("pdm_add_approver", args),
  listApprovers: (releaseConfigId: string) =>
    call<ReleaseApprover[]>("pdm_list_approvers", { releaseConfigId }),
  removeApprover: (approverId: string) =>
    call<boolean>("pdm_remove_approver", { approverId }),
  createReleaseCandidate: (args: {
    projectId: string;
    commitId: string;
    name: string;
    revision: string;
    configuration: string;
    createdBy: string;
    notes: string;
    parts: [string, string, string | null][];
  }) => call<ReleaseCandidate>("pdm_create_release_candidate", args),
  listReleaseCandidates: (projectId: string) =>
    call<ReleaseCandidate[]>("pdm_list_release_candidates", { projectId }),
  listCandidateParts: (candidateId: string) =>
    call<ReleaseCandidatePart[]>("pdm_list_candidate_parts", { candidateId }),
  reviewCandidate: (args: {
    candidateId: string;
    reviewerId: string;
    reviewerName: string;
    decision: string;
    comment: string;
  }) => call<ReleaseCandidate>("pdm_review_candidate", args),
  releaseCandidate: (candidateId: string) =>
    call<ReleaseCandidate>("pdm_release_candidate", { candidateId }),
  obsoleteCandidate: (candidateId: string) =>
    call<ReleaseCandidate>("pdm_obsolete_candidate", { candidateId }),
  cloneReleasePackage: (args: {
    candidateId: string;
    name: string;
    createdBy: string;
    clonedFromId?: string | null;
  }) => call<ReleasePackage>("pdm_clone_release_package", args),
  listReleasePackages: (projectId: string) =>
    call<ReleasePackage[]>("pdm_list_release_packages", { projectId }),
  listReviews: (candidateId: string) =>
    call<ReleaseReview[]>("pdm_list_reviews", { candidateId }),
};
