import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Settings } from "lucide-react";
import {
  IMPLEMENTED_ANALYSIS_TOOLS,
  type AnalysisToolId,
  type MeshBuffers,
} from "../../cad/types";
import { useCatalogStore } from "../../store/catalogStore";
import { useFeatureStore } from "../../store/featureStore";
import {
  EVALUATED_FEATURE_TOOLS,
  SCULPT_FEATURE_TOOLS,
  type FeatureToolType,
} from "../../store/featureTypes";
import { useSketchStore } from "../../store/sketchStore";
import { AssemblyWorkspace, InstanceTree } from "../assembly";
import { CamTree, CamWorkspace } from "../cam";
import { DrawingTree, DrawingWorkspace } from "../drawings";
import { PcbTree, PcbWorkspace } from "../pcb";
import { RenderSceneList, RenderWorkspace } from "../render";
import { SimulationTree, SimulationWorkspace } from "../simulation";
import { AnalysisPanel } from "../analysis/AnalysisPanel";
import {
  FeatureEditor,
  FeatureList,
  SketchCanvas,
  SketchTool,
} from "../partstudio";
import { IMPLEMENTED_SKETCH_TOOLS } from "../partstudio/types";
import { useAssemblyStore } from "../../store/assemblyStore";
import {
  IMPLEMENTED_ASSEMBLY_TOOLS,
  MATE_CATALOG,
  RELATION_CATALOG,
  type AssemblyToolId,
} from "../../store/assemblyTypes";
import { useCamStore } from "../../store/camStore";
import { CAM_TOOLBAR_GROUPS, type CamToolId } from "../../store/camTypes";
import { useDrawingStore } from "../../store/drawingStore";
import {
  DRAWING_TOOLBAR_GROUPS,
  IMPLEMENTED_DRAWING_TOOLS,
  type DrawingToolId,
} from "../../store/drawingTypes";
import { usePcbStore } from "../../store/pcbStore";
import { PCB_TOOLBAR_GROUPS, type PcbToolId } from "../../store/pcbTypes";
import { useRenderStore } from "../../store/renderStore";
import {
  RENDER_TOOLBAR_GROUPS,
  type RenderToolId,
} from "../../store/renderTypes";
import { useSimulationStore } from "../../store/simulationStore";
import {
  SIMULATION_TOOLBAR_GROUPS,
  type SimulationToolId,
} from "../../store/simulationTypes";
import { Viewport3D } from "../viewport/Viewport3D";
import { PreferencesModal } from "../settings/PreferencesModal";
import { CommandRibbon, type RibbonGroup } from "./CommandRibbon";
import { StudioLayout } from "./StudioLayout";

export interface WorkspaceTab {
  id: string;
  title: string;
  kind:
    | "part"
    | "assembly"
    | "drawing"
    | "cam"
    | "simulation"
    | "render"
    | "pcb";
  dirty?: boolean;
}

export interface StudioChromeProps {
  tabs?: WorkspaceTab[];
  activeTabId?: string;
  workspaceName?: string;
  onSelectTab?: (tabId: string) => void;
  onCloseTab?: (tabId: string) => void;
  onBackToDocuments?: () => void;
  onBackToWorkspaces?: () => void;
  onOpenVersions?: () => void;
  onOpenReleases?: () => void;
  onCreateDocument?: (kind: WorkspaceTab["kind"], label?: string) => void;
  onOpenCatalogDocument?: (doc: {
    id: string;
    title: string;
    kind: WorkspaceTab["kind"];
  }) => void;
  children?: ReactNode;
}

const DEFAULT_TABS: WorkspaceTab[] = [];

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

const VIEW_TOOLS = new Set(["Fit", "Iso", "Section", "Edges"]);

function isPartStudioToolImplemented(tool: string): boolean {
  if (VIEW_TOOLS.has(tool)) return true;
  const analysis = TOOL_TO_ANALYSIS[tool];
  if (analysis) return IMPLEMENTED_ANALYSIS_TOOLS.has(analysis);
  const sketchTool = SKETCH_TOOL_MAP[tool];
  if (sketchTool) return IMPLEMENTED_SKETCH_TOOLS.has(sketchTool);
  const featureType = FEATURE_TOOL_MAP[tool];
  if (featureType) {
    return (
      EVALUATED_FEATURE_TOOLS.has(featureType) ||
      SCULPT_FEATURE_TOOLS.has(featureType)
    );
  }
  // e.g. Pattern — listed but not mapped to a live feature.
  return false;
}

