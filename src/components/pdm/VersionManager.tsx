import { useCallback, useEffect, useMemo, useState } from "react";
import {
  type Branch,
  type BranchGraph,
  type CommitDiff,
  type OwnershipTransfer,
  type WorkspaceLock,
  isTauriRuntime,
  mockBranchGraph,
  pdm,
} from "../../lib/pdmApi";

const BRANCH_COLORS = ["#e85d04", "#8b949e", "#f3eee6", "#2c3642", "#64748b"];

export interface VersionManagerProps {
  projectId: string | null;
  currentUserId?: string;
  currentUserName?: string;
  onProjectReady?: (projectId: string) => void;
}

export function VersionManager({
  projectId,
  currentUserId = "local-user",
  currentUserName = "You",
  onProjectReady,
}: VersionManagerProps) {
  const [graph, setGraph] = useState<BranchGraph | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [compareLeft, setCompareLeft] = useState<string | null>(null);
  const [diff, setDiff] = useState<CommitDiff | null>(null);
  const [locks, setLocks] = useState<WorkspaceLock[]>([]);
  const [transfers, setTransfers] = useState<OwnershipTransfer[]>([]);
  const [status, setStatus] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [branchName, setBranchName] = useState("");
  const [commitMessage, setCommitMessage] = useState("");
  const [mergeSource, setMergeSource] = useState("");
  const [offline, setOffline] = useState(!isTauriRuntime());

  const load = useCallback(async () => {
    setError("");
    try {
      if (!isTauriRuntime()) {
        setOffline(true);
        setGraph(mockBranchGraph());
        setStatus("Demo graph · open via `npm run tauri` for live .cad_db");
        return;
      }
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
          onProjectReady?.(pid);
        } else {
          pid = projects[0].id;
          onProjectReady?.(pid);
        }
      }
      const [g, l, t] = await Promise.all([
        pdm.getBranchGraph(pid),
        pdm.listLocks(pid),
        pdm.listOwnershipTransfers(pid),
      ]);
      setGraph(g);
      setLocks(l);
      setTransfers(t);
      const path = await pdm.dbPath();
      setStatus(`.cad_db · ${path}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setGraph(mockBranchGraph());
      setOffline(true);
    }
  }, [projectId, currentUserId, onProjectReady]);

  useEffect(() => {
    void load();
  }, [load]);

  const selected = useMemo(
    () => graph?.nodes.find((n) => n.commit.id === selectedId)?.commit ?? null,
    [graph, selectedId],
  );

  const defaultBranch = graph?.branches.find((b) => b.isDefault) ?? graph?.branches[0];

  async function ensureProject(): Promise<string> {
    if (projectId) return projectId;
    throw new Error("No project loaded");
  }

  async function handleCreateBranch() {
    if (!branchName.trim() || !graph) return;
    try {
      const pid = await ensureProject();
      await pdm.createBranch({
        projectId: pid,
        name: branchName.trim(),
        fromCommitId: selected?.id ?? defaultBranch?.headCommitId,
        protect: false,
      });
      setBranchName("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  async function handleCommit() {
    if (!commitMessage.trim() || !defaultBranch) return;
    try {
      const pid = await ensureProject();
      await pdm.createCommit({
        projectId: pid,
        branchId: defaultBranch.id,
        message: commitMessage.trim(),
        authorId: currentUserId,
        authorName: currentUserName,
        documentId: "workspace",
        featureTree: {
          features: [
            { id: "ex1", type: "extrude", depth: 12 },
            { id: "fil1", type: "fillet", radius: 1.5 },
          ],
          savedAt: new Date().toISOString(),
        },
      });
      setCommitMessage("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  async function handleCompare(rightId: string) {
    if (!compareLeft) {
      setCompareLeft(rightId);
      setDiff(null);
      return;
    }
    try {
      if (offline) {
        setDiff({
          leftCommitId: compareLeft,
          rightCommitId: rightId,
          leftTree: {},
          rightTree: {},
          addedKeys: ["features[1]"],
          removedKeys: [],
          changedKeys: ["features[0].depth"],
        });
      } else {
        setDiff(await pdm.compareCommits(compareLeft, rightId));
      }
      setCompareLeft(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  async function handleRestore() {
    if (!selected || !defaultBranch) return;
    try {
      await pdm.restoreCommit({
        branchId: defaultBranch.id,
        commitId: selected.id,
        authorId: currentUserId,
        authorName: currentUserName,
      });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  async function handleRepair() {
    if (!selected) return;
    try {
      await pdm.repairCommit(
        selected.id,
        {
          features: [{ id: "repaired", type: "extrude", depth: 10 }],
          note: "auto-repair stub",
        },
        currentUserId,
      );
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  async function handleMerge() {
    if (!mergeSource || !defaultBranch) return;
    try {
      const pid = await ensureProject();
      const result = await pdm.mergeBranches({
        projectId: pid,
        sourceBranchId: mergeSource,
        targetBranchId: defaultBranch.id,
        authorId: currentUserId,
        authorName: currentUserName,
        message: `Merge into ${defaultBranch.name}`,
      });
      setStatus(
        result.autoMerged
          ? "Merge completed without conflicts"
          : `Merge with ${result.conflicts.length} conflict(s)`,
      );
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  async function handleLock() {
    try {
      const pid = await ensureProject();
      await pdm.acquireLock({
        projectId: pid,
        documentId: "d-2",
        ownerId: currentUserId,
        ownerName: currentUserName,
        lockKind: "exclusive",
      });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  async function handleTransfer() {
    try {
      const pid = await ensureProject();
      await pdm.requestOwnershipTransfer({
        projectId: pid,
        documentId: "d-2",
        fromOwnerId: currentUserId,
        toOwnerId: "u-chen",
        toOwnerName: "A. Chen",
      });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  async function toggleProtection(branch: Branch) {
    try {
      await pdm.setBranchProtection(branch.id, !branch.isProtected);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-background text-foreground">
      <header className="flex flex-wrap items-center gap-3 border-b border-border bg-card px-4 py-3">
        <div>
          <h1 className="text-base font-semibold tracking-tight">Version Manager</h1>
          <p className="text-xs text-muted-foreground">
            Branches, history, compare / repair / merge / restore
          </p>
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
          {offline && (
            <span className="rounded border border-amber-700/60 bg-amber-950/40 px-2 py-0.5 text-amber-300">
              Offline demo
            </span>
          )}
          <span className="font-mono text-faint">{status}</span>
          <button
            type="button"
            onClick={() => void load()}
            className="rounded border border-border px-2 py-1 hover:border-accent hover:text-accent"
          >
            Refresh
          </button>
        </div>
      </header>

      {error && (
        <div className="border-b border-rose-900/50 bg-rose-950/40 px-4 py-2 text-xs text-rose-300">
          {error}
        </div>
      )}

      <div className="flex min-h-0 flex-1">
        <aside className="flex w-72 shrink-0 flex-col border-r border-border bg-card">
          <section className="border-b border-border p-3">
            <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Branches
            </h2>
            <ul className="space-y-1">
              {graph?.branches.map((b, i) => (
                <li
                  key={b.id}
                  className="flex items-center justify-between rounded px-2 py-1.5 text-sm hover:bg-hover"
                >
                  <span className="flex items-center gap-2">
                    <span
                      className="inline-block h-2.5 w-2.5 rounded-full"
                      style={{ background: BRANCH_COLORS[i % BRANCH_COLORS.length] }}
                    />
                    <span className="font-medium">{b.name}</span>
                    {b.isProtected && (
                      <span className="text-[10px] text-amber-400" title="Protected">
                        🔒
                      </span>
                    )}
                  </span>
                  {!offline && (
                    <button
                      type="button"
                      onClick={() => void toggleProtection(b)}
                      className="text-[10px] text-faint hover:text-accent"
                    >
                      {b.isProtected ? "Unprotect" : "Protect"}
                    </button>
                  )}
                </li>
              ))}
            </ul>
            <div className="mt-2 flex gap-1">
              <input
                value={branchName}
                onChange={(e) => setBranchName(e.target.value)}
                placeholder="new-branch"
                className="min-w-0 flex-1 rounded border border-border bg-muted px-2 py-1 text-xs"
              />
              <button
                type="button"
                disabled={offline}
                onClick={() => void handleCreateBranch()}
                className="rounded bg-accent px-2 py-1 text-xs text-accent-foreground disabled:opacity-40"
              >
                Create
              </button>
            </div>
          </section>

          <section className="border-b border-border p-3">
            <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Commit
            </h2>
            <input
              value={commitMessage}
              onChange={(e) => setCommitMessage(e.target.value)}
              placeholder="Commit message"
              className="mb-2 w-full rounded border border-border bg-muted px-2 py-1.5 text-xs"
            />
            <button
              type="button"
              disabled={offline}
              onClick={() => void handleCommit()}
              className="w-full rounded bg-accent px-2 py-1.5 text-xs font-medium text-accent-foreground disabled:opacity-40"
            >
              Save revision
            </button>
          </section>

          <section className="border-b border-border p-3">
            <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Merge into main
            </h2>
            <select
              value={mergeSource}
              onChange={(e) => setMergeSource(e.target.value)}
              className="mb-2 w-full rounded border border-border bg-muted px-2 py-1.5 text-xs"
            >
              <option value="">Source branch…</option>
              {graph?.branches
                .filter((b) => !b.isDefault)
                .map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
            </select>
            <button
              type="button"
              disabled={offline || !mergeSource}
              onClick={() => void handleMerge()}
              className="w-full rounded border border-border px-2 py-1.5 text-xs hover:border-accent hover:text-accent disabled:opacity-40"
            >
              Merge
            </button>
          </section>

          <section className="min-h-0 flex-1 overflow-y-auto p-3">
            <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Workspace protections
            </h2>
            <div className="mb-2 flex flex-wrap gap-1">
              <button
                type="button"
                disabled={offline}
                onClick={() => void handleLock()}
                className="rounded border border-border px-2 py-1 text-[11px] hover:border-accent disabled:opacity-40"
              >
                Lock Drive Assembly
              </button>
              <button
                type="button"
                disabled={offline}
                onClick={() => void handleTransfer()}
                className="rounded border border-border px-2 py-1 text-[11px] hover:border-accent disabled:opacity-40"
              >
                Transfer ownership
              </button>
            </div>
            <ul className="space-y-1 text-xs text-muted-foreground">
              {locks.map((l) => (
                <li key={l.id} className="rounded bg-muted/50 px-2 py-1">
                  {l.documentId} · {l.ownerName} ({l.lockKind})
                </li>
              ))}
              {locks.length === 0 && <li className="text-faint">No active locks</li>}
            </ul>
            {transfers.length > 0 && (
              <div className="mt-3">
                <h3 className="mb-1 text-[10px] uppercase text-faint">Transfers</h3>
                {transfers.slice(0, 5).map((t) => (
                  <div
                    key={t.id}
                    className="mb-1 flex items-center justify-between rounded bg-muted/40 px-2 py-1 text-[11px]"
                  >
                    <span>
                      {t.documentId} → {t.toOwnerName} · {t.status}
                    </span>
                    {t.status === "pending" && !offline && (
                      <span className="flex gap-1">
                        <button
                          type="button"
                          className="text-emerald-400"
                          onClick={() =>
                            void pdm.resolveOwnershipTransfer(t.id, true).then(load)
                          }
                        >
                          Accept
                        </button>
                        <button
                          type="button"
                          className="text-rose-400"
                          onClick={() =>
                            void pdm.resolveOwnershipTransfer(t.id, false).then(load)
                          }
                        >
                          Reject
                        </button>
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        </aside>

        <main className="flex min-w-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 overflow-auto p-4">
            {graph ? (
              <BranchGraphView
                graph={graph}
                selectedId={selectedId}
                compareLeft={compareLeft}
                onSelect={setSelectedId}
                onCompareClick={(id) => void handleCompare(id)}
              />
            ) : (
              <p className="text-sm text-muted-foreground">Loading graph…</p>
            )}
          </div>

          <footer className="border-t border-border bg-card px-4 py-3">
            {selected ? (
              <div className="flex flex-wrap items-start gap-4">
                <div className="min-w-0 flex-1">
                  <p className="font-mono text-[11px] text-faint">
                    {selected.id.slice(0, 8)} · {selected.authorName} ·{" "}
                    {new Date(selected.createdAt).toLocaleString()}
                  </p>
                  <p className="text-sm font-medium">{selected.message}</p>
                  {selected.isRepaired && (
                    <p className="text-xs text-amber-400">Repaired revision</p>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void handleCompare(selected.id)}
                    className="rounded border border-border px-2.5 py-1.5 text-xs hover:border-accent hover:text-accent"
                  >
                    {compareLeft ? "Compare with selection" : "Mark for compare"}
                  </button>
                  <button
                    type="button"
                    disabled={offline}
                    onClick={() => void handleRestore()}
                    className="rounded border border-border px-2.5 py-1.5 text-xs hover:border-accent disabled:opacity-40"
                  >
                    Restore
                  </button>
                  <button
                    type="button"
                    disabled={offline}
                    onClick={() => void handleRepair()}
                    className="rounded border border-border px-2.5 py-1.5 text-xs hover:border-accent disabled:opacity-40"
                  >
                    Repair
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                Select a commit node. Click “Mark for compare” twice to diff trees.
              </p>
            )}
            {diff && (
              <div className="mt-3 grid gap-2 rounded border border-border bg-muted/40 p-3 text-xs md:grid-cols-3">
                <DiffCol title="Added" items={diff.addedKeys} tone="emerald" />
                <DiffCol title="Removed" items={diff.removedKeys} tone="rose" />
                <DiffCol title="Changed" items={diff.changedKeys} tone="amber" />
              </div>
            )}
          </footer>
        </main>
      </div>
    </div>
  );
}

function DiffCol({
  title,
  items,
  tone,
}: {
  title: string;
  items: string[];
  tone: "emerald" | "rose" | "amber";
}) {
  const color =
    tone === "emerald"
      ? "text-emerald-300"
      : tone === "rose"
        ? "text-rose-300"
        : "text-amber-300";
  return (
    <div>
      <h3 className={`mb-1 font-semibold ${color}`}>{title}</h3>
      {items.length === 0 ? (
        <p className="text-faint">—</p>
      ) : (
        <ul className="space-y-0.5 font-mono text-muted-foreground">
          {items.map((k) => (
            <li key={k}>{k || "(root)"}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

function BranchGraphView({
  graph,
  selectedId,
  compareLeft,
  onSelect,
  onCompareClick,
}: {
  graph: BranchGraph;
  selectedId: string | null;
  compareLeft: string | null;
  onSelect: (id: string) => void;
  onCompareClick: (id: string) => void;
}) {
  const rowH = 56;
  const colW = 28;
  const leftPad = 36;
  const topPad = 24;
  const nodesNewestFirst = [...graph.nodes].reverse();
  const positions = new Map<string, { x: number; y: number; column: number }>();
  nodesNewestFirst.forEach((n, row) => {
    positions.set(n.commit.id, {
      x: leftPad + n.column * colW,
      y: topPad + row * rowH,
      column: n.column,
    });
  });

  const width = Math.max(320, leftPad + graph.branches.length * colW + 420);
  const height = topPad + nodesNewestFirst.length * rowH + 24;

  return (
    <div className="overflow-auto rounded-lg border border-border bg-background">
      <svg width={width} height={height} className="block min-w-full">
        {graph.edges.map((e) => {
          const from = positions.get(e.fromId);
          const to = positions.get(e.toId);
          if (!from || !to) return null;
          const midY = (from.y + to.y) / 2;
          const path =
            from.x === to.x
              ? `M ${from.x} ${from.y} L ${to.x} ${to.y}`
              : `M ${from.x} ${from.y} C ${from.x} ${midY}, ${to.x} ${midY}, ${to.x} ${to.y}`;
          return (
            <path
              key={`${e.fromId}-${e.toId}-${e.kind}`}
              d={path}
              fill="none"
              stroke={e.kind === "merge" ? "#f472b6" : "#475569"}
              strokeWidth={e.kind === "merge" ? 2 : 1.5}
              strokeDasharray={e.kind === "merge" ? "4 3" : undefined}
            />
          );
        })}

        {nodesNewestFirst.map((n) => {
          const pos = positions.get(n.commit.id)!;
          const color = BRANCH_COLORS[n.column % BRANCH_COLORS.length];
          const selected = n.commit.id === selectedId;
          const marked = n.commit.id === compareLeft;
          return (
            <g key={n.commit.id}>
              <circle
                cx={pos.x}
                cy={pos.y}
                r={selected ? 7 : 5.5}
                fill={color}
                stroke={marked ? "#fbbf24" : selected ? "#e2e8f0" : "#0f172a"}
                strokeWidth={marked || selected ? 2 : 1}
                className="cursor-pointer"
                onClick={() => onSelect(n.commit.id)}
                onDoubleClick={() => onCompareClick(n.commit.id)}
              />
              <text
                x={leftPad + Math.max(graph.branches.length, 1) * colW + 16}
                y={pos.y + 4}
                className="cursor-pointer fill-slate-300 text-[12px]"
                onClick={() => onSelect(n.commit.id)}
              >
                <tspan className="fill-slate-500" style={{ fontFamily: "ui-monospace, monospace" }}>
                  {n.commit.id.slice(0, 7)}
                </tspan>
                {"  "}
                {n.commit.message}
                <tspan className="fill-slate-500"> · {n.branchName}</tspan>
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export default VersionManager;
