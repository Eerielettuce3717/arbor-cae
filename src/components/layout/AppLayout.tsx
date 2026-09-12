import { useCallback, useEffect, useState, type ReactNode } from "react";
import type { AnalysisToolId, MeshBuffers } from "../../cad/types";
import { useFeatureStore } from "../../store/featureStore";
import type { FeatureToolType } from "../../store/featureTypes";
import { useSketchStore } from "../../store/sketchStore";
import { AssemblyWorkspace, InstanceTree } from "../assembly";
import { DrawingTree, DrawingWorkspace } from "../drawings";
import { AnalysisPanel } from "../analysis/AnalysisPanel";
import {
  FeatureEditor,
  FeatureList,
  SketchCanvas,
  SketchTool,
} from "../partstudio";
import { useAssemblyStore } from "../../store/assemblyStore";
import {
  MATE_CATALOG,
  RELATION_CATALOG,
  type AssemblyToolId,
} from "../../store/assemblyTypes";
import { useDrawingStore } from "../../store/drawingStore";
import {
  DRAWING_TOOLBAR_GROUPS,
  type DrawingToolId,
} from "../../store/drawingTypes";
import { Viewport3D } from "../viewport/Viewport3D";

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

const SKETCH_TOOL_MAP: Record<string, SketchTool> = {
  Line: SketchTool.Line,
  Arc: SketchTool.ThreePointArc,
  Circle: SketchTool.CenterPointCircle,
  Rect: SketchTool.CornerRectangle,
  Fillet: SketchTool.SketchFillet,
};

const FEATURE_TOOL_MAP: Record<string, FeatureToolType> = {
  Extrude: "extrude",
  Revolve: "revolve",
  Hole: "hole",
  Boolean: "boolean",
  Sculpt: "sculpt",
};

const TOOLBAR_GROUPS: {
  id: string;
  label: string;
  tools: string[];
}[] = [
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
    id: "form",
    label: "Form",
    tools: ["Sculpt"],
  },
  {
    id: "analyze",
    label: "Analyze",
    tools: [
      "Measure",
      "Mass Props",
      "Zebra",
      "Curvature",
      "Draft",
      "Thickness",
      "Interference",
    ],
  },
  {
    id: "view",
    label: "View",
    tools: ["Fit", "Iso", "Section", "Edges"],
  },
];

const ASSEMBLY_TOOLBAR_GROUPS: {
  id: string;
  label: string;
  tools: { id: AssemblyToolId; label: string }[];
}[] = [
  {
    id: "insert",
    label: "Insert",
    tools: [
      { id: "insert", label: "Insert" },
      { id: "link", label: "Link" },
      { id: "updateRefs", label: "Update refs" },
    ],
  },
  {
    id: "mates",
    label: "Mates",
    tools: MATE_CATALOG.map((m) => ({ id: m.type, label: m.label })),
  },
  {
    id: "assembly",
    label: "Assembly",
    tools: [
      { id: "group", label: "Group" },
      { id: "snapMode", label: "Snap Mode" },
      { id: "showMates", label: "Show Mates" },
      { id: "replicate", label: "Replicate" },
      { id: "replace", label: "Replace" },
      { id: "linearPattern", label: "Linear Pattern" },
      { id: "circularPattern", label: "Circular Pattern" },
      { id: "mirror", label: "Mirror" },
    ],
  },
  {
    id: "relations",
    label: "Relations",
    tools: RELATION_CATALOG.map((r) => ({ id: r.type, label: r.label })),
  },
  {
    id: "states",
    label: "States",
    tools: [
      { id: "namedPositions", label: "Named Positions" },
      { id: "displayStates", label: "Display States" },
      { id: "explodedViews", label: "Exploded Views" },
      { id: "inContext", label: "In Context" },
      { id: "bom", label: "BOM" },
    ],
  },
];

