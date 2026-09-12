import { useMemo, useState } from "react";

type ViewMode = "list" | "structure";
type OrgSection =
  | "folders"
  | "labels"
  | "filters"
  | "trash"
  | "integrations";

type DocumentKind = "part" | "assembly" | "drawing" | "folder";
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

const MOCK_FOLDERS: FolderNode[] = [
  { id: "f-root", name: "Workspace", parentId: null },
  { id: "f-mech", name: "Mechanical", parentId: "f-root" },
  { id: "f-elec", name: "Electronics Enclosures", parentId: "f-root" },
  { id: "f-proto", name: "Prototypes", parentId: "f-mech" },
  { id: "f-rel", name: "Release Candidates", parentId: "f-mech" },
];

const MOCK_DOCUMENTS: CadDocument[] = [
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
];

const MOCK_LABELS = ["WIP", "Released", "Critical", "Aluminum", "Plastic"];
const MOCK_FILTERS = [
  { id: "mine", name: "Owned by me" },
  { id: "week", name: "Modified this week" },
  { id: "parts", name: "Parts only" },
  { id: "assy", name: "Assemblies only" },
];

const KIND_GLYPH: Record<DocumentKind, string> = {
  part: "◼",
  assembly: "⧉",
  drawing: "▭",
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

export interface DocumentsPageProps {
  onOpenDocument?: (documentId: string) => void;
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
  const [selectedFolderId, setSelectedFolderId] = useState("f-mech");
  const [activeLabels, setActiveLabels] = useState<string[]>([]);
  const [activeFilterIds, setActiveFilterIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);
  const [showCreateMenu, setShowCreateMenu] = useState(false);
  const [showUnitsPanel, setShowUnitsPanel] = useState(false);
  const [defaultUnit, setDefaultUnit] = useState<LengthUnit>("mm");
  const [advancedKind, setAdvancedKind] = useState<DocumentKind | "any">("any");
  const [advancedOwner, setAdvancedOwner] = useState("");

  const visibleDocs = useMemo(() => {
    const inTrash = orgSection === "trash";
    return MOCK_DOCUMENTS.filter((doc) => {
      if (inTrash) return doc.folderId === "f-trash";
      if (doc.folderId === "f-trash") return false;

      if (orgSection === "folders") {
        const folderMatch =
          doc.folderId === selectedFolderId ||
          isDescendantFolder(selectedFolderId, doc.folderId);
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

  return (
    <div className="flex h-full min-h-0 bg-eng-bg text-eng-text">
      {/* Organization rail */}
      <aside className="flex w-60 shrink-0 flex-col border-r border-eng-border bg-eng-panel">
        <div className="relative border-b border-eng-border p-3">
          <button
            type="button"
            onClick={() => setShowCreateMenu((v) => !v)}
            className="flex w-full items-center justify-between rounded-md bg-sky-600 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-500"
          >
            Create
            <span className="text-xs opacity-80">▾</span>
          </button>
          {showCreateMenu && (
            <div className="absolute left-3 right-3 z-20 mt-1 overflow-hidden rounded-md border border-eng-border bg-eng-elevated shadow-xl">
              {[
                ["Part Studio", "part"],
                ["Assembly", "assembly"],
                ["Drawing", "drawing"],
                ["Folder", "folder"],
              ].map(([label]) => (
                <button
                  key={label}
                  type="button"
                  className="block w-full px-3 py-2 text-left text-sm text-eng-text hover:bg-eng-hover"
                  onClick={() => setShowCreateMenu(false)}
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
                  ? "bg-eng-active font-medium text-sky-300"
                  : "text-eng-muted hover:bg-eng-hover hover:text-eng-text"
              }`}
            >
              {label}
            </button>
          ))}
        </nav>

        <div className="min-h-0 flex-1 overflow-y-auto border-t border-eng-border p-2">
          {orgSection === "folders" && (
            <FolderTree
              folders={MOCK_FOLDERS}
              selectedId={selectedFolderId}
              onSelect={setSelectedFolderId}
            />
          )}
          {orgSection === "labels" && (
            <ul className="space-y-1">
              {MOCK_LABELS.map((label) => (
                <li key={label}>
                  <button
                    type="button"
                    onClick={() => toggleLabel(label)}
                    className={`flex w-full items-center justify-between rounded-md px-2 py-1.5 text-sm ${
                      activeLabels.includes(label)
                        ? "bg-eng-active text-sky-300"
                        : "text-eng-muted hover:bg-eng-hover"
                    }`}
                  >
                    <span>{label}</span>
                    {activeLabels.includes(label) && (
                      <span className="text-xs">●</span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
          {orgSection === "filters" && (
            <ul className="space-y-1">
              {MOCK_FILTERS.map((filter) => (
                <li key={filter.id}>
                  <button
                    type="button"
                    onClick={() => toggleFilter(filter.id)}
                    className={`w-full rounded-md px-2 py-1.5 text-left text-sm ${
                      activeFilterIds.includes(filter.id)
                        ? "bg-eng-active text-sky-300"
                        : "text-eng-muted hover:bg-eng-hover"
                    }`}
                  >
                    {filter.name}
                  </button>
                </li>
              ))}
            </ul>
          )}
          {orgSection === "trash" && (
            <p className="px-2 py-1 text-xs leading-relaxed text-eng-muted">
              Deleted documents appear here. Restore or permanently remove from
              the list view.
            </p>
          )}
          {orgSection === "integrations" && (
            <ul className="space-y-1">
              {["Git LFS / repo sync", "STEP import watch", "PLM connector"].map(
                (name) => (
                  <li
                    key={name}
                    className="rounded-md border border-dashed border-eng-border px-2 py-2 text-sm text-eng-muted"
                  >
                    {name}
                    <div className="mt-1 text-[10px] uppercase tracking-wide text-amber-400/90">
                      Mock · not connected
                    </div>
                  </li>
                ),
              )}
            </ul>
          )}
        </div>

        <div className="border-t border-eng-border p-3">
          <button
            type="button"
            onClick={() => setShowUnitsPanel((v) => !v)}
            className="flex w-full items-center justify-between rounded-md border border-eng-border bg-eng-elevated px-2.5 py-2 text-left text-xs text-eng-muted hover:border-sky-700 hover:text-eng-text"
          >
            <span>Default units</span>
            <span className="font-mono font-semibold text-sky-300">
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
                      ? "bg-sky-600 text-white"
                      : "bg-eng-hover text-eng-muted hover:text-eng-text"
                  }`}
                >
                  {unit}
                </button>
              ))}
            </div>
          )}
        </div>
      </aside>

      {/* Main dashboard */}
      <main className="flex min-w-0 flex-1 flex-col">
        <header className="flex flex-wrap items-center gap-3 border-b border-eng-border bg-eng-panel px-4 py-3">
          <div>
            <h1 className="text-base font-semibold tracking-tight text-eng-text">
              Documents
            </h1>
            <p className="text-xs text-eng-muted">
              Local workspace · units {defaultUnit}
            </p>
          </div>

          <div className="ml-auto flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onOpenVersions}
              className="rounded-md border border-eng-border px-2.5 py-1.5 text-xs font-medium text-eng-muted hover:border-sky-700 hover:text-sky-300"
            >
              Versions
            </button>
            <button
              type="button"
              onClick={onOpenReleases}
              className="rounded-md border border-eng-border px-2.5 py-1.5 text-xs font-medium text-eng-muted hover:border-sky-700 hover:text-sky-300"
            >
              Releases
            </button>
            <div className="flex items-center gap-1 rounded-md border border-eng-border bg-eng-elevated p-0.5">
              <button
                type="button"
                onClick={() => setViewMode("list")}
                className={`rounded px-2.5 py-1 text-xs font-medium ${
                  viewMode === "list"
                    ? "bg-eng-active text-sky-300"
                    : "text-eng-muted hover:text-eng-text"
                }`}
              >
                List View
              </button>
              <button
                type="button"
                onClick={() => setViewMode("structure")}
                className={`rounded px-2.5 py-1 text-xs font-medium ${
                  viewMode === "structure"
                    ? "bg-eng-active text-sky-300"
                    : "text-eng-muted hover:text-eng-text"
                }`}
              >
                Structure View
              </button>
            </div>

            <div className="relative">
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search documents…"
                className="w-56 rounded-md border border-eng-border bg-eng-elevated px-3 py-1.5 text-sm text-eng-text placeholder:text-eng-faint focus:border-sky-600 focus:outline-none focus:ring-1 focus:ring-sky-600"
              />
            </div>
            <button
              type="button"
              onClick={() => setShowAdvancedSearch((v) => !v)}
              className={`rounded-md border px-2.5 py-1.5 text-xs font-medium ${
                showAdvancedSearch
                  ? "border-sky-600 bg-sky-950/50 text-sky-300"
                  : "border-eng-border text-eng-muted hover:border-sky-800 hover:text-eng-text"
              }`}
            >
              Advanced Search
            </button>
          </div>
        </header>

        {showAdvancedSearch && (
          <div className="flex flex-wrap items-end gap-3 border-b border-eng-border bg-eng-elevated/60 px-4 py-3">
            <label className="flex flex-col gap-1 text-xs text-eng-muted">
              Kind
              <select
                value={advancedKind}
                onChange={(e) =>
                  setAdvancedKind(e.target.value as DocumentKind | "any")
                }
                className="rounded border border-eng-border bg-eng-panel px-2 py-1.5 text-sm text-eng-text"
              >
                <option value="any">Any</option>
                <option value="part">Part</option>
                <option value="assembly">Assembly</option>
                <option value="drawing">Drawing</option>
              </select>
            </label>
            <label className="flex flex-col gap-1 text-xs text-eng-muted">
              Owner contains
              <input
                value={advancedOwner}
                onChange={(e) => setAdvancedOwner(e.target.value)}
                className="rounded border border-eng-border bg-eng-panel px-2 py-1.5 text-sm text-eng-text"
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
              className="rounded border border-eng-border px-3 py-1.5 text-xs text-eng-muted hover:text-eng-text"
            >
              Clear all
            </button>
          </div>
        )}

        <div className="min-h-0 flex-1 overflow-auto p-4">
          {viewMode === "list" ? (
            <ListView documents={visibleDocs} onOpen={onOpenDocument} />
          ) : (
            <StructureView
              documents={visibleDocs}
              roots={structureRoots}
              onOpen={onOpenDocument}
            />
          )}
          {visibleDocs.length === 0 && (
            <div className="flex h-48 items-center justify-center rounded-lg border border-dashed border-eng-border text-sm text-eng-muted">
              No documents match the current filters.
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function isDescendantFolder(ancestorId: string, folderId: string): boolean {
  if (ancestorId === "f-root") return true;
  let current: string | null = folderId;
  const byId = Object.fromEntries(MOCK_FOLDERS.map((f) => [f.id, f]));
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
                ? "bg-eng-active text-sky-300"
                : "text-eng-muted hover:bg-eng-hover hover:text-eng-text"
            }`}
          >
            <span className="text-[10px] opacity-70">▦</span>
            {folder.name}
          </button>
          {renderNode(folder.id, depth + 1)}
        </div>
      ));
  }

  return <div className="space-y-0.5">{renderNode(null, 0)}</div>;
}

function ListView({
  documents,
  onOpen,
}: {
  documents: CadDocument[];
  onOpen?: (id: string) => void;
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-eng-border">
      <table className="w-full border-collapse text-left text-sm">
        <thead className="bg-eng-panel text-xs uppercase tracking-wide text-eng-muted">
          <tr>
            <th className="px-3 py-2 font-medium">Name</th>
            <th className="px-3 py-2 font-medium">Type</th>
            <th className="px-3 py-2 font-medium">Labels</th>
            <th className="px-3 py-2 font-medium">Owner</th>
            <th className="px-3 py-2 font-medium">Modified</th>
          </tr>
        </thead>
        <tbody>
          {documents.map((doc) => (
            <tr
              key={doc.id}
              className="cursor-pointer border-t border-eng-border bg-eng-elevated/40 hover:bg-eng-hover"
              onDoubleClick={() => onOpen?.(doc.id)}
            >
              <td className="px-3 py-2.5 font-medium text-eng-text">
                <span className="mr-2 text-eng-faint">{KIND_GLYPH[doc.kind]}</span>
                {doc.name}
              </td>
              <td className="px-3 py-2.5 capitalize text-eng-muted">{doc.kind}</td>
              <td className="px-3 py-2.5">
                <div className="flex flex-wrap gap-1">
                  {doc.labels.map((label) => (
                    <span
                      key={label}
                      className="rounded border border-eng-border bg-eng-panel px-1.5 py-0.5 text-[10px] text-eng-muted"
                    >
                      {label}
                    </span>
                  ))}
                </div>
              </td>
              <td className="px-3 py-2.5 text-eng-muted">{doc.owner}</td>
              <td className="px-3 py-2.5 font-mono text-xs text-eng-muted">
                {formatModified(doc.modifiedAt)}
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
  onOpen,
}: {
  documents: CadDocument[];
  roots: CadDocument[];
  onOpen?: (id: string) => void;
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
          onDoubleClick={() => onOpen?.(doc.id)}
          style={{ paddingLeft: 12 + depth * 16 }}
          className="flex w-full items-center gap-2 border-b border-eng-border/60 py-2 text-left text-sm hover:bg-eng-hover"
        >
          <span className="w-4 text-center text-eng-faint">
            {KIND_GLYPH[doc.kind]}
          </span>
          <span className="font-medium text-eng-text">{doc.name}</span>
          <span className="text-xs capitalize text-eng-muted">{doc.kind}</span>
        </button>
        {children.map((child) => renderDoc(child, depth + 1))}
      </div>
    );
  }

  const topLevel =
    roots.length > 0
      ? roots.filter(
          (d) =>
            d.kind === "assembly" ||
            !documents.some((parent) => parent.children?.includes(d.id)),
        )
      : documents;

  return (
    <div className="overflow-hidden rounded-lg border border-eng-border bg-eng-elevated/30">
      {topLevel.map((doc) => renderDoc(doc, 0))}
    </div>
  );
}

export default DocumentsPage;
