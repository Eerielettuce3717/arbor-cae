import type { Vec2, ViewOrientation } from "../drawings/projection";

export type { Vec2, ViewOrientation };

export type DrawingUnit = "mm" | "inch";

export type SheetFormat =
  | "A4"
  | "A3"
  | "A2"
  | "A1"
  | "A0"
  | "Letter"
  | "Tabloid"
  | "Custom";

export type ProjectionStandard = "thirdAngle" | "firstAngle";

export type DrawingToolId =
  | DrawingViewType
  | DrawingDimensionType
  | DrawingAnnotationType
  | DrawingTableType
  | "select"
  | "mbdCheck"
  | "tolerances"
  | "update"
  | "export"
  | "print"
  | "dangling";

export type DrawingViewType =
  | "projected"
  | "auxiliary"
  | "section"
  | "alignedSection"
  | "brokenOutSection"
  | "detail"
  | "break"
  | "crop"
  | "flatPattern";

export type DrawingDimensionType =
  | "chamfer"
  | "maxMin"
  | "twoPointLinear"
  | "pointLineToLine"
  | "angular"
  | "arcLength"
  | "radial"
  | "diameter"
  | "ordinate";

export type DrawingAnnotationType =
  | "holeThreadCallout"
  | "datum"
  | "geometricTolerance"
  | "surfaceFinish"
  | "weldSymbol"
  | "note"
  | "balloon";

export type DrawingTableType =
  | "bom"
  | "cutList"
  | "hole"
  | "custom"
  | "revision";

export type EntityStatus = "ok" | "dangling" | "scaffold" | "suppressed";

export type MbdCheckStatus = "pass" | "warn" | "fail" | "unknown";

export interface SheetSize {
  widthMm: number;
  heightMm: number;
  label: string;
}

export const SHEET_FORMATS: Record<SheetFormat, SheetSize> = {
  A4: { widthMm: 210, heightMm: 297, label: "A4 (210×297)" },
  A3: { widthMm: 297, heightMm: 420, label: "A3 (297×420)" },
  A2: { widthMm: 420, heightMm: 594, label: "A2 (420×594)" },
  A1: { widthMm: 594, heightMm: 841, label: "A1 (594×841)" },
  A0: { widthMm: 841, heightMm: 1189, label: "A0 (841×1189)" },
  Letter: { widthMm: 215.9, heightMm: 279.4, label: "Letter (8.5×11\")" },
  Tabloid: { widthMm: 279.4, heightMm: 431.8, label: "Tabloid (11×17\")" },
  Custom: { widthMm: 420, heightMm: 297, label: "Custom" },
};

export interface DrawingTemplate {
  id: string;
  name: string;
  format: SheetFormat;
  landscape: boolean;
  company: string;
  titleBlockStyle: "standard" | "compact" | "custom";
  projection: ProjectionStandard;
}

export const DRAWING_TEMPLATES: DrawingTemplate[] = [
  {
    id: "tpl_iso_a3",
    name: "ISO A3 Landscape",
    format: "A3",
    landscape: true,
    company: "Cad Engine",
    titleBlockStyle: "standard",
    projection: "thirdAngle",
  },
  {
    id: "tpl_iso_a4",
    name: "ISO A4 Portrait",
    format: "A4",
    landscape: false,
    company: "Cad Engine",
    titleBlockStyle: "compact",
    projection: "thirdAngle",
  },
  {
    id: "tpl_ansi_b",
    name: "ANSI B Landscape",
    format: "Tabloid",
    landscape: true,
    company: "Cad Engine",
    titleBlockStyle: "standard",
    projection: "thirdAngle",
  },
  {
    id: "tpl_custom",
    name: "Custom Template",
    format: "Custom",
    landscape: true,
    company: "Cad Engine",
    titleBlockStyle: "custom",
    projection: "firstAngle",
  },
];

