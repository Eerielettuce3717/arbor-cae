/** PCB Studio domain types: board, components, traces, rigid-flex, Altium 365. */

export type Vec2 = [number, number];

export type PcbToolId =
  | "select"
  | "place"
  | "route"
  | "via"
  | "outline"
  | "rigidFlex"
  | "altium365"
  | "manufacturing"
  | "measure"
  | "3dPreview";

export type PcbPanelId =
  | "none"
  | "board"
  | "components"
  | "traces"
  | "layers"
  | "rigidFlex"
  | "altium365"
  | "manufacturing";

/** Target fab process for DRC + Gerber/Excellon export. */
export type ManufacturingType = "standardFab" | "additiveInk";

export type PcbLayerId =
  | "topCopper"
  | "bottomCopper"
  | "topSilk"
  | "bottomSilk"
  | "topMask"
  | "bottomMask"
  | "board";

export type SnapAngleMode = 45 | 90;

export type BoardRegionKind = "rigid" | "flex";

export type TraceNetClass = "signal" | "power" | "ground" | "diff";

export interface PcbPoint {
  x: number;
  y: number;
}

export interface BoardOutline {
  /** Closed polygon in mm (board XY). */
  points: PcbPoint[];
  thicknessMm: number;
  /** Overall board name / designator. */
  name: string;
}

export interface BoardRegion {
  id: string;
  name: string;
  kind: BoardRegionKind;
  /** Region polygon in mm. */
  points: PcbPoint[];
  /** Flex bend line endpoints (null for rigid). */
  bendLine: { a: PcbPoint; b: PcbPoint } | null;
  bendRadiusMm: number;
  stackupId: string;
}

export interface RigidFlexWorkflow {
  enabled: boolean;
  regions: BoardRegion[];
  activeRegionId: string | null;
  foldPreviewDeg: number;
  status: "scaffold" | "ready";
}

export interface Altium365Integration {
  connected: boolean;
  workspaceUrl: string;
  projectId: string;
  lastSyncAt: string | null;
  syncStatus: "idle" | "syncing" | "error" | "scaffold";
  commentsEnabled: boolean;
  statusMessage: string;
}

export interface PcbPad {
  id: string;
  x: number;
  y: number;
  widthMm: number;
  heightMm: number;
  layer: PcbLayerId;
  net: string | null;
}

export interface PcbComponent {
  id: string;
  designator: string;
  footprint: string;
  x: number;
  y: number;
  rotationDeg: number;
  /** Footprint bounding box size in mm. */
  widthMm: number;
  heightMm: number;
  /** Approximate 3D body height in mm. */
  height3dMm: number;
  layer: "top" | "bottom";
  pads: PcbPad[];
  color: string;
}

export interface TraceVertex {
  x: number;
  y: number;
}

export interface PcbTrace {
  id: string;
  net: string;
  netClass: TraceNetClass;
  layer: PcbLayerId;
  widthMm: number;
  vertices: TraceVertex[];
  /** In-progress route (cursor preview) — not committed. */
  draft: boolean;
}

export interface PcbVia {
  id: string;
  x: number;
  y: number;
  drillMm: number;
  padMm: number;
  net: string;
  fromLayer: PcbLayerId;
  toLayer: PcbLayerId;
}

export interface PcbLayerDef {
  id: PcbLayerId;
  name: string;
  visible: boolean;
  color: string;
}

export const PCB_LAYERS: PcbLayerDef[] = [
  { id: "topCopper", name: "Top Copper", visible: true, color: "#c45c26" },
  { id: "bottomCopper", name: "Bottom Copper", visible: true, color: "#2a6fdb" },
  { id: "topSilk", name: "Top Silk", visible: true, color: "#e8e8e8" },
  { id: "bottomSilk", name: "Bottom Silk", visible: false, color: "#b0b0b0" },
  { id: "topMask", name: "Top Mask", visible: false, color: "#1a5c3a" },
  { id: "bottomMask", name: "Bottom Mask", visible: false, color: "#1a5c3a" },
  { id: "board", name: "Board", visible: true, color: "#1a4d2e" },
];

export const DEFAULT_OUTLINE: BoardOutline = {
  name: "Main Board",
  thicknessMm: 1.6,
  points: [
    { x: 0, y: 0 },
    { x: 80, y: 0 },
    { x: 80, y: 50 },
    { x: 0, y: 50 },
  ],
};

export const DEFAULT_RIGID_FLEX: RigidFlexWorkflow = {
  enabled: false,
  regions: [
    {
      id: "region_rigid_a",
      name: "Rigid A",
      kind: "rigid",
      points: [
        { x: 0, y: 0 },
        { x: 50, y: 0 },
        { x: 50, y: 50 },
        { x: 0, y: 50 },
      ],
      bendLine: null,
      bendRadiusMm: 0,
      stackupId: "stack_rigid",
    },
    {
      id: "region_flex",
      name: "Flex Zone",
      kind: "flex",
      points: [
        { x: 50, y: 10 },
        { x: 65, y: 10 },
        { x: 65, y: 40 },
        { x: 50, y: 40 },
      ],
      bendLine: {
        a: { x: 57.5, y: 10 },
        b: { x: 57.5, y: 40 },
      },
      bendRadiusMm: 1.5,
      stackupId: "stack_flex",
    },
    {
      id: "region_rigid_b",
      name: "Rigid B",
      kind: "rigid",
      points: [
        { x: 65, y: 5 },
        { x: 80, y: 5 },
        { x: 80, y: 45 },
        { x: 65, y: 45 },
      ],
      bendLine: null,
      bendRadiusMm: 0,
      stackupId: "stack_rigid",
    },
  ],
  activeRegionId: "region_flex",
  foldPreviewDeg: 0,
  status: "scaffold",
};

export const DEFAULT_ALTIUM365: Altium365Integration = {
  connected: false,
  workspaceUrl: "https://365.altium.com/",
  projectId: "",
  lastSyncAt: null,
  syncStatus: "scaffold",
  commentsEnabled: true,
  statusMessage: "Altium 365 — connect workspace to sync schematics / PCB.",
};

export const PCB_TOOLBAR_GROUPS: {
  id: string;
  label: string;
  tools: { id: PcbToolId; label: string }[];
}[] = [
  {
    id: "edit",
    label: "Edit",
    tools: [
      { id: "select", label: "Select" },
      { id: "place", label: "Place" },
      { id: "route", label: "Route" },
      { id: "via", label: "Via" },
      { id: "outline", label: "Outline" },
    ],
  },
  {
    id: "workflow",
    label: "Workflow",
    tools: [
      { id: "rigidFlex", label: "Rigid-Flex" },
      { id: "altium365", label: "Altium 365" },
      { id: "manufacturing", label: "Export Mfg" },
    ],
  },
  {
    id: "view",
    label: "View",
    tools: [
      { id: "measure", label: "Measure" },
      { id: "3dPreview", label: "3D Preview" },
    ],
  },
];

export const LAYER_COLORS: Record<PcbLayerId, string> = {
  topCopper: "#c45c26",
  bottomCopper: "#2a6fdb",
  topSilk: "#e8e8e8",
  bottomSilk: "#b0b0b0",
  topMask: "#1a5c3a",
  bottomMask: "#1a5c3a",
  board: "#1a4d2e",
};
