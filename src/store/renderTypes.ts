/** Render Studio domain types: scenes, appearances, environments, PBR mapping. */

export type RenderToolId =
  | "select"
  | "appearances"
  | "environments"
  | "axf"
  | "volume"
  | "lights"
  | "render"
  | "camera";

export type RenderPanelId =
  | "none"
  | "appearances"
  | "environments"
  | "axf"
  | "volume"
  | "lights"
  | "camera";

export type AppearanceCategory = "functions" | "modifiers" | "lightEmission";

export type AppearanceFunctionKind =
  | "color"
  | "metal"
  | "plastic"
  | "glass"
  | "ceramic"
  | "custom";

export type AppearanceModifierKind =
  | "clearcoat"
  | "anisotropy"
  | "sheen"
  | "transmission"
  | "bump"
  | "normal";

/** Parameters mapped to a future WebGL MeshStandard / MeshPhysical material. */
export interface PbrMaterialParams {
  color: string;
  metalness: number;
  roughness: number;
  opacity: number;
  emissive: string;
  emissiveIntensity: number;
  clearcoat: number;
  clearcoatRoughness: number;
  transmission: number;
  ior: number;
  thickness: number;
  sheen: number;
  sheenRoughness: number;
  sheenColor: string;
  anisotropy: number;
  anisotropyRotation: number;
  envMapIntensity: number;
  /** Optional texture / AxF / volume payload ids for the renderer bridge. */
  normalMapId: string | null;
  bumpMapId: string | null;
  axfId: string | null;
  volumeId: string | null;
}

export interface AppearanceFunction {
  id: string;
  name: string;
  kind: AppearanceFunctionKind;
  category: "functions";
  baseColor: string;
  metalness: number;
  roughness: number;
  opacity: number;
}

export interface AppearanceModifier {
  id: string;
  name: string;
  kind: AppearanceModifierKind;
  category: "modifiers";
  enabled: boolean;
  strength: number;
  secondary: number;
}

export interface LightEmissionAppearance {
  id: string;
  name: string;
  category: "lightEmission";
  emissiveColor: string;
  intensity: number;
  temperatureK: number;
  castLight: boolean;
}

export type LibraryAppearance =
  | AppearanceFunction
  | AppearanceModifier
  | LightEmissionAppearance;

export interface EnvironmentPreset {
  id: string;
  name: string;
  kind: "hdri" | "studio" | "outdoor" | "custom";
  intensity: number;
  rotationDeg: number;
  backgroundVisible: boolean;
  /** Path or URL stub for future HDRI / cubemap loader. */
  mapRef: string;
  groundShadow: boolean;
}

export interface AxFAppearanceOptions {
  id: string;
  name: string;
  fileRef: string;
  scale: number;
  rotationDeg: number;
  useSpectral: boolean;
  previewSrgb: boolean;
}

export interface VolumeAppearanceOptions {
  id: string;
  name: string;
  density: number;
  absorptionColor: string;
  scatteringColor: string;
  anisotropy: number;
  stepSize: number;
}

export interface RenderLight {
  id: string;
  name: string;
  kind: "directional" | "point" | "spot" | "area" | "ibl";
  color: string;
  intensity: number;
  position: [number, number, number];
  castShadow: boolean;
  enabled: boolean;
}

export type RenderSceneNodeKind =
  | "root"
  | "part"
  | "appearance"
  | "environment"
  | "light"
  | "camera";

export interface RenderSceneNode {
  id: string;
  kind: RenderSceneNodeKind;
  label: string;
  parentId: string | null;
  visible: boolean;
  appearanceId: string | null;
  /** Resolved PBR bag passed to the future WebGL material binder. */
  pbr: PbrMaterialParams | null;
}

export const DEFAULT_PBR: PbrMaterialParams = {
  color: "#8a9bb0",
  metalness: 0.2,
  roughness: 0.45,
  opacity: 1,
  emissive: "#000000",
  emissiveIntensity: 0,
  clearcoat: 0,
  clearcoatRoughness: 0.1,
  transmission: 0,
  ior: 1.5,
  thickness: 0.5,
  sheen: 0,
  sheenRoughness: 0.5,
  sheenColor: "#ffffff",
  anisotropy: 0,
  anisotropyRotation: 0,
  envMapIntensity: 1,
  normalMapId: null,
  bumpMapId: null,
  axfId: null,
  volumeId: null,
};

