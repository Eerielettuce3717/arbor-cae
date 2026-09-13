import { create } from "zustand";
import { mapAppearanceToPbr, pbrToRendererUniforms } from "../render";
import {
  APPEARANCE_FUNCTIONS,
  APPEARANCE_MODIFIERS,
  DEFAULT_AXF,
  DEFAULT_PBR,
  DEFAULT_VOLUME,
  ENVIRONMENT_LIBRARY,
  LIGHT_EMISSION_PRESETS,
  type AppearanceCategory,
  type AppearanceFunction,
  type AppearanceModifier,
  type AxFAppearanceOptions,
  type EnvironmentPreset,
  type LightEmissionAppearance,
  type PbrMaterialParams,
  type RenderLight,
  type RenderPanelId,
  type RenderSceneNode,
  type RenderToolId,
  type VolumeAppearanceOptions,
} from "./renderTypes";

function cloneModifiers(): AppearanceModifier[] {
  return APPEARANCE_MODIFIERS.map((m) => ({ ...m }));
}

function seedScene(): RenderSceneNode[] {
  return [
    {
      id: "scene_root",
      kind: "root",
      label: "Scene",
      parentId: null,
      visible: true,
      appearanceId: null,
      pbr: null,
    },
    {
      id: "part_bracket",
      kind: "part",
      label: "Bracket Plate",
      parentId: "scene_root",
      visible: true,
      appearanceId: "fn_brushed_al",
      pbr: { ...DEFAULT_PBR, color: "#c0c6cc", metalness: 0.92, roughness: 0.35 },
    },
    {
      id: "part_housing",
      kind: "part",
      label: "Housing",
      parentId: "scene_root",
      visible: true,
      appearanceId: "fn_abs_black",
      pbr: { ...DEFAULT_PBR, color: "#1a1a1a", metalness: 0, roughness: 0.55 },
    },
    {
      id: "cam_main",
      kind: "camera",
      label: "Camera Main",
      parentId: "scene_root",
      visible: true,
      appearanceId: null,
      pbr: null,
    },
  ];
}

function seedLights(): RenderLight[] {
  return [
    {
      id: "light_key",
      name: "Key Light",
      kind: "directional",
      color: "#ffffff",
      intensity: 1.2,
      position: [4, 8, 2],
      castShadow: true,
      enabled: true,
    },
    {
      id: "light_fill",
      name: "Fill",
      kind: "point",
      color: "#c8d8ff",
      intensity: 0.4,
      position: [-3, 2, 4],
      castShadow: false,
      enabled: true,
    },
  ];
}

interface RenderState {
  sceneNodes: RenderSceneNode[];
  selectedNodeId: string | null;
  activeTool: RenderToolId;
  activePanel: RenderPanelId;
  appearanceTab: AppearanceCategory;
  functions: AppearanceFunction[];
  modifiers: AppearanceModifier[];
  emissions: LightEmissionAppearance[];
  selectedFunctionId: string | null;
  selectedEmissionId: string | null;
  environments: EnvironmentPreset[];
  activeEnvironmentId: string;
  axf: AxFAppearanceOptions;
  volume: VolumeAppearanceOptions;
  lights: RenderLight[];
  activePbr: PbrMaterialParams;
  lastUniforms: Record<string, string | number | boolean | null> | null;
  statusMessage: string;

  setActiveTool: (tool: RenderToolId) => void;
  setActivePanel: (panel: RenderPanelId) => void;
  setAppearanceTab: (tab: AppearanceCategory) => void;
  selectNode: (id: string | null) => void;
  setNodeVisible: (id: string, visible: boolean) => void;
  selectFunction: (id: string) => void;
  toggleModifier: (id: string, enabled: boolean) => void;
  updateModifier: (id: string, patch: Partial<AppearanceModifier>) => void;
  selectEmission: (id: string | null) => void;
  selectEnvironment: (id: string) => void;
  updateEnvironment: (id: string, patch: Partial<EnvironmentPreset>) => void;
  updateAxf: (patch: Partial<AxFAppearanceOptions>) => void;
  updateVolume: (patch: Partial<VolumeAppearanceOptions>) => void;
  updateLight: (id: string, patch: Partial<RenderLight>) => void;
  recomputePbr: () => void;
  pushToRenderer: () => void;
  setStatusMessage: (message: string) => void;
  loadSampleRender: () => void;
}

const TOOL_TO_PANEL: Partial<Record<RenderToolId, RenderPanelId>> = {
  appearances: "appearances",
  environments: "environments",
  axf: "axf",
  volume: "volume",
  lights: "lights",
  camera: "camera",
};

