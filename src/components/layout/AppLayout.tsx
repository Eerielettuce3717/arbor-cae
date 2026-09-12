import { useState, type ReactNode } from "react";

export interface WorkspaceTab {
  id: string;
  title: string;
  kind: "part" | "assembly" | "drawing";
  dirty?: boolean;
}

export interface AppLayoutProps {
  tabs?: WorkspaceTab[];
  activeTabId?: string;
  onSelectTab?: (tabId: string) => void;
  onCloseTab?: (tabId: string) => void;
  onBackToDocuments?: () => void;
  onOpenVersions?: () => void;
  onOpenReleases?: () => void;
  children?: ReactNode;
}

const DEFAULT_TABS: WorkspaceTab[] = [
  { id: "d-2", title: "Drive Assembly", kind: "assembly", dirty: true },
  { id: "d-1", title: "Bracket Plate", kind: "part" },
  { id: "d-3", title: "Housing A Drawing", kind: "drawing" },
];

const TOOLBAR_GROUPS = [
  {
    id: "sketch",
    label: "Sketch",
    tools: ["Line", "Arc", "Circle", "Rect", "Fillet"],
  },
  {
    id: "feature",
    label: "Feature",
    tools: ["Extrude", "Revolve", "Hole", "Pattern", "Boolean"],
  },
  {
    id: "view",
    label: "View",
    tools: ["Fit", "Iso", "Section", "Edges"],
  },
];

const FEATURE_TREE = [
  { id: "origin", label: "Origin", kind: "system" },
  { id: "planes", label: "Planes (Front / Top / Right)", kind: "system" },
  { id: "sk1", label: "Sketch 1", kind: "sketch" },
  { id: "ex1", label: "Extrude 1", kind: "feature" },
  { id: "sk2", label: "Sketch 2", kind: "sketch" },
  { id: "cut1", label: "Extrude Cut 1", kind: "feature" },
  { id: "fil1", label: "Fillet 1", kind: "feature" },
];

