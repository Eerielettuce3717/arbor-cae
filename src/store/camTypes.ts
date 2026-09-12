/** CAM Studio domain types: setups, stock, WCS, ops, and toolpaths. */

export type Vec3 = [number, number, number];

export type CamToolId =
  | "select"
  | "setup"
  | "stock"
  | "wcs"
  | "pocket"
  | "faceSelect"
  | "generate"
  | "post"
  | "simulate";

export type StockMaterial =
  | "Aluminum 6061"
  | "Aluminum 7075"
  | "Mild Steel"
  | "Stainless 304"
  | "Brass C360"
  | "Delrin"
  | "Custom";

export type WcsFrameId = "G54" | "G55" | "G56" | "G57" | "G58" | "G59";

export type FlatFaceId =
  | "top"
  | "bottom"
  | "front"
  | "back"
  | "left"
  | "right";

export type ToolpathKind = "pocketClear" | "rapid" | "lead";

export type CamNodeKind = "setup" | "operation" | "toolpath";

export interface StockDefinition {
  /** Bounding-box size in mm (X, Y, Z). */
  size: Vec3;
  /** Stock corner / min corner in machine space (mm), before WCS. */
  origin: Vec3;
  material: StockMaterial;
  visible: boolean;
}

export interface WcsOrigin {
  frame: WcsFrameId;
  /** Origin offset in mm relative to stock min corner. */
  origin: Vec3;
  /** Rotation about Z in degrees (machine XY). */
  rotationDeg: number;
}

export interface SetupNode {
  id: string;
  name: string;
  kind: "setup";
  stock: StockDefinition;
  wcs: WcsOrigin;
  machine: string;
  spindleOrientation: "vertical";
  suppressed: boolean;
}

export interface ToolDefinition {
  id: string;
  name: string;
  diameterMm: number;
  fluteCount: number;
  lengthMm: number;
  type: "endmill" | "ball" | "face";
}

export interface PocketParams {
  /** Stepover as fraction of tool diameter (0–1). */
  stepover: number;
  /** Axial depth of cut per pass (mm). */
  depthOfCutMm: number;
  /** Total pocket depth from selected face (mm). */
  totalDepthMm: number;
  /** XY feed mm/min. */
  feedMmMin: number;
  /** Plunge feed mm/min. */
  plungeMmMin: number;
  /** Spindle RPM. */
  spindleRpm: number;
  /** Inset from face edges (radial stock-to-leave), mm. */
  stockToLeaveMm: number;
  /** Zigzag angle in degrees (0 = parallel to +X). */
  angleDeg: number;
}

export interface CamPoint2 {
  x: number;
  y: number;
}

export interface CamPoint3 {
  x: number;
  y: number;
  z: number;
}

export interface ToolpathSegment {
  points: CamPoint3[];
  kind: ToolpathKind;
  /** Rapid / feed flag for post. */
  rapid: boolean;
}

export interface Toolpath {
  id: string;
  name: string;
  kind: ToolpathKind;
  operationId: string;
  setupId: string;
  faceId: FlatFaceId;
  segments: ToolpathSegment[];
  /** Flattened XY points from pocket algorithm (Z applied later). */
  xyPoints: CamPoint2[];
  color: string;
  visible: boolean;
}

export interface PocketOperation {
  id: string;
  name: string;
  kind: "pocketClear";
  setupId: string;
  faceId: FlatFaceId | null;
  toolId: string;
  params: PocketParams;
  toolpathId: string | null;
  suppressed: boolean;
}

export interface CamTreeNode {
  id: string;
  kind: CamNodeKind;
  label: string;
  parentId: string | null;
  refId: string;
}

export const DEFAULT_POCKET_PARAMS: PocketParams = {
  stepover: 0.4,
  depthOfCutMm: 1.5,
  totalDepthMm: 6,
  feedMmMin: 800,
  plungeMmMin: 200,
  spindleRpm: 12000,
  stockToLeaveMm: 0.2,
  angleDeg: 0,
};

export const DEFAULT_STOCK: StockDefinition = {
  size: [100, 60, 20],
  origin: [0, 0, 0],
  material: "Aluminum 6061",
  visible: true,
};

export const DEFAULT_WCS: WcsOrigin = {
  frame: "G54",
  origin: [0, 0, 20],
  rotationDeg: 0,
};

export const DEFAULT_TOOL: ToolDefinition = {
  id: "tool_em_6",
  name: 'Ø6mm Flat Endmill',
  diameterMm: 6,
  fluteCount: 3,
  lengthMm: 50,
  type: "endmill",
};

export const CAM_TOOLBAR_GROUPS: {
  id: string;
  label: string;
  tools: { id: CamToolId; label: string }[];
}[] = [
  {
    id: "setup",
    label: "Setup",
    tools: [
      { id: "setup", label: "Setup" },
      { id: "stock", label: "Stock" },
      { id: "wcs", label: "WCS" },
    ],
  },
  {
    id: "ops",
    label: "2.5D",
    tools: [
      { id: "faceSelect", label: "Select Face" },
      { id: "pocket", label: "Pocket Clear" },
      { id: "generate", label: "Generate" },
    ],
  },
  {
    id: "post",
    label: "Output",
    tools: [
      { id: "post", label: "Post Fanuc" },
      { id: "simulate", label: "Simulate" },
    ],
  },
];

export const FACE_LABELS: Record<FlatFaceId, string> = {
  top: "Top (+Z)",
  bottom: "Bottom (−Z)",
  front: "Front (+Y)",
  back: "Back (−Y)",
  left: "Left (−X)",
  right: "Right (+X)",
};

export const STOCK_MATERIALS: StockMaterial[] = [
  "Aluminum 6061",
  "Aluminum 7075",
  "Mild Steel",
  "Stainless 304",
  "Brass C360",
  "Delrin",
  "Custom",
];

export const WCS_FRAMES: WcsFrameId[] = [
  "G54",
  "G55",
  "G56",
  "G57",
  "G58",
  "G59",
];
