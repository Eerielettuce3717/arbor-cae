import { create } from "zustand";
import { saveDrlFile, saveGtlFile } from "../lib/pcbFs";
import { runDrc, type DrcResult, type ManufacturingProfileId } from "../pcb/drc";
import { generateExcellon, generateGtl } from "../pcb/export";
import { snapPointToRoute, snapToGrid } from "../pcb/snapRouting";
import {
  DEFAULT_ALTIUM365,
  DEFAULT_OUTLINE,
  DEFAULT_RIGID_FLEX,
  PCB_LAYERS,
  type Altium365Integration,
  type BoardOutline,
  type ManufacturingType,
  type PcbComponent,
  type PcbLayerDef,
  type PcbLayerId,
  type PcbPanelId,
  type PcbPoint,
  type PcbToolId,
  type PcbTrace,
  type PcbVia,
  type RigidFlexWorkflow,
  type SnapAngleMode,
  type TraceNetClass,
} from "./pcbTypes";

function uid(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

function seedComponents(): PcbComponent[] {
  // QFN-32 @ 0.5 mm pitch (passes Additive ≥0.4 mm).
  const qfnPads = [];
  const pitch = 0.5;
  const padW = 0.25;
  const padH = 0.4;
  const half = 2.25;
  for (let i = 0; i < 8; i++) {
    const t = -1.75 + i * pitch;
    qfnPads.push(
      {
        id: `pad_u1_n${i}`,
        x: 25 + t,
        y: 25 + half,
        widthMm: padW,
        heightMm: padH,
        layer: "topCopper" as const,
        net: null,
      },
      {
        id: `pad_u1_s${i}`,
        x: 25 + t,
        y: 25 - half,
        widthMm: padW,
        heightMm: padH,
        layer: "topCopper" as const,
        net: null,
      },
      {
        id: `pad_u1_w${i}`,
        x: 25 - half,
        y: 25 + t,
        widthMm: padH,
        heightMm: padW,
        layer: "topCopper" as const,
        net: null,
      },
      {
        id: `pad_u1_e${i}`,
        x: 25 + half,
        y: 25 + t,
        widthMm: padH,
        heightMm: padW,
        layer: "topCopper" as const,
        net: null,
      },
    );
  }

  return [
    {
      id: "comp_u1",
      designator: "U1",
      footprint: "QFN-32-5x5",
      x: 25,
      y: 25,
      rotationDeg: 0,
      widthMm: 5,
      heightMm: 5,
      height3dMm: 0.9,
      layer: "top",
      color: "#2d3748",
      pads: qfnPads,
    },
    {
      id: "comp_c1",
      designator: "C1",
      footprint: "0805",
      x: 40,
      y: 18,
      rotationDeg: 0,
      widthMm: 2,
      heightMm: 1.25,
      height3dMm: 0.7,
      layer: "top",
      color: "#1a202c",
      pads: [
        {
          id: "pad_c1_a",
          x: 39.1,
          y: 18,
          widthMm: 0.9,
          heightMm: 1.0,
          layer: "topCopper",
          net: "GND",
        },
        {
          id: "pad_c1_b",
          x: 40.9,
          y: 18,
          widthMm: 0.9,
          heightMm: 1.0,
          layer: "topCopper",
          net: "NET_USB_D+",
        },
      ],
    },
    {
      id: "comp_j1",
      designator: "J1",
      footprint: "USB-C-16",
      x: 8,
      y: 25,
      rotationDeg: 90,
      widthMm: 9,
      heightMm: 7.5,
      height3dMm: 3.2,
      layer: "top",
      color: "#4a5568",
      // 0.5 mm signal pitch — Additive-safe (≥0.4 mm).
      pads: Array.from({ length: 12 }, (_, i) => ({
        id: `pad_j1_${i}`,
        x: 8,
        y: 25 - 2.75 + i * 0.5,
        widthMm: 0.3,
        heightMm: 1.2,
        layer: "topCopper" as const,
        net: i === 4 || i === 5 ? "NET_USB_D+" : null,
      })),
    },
  ];
}

function seedTraces(): PcbTrace[] {
  return [
    {
      id: "tr_1",
      net: "NET_USB_D+",
      netClass: "diff",
      layer: "topCopper",
      widthMm: 0.2,
      vertices: [
        { x: 12, y: 22 },
        { x: 18, y: 22 },
        { x: 22, y: 26 },
        { x: 22.5, y: 26 },
      ],
      draft: false,
    },
  ];
}

function seedVias(): PcbVia[] {
  return [
    {
      id: "via_1",
      x: 30,
      y: 22,
      drillMm: 0.4,
      padMm: 0.8,
      net: "GND",
      fromLayer: "topCopper",
      toLayer: "bottomCopper",
    },
    {
      id: "via_2",
      x: 35,
      y: 28,
      drillMm: 0.45,
      padMm: 0.9,
      net: "NET_USB_D+",
      fromLayer: "topCopper",
      toLayer: "bottomCopper",
    },
  ];
}

interface PcbState {
  outline: BoardOutline;
  components: PcbComponent[];
  traces: PcbTrace[];
  vias: PcbVia[];
  layers: PcbLayerDef[];
  rigidFlex: RigidFlexWorkflow;
  altium365: Altium365Integration;
  activeTool: PcbToolId;
  activePanel: PcbPanelId;
  activeLayer: PcbLayerId;
  snapMode: SnapAngleMode;
  gridMm: number;
  selectedId: string | null;
  /** Active route being drawn (null when not routing). */
  activeTraceId: string | null;
  routePreview: PcbPoint | null;
  revision: number;
  statusMessage: string;

  /** Manufacturing export / DRC */
  manufacturingType: ManufacturingType;
  lastDrcResult: DrcResult | null;
  lastGtl: string | null;
  lastDrl: string | null;
  lastExportPaths: { gtl: string; drl: string } | null;
  exportBlocked: boolean;

  setActiveTool: (tool: PcbToolId) => void;
  setActivePanel: (panel: PcbPanelId) => void;
  setActiveLayer: (layer: PcbLayerId) => void;
  setSnapMode: (mode: SnapAngleMode) => void;
  setGridMm: (mm: number) => void;
  select: (id: string | null) => void;
  bumpRevision: () => void;

  updateOutline: (patch: Partial<BoardOutline>) => void;
  setOutlinePoints: (points: PcbPoint[]) => void;

  addComponent: (partial?: Partial<PcbComponent>) => void;
  updateComponent: (id: string, patch: Partial<PcbComponent>) => void;
  removeComponent: (id: string) => void;

  beginTrace: (net: string, netClass?: TraceNetClass) => void;
  addTraceVertex: (world: PcbPoint) => void;
  setRoutePreview: (world: PcbPoint | null) => void;
  commitTrace: () => void;
  cancelTrace: () => void;

  setRigidFlexEnabled: (enabled: boolean) => void;
  updateRigidFlex: (patch: Partial<RigidFlexWorkflow>) => void;
  setFoldPreview: (deg: number) => void;

  connectAltium365: () => void;
  disconnectAltium365: () => void;
  updateAltium365: (patch: Partial<Altium365Integration>) => void;
  syncAltium365: () => void;

  setManufacturingType: (type: ManufacturingType) => void;
  runManufacturingDrc: () => DrcResult;
  exportManufacturingFiles: () => Promise<boolean>;

  setStatusMessage: (msg: string) => void;
}

const TOOL_TO_PANEL: Partial<Record<PcbToolId, PcbPanelId>> = {
  place: "components",
  route: "traces",
  outline: "board",
  rigidFlex: "rigidFlex",
  altium365: "altium365",
  manufacturing: "manufacturing",
};

export const usePcbStore = create<PcbState>((set, get) => ({
  outline: {
    ...DEFAULT_OUTLINE,
    points: DEFAULT_OUTLINE.points.map((p) => ({ ...p })),
  },
  components: seedComponents(),
  traces: seedTraces(),
  vias: seedVias(),
  layers: PCB_LAYERS.map((l) => ({ ...l })),
  rigidFlex: {
    ...DEFAULT_RIGID_FLEX,
    regions: DEFAULT_RIGID_FLEX.regions.map((r) => ({
      ...r,
      points: r.points.map((p) => ({ ...p })),
      bendLine: r.bendLine
        ? { a: { ...r.bendLine.a }, b: { ...r.bendLine.b } }
        : null,
    })),
  },
  altium365: { ...DEFAULT_ALTIUM365 },
  activeTool: "select",
  activePanel: "board",
  activeLayer: "topCopper",
  snapMode: 45,
  gridMm: 0.25,
  selectedId: null,
  activeTraceId: null,
  routePreview: null,
  revision: 1,
  statusMessage:
    "PCB Studio — route with 45°/90° snap; 3D extrudes on every canvas update.",
  manufacturingType: "standardFab",
  lastDrcResult: null,
  lastGtl: null,
  lastDrl: null,
  lastExportPaths: null,
  exportBlocked: false,

  setActiveTool: (tool) => {
    const panel = TOOL_TO_PANEL[tool];
    set({
      activeTool: tool,
      ...(panel ? { activePanel: panel } : {}),
      statusMessage:
        tool === "route"
          ? `Routing (${get().snapMode}°) — click to place vertices, Enter/dbl-click to finish.`
          : tool === "rigidFlex"
            ? "Rigid-Flex workflow scaffold — enable regions and fold preview."
            : tool === "altium365"
              ? "Altium 365 integration UI — connect / sync placeholders."
              : tool === "manufacturing"
                ? "Export Manufacturing — run DRC, then save .GTL / .DRL."
                : `Tool: ${tool}`,
    });
  },

  setActivePanel: (panel) => set({ activePanel: panel }),
  setActiveLayer: (layer) => set({ activeLayer: layer }),
  setSnapMode: (mode) =>
    set({
      snapMode: mode,
      statusMessage: `Snap mode: ${mode}°`,
    }),
  setGridMm: (mm) => set({ gridMm: mm }),
  select: (id) => set({ selectedId: id }),
  bumpRevision: () => set({ revision: get().revision + 1 }),

  updateOutline: (patch) => {
    set({
      outline: {
        ...get().outline,
        ...patch,
        points: patch.points
          ? patch.points.map((p) => ({ ...p }))
          : get().outline.points,
      },
      revision: get().revision + 1,
      statusMessage: "Board outline updated → 3D rebuild.",
    });
  },

  setOutlinePoints: (points) => {
    get().updateOutline({ points });
  },

  addComponent: (partial) => {
    const comps = get().components;
    const comp: PcbComponent = {
      id: uid("comp"),
      designator: `U${comps.length + 1}`,
      footprint: "Generic",
      x: 40,
      y: 30,
      rotationDeg: 0,
      widthMm: 4,
      heightMm: 4,
      height3dMm: 1,
      layer: "top",
      color: "#2d3748",
      pads: [],
      ...partial,
    };
    set({
      components: [...comps, comp],
      selectedId: comp.id,
      activePanel: "components",
      revision: get().revision + 1,
      statusMessage: `Placed ${comp.designator} → 3D bbox.`,
    });
  },

  updateComponent: (id, patch) => {
    set({
      components: get().components.map((c) =>
        c.id === id ? { ...c, ...patch } : c,
      ),
      revision: get().revision + 1,
    });
  },

  removeComponent: (id) => {
    set({
      components: get().components.filter((c) => c.id !== id),
      selectedId: get().selectedId === id ? null : get().selectedId,
      revision: get().revision + 1,
    });
  },

  beginTrace: (net, netClass = "signal") => {
    const id = uid("tr");
    const trace: PcbTrace = {
      id,
      net,
      netClass,
      layer: get().activeLayer,
      widthMm: netClass === "power" ? 0.5 : 0.2,
      vertices: [],
      draft: true,
    };
    set({
      traces: [...get().traces, trace],
      activeTraceId: id,
      activeTool: "route",
      activePanel: "traces",
      routePreview: null,
      statusMessage: `Routing ${net} on ${get().activeLayer} (${get().snapMode}°).`,
    });
  },

  addTraceVertex: (world) => {
    const { activeTraceId, traces, snapMode, gridMm, routePreview } = get();
    if (!activeTraceId) {
      get().beginTrace("NET_NEW");
      get().addTraceVertex(world);
      return;
    }
    const trace = traces.find((t) => t.id === activeTraceId);
    if (!trace) return;

    let point = snapToGrid(world, gridMm);
    if (trace.vertices.length > 0) {
      const last = trace.vertices[trace.vertices.length - 1];
      point = snapToGrid(
        snapPointToRoute(last, routePreview ?? world, snapMode),
        gridMm,
      );
    }

    set({
      traces: traces.map((t) =>
        t.id === activeTraceId
          ? { ...t, vertices: [...t.vertices, point] }
          : t,
      ),
      routePreview: null,
      revision: get().revision + 1,
    });
  },

  setRoutePreview: (world) => {
    const { activeTraceId, traces, snapMode, gridMm } = get();
    if (!activeTraceId || !world) {
      set({ routePreview: world });
      return;
    }
    const trace = traces.find((t) => t.id === activeTraceId);
    if (!trace || trace.vertices.length === 0) {
      set({ routePreview: snapToGrid(world, gridMm) });
      return;
    }
    const last = trace.vertices[trace.vertices.length - 1];
    set({
      routePreview: snapToGrid(snapPointToRoute(last, world, snapMode), gridMm),
    });
  },

  commitTrace: () => {
    const { activeTraceId, traces } = get();
    if (!activeTraceId) return;
    const trace = traces.find((t) => t.id === activeTraceId);
    if (!trace || trace.vertices.length < 2) {
      set({
        traces: traces.filter((t) => t.id !== activeTraceId),
        activeTraceId: null,
        routePreview: null,
        statusMessage: "Trace cancelled (need ≥2 vertices).",
        revision: get().revision + 1,
      });
      return;
    }
    set({
      traces: traces.map((t) =>
        t.id === activeTraceId ? { ...t, draft: false } : t,
      ),
      activeTraceId: null,
      routePreview: null,
      revision: get().revision + 1,
      statusMessage: `Committed ${trace.net} (${trace.vertices.length} verts) → 3D.`,
    });
  },

  cancelTrace: () => {
    const { activeTraceId, traces } = get();
    if (!activeTraceId) return;
    set({
      traces: traces.filter((t) => t.id !== activeTraceId),
      activeTraceId: null,
      routePreview: null,
      statusMessage: "Route cancelled.",
      revision: get().revision + 1,
    });
  },

  setRigidFlexEnabled: (enabled) => {
    set({
      rigidFlex: { ...get().rigidFlex, enabled, status: "scaffold" },
      revision: get().revision + 1,
      statusMessage: enabled
        ? "Rigid-Flex enabled (scaffold regions)."
        : "Rigid-Flex disabled.",
    });
  },

  updateRigidFlex: (patch) => {
    set({
      rigidFlex: { ...get().rigidFlex, ...patch },
      revision: get().revision + 1,
    });
  },

  setFoldPreview: (deg) => {
    set({
      rigidFlex: { ...get().rigidFlex, foldPreviewDeg: deg },
      revision: get().revision + 1,
    });
  },

  connectAltium365: () => {
    set({
      altium365: {
        ...get().altium365,
        connected: false,
        syncStatus: "error",
        statusMessage:
          "Altium 365 OAuth is not wired — connection refused (no fake session).",
      },
      statusMessage: "Altium 365 not connected.",
    });
  },

  disconnectAltium365: () => {
    set({
      altium365: {
        ...get().altium365,
        connected: false,
        syncStatus: "idle",
        statusMessage: "Disconnected from Altium 365.",
      },
      statusMessage: "Altium 365 disconnected.",
    });
  },

  updateAltium365: (patch) => {
    set({ altium365: { ...get().altium365, ...patch } });
  },

  syncAltium365: () => {
    set({
      altium365: {
        ...get().altium365,
        syncStatus: "syncing",
        statusMessage: "Syncing with Altium 365… (placeholder)",
      },
    });
    window.setTimeout(() => {
      set({
        altium365: {
          ...get().altium365,
          syncStatus: "scaffold",
          lastSyncAt: new Date().toISOString(),
          statusMessage: "Sync scaffold complete — no remote payload.",
        },
        statusMessage: "Altium 365 sync scaffold finished.",
      });
    }, 600);
  },

  setManufacturingType: (type) => {
    set({
      manufacturingType: type,
      lastDrcResult: null,
      exportBlocked: false,
      statusMessage: `Manufacturing target: ${type === "additiveInk" ? "Additive / Conductive Ink" : "Standard Fab"}.`,
    });
  },

  runManufacturingDrc: () => {
    const { outline, components, traces, vias, manufacturingType } = get();
    const result = runDrc(
      { outline, components, traces, vias },
      manufacturingType as ManufacturingProfileId,
    );
    set({
      lastDrcResult: result,
      exportBlocked: !result.passed,
      statusMessage: result.passed
        ? `DRC passed (${result.profileName}) — ready to export.`
        : `DRC failed (${result.violations.length} issue${result.violations.length === 1 ? "" : "s"}) — export blocked.`,
    });
    return result;
  },

  exportManufacturingFiles: async () => {
    const state = get();
    const result = state.runManufacturingDrc();
    if (!result.passed) {
      set({
        exportBlocked: true,
        statusMessage: `Export blocked — fix ${result.violations.length} DRC error(s) first.`,
      });
      return false;
    }

    const boardInput = {
      outline: state.outline,
      components: state.components,
      traces: state.traces,
      vias: state.vias,
      partName: state.outline.name,
    };

    const gtl = generateGtl(boardInput);
    const drl = generateExcellon({
      vias: state.vias,
      partName: state.outline.name,
    });

    const base =
      state.outline.name.replace(/[^\w.-]+/g, "_").replace(/^_+|_+$/g, "") ||
      "board";

    try {
      const gtlPath = await saveGtlFile(base, gtl);
      const drlPath = await saveDrlFile(base, drl);
      set({
        lastGtl: gtl,
        lastDrl: drl,
        lastExportPaths: { gtl: gtlPath, drl: drlPath },
        exportBlocked: false,
        statusMessage: `Exported ${base}.GTL and ${base}.DRL (${result.profileName}).`,
      });
      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      set({
        statusMessage: `Export failed: ${msg}`,
      });
      return false;
    }
  },

  setStatusMessage: (msg) => set({ statusMessage: msg }),
}));