export interface DrawingStyle {
  id: string;
  name: string;
  lineWeightMm: number;
  fontFamily: string;
  fontSizeMm: number;
  dimArrowSize: number;
  dimGap: number;
  color: string;
}

export const DRAWING_STYLES: DrawingStyle[] = [
  {
    id: "sty_iso",
    name: "ISO Drafting",
    lineWeightMm: 0.35,
    fontFamily: "IBM Plex Sans",
    fontSizeMm: 3.5,
    dimArrowSize: 2.5,
    dimGap: 1.5,
    color: "#0f172a",
  },
  {
    id: "sty_ansi",
    name: "ANSI Drafting",
    lineWeightMm: 0.5,
    fontFamily: "IBM Plex Sans",
    fontSizeMm: 3.2,
    dimArrowSize: 3,
    dimGap: 1.5,
    color: "#0f172a",
  },
  {
    id: "sty_presentation",
    name: "Presentation",
    lineWeightMm: 0.7,
    fontFamily: "IBM Plex Sans",
    fontSizeMm: 4,
    dimArrowSize: 3.5,
    dimGap: 2,
    color: "#1e3a5f",
  },
];

export interface DrawingProperties {
  units: DrawingUnit;
  precision: number;
  annotationsVisible: boolean;
  format: SheetFormat;
  landscape: boolean;
  projection: ProjectionStandard;
  scale: string;
  material: string;
  finish: string;
  drawnBy: string;
  checkedBy: string;
  date: string;
  revision: string;
  partNumber: string;
  title: string;
  company: string;
}

export const DEFAULT_DRAWING_PROPERTIES: DrawingProperties = {
  units: "mm",
  precision: 2,
  annotationsVisible: true,
  format: "A3",
  landscape: true,
  projection: "thirdAngle",
  scale: "1:2",
  material: "Al 6061-T6",
  finish: "As machined",
  drawnBy: "VG",
  checkedBy: "",
  date: "2026-09-12",
  revision: "A",
  partNumber: "HSG-A-100",
  title: "Housing A",
  company: "Cad Engine",
};

export interface DrawingSheetMeta {
  id: string;
  name: string;
  templateId: string;
  format: SheetFormat;
  landscape: boolean;
  active: boolean;
}

export interface ModelBox {
  min: { x: number; y: number; z: number };
  max: { x: number; y: number; z: number };
}

export interface DrawingView {
  id: string;
  name: string;
  type: DrawingViewType;
  parentViewId: string | null;
  orientation: ViewOrientation;
  origin: Vec2;
  scale: number;
  rotationDeg: number;
  sectionPlane?: { origin: Vec2; angleDeg: number };
  detailCircle?: { center: Vec2; radius: number };
  breakGap?: number;
  cropBounds?: { min: Vec2; max: Vec2 };
  modelBox: ModelBox;
  status: EntityStatus;
  visible: boolean;
}

export interface DrawingDimension {
  id: string;
  name: string;
  type: DrawingDimensionType;
  viewId: string;
  pointA: Vec2;
  pointB: Vec2;
  offset: number;
  valueOverride: number | null;
  status: EntityStatus;
  /** Model entity refs — missing refs → dangling. */
  refA: string | null;
  refB: string | null;
}

export interface DrawingAnnotation {
  id: string;
  name: string;
  type: DrawingAnnotationType;
  viewId: string | null;
  position: Vec2;
  text: string;
  status: EntityStatus;
  refEntityId: string | null;
}

export interface DrawingTable {
  id: string;
  name: string;
  type: DrawingTableType;
  position: Vec2;
  columns: string[];
  rows: string[][];
  status: EntityStatus;
}

export interface ToleranceClass {
  id: string;
  name: string;
  standard: "ISO 2768" | "ASME" | "Custom";
  linearFine: string;
  linearMedium: string;
  linearCoarse: string;
  angular: string;
  description: string;
}

