import { useState } from "react";
import { FolderOpen, Plus, Settings } from "lucide-react";
import { useCatalogStore } from "../../store/catalogStore";
import { PreferencesModal } from "../settings/PreferencesModal";
import { Logo } from "../ui/Logo";

export interface WorkspacesPageProps {
  onOpenWorkspace: (workspaceId: string) => void;
  onOpenVersions?: () => void;
  onOpenReleases?: () => void;
}

export function WorkspacesPage({
  onOpenWorkspace,
  onOpenVersions,
  onOpenReleases,
}: WorkspacesPageProps) {
  const workspaces = useCatalogStore((s) => s.workspaces);
  const documents = useCatalogStore((s) => s.documents);
  const source = useCatalogStore((s) => s.source);
  const loadSample = useCatalogStore((s) => s.loadSample);
  const createWorkspace = useCatalogStore((s) => s.createWorkspace);
  const selectWorkspace = useCatalogStore((s) => s.selectWorkspace);
  const [prefsOpen, setPrefsOpen] = useState(false);

  function open(id: string) {
    selectWorkspace(id);
    onOpenWorkspace(id);
  }

  function onCreate() {
    const ws = createWorkspace();
    open(ws.id);
  }

  return (
    <div
      data-explorer="workspaces-page"
      className="relative flex h-full min-h-0 flex-col bg-background text-foreground"
    >
      <header className="flex shrink-0 items-center gap-3 border-b border-border bg-card px-4 py-3">
        <Logo className="h-7 w-7" />
        <div className="min-w-0">
          <h1 className="text-sm font-semibold tracking-tight">Workspaces</h1>
          <p className="text-[11px] text-muted-foreground">
            {source === "sample"
              ? "Local · sample"
              : source === "pdm"
                ? "PDM"
                : "Local · empty"}
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={onCreate}
            className="flex items-center gap-1.5 rounded-md bg-accent px-3 py-1.5 text-xs font-semibold text-accent-foreground"
          >
            <Plus className="h-3.5 w-3.5" strokeWidth={1.75} />
            New workspace
          </button>
          {onOpenVersions && (
            <button
              type="button"
              onClick={onOpenVersions}
              className="rounded-md border border-border px-2.5 py-1.5 text-xs text-muted-foreground hover:border-accent hover:text-accent"
            >
              Versions
            </button>
          )}
          {onOpenReleases && (
            <button
              type="button"
              onClick={onOpenReleases}
              className="rounded-md border border-border px-2.5 py-1.5 text-xs text-muted-foreground hover:border-accent hover:text-accent"
            >
              Releases
            </button>
          )}
          <button
            type="button"
            onClick={() => setPrefsOpen(true)}
            className="rounded-md border border-border p-1.5 text-muted-foreground hover:border-accent hover:text-accent"
            aria-label="Open preferences"
          >
            <Settings className="h-3.5 w-3.5" strokeWidth={1.75} />
          </button>
        </div>
      </header>

      <main className="min-h-0 flex-1 overflow-auto p-6">
        {workspaces.length === 0 ? (
          <div className="mx-auto flex max-w-lg flex-col items-center justify-center gap-4 rounded-lg border border-dashed border-border px-6 py-16 text-center">
            <FolderOpen className="h-8 w-8 text-faint" strokeWidth={1.5} />
            <p className="text-sm text-muted-foreground">
              A workspace is the Onshape document: parts, assemblies, drawings,
              and boards live inside it.
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              <button
                type="button"
                onClick={onCreate}
                className="rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-accent-foreground"
              >
                Create workspace
              </button>
              <button
                type="button"
                data-explorer="load-sample"
                onClick={() => {
                  loadSample();
                }}
                className="rounded-md border border-border px-3 py-1.5 text-xs font-medium hover:border-accent hover:text-accent"
              >
                Load sample workspaces
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {workspaces.map((ws) => {
              const docs = documents.filter((d) => d.workspaceId === ws.id);
              const counts = docs.reduce<Record<string, number>>((acc, d) => {
                acc[d.kind] = (acc[d.kind] ?? 0) + 1;
                return acc;
              }, {});
              return (
                <button
                  key={ws.id}
                  type="button"
                  data-explorer-workspace={ws.id}
                  onClick={() => open(ws.id)}
                  className="flex flex-col items-start gap-2 rounded-lg border border-border bg-card p-4 text-left hover:border-accent"
                >
                  <span className="text-sm font-semibold text-foreground">
                    {ws.name}
                  </span>
                  <span className="line-clamp-2 text-[11px] text-muted-foreground">
                    {ws.description || "Workspace"}
                  </span>
                  <span className="whitespace-nowrap text-[10px] text-faint">
                    {docs.length === 1 ? "1 document" : `${docs.length} documents`}
                    {counts.part ? ` · ${counts.part} part` : ""}
                    {counts.assembly ? ` · ${counts.assembly} assembly` : ""}
                    {counts.pcb ? ` · ${counts.pcb} pcb` : ""}
                  </span>
                  <span className="mt-1 text-[11px] font-medium text-accent">
                    Open
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </main>
      <PreferencesModal open={prefsOpen} onClose={() => setPrefsOpen(false)} />
    </div>
  );
}

export default WorkspacesPage;
