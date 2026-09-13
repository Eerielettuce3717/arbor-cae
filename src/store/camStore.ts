import { create } from "zustand";
import {
  faceBoundsFromStock,
  generatePocketZigzag,
  liftPocketTo3D,
  postProcessFanuc,
} from "../cam";
import { saveNcFile } from "../lib/camFs";
import {
  DEFAULT_POCKET_PARAMS,
  DEFAULT_STOCK,
  DEFAULT_TOOL,
  DEFAULT_WCS,
  FACE_LABELS,
  type CamToolId,
  type FlatFaceId,
  type PocketOperation,
  type PocketParams,
  type SetupNode,
  type StockDefinition,
  type ToolDefinition,
  type Toolpath,
  type WcsOrigin,
} from "./camTypes";

function uid(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

function seedSetup(): SetupNode {
  return {
    id: "setup_1",
    name: "Setup 1",
    kind: "setup",
    stock: { ...DEFAULT_STOCK, size: [...DEFAULT_STOCK.size], origin: [...DEFAULT_STOCK.origin] },
    wcs: {
      ...DEFAULT_WCS,
      origin: [...DEFAULT_WCS.origin],
    },
    machine: "Fanuc 0i-MF Vertical Mill",
    spindleOrientation: "vertical",
    suppressed: false,
  };
}

export type CamPanelId =
  | "none"
  | "setup"
  | "stock"
  | "wcs"
  | "pocket"
  | "post";

interface CamState {
  setups: SetupNode[];
  activeSetupId: string;
  operations: PocketOperation[];
  toolpaths: Toolpath[];
  tools: ToolDefinition[];
  activeToolId: string;
  activeCamTool: CamToolId;
  activePanel: CamPanelId;
  selectedFaceId: FlatFaceId | null;
  selectedOperationId: string | null;
  selectedToolpathId: string | null;
  selectedNodeId: string | null;
  lastGCode: string | null;
  lastNcPath: string | null;
  statusMessage: string;

  setActiveCamTool: (tool: CamToolId) => void;
  loadSampleCam: () => void;
  setActivePanel: (panel: CamPanelId) => void;
  selectSetup: (id: string) => void;
  selectNode: (id: string | null) => void;
  selectFace: (faceId: FlatFaceId | null) => void;
  updateStock: (patch: Partial<StockDefinition>) => void;
  updateWcs: (patch: Partial<WcsOrigin>) => void;
  updateSetupName: (name: string) => void;
  addPocketOperation: () => void;
  updatePocketParams: (opId: string, patch: Partial<PocketParams>) => void;
  generatePocketToolpath: () => void;
  postFanuc: () => Promise<void>;
}

export const useCamStore = create<CamState>((set, get) => {
  const setup = seedSetup();

  return {
    setups: [setup],
    activeSetupId: setup.id,
    operations: [],
    toolpaths: [],
    tools: [{ ...DEFAULT_TOOL }],
    activeToolId: DEFAULT_TOOL.id,
    activeCamTool: "select",
    activePanel: "setup",
    selectedFaceId: null,
    selectedOperationId: null,
    selectedToolpathId: null,
    selectedNodeId: setup.id,
    lastGCode: null,
    lastNcPath: null,
    statusMessage:
      "CAM Studio — empty setup. Select a face and add a pocket, or load the sample.",

    loadSampleCam: () => {
      const sample = seedSetup();
      const pocketOp: PocketOperation = {
        id: "op_pocket_1",
        name: "2.5D Pocket Clear 1",
        kind: "pocketClear",
        setupId: sample.id,
        faceId: null,
        toolId: DEFAULT_TOOL.id,
        params: { ...DEFAULT_POCKET_PARAMS },
        toolpathId: null,
        suppressed: false,
      };
      set({
        setups: [sample],
        activeSetupId: sample.id,
        operations: [pocketOp],
        toolpaths: [],
        selectedOperationId: pocketOp.id,
        selectedNodeId: sample.id,
        selectedFaceId: null,
        lastGCode: null,
        lastNcPath: null,
        statusMessage:
          "Sample CAM setup loaded — select a flat face, then Generate pocket clearing.",
      });
    },

    setActiveCamTool: (tool) => {
      const panelMap: Partial<Record<CamToolId, CamPanelId>> = {
        setup: "setup",
        stock: "stock",
        wcs: "wcs",
        pocket: "pocket",
        post: "post",
        generate: "pocket",
        faceSelect: "pocket",
      };
      const panel = panelMap[tool];
      set({
        activeCamTool: tool,
        ...(panel ? { activePanel: panel } : {}),
        statusMessage:
          tool === "faceSelect"
            ? "Click a stock face in the viewport to select it."
            : tool === "generate"
              ? "Generating pocket toolpath…"
              : tool === "post"
                ? "Posting Fanuc G-code…"
                : `Tool: ${tool}`,
      });
      if (tool === "generate") {
        get().generatePocketToolpath();
      } else if (tool === "post") {
        void get().postFanuc();
      } else if (tool === "pocket") {
        get().addPocketOperation();
      }
    },

    setActivePanel: (panel) => set({ activePanel: panel }),

    selectSetup: (id) =>
      set({
        activeSetupId: id,
        selectedNodeId: id,
        activePanel: "setup",
      }),

    selectNode: (id) => set({ selectedNodeId: id }),

    selectFace: (faceId) => {
      const { operations, selectedOperationId } = get();
      const opId = selectedOperationId ?? operations[0]?.id ?? null;
      set({
        selectedFaceId: faceId,
        operations: operations.map((op) =>
          op.id === opId ? { ...op, faceId } : op,
        ),
        statusMessage: faceId
          ? `Face selected: ${FACE_LABELS[faceId]}. Click Generate for zigzag clearing.`
          : "Face selection cleared.",
        activeCamTool: faceId ? "pocket" : get().activeCamTool,
        activePanel: "pocket",
      });
    },

    updateStock: (patch) => {
      const { setups, activeSetupId } = get();
      set({
        setups: setups.map((s) =>
          s.id === activeSetupId
            ? {
                ...s,
                stock: {
                  ...s.stock,
                  ...patch,
                  size: patch.size ? [...patch.size] : s.stock.size,
                  origin: patch.origin ? [...patch.origin] : s.stock.origin,
                },
              }
            : s,
        ),
        statusMessage: "Stock updated.",
      });
    },

    updateWcs: (patch) => {
      const { setups, activeSetupId } = get();
      set({
        setups: setups.map((s) =>
          s.id === activeSetupId
            ? {
                ...s,
                wcs: {
                  ...s.wcs,
                  ...patch,
                  origin: patch.origin ? [...patch.origin] : s.wcs.origin,
                },
              }
            : s,
        ),
        statusMessage: `WCS ${patch.frame ?? get().setups.find((x) => x.id === activeSetupId)?.wcs.frame ?? "G54"} updated.`,
      });
    },

    updateSetupName: (name) => {
      const { setups, activeSetupId } = get();
      set({
        setups: setups.map((s) =>
          s.id === activeSetupId ? { ...s, name } : s,
        ),
      });
    },

    addPocketOperation: () => {
      const { operations, activeSetupId, selectedFaceId } = get();
      const op: PocketOperation = {
        id: uid("op_pocket"),
        name: `2.5D Pocket Clear ${operations.length + 1}`,
        kind: "pocketClear",
        setupId: activeSetupId,
        faceId: selectedFaceId,
        toolId: DEFAULT_TOOL.id,
        params: { ...DEFAULT_POCKET_PARAMS },
        toolpathId: null,
        suppressed: false,
      };
      set({
        operations: [...operations, op],
        selectedOperationId: op.id,
        selectedNodeId: op.id,
        activePanel: "pocket",
        statusMessage: `${op.name} added. Select a face and Generate.`,
      });
    },

    updatePocketParams: (opId, patch) => {
      set({
        operations: get().operations.map((op) =>
          op.id === opId ? { ...op, params: { ...op.params, ...patch } } : op,
        ),
      });
    },

    generatePocketToolpath: () => {
      const state = get();
      const setup = state.setups.find((s) => s.id === state.activeSetupId);
      const op =
        state.operations.find((o) => o.id === state.selectedOperationId) ??
        state.operations[0];
      const tool =
        state.tools.find((t) => t.id === (op?.toolId ?? state.activeToolId)) ??
        state.tools[0];

      if (!setup || !op) {
        set({ statusMessage: "No setup or pocket operation available." });
        return;
      }

      const faceId = op.faceId ?? state.selectedFaceId;
      if (!faceId) {
        set({
          statusMessage: "Select a flat face on the stock before generating.",
          activeCamTool: "faceSelect",
        });
        return;
      }

      const bounds = faceBoundsFromStock(
        setup.stock,
        setup.wcs.origin,
        faceId,
      );
      const xyPoints = generatePocketZigzag({
        bounds,
        toolDiameterMm: tool.diameterMm,
        params: op.params,
      });
      const points3 = liftPocketTo3D(xyPoints, bounds, faceId, op.params);

      const tpId = uid("tp");
      const toolpath: Toolpath = {
        id: tpId,
        name: `${op.name} Toolpath`,
        kind: "pocketClear",
        operationId: op.id,
        setupId: setup.id,
        faceId,
        xyPoints,
        segments: [
          {
            points: points3,
            kind: "pocketClear",
            rapid: false,
          },
        ],
        color: "#e85d04",
        visible: true,
      };

      set({
        toolpaths: [
          ...state.toolpaths.filter((t) => t.operationId !== op.id),
          toolpath,
        ],
        operations: state.operations.map((o) =>
          o.id === op.id ? { ...o, faceId, toolpathId: tpId } : o,
        ),
        selectedToolpathId: tpId,
        selectedFaceId: faceId,
        statusMessage: `Generated zigzag pocket: ${xyPoints.length} XY points, ${points3.length} 3D moves.`,
        activeCamTool: "select",
      });
    },

    postFanuc: async () => {
      const state = get();
      const setup = state.setups.find((s) => s.id === state.activeSetupId);
      const toolpath =
        state.toolpaths.find((t) => t.id === state.selectedToolpathId) ??
        state.toolpaths[state.toolpaths.length - 1];
      const op = state.operations.find(
        (o) => o.id === toolpath?.operationId,
      );
      const tool =
        state.tools.find((t) => t.id === (op?.toolId ?? state.activeToolId)) ??
        state.tools[0];

      if (!setup || !toolpath || !op || !tool) {
        set({
          statusMessage:
            "Generate a pocket toolpath before posting Fanuc G-code.",
        });
        return;
      }

      const gcode = postProcessFanuc(toolpath, {
        programNumber: 1001,
        tool,
        wcs: setup.wcs,
        params: op.params,
        partName: setup.name,
        safeZ: Math.max(setup.stock.size[2] + 10, 25),
      });

      try {
        const path = await saveNcFile(
          `${setup.name.replace(/\s+/g, "_")}_pocket.nc`,
          gcode,
        );
        set({
          lastGCode: gcode,
          lastNcPath: path,
          statusMessage: `Saved Fanuc G-code → ${path}`,
          activePanel: "post",
          activeCamTool: "select",
        });
      } catch (err) {
        set({
          lastGCode: gcode,
          lastNcPath: null,
          statusMessage: `G-code ready (save failed: ${
            err instanceof Error ? err.message : String(err)
          }). Preview available in Post panel.`,
          activePanel: "post",
          activeCamTool: "select",
        });
      }
    },
  };
});
