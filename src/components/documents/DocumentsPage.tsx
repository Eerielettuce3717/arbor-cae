import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { Settings } from "lucide-react";
import { isTauriRuntime, pdm, type Project } from "../../lib/pdmApi";
import { PreferencesModal } from "../settings/PreferencesModal";
import { Logo } from "../ui/Logo";

type ViewMode = "list" | "structure";
type OrgSection =
  | "folders"
  | "labels"
  | "filters"
  | "trash"
  | "integrations";

type DocumentKind =
  | "part"
  | "assembly"
  | "drawing"
  | "cam"
  | "simulation"
  | "render"
  | "pcb"
  | "folder";

type StudioKind = Exclude<DocumentKind, "folder">;

type LengthUnit = "mm" | "in" | "m" | "ft";

interface CadDocument {
  id: string;
  name: string;
  kind: DocumentKind;
  folderId: string;
  labels: string[];
  modifiedAt: string;
  owner: string;
  children?: string[];
}

interface FolderNode {
  id: string;
  name: string;
  parentId: string | null;
}

/** Payload App uses to open the correct studio tab. */
export interface OpenDocumentRequest {
  id: string;
  title: string;
  kind: StudioKind;
}

const SAMPLE_FOLDERS: FolderNode[] = [
  { id: "f-root", name: "Workspace", parentId: null },
  { id: "f-mech", name: "Mechanical", parentId: "f-root" },
  { id: "f-elec", name: "Electronics Enclosures", parentId: "f-root" },
  { id: "f-proto", name: "Prototypes", parentId: "f-mech" },
  { id: "f-rel", name: "Release Candidates", parentId: "f-mech" },
];

const SAMPLE_DOCUMENTS: CadDocument[] = [
  {
    id: "d-1",
    name: "Bracket Plate",
    kind: "part",
    folderId: "f-proto",
    labels: ["WIP", "Aluminum"],
    modifiedAt: "2026-09-11T18:22:00Z",
    owner: "You",
  },
  {
    id: "d-2",
    name: "Drive Assembly",
    kind: "assembly",
    folderId: "f-mech",
    labels: ["Critical"],
    modifiedAt: "2026-09-10T09:05:00Z",
    owner: "You",
    children: ["d-1", "d-4"],
  },
  {
    id: "d-3",
    name: "Housing A Drawing",
    kind: "drawing",
    folderId: "f-rel",
    labels: ["Released"],
    modifiedAt: "2026-09-08T14:40:00Z",
    owner: "A. Chen",
  },
  {
    id: "d-4",
    name: "Shaft Collar",
    kind: "part",
    folderId: "f-proto",
    labels: ["WIP"],
    modifiedAt: "2026-09-12T08:12:00Z",
    owner: "You",
  },
  {
    id: "d-5",
    name: "PCB Frame",
    kind: "part",
    folderId: "f-elec",
    labels: ["Plastic"],
    modifiedAt: "2026-09-07T16:00:00Z",
    owner: "M. Ortiz",
  },
  {
    id: "d-6",
    name: "Old Fixture v1",
    kind: "assembly",
    folderId: "f-trash",
    labels: [],
    modifiedAt: "2026-06-01T12:00:00Z",
    owner: "You",
  },
  {
    id: "d-cam",
    name: "Bracket CAM Studio",
    kind: "cam",
    folderId: "f-proto",
    labels: ["WIP", "Aluminum"],
    modifiedAt: "2026-09-12T16:00:00Z",
    owner: "You",
  },
  {
    id: "d-sim",
    name: "Bracket Simulation Studio",
    kind: "simulation",
    folderId: "f-proto",
    labels: ["WIP"],
    modifiedAt: "2026-09-12T16:20:00Z",
    owner: "You",
  },
  {
    id: "d-render",
    name: "Bracket Render Studio",
    kind: "render",
    folderId: "f-proto",
    labels: ["WIP"],
    modifiedAt: "2026-09-12T16:22:00Z",
    owner: "You",
  },
  {
    id: "d-pcb",
    name: "Main Board PCB Studio",
    kind: "pcb",
    folderId: "f-elec",
    labels: ["WIP"],
    modifiedAt: "2026-09-12T16:35:00Z",
    owner: "You",
  },
];