export function StudioChrome({
  tabs = DEFAULT_TABS,
  activeTabId,
  workspaceName,
  onSelectTab,
  onCloseTab,
  onBackToDocuments,
  onOpenVersions,
  onOpenReleases,
  onCreateDocument,
  onOpenCatalogDocument,
  children,
}: StudioChromeProps) {
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
  const [prefsOpen, setPrefsOpen] = useState(false);
  const [insertOpen, setInsertOpen] = useState(false);
  const [sessionDirty, setSessionDirty] = useState(false);

  const currentTabId = activeTabId ?? internalActive;
  const activeTab = tabs.find((t) => t.id === currentTabId) ?? tabs[0];
  const isAssembly = activeTab?.kind === "assembly";
  const isDrawing = activeTab?.kind === "drawing";
  const isCam = activeTab?.kind === "cam";
  const isSimulation = activeTab?.kind === "simulation";
  const isRender = activeTab?.kind === "render";
  const isPcb = activeTab?.kind === "pcb";

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

  const camTool = useCamStore((s) => s.activeCamTool);
  const setCamTool = useCamStore((s) => s.setActiveCamTool);
  const camStatus = useCamStore((s) => s.statusMessage);

  const simulationTool = useSimulationStore((s) => s.activeTool);
  const setSimulationTool = useSimulationStore((s) => s.setActiveTool);
  const simulationStatus = useSimulationStore((s) => s.statusMessage);

  const renderTool = useRenderStore((s) => s.activeTool);
  const setRenderTool = useRenderStore((s) => s.setActiveTool);
  const renderStatus = useRenderStore((s) => s.statusMessage);

  const pcbTool = usePcbStore((s) => s.activeTool);
  const setPcbTool = usePcbStore((s) => s.setActiveTool);
  const pcbStatus = usePcbStore((s) => s.statusMessage);

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

  useEffect(() => {
    setSessionDirty(false);
    let armed = false;
    const arm = window.setTimeout(() => {
      armed = true;
    }, 500);
    const unsubs = [
      useSketchStore.subscribe((s, prev) => {
        if (!armed) return;
        if (s.entities !== prev.entities || s.constraints !== prev.constraints) {
          setSessionDirty(true);
        }
      }),
      useFeatureStore.subscribe((s, prev) => {
        if (!armed) return;
        if (s.features !== prev.features) setSessionDirty(true);
      }),
      useAssemblyStore.subscribe((s, prev) => {
        if (!armed) return;
        if (s.mates !== prev.mates || s.instances !== prev.instances) {
          setSessionDirty(true);
        }
      }),
    ];
    return () => {
      window.clearTimeout(arm);
      for (const unsub of unsubs) unsub();
    };
  }, [currentTabId]);

  useEffect(() => {
    if (activeTab?.kind !== "part") return;
    const catalog = useCatalogStore.getState();
    const doc = catalog.documents.find((d) => d.id === currentTabId);
    const store = useFeatureStore.getState();
    const samplePart =
      catalog.source === "sample" &&
      doc?.kind === "part" &&
      !doc.labels.includes("Local");
    if (store.features.length === 0 && samplePart) {
      store.loadSampleFeatures();
    }
  }, [activeTab?.kind, currentTabId]);

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
      if (!isPartStudioToolImplemented(tool)) return;
      setActiveTool(tool);
      const analysis = TOOL_TO_ANALYSIS[tool];
      if (analysis) {
        setAnalysisTool(analysis);
        return;
      }

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

  const ribbonGroups: RibbonGroup[] = isPcb
    ? PCB_TOOLBAR_GROUPS.map((group) => ({
        id: group.id,
        label: group.label,
        tools: group.tools.map((tool) => ({
          id: tool.id,
          label: tool.label,
          implemented: true,
          active: pcbTool === tool.id,
        })),
      }))
    : isRender
      ? RENDER_TOOLBAR_GROUPS.map((group) => ({
          id: group.id,
          label: group.label,
          tools: group.tools.map((tool) => ({
            id: tool.id,
            label: tool.label,
            implemented: true,
            active: renderTool === tool.id,
          })),
        }))
      : isSimulation
        ? SIMULATION_TOOLBAR_GROUPS.map((group) => ({
            id: group.id,
            label: group.label,
            tools: group.tools.map((tool) => ({
              id: tool.id,
              label: tool.label,
              implemented: true,
              active: simulationTool === tool.id,
            })),
          }))
        : isCam
          ? CAM_TOOLBAR_GROUPS.map((group) => ({
              id: group.id,
              label: group.label,
              tools: group.tools.map((tool) => ({
                id: tool.id,
                label: tool.label,
                implemented: true,
                active: camTool === tool.id,
              })),
            }))
          : isDrawing
            ? DRAWING_TOOLBAR_GROUPS.map((group) => ({
                id: group.id,
                label: group.label,
                tools: group.tools.map((tool) => ({
                  id: tool.id,
                  label: tool.label,
                  implemented: IMPLEMENTED_DRAWING_TOOLS.has(
                    tool.id as DrawingToolId,
                  ),
                  active: drawingTool === tool.id,
                })),
              }))
            : isAssembly
              ? ASSEMBLY_TOOLBAR_GROUPS.map((group) => ({
                  id: group.id,
                  label: group.label,
                  tools: group.tools.map((tool) => ({
                    id: tool.id,
                    label: tool.label,
                    implemented: IMPLEMENTED_ASSEMBLY_TOOLS.has(tool.id),
                    active:
                      assemblyTool === tool.id ||
                      (tool.id === "snapMode" && snapMode) ||
                      (tool.id === "showMates" && showMatesMode),
                  })),
                }))
              : TOOLBAR_GROUPS.map((group) => ({
                  id: group.id,
                  label: group.label,
                  tools: group.tools.map((tool) => ({
                    id: tool,
                    label: tool,
                    implemented: isPartStudioToolImplemented(tool),
                    active: activeTool === tool,
                  })),
                }));

  function onRibbonSelect(id: string) {
    if (isPcb) setPcbTool(id as PcbToolId);
    else if (isRender) setRenderTool(id as RenderToolId);
    else if (isSimulation) setSimulationTool(id as SimulationToolId);
    else if (isCam) setCamTool(id as CamToolId);
    else if (isDrawing) setDrawingTool(id as DrawingToolId);
    else if (isAssembly) setAssemblyTool(id as AssemblyToolId);
    else onSelectTool(id);
  }

  const ribbonStatus = (
    <>
      <span>
        Active:{" "}
        <span className="font-medium text-accent">
          {isPcb
            ? pcbTool
            : isRender
              ? renderTool
              : isSimulation
                ? simulationTool
                : isCam
                  ? camTool
                  : isDrawing
                    ? drawingTool
                    : isAssembly
                      ? assemblyTool
                      : activeTool}
        </span>
      </span>
      <span className="text-faint">|</span>
      <span>{activeTab?.title ?? "No document"}</span>
      {(isPcb || isRender || isSimulation || isCam || isDrawing || isAssembly) && (
        <>
          <span className="text-faint">|</span>
          <span className="max-w-[240px] truncate text-accent/80">
            {isPcb
              ? pcbStatus
              : isRender
                ? renderStatus
                : isSimulation
                  ? simulationStatus
                  : isCam
                    ? camStatus
                    : isDrawing
                      ? drawingStatus
                      : assemblyStatus}
          </span>
        </>
      )}
      {!isAssembly &&
        !isDrawing &&
        !isCam &&
        !isSimulation &&
        !isRender &&
        !isPcb &&
        selectedFeatureId && (
          <>
            <span className="text-faint">|</span>
            <span className="text-accent/80">
              {features.find((f) => f.id === selectedFeatureId)?.name ??
                selectedFeatureId}
            </span>
          </>
        )}
    </>
  );

  return (
    <StudioLayout
      workspaceName={workspaceName}
      documentTitle={activeTab?.title}
      studioKind={activeTab?.kind}
      dirty={sessionDirty}
      onExitToWorkspace={onBackToDocuments}
      onSave={() => setSessionDirty(false)}
    >
    <div
      data-explorer="workspace"
      className="relative flex h-full min-h-0 min-w-0 flex-1 flex-col bg-background text-foreground"
    >
      {/* Top chrome: Document Menu + Document Tabs */}
      <div className="flex shrink-0 items-stretch border-b border-border bg-card">
        <div className="relative flex items-center border-r border-border">
          <button
            type="button"
            data-explorer="document-menu"
            onClick={() => setMenuOpen((v) => !v)}
            className="flex h-full items-center gap-2 px-3 text-sm font-semibold tracking-tight text-foreground hover:bg-hover hover:text-accent"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
          >
            {workspaceName ?? "Workspace"}
            <span className="text-[10px] text-muted-foreground">▾</span>
          </button>
          {menuOpen && (
            <div
              role="menu"
              className="absolute left-0 top-full z-40 w-56 overflow-hidden rounded-b-md border border-border border-t-0 bg-muted"
            >
              {(
                [
                  { type: "item", label: "New Part Studio", kind: "part" },
                  { type: "item", label: "New Assembly", kind: "assembly" },
                  { type: "item", label: "New Drawing", kind: "drawing" },
                  { type: "item", label: "New CAM Studio", kind: "cam" },
                  {
                    type: "item",
                    label: "New Simulation Studio",
                    kind: "simulation",
                  },
                  { type: "item", label: "New Render Studio", kind: "render" },
                  { type: "item", label: "New PCB Studio", kind: "pcb" },
                  { type: "sep", label: "sep-1" },
                  { type: "item", label: "Load sample data" },
                  { type: "item", label: "Import from workspace…" },
                  { type: "item", label: "Export STEP…" },
                  { type: "sep", label: "sep-2" },
                  { type: "item", label: "Preferences…" },
                  { type: "item", label: "Close document" },
                ] as const
              ).map((item) =>
                item.type === "sep" ? (
                  <div
                    key={item.label}
                    className="my-1 border-t border-border"
                  />
                ) : (
                  <button
                    key={item.label}
                    type="button"
                    role="menuitem"
                    className="block w-full px-3 py-2 text-left text-sm text-foreground hover:bg-hover hover:text-accent"
                    onClick={() => {
                      setMenuOpen(false);
                      if (item.label === "Close document") {
                        onBackToDocuments?.();
                      }
                      if (item.label === "Preferences…") {
                        setPrefsOpen(true);
                      }
                      if (item.label === "Load sample data") {
                        useFeatureStore.getState().loadSampleFeatures();
                        useAssemblyStore.getState().loadSampleAssembly();
                        useDrawingStore.getState().loadSampleDrawing();
                        useCamStore.getState().loadSampleCam();
                        usePcbStore.getState().loadSamplePcb();
                        useRenderStore.getState().loadSampleRender();
                        useSimulationStore.getState().loadSampleSimulation();
                      }
                      if (item.label === "Import from workspace…") {
                        setInsertOpen(true);
                      }
                      if ("kind" in item && item.kind) {
                        onCreateDocument?.(
                          item.kind,
                          item.label.replace(/^New /, ""),
                        );
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
                className={`group flex max-w-[200px] items-center gap-1 border-r border-border px-3 py-2 text-xs ${
                  isActive
                    ? "border-b-2 border-b-accent bg-background text-foreground"
                    : "border-b-2 border-b-transparent text-muted-foreground hover:bg-hover hover:text-accent"
                }`}
              >
                <button
                  type="button"
                  onClick={() => selectTab(tab.id)}
                  className="min-w-0 truncate font-medium"
                  title={tab.title}
                >
                  <span className="mr-1.5 text-[10px] uppercase text-faint">
                    {tab.kind[0]}
                  </span>
                  {tab.title}
                  {(tab.dirty || (isActive && sessionDirty)) && (
                    <span className="ml-1 text-accent" title="Unsaved">
                      ●
                    </span>
                  )}
                </button>
                <button
                  type="button"
                  aria-label={`Close ${tab.title}`}
                  onClick={() => onCloseTab?.(tab.id)}
                  className="rounded px-1 text-faint opacity-0 hover:bg-active hover:text-accent group-hover:opacity-100"
                >
                  ×
                </button>
              </div>
            );
          })}
        </div>

        <div className="flex items-center gap-2 border-l border-border px-3">
          {onOpenVersions && (
            <button
              type="button"
              onClick={onOpenVersions}
              className="rounded border border-border px-2 py-1 text-[11px] text-muted-foreground hover:border-accent hover:text-accent"
            >
              Versions
            </button>
          )}
          {onOpenReleases && (
            <button
              type="button"
              onClick={onOpenReleases}
              className="rounded border border-border px-2 py-1 text-[11px] text-muted-foreground hover:border-accent hover:text-accent"
            >
              Releases
            </button>
          )}
          <button
            type="button"
            onClick={() => setPrefsOpen(true)}
            className="rounded border border-border p-1 text-muted-foreground hover:border-accent hover:text-accent"
            title="Preferences"
            aria-label="Open preferences"
          >
            <Settings className="h-3.5 w-3.5" strokeWidth={1.75} />
          </button>
        </div>
      </div>

      <CommandRibbon
        groups={ribbonGroups}
        onSelect={onRibbonSelect}
        status={ribbonStatus}
      />

      <div className="flex min-h-0 flex-1">
        {/* Document Panel (feature tree) */}
        <aside
          data-explorer="tree-panel"
          className={`flex shrink-0 flex-col border-r border-border bg-card transition-[width] ${
            panelCollapsed ? "w-10" : "w-64"
          }`}
        >
          <div className="flex items-center justify-between border-b border-border px-2 py-1.5">
            {!panelCollapsed && (
              <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                {isPcb
                  ? "PCB Tree"
                  : isRender
                  ? "Scene List"
                  : isSimulation
                    ? "Simulation Tree"
                    : isCam
                      ? "CAM Tree"
                      : isDrawing
                        ? "Drawing Tree"
                        : isAssembly
                          ? "Instance Tree"
                          : "Feature Tree"}
              </span>
            )}
            <button
              type="button"
              onClick={() => setPanelCollapsed((v) => !v)}
              className="rounded px-1.5 py-0.5 text-xs text-muted-foreground hover:bg-hover hover:text-accent"
              title={panelCollapsed ? "Expand panel" : "Collapse panel"}
              aria-label={panelCollapsed ? "Expand panel" : "Collapse panel"}
              aria-expanded={!panelCollapsed}
            >
              {panelCollapsed ? "»" : "«"}
            </button>
          </div>
          {!panelCollapsed &&
            (isPcb ? (
              <PcbTree />
            ) : isRender ? (
              <RenderSceneList />
            ) : isSimulation ? (
              <SimulationTree />
            ) : isCam ? (
              <CamTree />
            ) : isDrawing ? (
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
        <section className="relative min-w-0 flex-1 bg-background">
          {children ??
            (isPcb ? (
              <PcbWorkspace />
            ) : isRender ? (
              <RenderWorkspace />
            ) : isSimulation ? (
              <SimulationWorkspace />
            ) : isCam ? (
              <CamWorkspace />
            ) : isDrawing ? (
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
      {insertOpen && (
        <InsertFromWorkspace
          currentId={currentTabId}
          onClose={() => setInsertOpen(false)}
          onOpen={(doc) => {
            onOpenCatalogDocument?.(doc);
            if (isAssembly && (doc.kind === "part" || doc.kind === "assembly")) {
              useAssemblyStore.getState().insertDocument(doc.id);
            }
            setInsertOpen(false);
          }}
        />
      )}
      <PreferencesModal open={prefsOpen} onClose={() => setPrefsOpen(false)} />
    </div>
    </StudioLayout>
  );
}

function InsertFromWorkspace({
  currentId,
  onClose,
  onOpen,
}: {
  currentId: string;
  onClose: () => void;
  onOpen: (doc: {
    id: string;
    title: string;
    kind: WorkspaceTab["kind"];
  }) => void;
}) {
  const workspaceId = useCatalogStore((s) => s.selectedWorkspaceId);
  const allDocuments = useCatalogStore((s) => s.documents);
  const documents = workspaceId
    ? allDocuments.filter((d) => d.workspaceId === workspaceId)
    : allDocuments;

  return (
    <div
      className="absolute inset-0 z-50 flex items-start justify-center bg-background/80 p-8"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-label="Insert from workspace"
        className="w-full max-w-md border border-border bg-card"
      >
        <header className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold">Documents in this workspace</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded px-2 text-sm text-faint hover:bg-hover hover:text-accent"
            aria-label="Close insert picker"
          >
            ×
          </button>
        </header>
        <div className="max-h-80 overflow-auto p-2">
          {documents.length === 0 && (
            <p className="px-2 py-4 text-xs text-muted-foreground">
              No other documents yet. Create a Part Studio from the workspace
              menu.
            </p>
          )}
          {documents.map((doc) => (
            <button
              key={doc.id}
              type="button"
              disabled={doc.id === currentId}
              onClick={() =>
                onOpen({ id: doc.id, title: doc.name, kind: doc.kind })
              }
              className="flex w-full items-center justify-between rounded px-3 py-2 text-left text-sm hover:bg-hover disabled:opacity-40"
            >
              <span>{doc.name}</span>
              <span className="text-[10px] uppercase text-faint">{doc.kind}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default StudioChrome;