export function AppLayout({
  tabs = DEFAULT_TABS,
  activeTabId,
  onSelectTab,
  onCloseTab,
  onBackToDocuments,
  onOpenVersions,
  onOpenReleases,
  children,
}: AppLayoutProps) {
  const [internalActive, setInternalActive] = useState(
    activeTabId ?? tabs[0]?.id ?? "",
  );
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeTool, setActiveTool] = useState("Extrude");
  const [panelCollapsed, setPanelCollapsed] = useState(false);
  const [selectedFeatureId, setSelectedFeatureId] = useState("ex1");

  const currentTabId = activeTabId ?? internalActive;
  const activeTab = tabs.find((t) => t.id === currentTabId) ?? tabs[0];

  function selectTab(id: string) {
    setInternalActive(id);
    onSelectTab?.(id);
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-eng-bg text-eng-text">
      {/* Top chrome: Document Menu + Document Tabs */}
      <div className="flex shrink-0 items-stretch border-b border-eng-border bg-eng-panel">
        <div className="relative flex items-center border-r border-eng-border">
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            className="flex h-full items-center gap-2 px-3 text-sm font-semibold tracking-tight text-eng-text hover:bg-eng-hover"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
          >
            <span className="flex h-6 w-6 items-center justify-center rounded bg-sky-700 text-[10px] font-bold text-white">
              CE
            </span>
            Document
            <span className="text-[10px] text-eng-muted">▾</span>
          </button>
          {menuOpen && (
            <div
              role="menu"
              className="absolute left-0 top-full z-40 w-56 overflow-hidden rounded-b-md border border-eng-border border-t-0 bg-eng-elevated shadow-2xl"
            >
              {(
                [
                  { type: "item", label: "New Part Studio" },
                  { type: "item", label: "New Assembly" },
                  { type: "item", label: "New Drawing" },
                  { type: "sep", label: "sep-1" },
                  { type: "item", label: "Open…" },
                  { type: "item", label: "Save" },
                  { type: "item", label: "Save As…" },
                  { type: "item", label: "Export STEP…" },
                  { type: "sep", label: "sep-2" },
                  { type: "item", label: "Document properties" },
                  { type: "item", label: "Close document" },
                ] as const
              ).map((item) =>
                item.type === "sep" ? (
                  <div
                    key={item.label}
                    className="my-1 border-t border-eng-border"
                  />
                ) : (
                  <button
                    key={item.label}
                    type="button"
                    role="menuitem"
                    className="block w-full px-3 py-2 text-left text-sm text-eng-text hover:bg-eng-hover"
                    onClick={() => {
                      setMenuOpen(false);
                      if (item.label === "Close document") {
                        onBackToDocuments?.();
                      }
                    }}
                  >
                    {item.label}
                  </button>
                ),
              )}
            </div>
          )}
        </div>

        <div className="flex min-w-0 flex-1 items-end overflow-x-auto">
          {tabs.map((tab) => {
            const isActive = tab.id === currentTabId;
            return (
              <div
                key={tab.id}
                className={`group flex max-w-[200px] items-center gap-1 border-r border-eng-border px-3 py-2 text-xs ${
                  isActive
                    ? "border-b-2 border-b-sky-500 bg-eng-bg text-eng-text"
                    : "border-b-2 border-b-transparent text-eng-muted hover:bg-eng-hover hover:text-eng-text"
                }`}
              >
                <button
                  type="button"
                  onClick={() => selectTab(tab.id)}
                  className="min-w-0 truncate font-medium"
                  title={tab.title}
                >
                  <span className="mr-1.5 text-[10px] uppercase text-eng-faint">
                    {tab.kind[0]}
                  </span>
                  {tab.title}
                  {tab.dirty && (
                    <span className="ml-1 text-amber-400" title="Unsaved">
                      ●
                    </span>
                  )}
                </button>
                <button
                  type="button"
                  aria-label={`Close ${tab.title}`}
                  onClick={() => onCloseTab?.(tab.id)}
                  className="rounded px-1 text-eng-faint opacity-0 hover:bg-eng-active hover:text-eng-text group-hover:opacity-100"
                >
                  ×
                </button>
              </div>
            );
          })}
        </div>

        <div className="flex items-center gap-2 border-l border-eng-border px-3">
          {onBackToDocuments && (
            <button
              type="button"
              onClick={onBackToDocuments}
              className="rounded border border-eng-border px-2 py-1 text-[11px] text-eng-muted hover:border-sky-700 hover:text-sky-300"
            >
              Documents
            </button>
          )}
          {onOpenVersions && (
            <button
              type="button"
              onClick={onOpenVersions}
              className="rounded border border-eng-border px-2 py-1 text-[11px] text-eng-muted hover:border-sky-700 hover:text-sky-300"
            >
              Versions
            </button>
          )}
          {onOpenReleases && (
            <button
              type="button"
              onClick={onOpenReleases}
              className="rounded border border-eng-border px-2 py-1 text-[11px] text-eng-muted hover:border-sky-700 hover:text-sky-300"
            >
              Releases
            </button>
          )}
          <span className="font-mono text-[10px] text-eng-faint">mm · ISO</span>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex shrink-0 flex-wrap items-center gap-4 border-b border-eng-border bg-eng-elevated/80 px-2 py-1.5">
        {TOOLBAR_GROUPS.map((group) => (
          <div key={group.id} className="flex items-center gap-1">
            <span className="mr-1 text-[10px] font-semibold uppercase tracking-wider text-eng-faint">
              {group.label}
            </span>
            {group.tools.map((tool) => (
              <button
                key={tool}
                type="button"
                onClick={() => setActiveTool(tool)}
                className={`rounded px-2 py-1 text-xs ${
                  activeTool === tool
                    ? "bg-sky-700 text-white"
                    : "text-eng-muted hover:bg-eng-hover hover:text-eng-text"
                }`}
              >
                {tool}
              </button>
            ))}
          </div>
        ))}
        <div className="ml-auto flex items-center gap-2 text-[11px] text-eng-muted">
          <span>
            Active: <span className="font-medium text-sky-300">{activeTool}</span>
          </span>
          <span className="text-eng-faint">|</span>
          <span>{activeTab?.title ?? "No document"}</span>
        </div>
      </div>

      <div className="flex min-h-0 flex-1">
        {/* Document Panel (feature tree) */}
        <aside
          className={`flex shrink-0 flex-col border-r border-eng-border bg-eng-panel transition-[width] ${
            panelCollapsed ? "w-10" : "w-64"
          }`}
        >
          <div className="flex items-center justify-between border-b border-eng-border px-2 py-1.5">
            {!panelCollapsed && (
              <span className="text-[11px] font-semibold uppercase tracking-wide text-eng-muted">
                Document Panel
              </span>
            )}
            <button
              type="button"
              onClick={() => setPanelCollapsed((v) => !v)}
              className="rounded px-1.5 py-0.5 text-xs text-eng-muted hover:bg-eng-hover hover:text-eng-text"
              title={panelCollapsed ? "Expand panel" : "Collapse panel"}
            >
              {panelCollapsed ? "»" : "«"}
            </button>
          </div>
          {!panelCollapsed && (
            <div className="min-h-0 flex-1 overflow-y-auto p-1">
              {FEATURE_TREE.map((node) => (
                <button
                  key={node.id}
                  type="button"
                  onClick={() => setSelectedFeatureId(node.id)}
                  className={`flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs ${
                    selectedFeatureId === node.id
                      ? "bg-eng-active text-sky-300"
                      : "text-eng-muted hover:bg-eng-hover hover:text-eng-text"
                  }`}
                >
                  <span className="w-3 text-center text-[10px] text-eng-faint">
                    {node.kind === "sketch"
                      ? "◇"
                      : node.kind === "feature"
                        ? "▣"
                        : "·"}
                  </span>
                  {node.label}
                </button>
              ))}
            </div>
          )}
        </aside>

        {/* Viewport / workspace content */}
        <section className="relative min-w-0 flex-1 bg-[#0b1220]">
          {children ?? (
            <div className="absolute inset-0 flex flex-col">
              <div
                className="pointer-events-none absolute inset-0 opacity-[0.12]"
                style={{
                  backgroundImage:
                    "linear-gradient(#64748b 1px, transparent 1px), linear-gradient(90deg, #64748b 1px, transparent 1px)",
                  backgroundSize: "32px 32px",
                }}
              />
              <div className="relative z-10 flex flex-1 flex-col items-center justify-center gap-2 text-center">
                <p className="font-mono text-xs uppercase tracking-[0.2em] text-slate-500">
                  Viewport
                </p>
                <p className="max-w-md text-sm text-slate-400">
                  CAD canvas shell — WebGL / wgpu renderer mounts here.
                  Selection, orbit, and sketch overlays attach to this surface.
                </p>
                <div className="mt-4 flex gap-6 font-mono text-[10px] text-slate-600">
                  <span>X →</span>
                  <span>Y ↑</span>
                  <span>Z ⊙</span>
                </div>
              </div>
              <div className="relative z-10 flex items-center justify-between border-t border-eng-border/60 bg-eng-panel/90 px-3 py-1 text-[10px] text-eng-muted">
                <span>Ready</span>
                <span className="font-mono">
                  {activeTab?.kind ?? "—"} · {selectedFeatureId}
                </span>
                <span>Perspective · Shaded w/ edges</span>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

export default AppLayout;
