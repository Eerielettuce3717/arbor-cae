import { useCallback, useEffect, useMemo, useState } from "react";
import {
  type Commit,
  type ReleaseApprover,
  type ReleaseCandidate,
  type ReleaseCandidatePart,
  type ReleaseConfig,
  type ReleasePackage,
  type ReleaseReview,
  isTauriRuntime,
  pdm,
} from "../../lib/pdmApi";

const PART_CATALOG = [
  { id: "d-1", name: "Bracket Plate", partNumber: "BRK-001" },
  { id: "d-2", name: "Drive Assembly", partNumber: "ASM-DRV-010" },
  { id: "d-4", name: "Shaft Collar", partNumber: "COL-004" },
  { id: "d-5", name: "PCB Frame", partNumber: "FRM-PCB-02" },
];

type PanelTab =
  | "setup"
  | "workflow"
  | "candidates"
  | "packages"
  | "history";

export interface ReleaseManagementProps {
  projectId: string | null;
  currentUserId?: string;
  currentUserName?: string;
  onProjectReady?: (projectId: string) => void;
}

export function ReleaseManagement({
  projectId,
  currentUserId = "local-user",
  currentUserName = "You",
  onProjectReady,
}: ReleaseManagementProps) {
  const [tab, setTab] = useState<PanelTab>("workflow");
  const [config, setConfig] = useState<ReleaseConfig | null>(null);
  const [approvers, setApprovers] = useState<ReleaseApprover[]>([]);
  const [candidates, setCandidates] = useState<ReleaseCandidate[]>([]);
  const [packages, setPackages] = useState<ReleasePackage[]>([]);
  const [commits, setCommits] = useState<Commit[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [parts, setParts] = useState<ReleaseCandidatePart[]>([]);
  const [reviews, setReviews] = useState<ReleaseReview[]>([]);
  const [selectedParts, setSelectedParts] = useState<string[]>(["d-1", "d-2"]);
  const [offline, setOffline] = useState(!isTauriRuntime());
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");

  // Setup form
  const [processName, setProcessName] = useState("Default Release Process");
  const [requireApprovals, setRequireApprovals] = useState(true);
  const [minApprovals, setMinApprovals] = useState(1);
  const [allowSelf, setAllowSelf] = useState(false);
  const [autoObsolete, setAutoObsolete] = useState(true);
  const [approverName, setApproverName] = useState("");
  const [approverId, setApproverId] = useState("");

  // New candidate form
  const [rcName, setRcName] = useState("Release Candidate");
  const [revision, setRevision] = useState("A");
  const [configuration, setConfiguration] = useState("production");
  const [commitId, setCommitId] = useState("");
  const [notes, setNotes] = useState("");
  const [reviewComment, setReviewComment] = useState("");

  const load = useCallback(async () => {
    setError("");
    if (!isTauriRuntime()) {
      setOffline(true);
      setCandidates([]);
      setSelectedId(null);
      setConfig(null);
      setApprovers([]);
      setPackages([]);
      setCommits([]);
      setStatus("Open via `npm run tauri` to connect release management");
      return;
    }

    try {
      setOffline(false);
      let pid = projectId;
      if (!pid) {
        const projects = await pdm.listProjects();
        if (projects.length === 0) {
          const created = await pdm.createProject({
            name: "Local Workspace",
            description: "Default PDM project",
            rootPath: ".",
            ownerId: currentUserId,
          });
          pid = created.id;
        } else {
          pid = projects[0].id;
        }
        onProjectReady?.(pid);
      }

      const [cfg, list, pkgs, cms] = await Promise.all([
        pdm.getReleaseConfig(pid),
        pdm.listReleaseCandidates(pid),
        pdm.listReleasePackages(pid),
        pdm.listCommits(pid),
      ]);
      setConfig(cfg);
      if (cfg) {
        setProcessName(cfg.name);
        setRequireApprovals(cfg.requireApprovals);
        setMinApprovals(cfg.minApprovals);
        setAllowSelf(cfg.allowSelfApprove);
        setAutoObsolete(cfg.autoObsoletePrevious);
        setApprovers(await pdm.listApprovers(cfg.id));
      }
      setCandidates(list);
      setPackages(pkgs);
      setCommits(cms);
      setCommitId((prev) => prev || cms[0]?.id || "");
      setSelectedId((prev) => prev || list[0]?.id || null);
      setStatus("Release management connected to .cad_db");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setOffline(true);
      setCandidates([]);
      setSelectedId(null);
    }
  }, [projectId, currentUserId, onProjectReady]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!selectedId || offline) {
      setParts(
        PART_CATALOG.filter((p) => selectedParts.includes(p.id)).map((p) => ({
          id: p.id,
          releaseCandidateId: selectedId ?? "",
          documentId: p.id,
          documentName: p.name,
          partNumber: p.partNumber,
        })),
      );
      setReviews([]);
      return;
    }
    void (async () => {
      try {
        setParts(await pdm.listCandidateParts(selectedId));
        setReviews(await pdm.listReviews(selectedId));
      } catch {
        /* ignore */
      }
    })();
  }, [selectedId, offline, selectedParts]);

  const selected = useMemo(
    () => candidates.find((c) => c.id === selectedId) ?? null,
    [candidates, selectedId],
  );

  async function saveSetup() {
    if (offline) return;
    try {
      let pid = projectId;
      if (!pid) {
        const projects = await pdm.listProjects();
        pid = projects[0]?.id;
        if (!pid) throw new Error("No project loaded");
      }
      const cfg = await pdm.setupReleaseManagement({
        projectId: pid,
        name: processName,
        requireApprovals,
        minApprovals,
        allowSelfApprove: allowSelf,
        autoObsoletePrevious: autoObsolete,
      });
      setConfig(cfg);
      setStatus("Release process saved");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  async function addApprover() {
    if (!config || !approverId.trim() || !approverName.trim() || offline) return;
    try {
      await pdm.addApprover({
        releaseConfigId: config.id,
        userId: approverId.trim(),
        userName: approverName.trim(),
        role: "approver",
      });
      setApproverId("");
      setApproverName("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  async function createCandidate() {
    if (offline) return;
    try {
      let pid = projectId;
      if (!pid) {
        const projects = await pdm.listProjects();
        pid = projects[0]?.id;
        if (!pid) throw new Error("No project loaded");
      }
      const partTuples: [string, string, string | null][] = PART_CATALOG.filter(
        (p) => selectedParts.includes(p.id),
      ).map((p) => [p.id, p.name, p.partNumber]);
      const created = await pdm.createReleaseCandidate({
        projectId: pid,
        commitId: commitId || commits[0]?.id || "",
        name: rcName,
        revision,
        configuration,
        createdBy: currentUserId,
        notes,
        parts: partTuples,
      });
      setSelectedId(created.id);
      setTab("candidates");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  async function review(decision: "approved" | "rejected") {
    if (!selected || offline) return;
    try {
      await pdm.reviewCandidate({
        candidateId: selected.id,
        reviewerId: currentUserId,
        reviewerName: currentUserName,
        decision,
        comment: reviewComment,
      });
      setReviewComment("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  async function doRelease() {
    if (!selected || offline) return;
    try {
      await pdm.releaseCandidate(selected.id);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  async function doObsolete() {
    if (!selected || offline) return;
    try {
      await pdm.obsoleteCandidate(selected.id);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  async function clonePackage() {
    if (!selected || offline) return;
    try {
      await pdm.cloneReleasePackage({
        candidateId: selected.id,
        name: `${selected.name} package`,
        createdBy: currentUserId,
      });
      setTab("packages");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  function togglePart(id: string) {
    setSelectedParts((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id],
    );
  }

  const tabs: { id: PanelTab; label: string }[] = [
    { id: "setup", label: "Setup" },
    { id: "workflow", label: "Workflow" },
    { id: "candidates", label: "Candidates" },
    { id: "packages", label: "Packages" },
    { id: "history", label: "History" },
  ];

  return (
    <div className="flex h-full min-h-0 flex-col bg-background text-foreground">
      <header className="flex flex-wrap items-center gap-3 border-b border-border bg-card px-4 py-3">
        <div>
          <h1 className="text-base font-semibold tracking-tight">
            Release Management
          </h1>
          <p className="text-xs text-muted-foreground">
            Approvers, candidates, packages, and configuration releases
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2 text-[11px] text-muted-foreground">
          {offline && (
            <span className="rounded border border-amber-700/60 bg-amber-950/40 px-2 py-0.5 text-amber-300">
              Offline demo
            </span>
          )}
          <span className="font-mono text-faint">{status}</span>
        </div>
      </header>

      <div className="flex gap-1 border-b border-border bg-muted/50 px-3 py-1.5">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`rounded px-3 py-1.5 text-xs font-medium ${
              tab === t.id
                ? "bg-active text-accent"
                : "text-muted-foreground hover:bg-hover hover:text-accent"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="border-b border-rose-900/50 bg-rose-950/40 px-4 py-2 text-xs text-rose-300">
          {error}
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-auto p-4">
        {tab === "setup" && (
          <div className="mx-auto grid max-w-3xl gap-6">
            <section className="space-y-3">
              <h2 className="text-sm font-semibold">Setting up release management</h2>
              <p className="text-xs text-muted-foreground">
                Define the release process for this project: approval rules and
                whether releasing a configuration obsoletes the previous release.
              </p>
              <label className="block text-xs text-muted-foreground">
                Process name
                <input
                  value={processName}
                  onChange={(e) => setProcessName(e.target.value)}
                  className="mt-1 w-full rounded border border-border bg-muted px-3 py-2 text-sm text-foreground"
                />
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={requireApprovals}
                  onChange={(e) => setRequireApprovals(e.target.checked)}
                />
                Require approvals
              </label>
              <label className="block text-xs text-muted-foreground">
                Minimum approvals
                <input
                  type="number"
                  min={1}
                  value={minApprovals}
                  onChange={(e) => setMinApprovals(Number(e.target.value) || 1)}
                  className="mt-1 w-24 rounded border border-border bg-muted px-2 py-1.5 text-sm"
                />
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={allowSelf}
                  onChange={(e) => setAllowSelf(e.target.checked)}
                />
                Allow self-approve
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={autoObsolete}
                  onChange={(e) => setAutoObsolete(e.target.checked)}
                />
                Auto-obsolete previous release of same configuration
              </label>
              <button
                type="button"
                disabled={offline}
                onClick={() => void saveSetup()}
                className="rounded bg-accent px-3 py-2 text-sm font-medium text-accent-foreground disabled:opacity-40"
              >
                Save process
              </button>
            </section>

            <section className="space-y-3 border-t border-border pt-4">
              <h2 className="text-sm font-semibold">Specifying approvers</h2>
              <ul className="space-y-1">
                {approvers.map((a) => (
                  <li
                    key={a.id}
                    className="flex items-center justify-between rounded border border-border bg-muted/40 px-3 py-2 text-sm"
                  >
                    <span>
                      {a.userName}{" "}
                      <span className="font-mono text-[11px] text-faint">
                        {a.userId}
                      </span>
                    </span>
                    {!offline && (
                      <button
                        type="button"
                        className="text-xs text-rose-400"
                        onClick={() =>
                          void pdm.removeApprover(a.id).then(load)
                        }
                      >
                        Remove
                      </button>
                    )}
                  </li>
                ))}
                {approvers.length === 0 && (
                  <li className="text-xs text-faint">No approvers yet</li>
                )}
              </ul>
              <div className="flex flex-wrap gap-2">
                <input
                  value={approverName}
                  onChange={(e) => setApproverName(e.target.value)}
                  placeholder="Display name"
                  className="rounded border border-border bg-muted px-2 py-1.5 text-sm"
                />
                <input
                  value={approverId}
                  onChange={(e) => setApproverId(e.target.value)}
                  placeholder="user-id"
                  className="rounded border border-border bg-muted px-2 py-1.5 font-mono text-sm"
                />
                <button
                  type="button"
                  disabled={offline}
                  onClick={() => void addApprover()}
                  className="rounded border border-border px-3 py-1.5 text-sm hover:border-accent disabled:opacity-40"
                >
                  Add approver
                </button>
              </div>
            </section>
          </div>
        )}

        {tab === "workflow" && (
          <div className="mx-auto grid max-w-4xl gap-6 lg:grid-cols-2">
            <section className="space-y-3">
              <h2 className="text-sm font-semibold">Typical release workflow</h2>
              <ol className="space-y-2 text-sm text-muted-foreground">
                {[
                  "Select a commit that represents the design state to release",
                  "Choose parts / documents included in the candidate",
                  "Submit candidate for review (status → in_review)",
                  "Approvers approve or reject with comments",
                  "When approvals met, release the candidate",
                  "Optionally clone a release package and obsolete prior revisions",
                ].map((step, i) => (
                  <li key={step} className="flex gap-2">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-accent/15 text-[10px] font-bold text-accent">
                      {i + 1}
                    </span>
                    {step}
                  </li>
                ))}
              </ol>
              <p className="text-xs text-faint">
                Process: {config?.name ?? "—"} · min approvals{" "}
                {config?.minApprovals ?? "—"}
              </p>
            </section>

            <section className="space-y-3 rounded-lg border border-border bg-card p-4">
              <h2 className="text-sm font-semibold">Create release candidate</h2>
              <label className="block text-xs text-muted-foreground">
                Name
                <input
                  value={rcName}
                  onChange={(e) => setRcName(e.target.value)}
                  className="mt-1 w-full rounded border border-border bg-muted px-2 py-1.5 text-sm"
                />
              </label>
              <div className="grid grid-cols-2 gap-2">
                <label className="block text-xs text-muted-foreground">
                  Revision
                  <input
                    value={revision}
                    onChange={(e) => setRevision(e.target.value)}
                    className="mt-1 w-full rounded border border-border bg-muted px-2 py-1.5 text-sm"
                  />
                </label>
                <label className="block text-xs text-muted-foreground">
                  Configuration
                  <input
                    value={configuration}
                    onChange={(e) => setConfiguration(e.target.value)}
                    className="mt-1 w-full rounded border border-border bg-muted px-2 py-1.5 text-sm"
                    placeholder="production"
                  />
                </label>
              </div>
              <label className="block text-xs text-muted-foreground">
                Source commit
                <select
                  value={commitId}
                  onChange={(e) => setCommitId(e.target.value)}
                  className="mt-1 w-full rounded border border-border bg-muted px-2 py-1.5 text-sm"
                >
                  {commits.length === 0 && <option value="">No commits</option>}
                  {commits.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.id.slice(0, 8)} — {c.message}
                    </option>
                  ))}
                </select>
              </label>

              <div>
                <h3 className="mb-1 text-xs font-semibold uppercase text-muted-foreground">
                  Selecting parts
                </h3>
                <ul className="space-y-1">
                  {PART_CATALOG.map((p) => (
                    <li key={p.id}>
                      <label className="flex items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-hover">
                        <input
                          type="checkbox"
                          checked={selectedParts.includes(p.id)}
                          onChange={() => togglePart(p.id)}
                        />
                        <span>{p.name}</span>
                        <span className="ml-auto font-mono text-[10px] text-faint">
                          {p.partNumber}
                        </span>
                      </label>
                    </li>
                  ))}
                </ul>
              </div>

              <label className="block text-xs text-muted-foreground">
                Notes
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  className="mt-1 w-full rounded border border-border bg-muted px-2 py-1.5 text-sm"
                />
              </label>
              <button
                type="button"
                disabled={offline || selectedParts.length === 0}
                onClick={() => void createCandidate()}
                className="w-full rounded bg-accent px-3 py-2 text-sm font-medium text-accent-foreground disabled:opacity-40"
              >
                Submit for review
              </button>
            </section>
          </div>
        )}

        {tab === "candidates" && (
          <div className="grid h-full min-h-[420px] gap-4 lg:grid-cols-[280px_1fr]">
            <ul className="space-y-1 overflow-auto rounded-lg border border-border bg-card p-2">
              {candidates.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(c.id)}
                    className={`w-full rounded px-2.5 py-2 text-left text-sm ${
                      selectedId === c.id
                        ? "bg-active text-accent"
                        : "text-muted-foreground hover:bg-hover"
                    }`}
                  >
                    <div className="font-medium text-foreground">{c.name}</div>
                    <div className="mt-0.5 flex gap-2 text-[10px] uppercase tracking-wide">
                      <StatusPill status={c.status} />
                      <span>Rev {c.revision}</span>
                      <span>{c.configuration}</span>
                    </div>
                  </button>
                </li>
              ))}
              {candidates.length === 0 && (
                <li className="p-3 text-xs text-faint">No candidates yet</li>
              )}
            </ul>

            {selected ? (
              <div className="space-y-4 rounded-lg border border-border bg-card p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-base font-semibold">{selected.name}</h2>
                    <p className="text-xs text-muted-foreground">
                      Rev {selected.revision} · {selected.configuration} · commit{" "}
                      <span className="font-mono">{selected.commitId.slice(0, 8)}</span>
                    </p>
                  </div>
                  <StatusPill status={selected.status} />
                </div>

                <div>
                  <h3 className="mb-1 text-[11px] font-semibold uppercase text-muted-foreground">
                    Parts in candidate
                  </h3>
                  <ul className="divide-y divide-border rounded border border-border">
                    {parts.map((p) => (
                      <li
                        key={p.id}
                        className="flex justify-between px-3 py-2 text-sm"
                      >
                        <span>{p.documentName}</span>
                        <span className="font-mono text-xs text-faint">
                          {p.partNumber ?? p.documentId}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h3 className="mb-1 text-[11px] font-semibold uppercase text-muted-foreground">
                    Review / approve / reject
                  </h3>
                  <textarea
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                    placeholder="Review comment"
                    rows={2}
                    className="mb-2 w-full rounded border border-border bg-muted px-2 py-1.5 text-sm"
                  />
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={offline}
                      onClick={() => void review("approved")}
                      className="rounded bg-emerald-700 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-40"
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      disabled={offline}
                      onClick={() => void review("rejected")}
                      className="rounded bg-rose-800 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-40"
                    >
                      Reject
                    </button>
                    <button
                      type="button"
                      disabled={offline}
                      onClick={() => void doRelease()}
                      className="rounded bg-accent px-3 py-1.5 text-xs font-medium text-accent-foreground disabled:opacity-40"
                    >
                      Release
                    </button>
                    <button
                      type="button"
                      disabled={offline}
                      onClick={() => void doObsolete()}
                      className="rounded border border-border px-3 py-1.5 text-xs disabled:opacity-40"
                    >
                      Obsolete
                    </button>
                    <button
                      type="button"
                      disabled={offline}
                      onClick={() => void clonePackage()}
                      className="rounded border border-border px-3 py-1.5 text-xs disabled:opacity-40"
                    >
                      Clone release package
                    </button>
                  </div>
                </div>

                {reviews.length > 0 && (
                  <div>
                    <h3 className="mb-1 text-[11px] font-semibold uppercase text-muted-foreground">
                      Review history
                    </h3>
                    <ul className="space-y-1 text-xs text-muted-foreground">
                      {reviews.map((r) => (
                        <li key={r.id} className="rounded bg-muted/40 px-2 py-1.5">
                          <span
                            className={
                              r.decision === "approved"
                                ? "text-emerald-400"
                                : "text-rose-400"
                            }
                          >
                            {r.decision}
                          </span>{" "}
                          by {r.reviewerName}
                          {r.comment ? ` — ${r.comment}` : ""}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-center rounded-lg border border-dashed border-border text-sm text-muted-foreground">
                Select a candidate
              </div>
            )}
          </div>
        )}

        {tab === "packages" && (
          <div className="mx-auto max-w-3xl space-y-3">
            <h2 className="text-sm font-semibold">Cloned release packages</h2>
            <p className="text-xs text-muted-foreground">
              Packages snapshot the candidate manifest (parts, revision,
              configuration) for handoff or archive.
            </p>
            {packages.length === 0 ? (
              <p className="text-sm text-faint">No packages yet</p>
            ) : (
              <ul className="space-y-2">
                {packages.map((p) => (
                  <li
                    key={p.id}
                    className="rounded-lg border border-border bg-card px-4 py-3"
                  >
                    <div className="font-medium">{p.name}</div>
                    <div className="mt-1 font-mono text-[11px] text-faint">
                      {p.id.slice(0, 8)} · from {p.sourceCandidateId.slice(0, 8)} ·{" "}
                      {new Date(p.createdAt).toLocaleString()}
                    </div>
                    <pre className="mt-2 overflow-auto rounded bg-muted/50 p-2 text-[10px] text-muted-foreground">
                      {JSON.stringify(p.manifestJson, null, 2)}
                    </pre>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {tab === "history" && (
          <div className="mx-auto max-w-3xl space-y-4">
            <h2 className="text-sm font-semibold">
              Viewing history and obsoleting parts
            </h2>
            <p className="text-xs text-muted-foreground">
              Released and obsolete candidates by configuration. Releasing a new
              revision of the same configuration can auto-obsolete the previous
              one.
            </p>
            <table className="w-full border-collapse text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-muted-foreground">
                <tr className="border-b border-border">
                  <th className="px-2 py-2 font-medium">Name</th>
                  <th className="px-2 py-2 font-medium">Rev</th>
                  <th className="px-2 py-2 font-medium">Config</th>
                  <th className="px-2 py-2 font-medium">Status</th>
                  <th className="px-2 py-2 font-medium">Released</th>
                </tr>
              </thead>
              <tbody>
                {candidates.map((c) => (
                  <tr key={c.id} className="border-b border-border/60">
                    <td className="px-2 py-2">{c.name}</td>
                    <td className="px-2 py-2 font-mono text-xs">{c.revision}</td>
                    <td className="px-2 py-2 text-muted-foreground">{c.configuration}</td>
                    <td className="px-2 py-2">
                      <StatusPill status={c.status} />
                    </td>
                    <td className="px-2 py-2 font-mono text-[11px] text-faint">
                      {c.releasedAt
                        ? new Date(c.releasedAt).toLocaleDateString()
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <section className="rounded-lg border border-border bg-card p-4">
              <h3 className="text-sm font-semibold">Releasing configurations</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Each candidate carries a{" "}
                <span className="font-mono text-accent">configuration</span>{" "}
                label (e.g. production, prototype). Use the Candidates tab to
                approve and release; history above tracks which configuration
                revisions are live vs obsolete.
              </p>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const tone =
    status === "released"
      ? "border-emerald-700/50 bg-emerald-950/40 text-emerald-300"
      : status === "approved"
        ? "border-accent/50 bg-accent/10 text-accent"
        : status === "rejected" || status === "obsolete"
          ? "border-rose-800/50 bg-rose-950/30 text-rose-300"
          : "border-amber-700/50 bg-amber-950/30 text-amber-300";
  return (
    <span className={`rounded border px-1.5 py-0.5 text-[10px] uppercase ${tone}`}>
      {status.replace("_", " ")}
    </span>
  );
}

export default ReleaseManagement;
