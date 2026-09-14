import { useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  Box,
  CircuitBoard,
  Cuboid,
  FileBox,
  Layers,
  Plus,
  Spline,
  Square,
} from "lucide-react";
import {
  useCatalogStore,
  type StudioKind,
} from "../../store/catalogStore";
import { formatModifiedLong } from "./format";

export interface OpenStudioRequest {
  id: string;
  title: string;
  kind: StudioKind;
}

export interface WorkspaceViewProps {
  onBack: () => void;
  onOpenStudio: (request: OpenStudioRequest) => void;
  onOpenVersions?: () => void;
  onOpenReleases?: () => void;
  listed?: boolean;
}

const GROUPS: {
  kind: StudioKind;
  label: string;
  Icon: typeof Box;
}[] = [
  { kind: "part", label: "Part Studios", Icon: Square },
  { kind: "assembly", label: "Assemblies", Icon: Box },
  { kind: "drawing", label: "Drawings", Icon: Layers },
  { kind: "pcb", label: "PCB Studios", Icon: CircuitBoard },
  { kind: "cam", label: "CAM Setups", Icon: Spline },
  { kind: "simulation", label: "Simulation Studios", Icon: Cuboid },
  { kind: "render", label: "Render Studios", Icon: FileBox },
];

const CREATE_ITEMS: { kind: StudioKind; label: string }[] = [
  { kind: "part", label: "Part Studio" },
  { kind: "assembly", label: "Assembly" },
  { kind: "drawing", label: "Drawing" },
  { kind: "pcb", label: "PCB Studio" },
  { kind: "cam", label: "CAM Setup" },
  { kind: "simulation", label: "Simulation Studio" },
  { kind: "render", label: "Render Studio" },
];