export const DEFAULT_TOLERANCE_LIBRARY: ToleranceClass[] = [
  {
    id: "tol_iso_m",
    name: "ISO 2768-m",
    standard: "ISO 2768",
    linearFine: "±0.05",
    linearMedium: "±0.1",
    linearCoarse: "±0.2",
    angular: "±0°30'",
    description: "Medium general tolerances (default).",
  },
  {
    id: "tol_iso_f",
    name: "ISO 2768-f",
    standard: "ISO 2768",
    linearFine: "±0.05",
    linearMedium: "±0.1",
    linearCoarse: "±0.15",
    angular: "±0°20'",
    description: "Fine general tolerances.",
  },
  {
    id: "tol_iso_c",
    name: "ISO 2768-c",
    standard: "ISO 2768",
    linearFine: "±0.2",
    linearMedium: "±0.3",
    linearCoarse: "±0.5",
    angular: "±0°30'",
    description: "Coarse general tolerances.",
  },
  {
    id: "tol_asme",
    name: "ASME Y14.5 Default",
    standard: "ASME",
    linearFine: "±.005",
    linearMedium: "±.010",
    linearCoarse: "±.030",
    angular: "±0.5°",
    description: "Inch-oriented default block.",
  },
  {
    id: "tol_custom",
    name: "Shop Custom",
    standard: "Custom",
    linearFine: "±0.02",
    linearMedium: "±0.05",
    linearCoarse: "±0.1",
    angular: "±0°15'",
    description: "User-defined shop defaults.",
  },
];

export interface MbdCheckItem {
  id: string;
  label: string;
  status: MbdCheckStatus;
  detail: string;
}

export interface DrawingExportState {
  lastUpdatedAt: number | null;
  danglingCount: number;
  exportFormat: "pdf" | "dxf" | "dwg" | "svg";
  printReady: boolean;
  message: string;
}

export const VIEW_CATALOG: {
  type: DrawingViewType;
  label: string;
  implemented: boolean;
  description: string;
}[] = [
  {
    type: "projected",
    label: "Projected",
    implemented: true,
    description: "Orthographic projection from parent or model.",
  },
  {
    type: "auxiliary",
    label: "Auxiliary",
    implemented: false,
    description: "True-shape view normal to a selected plane/edge.",
  },
  {
    type: "section",
    label: "Section",
    implemented: false,
    description: "Cutting plane through the model.",
  },
  {
    type: "alignedSection",
    label: "Aligned Section",
    implemented: false,
    description: "Revolved section aligned to features.",
  },
  {
    type: "brokenOutSection",
    label: "Broken-Out Section",
    implemented: false,
    description: "Local material removal to expose internals.",
  },
  {
    type: "detail",
    label: "Detail",
    implemented: false,
    description: "Enlarged circular callout of a region.",
  },
  {
    type: "break",
    label: "Break",
    implemented: false,
    description: "Shortened view with break lines.",
  },
  {
    type: "crop",
    label: "Crop",
    implemented: false,
    description: "Boundary crop of an existing view.",
  },
  {
    type: "flatPattern",
    label: "Flat Pattern",
    implemented: false,
    description: "Sheet-metal flat pattern view.",
  },
];

export const DIMENSION_CATALOG: {
  type: DrawingDimensionType;
  label: string;
  implemented: boolean;
}[] = [
  { type: "chamfer", label: "Chamfer", implemented: false },
  { type: "maxMin", label: "Max/Min", implemented: false },
  { type: "twoPointLinear", label: "2 Point Linear", implemented: true },
  { type: "pointLineToLine", label: "Point/Line to Line", implemented: false },
  { type: "angular", label: "Angular", implemented: false },
  { type: "arcLength", label: "Arc Length", implemented: false },
  { type: "radial", label: "Radial", implemented: false },
  { type: "diameter", label: "Diameter", implemented: false },
  { type: "ordinate", label: "Ordinate", implemented: false },
];

