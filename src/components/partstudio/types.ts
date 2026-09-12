/** All target sketch tools (Onshape-style). Only a subset has drawing logic today. */
export enum SketchTool {
  Select = "select",
  Line = "line",
  MidpointLine = "midpoint-line",
  CornerRectangle = "corner-rectangle",
  CenterPointRectangle = "center-point-rectangle",
  AlignedRectangle = "aligned-rectangle",
  CenterPointCircle = "center-point-circle",
  ThreePointCircle = "three-point-circle",
  Ellipse = "ellipse",
  ThreePointArc = "three-point-arc",
  TangentArc = "tangent-arc",
  CenterPointArc = "center-point-arc",
  EllipticalArc = "elliptical-arc",
  Conic = "conic",
  InscribedPolygon = "inscribed-polygon",
  CircumscribedPolygon = "circumscribed-polygon",
  Spline = "spline",
  Bezier = "bezier",
  SplineControlPoint = "spline-control-point",
  Point = "point",
  Text = "text",
  Use = "use",
  Intersection = "intersection",
  Construction = "construction",
  SketchChamfer = "sketch-chamfer",
  SketchFillet = "sketch-fillet",
  Trim = "trim",
  Extend = "extend",
  SketchSplit = "sketch-split",
  Offset = "offset",
  Slot = "slot",
  SketchMirror = "sketch-mirror",
  LinearSketchPattern = "linear-sketch-pattern",
  CircularSketchPattern = "circular-sketch-pattern",
  TransformSketch = "transform-sketch",
  InsertDxfDwg = "insert-dxf-dwg",
  InsertImage = "insert-image",
  Dimension = "dimension",
}

/** All target geometric / dimensional constraints. */
export enum SketchConstraintType {
  Coincident = "coincident",
  Concentric = "concentric",
  Parallel = "parallel",
  Tangent = "tangent",
  Horizontal = "horizontal",
  Vertical = "vertical",
  Perpendicular = "perpendicular",
  Equal = "equal",
  Midpoint = "midpoint",
  Normal = "normal",
  Pierce = "pierce",
  Symmetric = "symmetric",
  Fix = "fix",
  Curvature = "curvature",
  Dimension = "dimension",
}

/** Tools with implemented drawing / interaction math. */
export const IMPLEMENTED_SKETCH_TOOLS: ReadonlySet<SketchTool> = new Set([
  SketchTool.Select,
  SketchTool.Line,
  SketchTool.CornerRectangle,
  SketchTool.CenterPointRectangle,
  SketchTool.CenterPointCircle,
  SketchTool.Dimension,
]);

/** Constraints with implemented logic. */
export const IMPLEMENTED_CONSTRAINTS: ReadonlySet<SketchConstraintType> =
  new Set([SketchConstraintType.Coincident, SketchConstraintType.Dimension]);

export type Vec2 = { x: number; y: number };

export type EntityId = string;
export type ConstraintId = string;

export type SketchEntityKind =
  | "point"
  | "line"
  | "rectangle"
  | "circle"
  | "dimension"
  | "stub";

export interface SketchEntityBase {
  id: EntityId;
  kind: SketchEntityKind;
  construction?: boolean;
  /** Tool that created this entity (for stubs / future tools). */
  sourceTool?: SketchTool;
}

export interface SketchPointEntity extends SketchEntityBase {
  kind: "point";
  position: Vec2;
}

export interface SketchLineEntity extends SketchEntityBase {
  kind: "line";
  start: Vec2;
  end: Vec2;
}

export interface SketchRectangleEntity extends SketchEntityBase {
  kind: "rectangle";
  /** Corner-defined AABB in sketch space. */
  min: Vec2;
  max: Vec2;
  /** True when created via center-point rectangle tool. */
  fromCenter?: boolean;
}

export interface SketchCircleEntity extends SketchEntityBase {
  kind: "circle";
  center: Vec2;
  radius: number;
}

export interface SketchDimensionEntity extends SketchEntityBase {
  kind: "dimension";
  /** Entity this dimension measures. */
  targetId: EntityId;
  /** Offset placement of the dimension label in sketch space. */
  labelAt: Vec2;
  value: number;
  unit?: "mm";
}