const TOOL_TO_ANALYSIS: Record<string, AnalysisToolId> = {
  Measure: "measure",
  "Mass Props": "mass-properties",
  Zebra: "zebra-stripes",
  Curvature: "curvature-color-map",
  Draft: "draft-analysis",
  Thickness: "thickness-analysis",
  Interference: "interference-detection",
};

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
  const [analysisTool, setAnalysisTool] = useState<AnalysisToolId | null>(
    null,
  );
  const [occtMesh, setOcctMesh] = useState<MeshBuffers | null>(null);

  const currentTabId = activeTabId ?? internalActive;
  const activeTab = tabs.find((t) => t.id === currentTabId) ?? tabs[0];
  const isAssembly = activeTab?.kind === "assembly";
  const isDrawing = activeTab?.kind === "drawing";

  function selectTab(id: string) {
    setInternalActive(id);
    onSelectTab?.(id);
  }

  const sketchActive = useSketchStore((s) => s.active);
  const setSketchActive = useSketchStore((s) => s.setActive);
  const setSketchTool = useSketchStore((s) => s.setActiveTool);

  const selectedFeatureId = useFeatureStore((s) => s.selectedFeatureId);
  const features = useFeatureStore((s) => s.features);
  const lastMesh = useFeatureStore((s) => s.lastMesh);
  const addFeature = useFeatureStore((s) => s.addFeature);
  const openEditor = useFeatureStore((s) => s.openEditor);
  const selectFeature = useFeatureStore((s) => s.selectFeature);
  const updateFeatureParams = useFeatureStore((s) => s.updateFeatureParams);

  const assemblyTool = useAssemblyStore((s) => s.activeTool);
  const setAssemblyTool = useAssemblyStore((s) => s.setActiveTool);
  const assemblyStatus = useAssemblyStore((s) => s.statusMessage);
  const snapMode = useAssemblyStore((s) => s.snapMode);
  const showMatesMode = useAssemblyStore((s) => s.showMatesMode);

  const drawingTool = useDrawingStore((s) => s.activeTool);
  const setDrawingTool = useDrawingStore((s) => s.setActiveTool);
  const drawingStatus = useDrawingStore((s) => s.statusMessage);

  const selectedFeature = features.find((f) => f.id === selectedFeatureId);
  const sculptActive =
    selectedFeature?.type === "sculpt" && !selectedFeature.suppressed;
  const sculptParams = sculptActive
    ? (selectedFeature.params as {
        size?: number;
        levels?: number;
        cageVertices?: number[];
        showCage?: boolean;
      })
    : null;

  useEffect(() => {
    if (lastMesh) setOcctMesh(lastMesh);
  }, [lastMesh]);

  const onSculptCageChanged = useCallback(
    (cageVertices: number[]) => {
      if (!selectedFeatureId || !sculptActive) return;
      updateFeatureParams(selectedFeatureId, { cageVertices });
    },
    [selectedFeatureId, sculptActive, updateFeatureParams],
  );

  const onSculptLevelsChanged = useCallback(
    (levels: number) => {
      if (!selectedFeatureId || !sculptActive) return;
      updateFeatureParams(selectedFeatureId, { levels });
    },
    [selectedFeatureId, sculptActive, updateFeatureParams],
  );

  const onSelectTool = useCallback(
    (tool: string) => {
      setActiveTool(tool);
      const analysis = TOOL_TO_ANALYSIS[tool];
      if (analysis) setAnalysisTool(analysis);

      const sketchTool = SKETCH_TOOL_MAP[tool];
      if (sketchTool) {
        const selected = features.find((f) => f.id === selectedFeatureId);
        setSketchActive(true, {
          id:
            selected?.type === "sketch"
              ? selected.id
              : (features.find((f) => f.type === "sketch")?.id ?? "sk1"),
          name:
            selected?.type === "sketch"
              ? selected.name
              : (features.find((f) => f.type === "sketch")?.name ?? "Sketch 1"),
        });
        setSketchTool(sketchTool);
        return;
      }

      const featureType = FEATURE_TOOL_MAP[tool];
      if (featureType) {
        const existing = features.find((f) => f.type === featureType);
        if (existing) {
          selectFeature(existing.id);
          openEditor(existing.id);
        } else {
          addFeature(featureType);
        }
      }
    },
    [
      addFeature,
      features,
      openEditor,
      selectFeature,
      selectedFeatureId,
      setSketchActive,
      setSketchTool,
    ],
  );

  const onMeshReady = useCallback((mesh: MeshBuffers) => {
    setOcctMesh(mesh);
  }, []);

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
        {isDrawing
          ? DRAWING_TOOLBAR_GROUPS.map((group) => (
              <div key={group.id} className="flex items-center gap-1">
                <span className="mr-1 text-[10px] font-semibold uppercase tracking-wider text-eng-faint">
                  {group.label}
                </span>
                {group.tools.map((tool) => {
                  const active = drawingTool === tool.id;
                  return (
                    <button
                      key={tool.id}
                      type="button"
                      onClick={() => setDrawingTool(tool.id as DrawingToolId)}
                      className={`rounded px-2 py-1 text-xs ${
                        active
                          ? "bg-sky-700 text-white"
                          : "text-eng-muted hover:bg-eng-hover hover:text-eng-text"
                      }`}
                    >
                      {tool.label}
                    </button>
                  );
                })}
              </div>
            ))
          : isAssembly
            ? ASSEMBLY_TOOLBAR_GROUPS.map((group) => (
                <div key={group.id} className="flex items-center gap-1">
                  <span className="mr-1 text-[10px] font-semibold uppercase tracking-wider text-eng-faint">
                    {group.label}
                  </span>
                  {group.tools.map((tool) => {
                    const toggled =
                      (tool.id === "snapMode" && snapMode) ||
                      (tool.id === "showMates" && showMatesMode);
                    const active = assemblyTool === tool.id || toggled;
                    return (
                      <button
                        key={tool.id}
                        type="button"
                        onClick={() => setAssemblyTool(tool.id)}
                        className={`rounded px-2 py-1 text-xs ${
                          active
                            ? "bg-sky-700 text-white"
                            : "text-eng-muted hover:bg-eng-hover hover:text-eng-text"
                        }`}
                      >
                        {tool.label}
                      </button>
                    );
                  })}
                </div>
              ))
            : TOOLBAR_GROUPS.map((group) => (
                <div key={group.id} className="flex items-center gap-1">
                  <span className="mr-1 text-[10px] font-semibold uppercase tracking-wider text-eng-faint">
                    {group.label}
                  </span>
                  {group.tools.map((tool) => (
                    <button
                      key={tool}
                      type="button"
                      onClick={() => onSelectTool(tool)}
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
            Active:{" "}
            <span className="font-medium text-sky-300">
              {isDrawing ? drawingTool : isAssembly ? assemblyTool : activeTool}
            </span>
          </span>
          <span className="text-eng-faint">|</span>
          <span>{activeTab?.title ?? "No document"}</span>
          {isDrawing && (
            <>
              <span className="text-eng-faint">|</span>
              <span className="max-w-[240px] truncate text-sky-300/80">
                {drawingStatus}
              </span>
            </>
          )}
          {isAssembly && (
            <>
              <span className="text-eng-faint">|</span>
              <span className="max-w-[240px] truncate text-sky-300/80">
                {assemblyStatus}
              </span>
            </>
          )}
          {!isAssembly && !isDrawing && selectedFeatureId && (
            <>
              <span className="text-eng-faint">|</span>
              <span className="text-sky-300/80">
                {features.find((f) => f.id === selectedFeatureId)?.name ??
                  selectedFeatureId}
              </span>
            </>
          )}
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
                {isDrawing
                  ? "Drawing Tree"
                  : isAssembly
                    ? "Instance Tree"
                    : "Feature Tree"}
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
          {!panelCollapsed &&
            (isDrawing ? (
              <DrawingTree />
            ) : isAssembly ? (
              <InstanceTree />
            ) : (
              <FeatureList
                onMeshReady={onMeshReady}
                onActivateSketch={(feature) => {
                  setSketchActive(true, {
                    id: feature.id,
                    name: feature.name,
                  });
                }}
              />
            ))}
        </aside>

        {/* Viewport / workspace content */}
        <section className="relative min-w-0 flex-1 bg-[#0b1220]">
          {children ??
            (isDrawing ? (
              <DrawingWorkspace />
            ) : isAssembly ? (
              <AssemblyWorkspace />
            ) : (
              <>
                <Viewport3D
                  occtMesh={sculptActive ? null : occtMesh}
                  sculptActive={sculptActive}
                  sculptParams={sculptParams}
                  onSculptCageChanged={onSculptCageChanged}
                  onSculptLevelsChanged={onSculptLevelsChanged}
                />
                <AnalysisPanel
                  activeTool={analysisTool}
                  onClose={() => setAnalysisTool(null)}
                  onMeshReady={onMeshReady}
                />
                {sketchActive && <SketchCanvas />}
                <FeatureEditor />
              </>
            ))}
        </section>
      </div>
    </div>
  );
}

export default AppLayout;