export const ANNOTATION_CATALOG: {
  type: DrawingAnnotationType;
  label: string;
  implemented: boolean;
}[] = [
  { type: "holeThreadCallout", label: "Hole/Thread Callout", implemented: false },
  { type: "datum", label: "Datum", implemented: false },
  { type: "geometricTolerance", label: "Geometric Tolerance", implemented: false },
  { type: "surfaceFinish", label: "Surface Finish", implemented: false },
  { type: "weldSymbol", label: "Weld Symbol", implemented: false },
  { type: "note", label: "Note", implemented: false },
  { type: "balloon", label: "Balloon", implemented: false },
];

export const TABLE_CATALOG: {
  type: DrawingTableType;
  label: string;
  implemented: boolean;
}[] = [
  { type: "bom", label: "BOM", implemented: false },
  { type: "cutList", label: "Cut List", implemented: false },
  { type: "hole", label: "Hole", implemented: false },
  { type: "custom", label: "Custom", implemented: false },
  { type: "revision", label: "Revision", implemented: false },
];

export const IMPLEMENTED_VIEWS = new Set<DrawingViewType>(["projected"]);
export const IMPLEMENTED_DIMENSIONS = new Set<DrawingDimensionType>([
  "twoPointLinear",
]);

export const DRAWING_TOOLBAR_GROUPS: {
  id: string;
  label: string;
  tools: { id: DrawingToolId; label: string }[];
}[] = [
  {
    id: "select",
    label: "Select",
    tools: [{ id: "select", label: "Select" }],
  },
  {
    id: "views",
    label: "Views",
    tools: VIEW_CATALOG.map((v) => ({ id: v.type, label: v.label })),
  },
  {
    id: "dimensions",
    label: "Dimensions",
    tools: DIMENSION_CATALOG.map((d) => ({ id: d.type, label: d.label })),
  },
  {
    id: "annotations",
    label: "Annotations",
    tools: ANNOTATION_CATALOG.map((a) => ({ id: a.type, label: a.label })),
  },
  {
    id: "tables",
    label: "Tables",
    tools: TABLE_CATALOG.map((t) => ({ id: t.type, label: t.label })),
  },
  {
    id: "mbd",
    label: "MBD / Output",
    tools: [
      { id: "mbdCheck", label: "MBD Check" },
      { id: "tolerances", label: "Tolerances" },
      { id: "update", label: "Update" },
      { id: "dangling", label: "Dangling" },
      { id: "export", label: "Export" },
      { id: "print", label: "Print" },
    ],
  },
];

export function sheetPixelSize(
  format: SheetFormat,
  landscape: boolean,
): { widthMm: number; heightMm: number } {
  const base = SHEET_FORMATS[format];
  if (landscape) {
    return {
      widthMm: Math.max(base.widthMm, base.heightMm),
      heightMm: Math.min(base.widthMm, base.heightMm),
    };
  }
  return {
    widthMm: Math.min(base.widthMm, base.heightMm),
    heightMm: Math.max(base.widthMm, base.heightMm),
  };
}

export function defaultNameForView(type: DrawingViewType, n: number): string {
  const label = VIEW_CATALOG.find((v) => v.type === type)?.label ?? type;
  return `${label} ${n}`;
}

export function defaultNameForDimension(
  type: DrawingDimensionType,
  n: number,
): string {
  const label = DIMENSION_CATALOG.find((d) => d.type === type)?.label ?? type;
  return `${label} ${n}`;
}

export function defaultNameForAnnotation(
  type: DrawingAnnotationType,
  n: number,
): string {
  const label = ANNOTATION_CATALOG.find((a) => a.type === type)?.label ?? type;
  return `${label} ${n}`;
}

export function defaultNameForTable(type: DrawingTableType, n: number): string {
  const label = TABLE_CATALOG.find((t) => t.type === type)?.label ?? type;
  return `${label} ${n}`;
}

export const DEFAULT_MODEL_BOX: ModelBox = {
  min: { x: -40, y: -25, z: -15 },
  max: { x: 40, y: 25, z: 15 },
};