export const APPEARANCE_FUNCTIONS: AppearanceFunction[] = [
  {
    id: "fn_brushed_al",
    name: "Brushed Aluminum",
    kind: "metal",
    category: "functions",
    baseColor: "#c0c6cc",
    metalness: 0.92,
    roughness: 0.35,
    opacity: 1,
  },
  {
    id: "fn_abs_black",
    name: "ABS Black",
    kind: "plastic",
    category: "functions",
    baseColor: "#1a1a1a",
    metalness: 0,
    roughness: 0.55,
    opacity: 1,
  },
  {
    id: "fn_clear_glass",
    name: "Clear Glass",
    kind: "glass",
    category: "functions",
    baseColor: "#e8f4ff",
    metalness: 0,
    roughness: 0.05,
    opacity: 0.15,
  },
  {
    id: "fn_ceramic_white",
    name: "Ceramic White",
    kind: "ceramic",
    category: "functions",
    baseColor: "#f5f2eb",
    metalness: 0,
    roughness: 0.4,
    opacity: 1,
  },
];

export const APPEARANCE_MODIFIERS: AppearanceModifier[] = [
  {
    id: "mod_clearcoat",
    name: "Clearcoat",
    kind: "clearcoat",
    category: "modifiers",
    enabled: false,
    strength: 0.8,
    secondary: 0.1,
  },
  {
    id: "mod_anisotropy",
    name: "Anisotropy",
    kind: "anisotropy",
    category: "modifiers",
    enabled: false,
    strength: 0.6,
    secondary: 0,
  },
  {
    id: "mod_sheen",
    name: "Sheen",
    kind: "sheen",
    category: "modifiers",
    enabled: false,
    strength: 0.4,
    secondary: 0.5,
  },
  {
    id: "mod_transmission",
    name: "Transmission",
    kind: "transmission",
    category: "modifiers",
    enabled: false,
    strength: 1,
    secondary: 1.5,
  },
  {
    id: "mod_bump",
    name: "Bump",
    kind: "bump",
    category: "modifiers",
    enabled: false,
    strength: 0.25,
    secondary: 0,
  },
];

export const LIGHT_EMISSION_PRESETS: LightEmissionAppearance[] = [
  {
    id: "emit_led_cool",
    name: "LED Cool White",
    category: "lightEmission",
    emissiveColor: "#e8f0ff",
    intensity: 2.5,
    temperatureK: 6500,
    castLight: true,
  },
  {
    id: "emit_led_warm",
    name: "LED Warm",
    category: "lightEmission",
    emissiveColor: "#ffd9a8",
    intensity: 1.8,
    temperatureK: 3000,
    castLight: true,
  },
  {
    id: "emit_led_soft",
    name: "Soft Fill",
    category: "lightEmission",
    emissiveColor: "#88aaff",
    intensity: 0.6,
    temperatureK: 5000,
    castLight: false,
  },
];

export const ENVIRONMENT_LIBRARY: EnvironmentPreset[] = [
  {
    id: "env_studio_soft",
    name: "Studio Softbox",
    kind: "studio",
    intensity: 1,
    rotationDeg: 0,
    backgroundVisible: true,
    mapRef: "hdr://studio_softbox.hdr",
    groundShadow: true,
  },
  {
    id: "env_outdoor_overcast",
    name: "Outdoor Overcast",
    kind: "outdoor",
    intensity: 1.2,
    rotationDeg: 35,
    backgroundVisible: true,
    mapRef: "hdr://outdoor_overcast.hdr",
    groundShadow: true,
  },
  {
    id: "env_warehouse",
    name: "Warehouse",
    kind: "hdri",
    intensity: 0.85,
    rotationDeg: 90,
    backgroundVisible: false,
    mapRef: "hdr://warehouse.hdr",
    groundShadow: true,
  },
];

export const DEFAULT_AXF: AxFAppearanceOptions = {
  id: "axf_1",
  name: "AxF Sample",
  fileRef: "axf://sample.axf",
  scale: 1,
  rotationDeg: 0,
  useSpectral: true,
  previewSrgb: true,
};

export const DEFAULT_VOLUME: VolumeAppearanceOptions = {
  id: "vol_1",
  name: "Homogeneous Volume",
  density: 0.15,
  absorptionColor: "#2a1a10",
  scatteringColor: "#c8b090",
  anisotropy: 0.2,
  stepSize: 0.05,
};

export const RENDER_TOOLBAR_GROUPS: {
  id: string;
  label: string;
  tools: { id: RenderToolId; label: string }[];
}[] = [
  {
    id: "libraries",
    label: "Libraries",
    tools: [
      { id: "appearances", label: "Appearances" },
      { id: "environments", label: "Environments" },
    ],
  },
  {
    id: "advanced",
    label: "Advanced",
    tools: [
      { id: "axf", label: "AxF" },
      { id: "volume", label: "Volume" },
      { id: "lights", label: "Light" },
    ],
  },
  {
    id: "output",
    label: "Output",
    tools: [
      { id: "camera", label: "Camera" },
      { id: "render", label: "Render" },
    ],
  },
];