export const useRenderStore = create<RenderState>((set, get) => ({
  sceneNodes: [],
  selectedNodeId: null,
  activeTool: "appearances",
  activePanel: "appearances",
  appearanceTab: "functions",
  functions: APPEARANCE_FUNCTIONS.map((f) => ({ ...f })),
  modifiers: cloneModifiers(),
  emissions: LIGHT_EMISSION_PRESETS.map((e) => ({ ...e })),
  selectedFunctionId: "fn_brushed_al",
  selectedEmissionId: null,
  environments: ENVIRONMENT_LIBRARY.map((e) => ({ ...e })),
  activeEnvironmentId: "env_studio_soft",
  axf: { ...DEFAULT_AXF },
  volume: { ...DEFAULT_VOLUME },
  lights: [],
  activePbr: { ...DEFAULT_PBR },
  lastUniforms: null,
  statusMessage: "Render Studio — empty scene. Load the sample or add appearances.",

  loadSampleRender: () => {
    set({
      sceneNodes: seedScene(),
      selectedNodeId: "part_bracket",
      lights: seedLights(),
      statusMessage: "Sample render scene loaded.",
    });
  },

  setActiveTool: (tool) => {
    const panel = TOOL_TO_PANEL[tool];
    set({
      activeTool: tool,
      ...(panel ? { activePanel: panel } : {}),
      statusMessage:
        tool === "render"
          ? "Pushing mapped PBR uniforms to future WebGL renderer…"
          : `Tool: ${tool}`,
    });
    if (tool === "render") {
      get().pushToRenderer();
    }
  },

  setActivePanel: (panel) => set({ activePanel: panel }),
  setAppearanceTab: (tab) => set({ appearanceTab: tab }),

  selectNode: (id) => {
    const node = get().sceneNodes.find((n) => n.id === id);
    set({
      selectedNodeId: id,
      ...(node?.appearanceId
        ? { selectedFunctionId: node.appearanceId, activePanel: "appearances" }
        : {}),
    });
    get().recomputePbr();
  },

  setNodeVisible: (id, visible) => {
    set({
      sceneNodes: get().sceneNodes.map((n) =>
        n.id === id ? { ...n, visible } : n,
      ),
    });
  },

  selectFunction: (id) => {
    set({ selectedFunctionId: id, appearanceTab: "functions" });
    const { selectedNodeId, sceneNodes } = get();
    if (selectedNodeId) {
      set({
        sceneNodes: sceneNodes.map((n) =>
          n.id === selectedNodeId ? { ...n, appearanceId: id } : n,
        ),
      });
    }
    get().recomputePbr();
  },

  toggleModifier: (id, enabled) => {
    set({
      modifiers: get().modifiers.map((m) =>
        m.id === id ? { ...m, enabled } : m,
      ),
      appearanceTab: "modifiers",
    });
    get().recomputePbr();
  },

  updateModifier: (id, patch) => {
    set({
      modifiers: get().modifiers.map((m) =>
        m.id === id ? { ...m, ...patch } : m,
      ),
    });
    get().recomputePbr();
  },

  selectEmission: (id) => {
    set({ selectedEmissionId: id, appearanceTab: "lightEmission" });
    get().recomputePbr();
  },

  selectEnvironment: (id) => {
    set({ activeEnvironmentId: id, activePanel: "environments" });
    get().recomputePbr();
  },

  updateEnvironment: (id, patch) => {
    set({
      environments: get().environments.map((e) =>
        e.id === id ? { ...e, ...patch } : e,
      ),
    });
    get().recomputePbr();
  },

  updateAxf: (patch) => {
    set({ axf: { ...get().axf, ...patch } });
    get().recomputePbr();
  },

  updateVolume: (patch) => {
    set({ volume: { ...get().volume, ...patch } });
    get().recomputePbr();
  },

  updateLight: (id, patch) => {
    set({
      lights: get().lights.map((l) =>
        l.id === id
          ? {
              ...l,
              ...patch,
              position: patch.position
                ? ([...patch.position] as [number, number, number])
                : l.position,
            }
          : l,
      ),
    });
  },

  recomputePbr: () => {
    const state = get();
    const base =
      state.functions.find((f) => f.id === state.selectedFunctionId) ?? null;
    const emission =
      state.emissions.find((e) => e.id === state.selectedEmissionId) ?? null;
    const environment =
      state.environments.find((e) => e.id === state.activeEnvironmentId) ??
      null;

    const pbr = mapAppearanceToPbr({
      base,
      modifiers: state.modifiers,
      emission,
      environment,
      axf: state.activePanel === "axf" || state.axf.fileRef ? state.axf : null,
      volume:
        state.activePanel === "volume" || state.volume.density > 0
          ? state.volume
          : null,
    });

    const { selectedNodeId, sceneNodes } = state;
    set({
      activePbr: pbr,
      sceneNodes: sceneNodes.map((n) =>
        n.id === selectedNodeId && n.kind === "part"
          ? { ...n, pbr: { ...pbr } }
          : n,
      ),
    });
  },

  pushToRenderer: () => {
    const uniforms = pbrToRendererUniforms(get().activePbr);
    console.info("[RenderStudio] PBR uniforms → WebGL binder", uniforms);
    set({
      lastUniforms: uniforms,
      statusMessage: `Mapped ${Object.keys(uniforms).length} PBR uniforms for WebGL (scaffold).`,
      activeTool: "select",
    });
  },

  setStatusMessage: (message) => set({ statusMessage: message }),
}));