/** Placeholder entity for tools not yet implemented. */
export interface SketchStubEntity extends SketchEntityBase {
  kind: "stub";
  note: string;
  points: Vec2[];
}

export type SketchEntity =
  | SketchPointEntity
  | SketchLineEntity
  | SketchRectangleEntity
  | SketchCircleEntity
  | SketchDimensionEntity
  | SketchStubEntity;

export interface SketchConstraint {
  id: ConstraintId;
  type: SketchConstraintType;
  /** Participating entity (and optional vertex) ids. */
  entityIds: EntityId[];
  /** For coincident: which points snap together (optional named handles). */
  handles?: string[];
  /** Dimensional value when type is Dimension. */
  value?: number;
  /** True when inferred automatically while drawing. */
  inferred?: boolean;
}

export type InferenceKind =
  | "endpoint"
  | "midpoint"
  | "center"
  | "grid"
  | "horizontal"
  | "vertical"
  | "coincident";

export interface InferenceSnap {
  kind: InferenceKind;
  position: Vec2;
  /** Entity that produced the snap, if any. */
  sourceId?: EntityId;
  /** Alignment guide origin (for H/V). */
  guideFrom?: Vec2;
  label: string;
}

export interface DraftStroke {
  tool: SketchTool;
  points: Vec2[];
}

export interface SketchToolbarItem {
  tool: SketchTool;
  label: string;
  group:
    | "draw"
    | "arc"
    | "poly"
    | "curve"
    | "modify"
    | "pattern"
    | "insert"
    | "constraint";
  implemented: boolean;
  shortcut?: string;
}