const SAMPLE_LABELS = ["WIP", "Released", "Critical", "Aluminum", "Plastic"];
const SAMPLE_FILTERS = [
  { id: "mine", name: "Owned by me" },
  { id: "week", name: "Modified this week" },
  { id: "parts", name: "Parts only" },
  { id: "assy", name: "Assemblies only" },
];

const PDM_FOLDER: FolderNode = {
  id: "f-pdm",
  name: "PDM Projects",
  parentId: null,
};

type WorkspaceSource = "empty" | "sample" | "pdm";

function projectsToDocuments(projects: Project[]): CadDocument[] {
  return projects.map((p) => ({
    id: p.id,
    name: p.name,
    kind: "folder" as const,
    folderId: PDM_FOLDER.id,
    labels: ["PDM"],
    modifiedAt: p.updatedAt,
    owner: p.ownerId || "You",
  }));
}

const KIND_GLYPH: Record<DocumentKind, string> = {
  part: "◼",
  assembly: "⧉",
  drawing: "▭",
  cam: "⚒",
  simulation: "∿",
  render: "◈",
  pcb: "⬡",
  folder: "▦",
};

function formatModified(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function isStudioKind(kind: DocumentKind): kind is StudioKind {
  return kind !== "folder";
}

export interface DocumentsPageProps {
  onOpenDocument?: (request: OpenDocumentRequest | string) => void;
  onOpenVersions?: () => void;
  onOpenReleases?: () => void;
}

export function DocumentsPage({
  onOpenDocument,
  onOpenVersions,
  onOpenReleases,
}: DocumentsPageProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [orgSection, setOrgSection] = useState<OrgSection>("folders");
  const [folders, setFolders] = useState<FolderNode[]>([]);
  const [documents, setDocuments] = useState<CadDocument[]>([]);
  const [labels, setLabels] = useState<string[]>([]);
  const [filters, setFilters] = useState(SAMPLE_FILTERS);
  const [selectedFolderId, setSelectedFolderId] = useState("f-root");
  const [activeLabels, setActiveLabels] = useState<string[]>([]);
  const [activeFilterIds, setActiveFilterIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);
  const [showCreateMenu, setShowCreateMenu] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showUnitsPanel, setShowUnitsPanel] = useState(false);
  const [defaultUnit, setDefaultUnit] = useState<LengthUnit>("mm");
  const [advancedKind, setAdvancedKind] = useState<DocumentKind | "any">("any");
  const [advancedOwner, setAdvancedOwner] = useState("");
  const [prefsOpen, setPrefsOpen] = useState(false);
  const [dataSource, setDataSource] = useState<WorkspaceSource>("empty");
  const [pdmPath, setPdmPath] = useState<string | null>(null);
  const [pdmError, setPdmError] = useState<string | null>(null);
  const [pdmBusy, setPdmBusy] = useState(false);

  const createMenuRef = useRef<HTMLDivElement>(null);
  const moreMenuRef = useRef<HTMLDivElement>(null);

  const applyPdmProjects = useCallback((projects: Project[], dbPath: string) => {
    setFolders([PDM_FOLDER]);
    setDocuments(projectsToDocuments(projects));
    setLabels(["PDM"]);
    setActiveLabels([]);
    setSelectedFolderId(PDM_FOLDER.id);
    setPdmPath(dbPath);
    setPdmError(null);
    setDataSource("pdm");
  }, []);

  const refreshPdmProjects = useCallback(async () => {
    if (!isTauriRuntime()) {
      setPdmError(null);
      setPdmPath(null);
      return;
    }
    setPdmBusy(true);
    try {
      const [projects, dbPath] = await Promise.all([
        pdm.listProjects(),
        pdm.dbPath(),
      ]);
      applyPdmProjects(projects, dbPath);
    } catch (e) {
      setPdmError(e instanceof Error ? e.message : String(e));
    } finally {
      setPdmBusy(false);
    }
  }, [applyPdmProjects]);

  useEffect(() => {
    void refreshPdmProjects();
  }, [refreshPdmProjects]);

  useEffect(() => {
    if (!showCreateMenu && !showMoreMenu) return;

    function onPointerDown(event: PointerEvent) {
      const target = event.target as Node;
      if (
        showCreateMenu &&
        createMenuRef.current &&
        !createMenuRef.current.contains(target)
      ) {
        setShowCreateMenu(false);
      }
      if (
        showMoreMenu &&
        moreMenuRef.current &&
        !moreMenuRef.current.contains(target)
      ) {
        setShowMoreMenu(false);
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setShowCreateMenu(false);
        setShowMoreMenu(false);
        setShowAdvancedSearch(false);
      }
    }

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [showCreateMenu, showMoreMenu]);

  function loadSampleWorkspace() {
    setFolders(SAMPLE_FOLDERS);
    setDocuments(SAMPLE_DOCUMENTS);
    setLabels(SAMPLE_LABELS);
    setFilters(SAMPLE_FILTERS);
    setSelectedFolderId("f-mech");
    setDataSource("sample");
    setPdmPath(null);
    setPdmError(null);
    setShowMoreMenu(false);
  }

  function clearWorkspace() {
    setFolders([]);
    setDocuments([]);
    setLabels([]);
    setActiveLabels([]);
    setSelectedFolderId("f-root");
    setDataSource("empty");
    setPdmPath(null);
    setShowMoreMenu(false);
  }

  async function createPdmProject() {
    if (!isTauriRuntime()) {
      setPdmError("PDM projects require the Tauri desktop app.");
      return;
    }
    setPdmBusy(true);
    setShowCreateMenu(false);
    try {
      const name = `Project ${new Date().toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })}`;
      await pdm.createProject({
        name,
        description: "Created from Documents",
        rootPath: ".cad_workspace",
        ownerId: "local-user",
      });
      await refreshPdmProjects();
    } catch (e) {
      setPdmError(e instanceof Error ? e.message : String(e));
      setPdmBusy(false);
    }
  }

  function createLocalDocument(kind: DocumentKind, label: string) {
    setShowCreateMenu(false);
    const rootId = "f-local-root";
    const ensureLocalFolders = (): FolderNode[] => {
      if (dataSource === "pdm" || folders.length === 0) {
        return [{ id: rootId, name: "Workspace", parentId: null }];
      }
      return folders;
    };

    if (kind === "folder") {
      const nextFolders = ensureLocalFolders();
      const id = `f-local-${Date.now()}`;
      const parentId =
        nextFolders.some((f) => f.id === selectedFolderId) &&
        selectedFolderId !== "f-root"
          ? selectedFolderId
          : (nextFolders[0]?.id ?? null);
      setFolders([
        ...nextFolders,
        { id, name: `Folder ${nextFolders.length}`, parentId },
      ]);
      if (dataSource === "pdm") {
        setDocuments([]);
        setPdmPath(null);
      }
      setDataSource("sample");
      return;
    }

    const nextFolders = ensureLocalFolders();
    const folderId = nextFolders.some((f) => f.id === selectedFolderId)
      ? selectedFolderId
      : nextFolders[0].id;
    const id = `d-local-${Date.now()}`;
    const baseDocs = dataSource === "pdm" ? [] : documents;
    const name = `${label} ${baseDocs.filter((d) => d.kind === kind).length + 1}`;
    setFolders(nextFolders);
    setDocuments([
      ...baseDocs,
      {
        id,
        name,
        kind,
        folderId,
        labels: ["Local"],
        modifiedAt: new Date().toISOString(),
        owner: "You",
      },
    ]);
    setSelectedFolderId(folderId);
    setPdmPath(null);
    setDataSource("sample");
    onOpenDocument?.({ id, title: name, kind });
  }

  function handleOpenDocument(doc: CadDocument) {
    if (doc.kind === "folder" || dataSource === "pdm") {
      onOpenVersions?.();
      return;
    }
    if (!isStudioKind(doc.kind)) return;
    onOpenDocument?.({ id: doc.id, title: doc.name, kind: doc.kind });
  }

  const visibleDocs = useMemo(() => {
    const inTrash = orgSection === "trash";
    return documents.filter((doc) => {
      if (inTrash) return doc.folderId === "f-trash";
      if (doc.folderId === "f-trash") return false;

      if (orgSection === "folders") {
        const folderMatch =
          doc.folderId === selectedFolderId ||
          isDescendantFolder(selectedFolderId, doc.folderId, folders);
        if (!folderMatch && selectedFolderId !== "f-root") return false;
      }

      if (activeLabels.length > 0) {
        if (!activeLabels.every((label) => doc.labels.includes(label))) {
          return false;
        }
      }

      if (activeFilterIds.includes("mine") && doc.owner !== "You") return false;
      if (activeFilterIds.includes("parts") && doc.kind !== "part") return false;
      if (activeFilterIds.includes("assy") && doc.kind !== "assembly") {
        return false;
      }
      if (activeFilterIds.includes("week")) {
        const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
        if (new Date(doc.modifiedAt).getTime() < weekAgo) return false;
      }

      if (advancedKind !== "any" && doc.kind !== advancedKind) return false;
      if (
        advancedOwner &&
        !doc.owner.toLowerCase().includes(advancedOwner.toLowerCase())
      ) {
        return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const hay = `${doc.name} ${doc.labels.join(" ")} ${doc.owner}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }

      return true;
    });
  }, [
    documents,
    folders,
    orgSection,
    selectedFolderId,
    activeLabels,
    activeFilterIds,
    searchQuery,
    advancedKind,
    advancedOwner,
  ]);

  const structureRoots = useMemo(
    () => visibleDocs.filter((d) => d.kind === "assembly" || !d.children),
    [visibleDocs],
  );

  function toggleLabel(label: string) {
    setActiveLabels((prev) =>
      prev.includes(label) ? prev.filter((l) => l !== label) : [...prev, label],
    );
  }

  function toggleFilter(id: string) {
    setActiveFilterIds((prev) =>
      prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id],
    );
  }

  const statusLine =
    dataSource === "pdm"
      ? `PDM · SQLite${pdmPath ? ` · ${pdmPath}` : ""}`
      : dataSource === "sample"
        ? `Local workspace · ${defaultUnit} · sample`
        : `Local workspace · ${defaultUnit} · empty`;

  return (
    <div className="relative flex h-full min-h-0 bg-background text-foreground">
      <aside className="flex w-60 shrink-0 flex-col border-r border-border bg-card">
        <div ref={createMenuRef} className="relative z-30 border-b border-border p-3">
          <button
            type="button"
            onClick={() => {
              setShowMoreMenu(false);
              setShowCreateMenu((v) => !v);
            }}
            aria-haspopup="menu"
            aria-expanded={showCreateMenu}
            className="flex w-full items-center justify-between rounded-md bg-accent px-3 py-2 text-sm font-semibold text-accent-foreground transition hover:bg-accent"
          >
            Create
            <span className="text-xs opacity-80">▾</span>
          </button>
          {showCreateMenu && (
            <div
              role="menu"
              className="absolute left-3 right-3 z-40 mt-1 overflow-hidden rounded-md border border-border bg-card shadow-lg"
            >
              {isTauriRuntime() && (
                <button
                  type="button"
                  role="menuitem"
                  className="block w-full px-3 py-2 text-left text-sm text-foreground hover:bg-hover hover:text-accent"
                  onClick={() => void createPdmProject()}
                  disabled={pdmBusy}
                >
                  PDM Project (SQLite)
                </button>
              )}
              {(
                [
                  ["Part Studio", "part"],
                  ["Assembly", "assembly"],
                  ["Drawing", "drawing"],
                  ["CAM Studio", "cam"],
                  ["Simulation Studio", "simulation"],
                  ["Render Studio", "render"],
                  ["PCB Studio", "pcb"],
                  ["Folder", "folder"],
                ] as const
              ).map(([label, kind]) => (
                <button
                  key={label}
                  type="button"
                  role="menuitem"
                  className="block w-full px-3 py-2 text-left text-sm text-foreground hover:bg-hover hover:text-accent"
                  onClick={() => createLocalDocument(kind, label)}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>

        <nav className="flex flex-col gap-0.5 p-2">
          {(
            [
              ["folders", "Folders"],
              ["labels", "Labels"],
              ["filters", "Filters"],
              ["trash", "Trash"],
              ["integrations", "Integrations"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setOrgSection(id)}
              className={`rounded-md px-2.5 py-1.5 text-left text-sm ${
                orgSection === id
                  ? "bg-active font-medium text-accent"
                  : "text-muted-foreground hover:bg-hover hover:text-accent"
              }`}
            >
              {label}
            </button>
          ))}
        </nav>

        <div className="min-h-0 flex-1 overflow-y-auto border-t border-border p-2">
          {orgSection === "folders" && (
            <FolderTree
              folders={folders}
              selectedId={selectedFolderId}
              onSelect={setSelectedFolderId}
            />
          )}
          {orgSection === "labels" && (
            <ul className="space-y-1">
              {labels.map((label) => (
                <li key={label}>
                  <button
                    type="button"
                    onClick={() => toggleLabel(label)}
                    className={`flex w-full items-center justify-between rounded-md px-2 py-1.5 text-sm ${
                      activeLabels.includes(label)
                        ? "bg-active text-accent"
                        : "text-muted-foreground hover:bg-hover"
                    }`}
                  >
                    <span>{label}</span>
                    {activeLabels.includes(label) && (
                      <span className="text-xs">●</span>
                    )}
                  </button>
                </li>
              ))}
              {labels.length === 0 && (
                <li className="px-2 py-1 text-xs text-muted-foreground">
                  No labels yet.
                </li>
              )}
            </ul>
          )}
          {orgSection === "filters" && (
            <ul className="space-y-1">
              {filters.map((filter) => (
                <li key={filter.id}>
                  <button
                    type="button"
                    onClick={() => toggleFilter(filter.id)}
                    className={`w-full rounded-md px-2 py-1.5 text-left text-sm ${
                      activeFilterIds.includes(filter.id)
                        ? "bg-active text-accent"
                        : "text-muted-foreground hover:bg-hover"
                    }`}
                  >
                    {filter.name}
                  </button>
                </li>
              ))}
            </ul>
          )}
          {orgSection === "trash" && (
            <p className="px-2 py-1 text-xs leading-relaxed text-muted-foreground">
              Deleted documents appear here.
            </p>
          )}
          {orgSection === "integrations" && (
            <ul className="space-y-1">
              {["Git LFS / repo sync", "STEP import watch", "PLM connector"].map(
                (name) => (
                  <li
                    key={name}
                    className="rounded-md border border-dashed border-border px-2 py-2 text-sm text-muted-foreground"
                  >
                    {name}
                    <div className="mt-1 text-[10px] uppercase tracking-wide text-muted-foreground">
                      Not connected
                    </div>
                  </li>
                ),
              )}
            </ul>
          )}
        </div>

        <div className="border-t border-border p-3">
          <button
            type="button"
            onClick={() => setShowUnitsPanel((v) => !v)}
            className="flex w-full items-center justify-between rounded-md border border-border bg-muted px-2.5 py-2 text-left text-xs text-muted-foreground hover:border-accent hover:text-accent"
          >
            <span>Default units</span>
            <span className="font-mono font-semibold text-accent">
              {defaultUnit}
            </span>
          </button>
          {showUnitsPanel && (
            <div className="mt-2 grid grid-cols-2 gap-1">
              {(["mm", "in", "m", "ft"] as LengthUnit[]).map((unit) => (
                <button
                  key={unit}
                  type="button"
                  onClick={() => {
                    setDefaultUnit(unit);
                    setShowUnitsPanel(false);
                  }}
                  className={`rounded px-2 py-1.5 font-mono text-xs ${
                    defaultUnit === unit
                      ? "bg-accent text-accent-foreground"
                      : "bg-hover text-muted-foreground hover:text-accent"
                  }`}
                >
                  {unit}
                </button>
              ))}
            </div>
          )}
        </div>
      </aside>

      <main className="flex min-w-0 flex-1 flex-col">
        <header className="flex shrink-0 items-center gap-3 border-b border-border bg-card px-4 py-3">
          <div className="min-w-0 shrink">
            <Logo className="h-7 w-7" />
            <h1 className="sr-only">Documents</h1>
            <p className="mt-0.5 truncate text-xs text-muted-foreground">
              {statusLine}
              {pdmBusy ? " · loading…" : ""}
            </p>
            {pdmError && (
              <p className="mt-0.5 text-[11px] text-accent">{pdmError}</p>
            )}
          </div>

          <div className="ml-auto flex min-w-0 items-center gap-2">
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search…"
              className="w-40 shrink rounded-md border border-border bg-muted px-3 py-1.5 text-sm text-foreground placeholder:text-faint focus:border-accent sm:w-52"
            />

            <div ref={moreMenuRef} className="relative shrink-0">
              <button
                type="button"
                onClick={() => {
                  setShowCreateMenu(false);
                  setShowMoreMenu((v) => !v);
                }}
                aria-haspopup="menu"
                aria-expanded={showMoreMenu}
                className="rounded-md border border-border px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:border-accent hover:text-accent"
              >
                More ▾
              </button>
              {showMoreMenu && (
                <div
                  role="menu"
                  className="absolute right-0 z-40 mt-1 w-52 overflow-hidden rounded-md border border-border bg-card shadow-lg"
                >
                  {dataSource === "pdm" ? (
                    <>
                      <MoreItem
                        label="Refresh PDM"
                        disabled={pdmBusy}
                        onClick={() => {
                          setShowMoreMenu(false);
                          void refreshPdmProjects();
                        }}
                      />
                      <MoreItem
                        label="Load sample workspace"
                        onClick={loadSampleWorkspace}
                      />
                    </>
                  ) : dataSource === "sample" ? (
                    <>
                      <MoreItem label="Clear sample" onClick={clearWorkspace} />
                      {isTauriRuntime() && (
                        <MoreItem
                          label="Load PDM projects"
                          disabled={pdmBusy}
                          onClick={() => {
                            setShowMoreMenu(false);
                            void refreshPdmProjects();
                          }}
                        />
                      )}
                    </>
                  ) : (
                    <>
                      <MoreItem
                        label="Load sample workspace"
                        onClick={loadSampleWorkspace}
                      />
                      {isTauriRuntime() && (
                        <MoreItem
                          label="Load PDM projects"
                          disabled={pdmBusy}
                          onClick={() => {
                            setShowMoreMenu(false);
                            void refreshPdmProjects();
                          }}
                        />
                      )}
                    </>
                  )}
                  <div className="my-1 border-t border-border" />
                  <MoreItem
                    label="Versions"
                    onClick={() => {
                      setShowMoreMenu(false);
                      onOpenVersions?.();
                    }}
                  />
                  <MoreItem
                    label="Releases"
                    onClick={() => {
                      setShowMoreMenu(false);
                      onOpenReleases?.();
                    }}
                  />
                  <div className="my-1 border-t border-border" />
                  <MoreItem
                    label={
                      viewMode === "list"
                        ? "Switch to structure view"
                        : "Switch to list view"
                    }
                    onClick={() => {
                      setViewMode((v) => (v === "list" ? "structure" : "list"));
                      setShowMoreMenu(false);
                    }}
                  />
                  <MoreItem
                    label={
                      showAdvancedSearch
                        ? "Hide advanced search"
                        : "Advanced search"
                    }
                    onClick={() => {
                      setShowAdvancedSearch((v) => !v);
                      setShowMoreMenu(false);
                    }}
                  />
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => setPrefsOpen(true)}
              className="shrink-0 rounded-md border border-border p-1.5 text-muted-foreground hover:border-accent hover:text-accent"
              title="Preferences"
              aria-label="Open preferences"
            >
              <Settings className="h-3.5 w-3.5" strokeWidth={1.75} />
            </button>
          </div>
        </header>

        {showAdvancedSearch && (
          <div className="flex flex-wrap items-end gap-3 border-b border-border bg-muted/60 px-4 py-3">
            <label className="flex flex-col gap-1 text-xs text-muted-foreground">
              Kind
              <select
                value={advancedKind}
                onChange={(e) =>
                  setAdvancedKind(e.target.value as DocumentKind | "any")
                }
                className="rounded border border-border bg-card px-2 py-1.5 text-sm text-foreground"
              >
                <option value="any">Any</option>
                <option value="part">Part</option>
                <option value="assembly">Assembly</option>
                <option value="drawing">Drawing</option>
                <option value="cam">CAM</option>
                <option value="simulation">Simulation</option>
                <option value="render">Render</option>
                <option value="pcb">PCB</option>
              </select>
            </label>
            <label className="flex flex-col gap-1 text-xs text-muted-foreground">
              Owner contains
              <input
                value={advancedOwner}
                onChange={(e) => setAdvancedOwner(e.target.value)}
                className="rounded border border-border bg-card px-2 py-1.5 text-sm text-foreground"
                placeholder="e.g. Chen"
              />
            </label>
            <button
              type="button"
              onClick={() => {
                setAdvancedKind("any");
                setAdvancedOwner("");
                setSearchQuery("");
                setActiveLabels([]);
                setActiveFilterIds([]);
              }}
              className="rounded border border-border px-3 py-1.5 text-xs text-muted-foreground hover:text-accent"
            >
              Clear all
            </button>
          </div>
        )}

        <div className="min-h-0 flex-1 overflow-auto p-4">
          {visibleDocs.length > 0 && (
            <p className="mb-2 text-[11px] text-muted-foreground">
              {dataSource === "pdm"
                ? "Click a project to open Versions."
                : "Click a row to open it."}
            </p>
          )}
          {viewMode === "list" ? (
            <ListView
              documents={visibleDocs}
              pdmMode={dataSource === "pdm"}
              onOpen={handleOpenDocument}
            />
          ) : (
            <StructureView
              documents={visibleDocs}
              roots={structureRoots}
              pdmMode={dataSource === "pdm"}
              onOpen={handleOpenDocument}
            />
          )}
          {visibleDocs.length === 0 && (
            <div className="flex h-48 flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border text-sm text-muted-foreground">
              <p>
                {documents.length === 0
                  ? "No documents yet."
                  : "No documents match the current filters."}
              </p>
              {documents.length === 0 && (
                <div className="flex flex-wrap justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => createLocalDocument("part", "Part Studio")}
                    className="rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-accent-foreground hover:bg-accent"
                  >
                    Create Part Studio
                  </button>
                  <button
                    type="button"
                    onClick={loadSampleWorkspace}
                    className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:border-accent hover:text-accent"
                  >
                    Load sample workspace
                  </button>
                </div>
              )}
              {documents.length === 0 && (
                <p className="text-[11px] text-faint">
                  After you have documents, click a row to open.
                </p>
              )}
            </div>
          )}
        </div>
      </main>
      <PreferencesModal open={prefsOpen} onClose={() => setPrefsOpen(false)} />
    </div>
  );
}

function MoreItem({
  label,
  onClick,
  disabled,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      disabled={disabled}
      onClick={onClick}
      className="block w-full px-3 py-2 text-left text-sm text-foreground hover:bg-hover hover:text-accent disabled:opacity-50"
    >
      {label}
    </button>
  );
}

function isDescendantFolder(
  ancestorId: string,
  folderId: string,
  folders: FolderNode[],
): boolean {
  if (ancestorId === "f-root") return true;
  let current: string | null = folderId;
  const byId = Object.fromEntries(folders.map((f) => [f.id, f]));
  while (current) {
    if (current === ancestorId) return true;
    current = byId[current]?.parentId ?? null;
  }
  return false;
}

function FolderTree({
  folders,
  selectedId,
  onSelect,
}: {
  folders: FolderNode[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  function renderNode(parentId: string | null, depth: number) {
    return folders
      .filter((f) => f.parentId === parentId)
      .map((folder) => (
        <div key={folder.id}>
          <button
            type="button"
            onClick={() => onSelect(folder.id)}
            style={{ paddingLeft: 8 + depth * 12 }}
            className={`flex w-full items-center gap-1.5 rounded-md py-1.5 pr-2 text-left text-sm ${
              selectedId === folder.id
                ? "bg-active text-accent"
                : "text-muted-foreground hover:bg-hover hover:text-accent"
            }`}
          >
            <span className="text-[10px] opacity-70">▦</span>
            {folder.name}
          </button>
          {renderNode(folder.id, depth + 1)}
        </div>
      ));
  }

  if (folders.length === 0) {
    return (
      <p className="px-2 py-1 text-xs text-muted-foreground">No folders yet.</p>
    );
  }

  return <div className="space-y-0.5">{renderNode(null, 0)}</div>;
}

function ListView({
  documents,
  pdmMode,
  onOpen,
}: {
  documents: CadDocument[];
  pdmMode: boolean;
  onOpen: (doc: CadDocument) => void;
}) {
  function onRowKeyDown(event: ReactKeyboardEvent, doc: CadDocument) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onOpen(doc);
    }
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <table className="w-full border-collapse text-left text-sm">
        <thead className="bg-card text-xs uppercase tracking-wide text-muted-foreground">
          <tr>
            <th className="px-3 py-2 font-medium">Name</th>
            <th className="px-3 py-2 font-medium">Type</th>
            <th className="px-3 py-2 font-medium">Labels</th>
            <th className="px-3 py-2 font-medium">Owner</th>
            <th className="px-3 py-2 font-medium">Modified</th>
            <th className="px-3 py-2 font-medium">
              <span className="sr-only">Open</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {documents.map((doc) => (
            <tr
              key={doc.id}
              tabIndex={0}
              role="button"
              aria-label={
                pdmMode || doc.kind === "folder"
                  ? `Open Versions for ${doc.name}`
                  : `Open ${doc.name}`
              }
              className="cursor-pointer border-t border-border bg-muted/40 hover:bg-hover focus-visible:bg-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-accent"
              onClick={() => onOpen(doc)}
              onKeyDown={(e) => onRowKeyDown(e, doc)}
            >
              <td className="px-3 py-2.5 font-medium text-foreground">
                <span className="mr-2 text-faint">{KIND_GLYPH[doc.kind]}</span>
                {doc.name}
              </td>
              <td className="px-3 py-2.5 capitalize text-muted-foreground">
                {pdmMode || doc.kind === "folder" ? "PDM project" : doc.kind}
              </td>
              <td className="px-3 py-2.5">
                <div className="flex flex-wrap gap-1">
                  {doc.labels.map((label) => (
                    <span
                      key={label}
                      className="rounded border border-border bg-card px-1.5 py-0.5 text-[10px] text-muted-foreground"
                    >
                      {label}
                    </span>
                  ))}
                </div>
              </td>
              <td className="px-3 py-2.5 text-muted-foreground">{doc.owner}</td>
              <td className="px-3 py-2.5 font-mono text-xs text-muted-foreground">
                {formatModified(doc.modifiedAt)}
              </td>
              <td className="px-3 py-2.5 text-right">
                <span className="text-[11px] font-medium text-accent">
                  {pdmMode || doc.kind === "folder" ? "Open Versions" : "Open"}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StructureView({
  documents,
  roots,
  pdmMode,
  onOpen,
}: {
  documents: CadDocument[];
  roots: CadDocument[];
  pdmMode: boolean;
  onOpen: (doc: CadDocument) => void;
}) {
  const byId = Object.fromEntries(documents.map((d) => [d.id, d]));

  function renderDoc(doc: CadDocument, depth: number) {
    const children = (doc.children ?? [])
      .map((id) => byId[id])
      .filter(Boolean) as CadDocument[];

    return (
      <div key={doc.id}>
        <button
          type="button"
          onClick={() => onOpen(doc)}
          style={{ paddingLeft: 12 + depth * 16 }}
          className="flex w-full items-center gap-2 border-b border-border/60 py-2 text-left text-sm hover:bg-hover"
        >
          <span className="w-4 text-center text-faint">
            {KIND_GLYPH[doc.kind]}
          </span>
          <span className="font-medium text-foreground">{doc.name}</span>
          <span className="text-xs capitalize text-muted-foreground">
            {pdmMode || doc.kind === "folder" ? "PDM" : doc.kind}
          </span>
          <span className="ml-auto pr-2 text-[11px] font-medium text-accent">
            {pdmMode || doc.kind === "folder" ? "Open Versions" : "Open"}
          </span>
        </button>
        {children.map((child) => renderDoc(child, depth + 1))}
      </div>
    );
  }

  const topLevel =
    roots.length > 0
      ? roots
      : visibleRootsFallback(documents);

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-muted/30">
      {topLevel.map((doc) => renderDoc(doc, 0))}
    </div>
  );
}

function visibleRootsFallback(documents: CadDocument[]): CadDocument[] {
  const childIds = new Set(documents.flatMap((d) => d.children ?? []));
  return documents.filter((d) => !childIds.has(d.id));
}

export default DocumentsPage;
