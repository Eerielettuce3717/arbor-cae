/** Camera projection / axonometric presets (Onshape-style). */
export type CameraMode =
  | "perspective"
  | "isometric"
  | "dimetric"
  | "trimetric"
  | "orient-sketch-plane";

export type ShadingMode = "shaded" | "unshaded" | "translucent";

export type HiddenEdgesMode = "visible" | "removed";

export type TangentEdgesMode = "visible" | "phantom" | "removed";

export interface RenderOptionsState {
  shading: ShadingMode;
  hiddenEdges: HiddenEdgesMode;
  tangentEdges: TangentEdgesMode;
  highQuality: boolean;
  highlightBoundaryEdges: boolean;
}

export type DisplayOverride =
  | "hide-show"
  | "isolate"
  | "make-transparent"
  | "section-view";

export interface DisplayOverridesState {
  /** Parts currently forced hidden (ids). */
  hiddenIds: string[];
  /** When set, only these ids remain visible. */
  isolatedIds: string[] | null;
  /** Parts rendered translucent regardless of shading mode. */
  transparentIds: string[];
  sectionViewEnabled: boolean;
  /** Plane in world space: ax + by + cz + d = 0 */
  sectionPlane: { a: number; b: number; c: number; d: number };
}

export interface ViewportStatus {
  cameraMode: CameraMode;
  shading: ShadingMode;
  fps: number;
}

export const DEFAULT_RENDER_OPTIONS: RenderOptionsState = {
  shading: "shaded",
  hiddenEdges: "visible",
  tangentEdges: "phantom",
  highQuality: true,
  highlightBoundaryEdges: true,
};

export const DEFAULT_DISPLAY_OVERRIDES: DisplayOverridesState = {
  hiddenIds: [],
  isolatedIds: null,
  transparentIds: [],
  sectionViewEnabled: false,
  sectionPlane: { a: 0, b: 0, c: 1, d: 0 },
};

/** Sketch plane placeholder — Front (XY) until sketch module wires in. */
export const DEFAULT_SKETCH_PLANE = {
  origin: { x: 0, y: 0, z: 0 },
  normal: { x: 0, y: 0, z: 1 },
  up: { x: 0, y: 1, z: 0 },
} as const;
