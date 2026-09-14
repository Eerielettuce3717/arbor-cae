import { useMemo, useState } from "react";
import { Plus, Star } from "lucide-react";
import {
  useCatalogStore,
  type WorkspaceRecord,
} from "../../store/catalogStore";
import { formatModified } from "./format";

export type DashFilter = "recent" | "mine" | "shared" | "trash";

const FILTERS: { id: DashFilter; label: string; hint: string }[] = [
  { id: "recent", label: "Recently Opened", hint: "By last opened" },
  { id: "mine", label: "Created by Me", hint: "Owner is you" },
  { id: "shared", label: "Shared with Me", hint: "From other owners" },
  { id: "trash", label: "Trash", hint: "Removed workspaces" },
];

export interface DashboardProps {
  onOpenWorkspace: (workspaceId: string) => void;
  listed?: boolean;
}

export function Dashboard({ onOpenWorkspace, listed = true }: DashboardProps) {
  const workspaces = useCatalogStore((s) => s.workspaces);
  const documents = useCatalogStore((s) => s.documents);
  const imports = useCatalogStore((s) => s.imports);
  const source = useCatalogStore((s) => s.source);
  const loadSample = useCatalogStore((s) => s.loadSample);
  const createWorkspace = useCatalogStore((s) => s.createWorkspace);
  const toggleStar = useCatalogStore((s) => s.toggleStar);
  const restoreWorkspace = useCatalogStore((s) => s.restoreWorkspace);
  const [filter, setFilter] = useState<DashFilter>("recent");

  const visible = useMemo(
    () => workspaces.filter((w) => matchesFilter(w, filter)),
    [workspaces, filter],
  );

  const starred = visible
    .filter((w) => w.starred && !w.trashed)
    .sort((a, b) => b.lastOpenedAt.localeCompare(a.lastOpenedAt));

  const recent = [...visible]
    .filter((w) => !w.trashed || filter === "trash")
    .sort((a, b) =>
      filter === "trash"
        ? b.modifiedAt.localeCompare(a.modifiedAt)
        : b.lastOpenedAt.localeCompare(a.lastOpenedAt),
    );

  const visibleImports = imports.filter((item) => {
    if (filter === "trash") return false;
    if (filter === "mine") return item.owner === "You";
    if (filter === "shared") return item.owner !== "You";
    return true;
  });

  function onCreate() {
    const ws = createWorkspace();
    onOpenWorkspace(ws.id);
  }

  function open(id: string) {
    onOpenWorkspace(id);
  }

  return (
    <div
      data-explorer={listed ? "workspaces-page" : undefined}
      className="flex h-full min-h-0 bg-background text-foreground"
    >
      <aside className="flex w-52 shrink-0 flex-col border-r border-border bg-card">
        <div className="border-b border-border px-4 py-4">
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-accent">
            DWG AR-DASH · LOCAL
          </p>
          <h1 className="mt-2 font-display text-lg font-medium tracking-tight">
            Workspaces
          </h1>
          <button
            type="button"
            onClick={onCreate}
            className="mt-4 inline-flex min-h-10 w-full items-center justify-center gap-2 bg-accent px-3 font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-accent-foreground hover:bg-accent/90"
          >
            <Plus className="h-3.5 w-3.5" strokeWidth={2} />
            Create Workspace
          </button>
        </div>
        <nav aria-label="Workspace filters" className="flex flex-col p-2">
          {FILTERS.map((item) => {
            const active = filter === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setFilter(item.id)}
                className={`flex flex-col items-start rounded-sm px-3 py-2 text-left ${
                  active
                    ? "bg-active text-accent"
                    : "text-muted-foreground hover:bg-hover hover:text-accent"
                }`}
              >
                <span className="text-sm font-medium">{item.label}</span>
                <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-faint">
                  {item.hint}
                </span>
              </button>
            );
          })}
        </nav>
        <div className="mt-auto border-t border-border px-4 py-3">
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-faint">
            {source === "sample"
              ? "Catalog · sample"
              : source === "pdm"
                ? "Catalog · PDM"
                : "Catalog · empty"}
          </p>
        </div>
      </aside>

      <main className="min-h-0 min-w-0 flex-1 overflow-auto">
        <header className="border-b border-border px-6 py-4">
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
            {FILTERS.find((f) => f.id === filter)?.label}
          </p>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {filter === "trash"
              ? "Workspaces moved out of the live catalog."
              : "Starred pins, then recents, then CAD-adjacent imports."}
          </p>
        </header>

        {workspaces.length === 0 ? (
          <EmptyCatalog
            listed={listed}
            onCreate={onCreate}
            onLoadSample={loadSample}
          />
        ) : (
          <div className="flex flex-col gap-10 px-6 py-8">
            {filter !== "trash" && (
              <section aria-labelledby="starred-heading">
                <SectionHead
                  id="starred-heading"
                  kicker="Pinned"
                  title="Starred Workspaces"
                  count={starred.length}
                />
                {starred.length === 0 ? (
                  <p className="mt-4 text-sm text-muted-foreground">
                    Star a workspace to pin it on this grid.
                  </p>
                ) : (
                  <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {starred.map((ws) => {
                      const docs = documents.filter(
                        (d) => d.workspaceId === ws.id,
                      );
                      return (
                        <article
                          key={ws.id}
                          className="flex flex-col border border-border bg-card text-left hover:border-accent"
                        >
                          <button
                            type="button"
                            data-explorer-workspace={listed ? ws.id : undefined}
                            onClick={() => open(ws.id)}
                            className="flex flex-1 flex-col items-start gap-2 p-4 text-left"
                          >
                            <span className="font-display text-[15px] font-medium tracking-tight text-foreground">
                              {ws.name}
                            </span>
                            <span className="line-clamp-2 text-[12px] leading-relaxed text-muted-foreground">
                              {ws.description || "Workspace"}
                            </span>
                            <span className="mt-auto font-mono text-[10px] uppercase tracking-[0.12em] text-faint">
                              {docs.length === 1
                                ? "1 studio"
                                : `${docs.length} studios`}
                              {` · ${formatModified(ws.modifiedAt)}`}
                            </span>
                          </button>
                          <div className="flex items-center justify-between border-t border-border px-3 py-2">
                            <button
                              type="button"
                              aria-label={
                                ws.starred ? "Unstar workspace" : "Star workspace"
                              }
                              onClick={() => toggleStar(ws.id)}
                              className="p-1 text-accent hover:bg-hover"
                            >
                              <Star
                                className="h-3.5 w-3.5"
                                strokeWidth={1.75}
                                fill="currentColor"
                              />
                            </button>
                            <button
                              type="button"
                              onClick={() => open(ws.id)}
                              className="font-mono text-[10px] uppercase tracking-[0.14em] text-accent"
                            >
                              Open
                            </button>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                )}
              </section>
            )}

            <section aria-labelledby="recent-heading">
              <SectionHead
                id="recent-heading"
                kicker={filter === "trash" ? "Removed" : "Catalog"}
                title={
                  filter === "trash" ? "Trashed Workspaces" : "Recent Workspaces"
                }
                count={recent.length}
              />
              {recent.length === 0 ? (
                <p className="mt-4 text-sm text-muted-foreground">
                  {filter === "trash"
                    ? "Trash is empty."
                    : "No workspaces in this filter."}
                </p>
              ) : (
                <div className="mt-4 overflow-hidden border border-border">
                  <table className="w-full border-collapse text-left text-sm">
                    <thead className="bg-card font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                      <tr>
                        <th className="px-4 py-2.5 font-medium">Name</th>
                        <th className="px-4 py-2.5 font-medium">Modified Date</th>
                        <th className="px-4 py-2.5 font-medium">Modified By</th>
                        <th className="px-4 py-2.5 font-medium">
                          <span className="sr-only">Action</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {recent.map((ws) => (
                        <tr
                          key={ws.id}
                          className="border-t border-border hover:bg-hover"
                        >
                          <td className="px-4 py-3">
                            <button
                              type="button"
                              data-explorer-workspace={listed ? ws.id : undefined}
                              onClick={() =>
                                ws.trashed ? undefined : open(ws.id)
                              }
                              className="flex items-center gap-2 text-left font-medium text-foreground"
                            >
                              {ws.starred && (
                                <Star
                                  className="h-3 w-3 text-accent"
                                  strokeWidth={1.75}
                                  fill="currentColor"
                                />
                              )}
                              {ws.name}
                            </button>
                          </td>
                          <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                            {formatModified(ws.modifiedAt)}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {ws.owner}
                          </td>
                          <td className="px-4 py-3 text-right">
                            {ws.trashed ? (
                              <button
                                type="button"
                                onClick={() => restoreWorkspace(ws.id)}
                                className="font-mono text-[10px] uppercase tracking-[0.14em] text-accent"
                              >
                                Restore
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => open(ws.id)}
                                className="font-mono text-[10px] uppercase tracking-[0.14em] text-accent"
                              >
                                Open
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            {filter !== "trash" && (
              <section aria-labelledby="imports-heading">
                <SectionHead
                  id="imports-heading"
                  kicker="Reference"
                  title="Imports"
                  count={visibleImports.length}
                />
                <p className="mt-1 max-w-xl text-[12px] text-muted-foreground">
                  DXF, DWG, and images sit beside CAD studios. They are not
                  Part Studios.
                </p>
                {visibleImports.length === 0 ? (
                  <p className="mt-4 text-sm text-muted-foreground">
                    No imports in this filter.
                  </p>
                ) : (
                  <div className="mt-4 overflow-hidden border border-border">
                    <table className="w-full border-collapse text-left text-sm">
                      <thead className="bg-card font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                        <tr>
                          <th className="px-4 py-2.5 font-medium">Name</th>
                          <th className="px-4 py-2.5 font-medium">Format</th>
                          <th className="px-4 py-2.5 font-medium">
                            Modified Date
                          </th>
                          <th className="px-4 py-2.5 font-medium">
                            Modified By
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {visibleImports.map((item) => (
                          <tr
                            key={item.id}
                            className="border-t border-border"
                          >
                            <td className="px-4 py-3 font-medium">
                              {item.name}
                            </td>
                            <td className="px-4 py-3 font-mono text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                              {item.format}
                            </td>
                            <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                              {formatModified(item.modifiedAt)}
                            </td>
                            <td className="px-4 py-3 text-muted-foreground">
                              {item.owner}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

function matchesFilter(ws: WorkspaceRecord, filter: DashFilter): boolean {
  if (filter === "trash") return ws.trashed;
  if (ws.trashed) return false;
  if (filter === "mine") return ws.owner === "You";
  if (filter === "shared") return ws.owner !== "You";
  return true;
}

function SectionHead({
  id,
  kicker,
  title,
  count,
}: {
  id: string;
  kicker: string;
  title: string;
  count: number;
}) {
  return (
    <div className="flex items-end justify-between gap-4 border-b border-border pb-2">
      <div>
        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-accent">
          {kicker}
        </p>
        <h2
          id={id}
          className="mt-1 font-display text-xl font-medium tracking-tight"
        >
          {title}
        </h2>
      </div>
      <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-faint">
        {count}
      </span>
    </div>
  );
}

function EmptyCatalog({
  listed,
  onCreate,
  onLoadSample,
}: {
  listed: boolean;
  onCreate: () => void;
  onLoadSample: () => void;
}) {
  return (
    <div className="flex h-[min(28rem,70%)] flex-col justify-center gap-5 px-6 py-16">
      <div className="max-w-md border border-dashed border-border px-6 py-10">
        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-accent">
          Empty catalog
        </p>
        <h2 className="mt-2 font-display text-2xl font-medium tracking-tight">
          No workspaces on disk.
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          A workspace holds Part Studios, assemblies, drawings, boards, and CAM
          setups. Nothing leaves this machine.
        </p>
        <div className="mt-6 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onCreate}
            className="inline-flex min-h-10 items-center bg-accent px-4 font-mono text-[11px] uppercase tracking-[0.14em] text-accent-foreground"
          >
            Create Workspace
          </button>
          <button
            type="button"
            data-explorer={listed ? "load-sample" : undefined}
            onClick={onLoadSample}
            className="inline-flex min-h-10 items-center border border-border px-4 font-mono text-[11px] uppercase tracking-[0.14em] text-foreground hover:border-accent hover:text-accent"
          >
            Load sample workspaces
          </button>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