export function WorkspaceView({
  onBack,
  onOpenStudio,
  onOpenVersions,
  onOpenReleases,
  listed = true,
}: WorkspaceViewProps) {
  const selectedId = useCatalogStore((s) => s.selectedWorkspaceId);
  const workspace = useCatalogStore((s) =>
    s.workspaces.find((w) => w.id === s.selectedWorkspaceId),
  );
  const allDocuments = useCatalogStore((s) => s.documents);
  const createDocument = useCatalogStore((s) => s.createDocument);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const documents = useMemo(
    () =>
      selectedId
        ? allDocuments.filter((d) => d.workspaceId === selectedId)
        : [],
    [allDocuments, selectedId],
  );

  const grouped = useMemo(
    () =>
      GROUPS.map((group) => ({
        ...group,
        items: documents.filter((d) => d.kind === group.kind),
      })),
    [documents],
  );

  function create(kind: StudioKind, label: string) {
    setMenuOpen(false);
    const created = createDocument(kind, label);
    onOpenStudio({ id: created.id, title: created.name, kind: created.kind });
  }

  if (!listed) {
    return <div className="h-full bg-background" />;
  }
  if (!workspace) {
    return (
      <div className="flex h-full items-center px-6">
        <p className="text-sm text-muted-foreground">No workspace selected.</p>
      </div>
    );
  }

  return (
    <div
      data-explorer={listed ? "documents-page" : undefined}
      className="flex h-full min-h-0 flex-col bg-background text-foreground"
    >
      <header className="flex shrink-0 items-center gap-4 border-b border-border bg-card px-4 py-3">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex min-h-10 items-center gap-2 border border-accent bg-active px-3 font-mono text-[11px] uppercase tracking-[0.14em] text-accent hover:bg-accent hover:text-accent-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" strokeWidth={2} />
          Back to Dashboard
        </button>
        <div className="min-w-0 flex-1">
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-accent">
            Workspace
          </p>
          <h1 className="truncate font-display text-lg font-medium tracking-tight">
            {workspace.name}
          </h1>
        </div>
        <div ref={menuRef} className="relative">
          <button
            type="button"
            data-explorer={listed ? "create-menu" : undefined}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((v) => !v)}
            className="inline-flex min-h-10 items-center gap-2 bg-accent px-4 font-mono text-[11px] uppercase tracking-[0.14em] text-accent-foreground"
          >
            <Plus className="h-3.5 w-3.5" strokeWidth={2} />
            Create
          </button>
          {menuOpen && (
            <>
              <button
                type="button"
                className="fixed inset-0 z-20 cursor-default"
                aria-label="Close create menu"
                onClick={() => setMenuOpen(false)}
              />
              <div
                role="menu"
                className="absolute right-0 z-30 mt-1 w-52 border border-border bg-card py-1"
              >
                {CREATE_ITEMS.map((item) => (
                  <button
                    key={item.kind}
                    type="button"
                    role="menuitem"
                    className="block w-full px-3 py-2 text-left text-sm hover:bg-hover hover:text-accent"
                    onClick={() => create(item.kind, item.label)}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
        {onOpenVersions && (
          <button
            type="button"
            onClick={onOpenVersions}
            className="min-h-10 border border-border px-3 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground hover:border-accent hover:text-accent"
          >
            Versions
          </button>
        )}
        {onOpenReleases && (
          <button
            type="button"
            onClick={onOpenReleases}
            className="min-h-10 border border-border px-3 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground hover:border-accent hover:text-accent"
          >
            Releases
          </button>
        )}
      </header>

      <div className="min-h-0 flex-1 overflow-auto px-6 py-6">
        <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
          {workspace.description || "Local workspace."} · {workspace.owner} ·
          updated {formatModifiedLong(workspace.modifiedAt)}
        </p>

        <div className="mt-6 flex flex-col gap-8">
          {grouped.map((group) => (
            <section key={group.kind} aria-labelledby={`kind-${group.kind}`}>
              <div className="flex items-end justify-between border-b border-border pb-2">
                <div className="flex items-center gap-2">
                  <group.Icon
                    className="h-4 w-4 text-accent"
                    strokeWidth={1.75}
                  />
                  <h2
                    id={`kind-${group.kind}`}
                    className="font-display text-base font-medium tracking-tight"
                  >
                    {group.label}
                  </h2>
                </div>
                <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-faint">
                  {group.items.length}
                </span>
              </div>
                {group.items.length === 0 ? (
                  <p className="mt-3 text-sm text-muted-foreground">
                    None yet. Use Create to add one.
                  </p>
                ) : (
                <ul className="mt-2 border border-border">
                  {group.items.map((doc) => (
                    <li
                      key={doc.id}
                      className="flex min-w-0 items-center gap-3 border-b border-border last:border-b-0"
                    >
                      <button
                        type="button"
                        data-explorer-doc={listed ? doc.id : undefined}
                        data-explorer-kind={listed ? doc.kind : undefined}
                        onClick={() =>
                          onOpenStudio({
                            id: doc.id,
                            title: doc.name,
                            kind: doc.kind,
                          })
                        }
                        className="flex min-w-0 flex-1 items-center gap-3 px-4 py-3 text-left hover:bg-hover"
                      >
                        <span className="min-w-0 flex-1 truncate font-medium">
                          {doc.name}
                        </span>
                        <span className="hidden shrink-0 text-xs text-muted-foreground sm:inline">
                          {doc.owner}
                        </span>
                        <span className="hidden shrink-0 font-mono text-[11px] text-faint md:inline">
                          {formatModifiedLong(doc.modifiedAt)}
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          onOpenStudio({
                            id: doc.id,
                            title: doc.name,
                            kind: doc.kind,
                          })
                        }
                        className="mr-3 inline-flex min-h-9 shrink-0 items-center border border-accent px-3 font-mono text-[10px] uppercase tracking-[0.14em] text-accent hover:bg-accent hover:text-accent-foreground"
                      >
                        Open
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}

export default WorkspaceView;