export const SKETCH_TOOLBAR_ITEMS: SketchToolbarItem[] = [
  {
    tool: SketchTool.Select,
    label: "Select",
    group: "draw",
    implemented: true,
    shortcut: "Esc",
  },
  {
    tool: SketchTool.Line,
    label: "Line",
    group: "draw",
    implemented: true,
    shortcut: "L",
  },
  {
    tool: SketchTool.MidpointLine,
    label: "Midpoint Line",
    group: "draw",
    implemented: false,
  },
  {
    tool: SketchTool.CornerRectangle,
    label: "Corner Rectangle",
    group: "draw",
    implemented: true,
    shortcut: "R",
  },
  {
    tool: SketchTool.CenterPointRectangle,
    label: "Center Point Rectangle",
    group: "draw",
    implemented: true,
  },
  {
    tool: SketchTool.AlignedRectangle,
    label: "Aligned Rectangle",
    group: "draw",
    implemented: false,
  },
  {
    tool: SketchTool.CenterPointCircle,
    label: "Center Point Circle",
    group: "draw",
    implemented: true,
    shortcut: "C",
  },
  {
    tool: SketchTool.ThreePointCircle,
    label: "3 Point Circle",
    group: "draw",
    implemented: false,
  },
  {
    tool: SketchTool.Ellipse,
    label: "Ellipse",
    group: "draw",
    implemented: false,
  },
  {
    tool: SketchTool.ThreePointArc,
    label: "3 Point Arc",
    group: "arc",
    implemented: false,
  },
  {
    tool: SketchTool.TangentArc,
    label: "Tangent Arc",
    group: "arc",
    implemented: false,
  },
  {
    tool: SketchTool.CenterPointArc,
    label: "Center Point Arc",
    group: "arc",
    implemented: false,
  },
  {
    tool: SketchTool.EllipticalArc,
    label: "Elliptical Arc",
    group: "arc",
    implemented: false,
  },
  {
    tool: SketchTool.Conic,
    label: "Conic",
    group: "curve",
    implemented: false,
  },
  {
    tool: SketchTool.InscribedPolygon,
    label: "Inscribed Polygon",
    group: "poly",
    implemented: false,
  },
  {
    tool: SketchTool.CircumscribedPolygon,
    label: "Circumscribed Polygon",
    group: "poly",
    implemented: false,
  },
  {
    tool: SketchTool.Spline,
    label: "Spline",
    group: "curve",
    implemented: false,
  },
  {
    tool: SketchTool.Bezier,
    label: "Bezier",
    group: "curve",
    implemented: false,
  },
  {
    tool: SketchTool.SplineControlPoint,
    label: "Spline Control Point",
    group: "curve",
    implemented: false,
  },
  {
    tool: SketchTool.Point,
    label: "Point",
    group: "draw",
    implemented: false,
  },
  {
    tool: SketchTool.Text,
    label: "Text",
    group: "insert",
    implemented: false,
  },
  {
    tool: SketchTool.Use,
    label: "Use",
    group: "modify",
    implemented: false,
  },
  {
    tool: SketchTool.Intersection,
    label: "Intersection",
    group: "modify",
    implemented: false,
  },
  {
    tool: SketchTool.Construction,
    label: "Construction",
    group: "modify",
    implemented: false,
  },
  {
    tool: SketchTool.SketchChamfer,
    label: "Sketch Chamfer",
    group: "modify",
    implemented: false,
  },
  {
    tool: SketchTool.SketchFillet,
    label: "Sketch Fillet",
    group: "modify",
    implemented: false,
  },
  {
    tool: SketchTool.Trim,
    label: "Trim",
    group: "modify",
    implemented: false,
  },
  {
    tool: SketchTool.Extend,
    label: "Extend",
    group: "modify",
    implemented: false,
  },
  {
    tool: SketchTool.SketchSplit,
    label: "Sketch Split",
    group: "modify",
    implemented: false,
  },
  {
    tool: SketchTool.Offset,
    label: "Offset",
    group: "modify",
    implemented: false,
  },
  {
    tool: SketchTool.Slot,
    label: "Slot",
    group: "draw",
    implemented: false,
  },
  {
    tool: SketchTool.SketchMirror,
    label: "Sketch Mirror",
    group: "pattern",
    implemented: false,
  },
  {
    tool: SketchTool.LinearSketchPattern,
    label: "Linear Pattern",
    group: "pattern",
    implemented: false,
  },
  {
    tool: SketchTool.CircularSketchPattern,
    label: "Circular Pattern",
    group: "pattern",
    implemented: false,
  },
  {
    tool: SketchTool.TransformSketch,
    label: "Transform Sketch",
    group: "pattern",
    implemented: false,
  },
  {
    tool: SketchTool.InsertDxfDwg,
    label: "Insert DXF/DWG",
    group: "insert",
    implemented: false,
  },
  {
    tool: SketchTool.InsertImage,
    label: "Insert Image",
    group: "insert",
    implemented: false,
  },
  {
    tool: SketchTool.Dimension,
    label: "Dimension",
    group: "constraint",
    implemented: true,
    shortcut: "D",
  },
];

export const CONSTRAINT_TOOLBAR_ITEMS: {
  type: SketchConstraintType;
  label: string;
  implemented: boolean;
}[] = [
  {
    type: SketchConstraintType.Coincident,
    label: "Coincident",
    implemented: true,
  },
  {
    type: SketchConstraintType.Concentric,
    label: "Concentric",
    implemented: false,
  },
  {
    type: SketchConstraintType.Parallel,
    label: "Parallel",
    implemented: false,
  },
  {
    type: SketchConstraintType.Tangent,
    label: "Tangent",
    implemented: false,
  },
  {
    type: SketchConstraintType.Horizontal,
    label: "Horizontal",
    implemented: false,
  },
  {
    type: SketchConstraintType.Vertical,
    label: "Vertical",
    implemented: false,
  },
  {
    type: SketchConstraintType.Perpendicular,
    label: "Perpendicular",
    implemented: false,
  },
  { type: SketchConstraintType.Equal, label: "Equal", implemented: false },
  {
    type: SketchConstraintType.Midpoint,
    label: "Midpoint",
    implemented: false,
  },
  { type: SketchConstraintType.Normal, label: "Normal", implemented: false },
  { type: SketchConstraintType.Pierce, label: "Pierce", implemented: false },
  {
    type: SketchConstraintType.Symmetric,
    label: "Symmetric",
    implemented: false,
  },
  { type: SketchConstraintType.Fix, label: "Fix", implemented: false },
  {
    type: SketchConstraintType.Curvature,
    label: "Curvature",
    implemented: false,
  },
];
