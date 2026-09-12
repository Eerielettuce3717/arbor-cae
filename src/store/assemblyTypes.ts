import {
  identityMat4,
  makeFrame,
  frameToMat4,
  type Frame,
  type Mat4,
  type Vec3,
} from "../assembly/mateMath";

export type { Frame, Mat4, Vec3 };

export type DocumentKind = "part" | "assembly";

export type LinkMode = "version" | "workspace";

export type InstanceKind = "part" | "assembly";

export type MateType =
  | "fastened"
  | "revolute"
  | "slider"
  | "planar"
  | "cylindrical"
  | "pinSlot"
  | "ball"
  | "parallel"
  | "tangent"
  | "width";

export type RelationType = "gear" | "rackAndPinion" | "screw" | "linear";

export type AssemblyToolId =
  | MateType
  | RelationType
  | "insert"
  | "link"
  | "updateRefs"
  | "group"
  | "snapMode"
  | "showMates"
  | "replicate"
  | "replace"
  | "linearPattern"
  | "circularPattern"
  | "mirror"
  | "namedPositions"
  | "displayStates"
  | "explodedViews"
  | "inContext"
  | "bom";

export type PrimitiveKind = "box" | "cylinder";

export interface BoxPrimitive {
  kind: "box";
  size: Vec3;
}

export interface CylinderPrimitive {
  kind: "cylinder";
  radius: number;
  height: number;
  axis: "x" | "y" | "z";
}

export type InstancePrimitive = BoxPrimitive | CylinderPrimitive;

export interface CatalogDocument {
  id: string;
  name: string;
  kind: DocumentKind;
  partNumber: string;
  description: string;
  material: string;
  massGrams: number;
  revision: string;
  latestRevision: string;
  workspaceDirty: boolean;
  primitive: InstancePrimitive;
  color: string;
}

export interface LinkedDocument {
  id: string;
  documentId: string;
  documentName: string;
  mode: LinkMode;
  pinnedRevision: string;
  latestRevision: string;
  stale: boolean;
  linkedAt: number;
}

export interface MateConnector {
  id: string;
  name: string;
  instanceId: string;
  /** Local frame relative to the instance origin. */
  local: Mat4;
  implicit: boolean;
  ownerFace?: string;
}

export interface AssemblyInstance {
  id: string;
  name: string;
  kind: InstanceKind;
  documentId: string;
  documentName: string;
  partNumber: string;
  configuration: string;
  linkId: string | null;
  revision: string;
  grounded: boolean;
  suppressed: boolean;
  visible: boolean;
  color: string;
  opacity: number;
  primitive: InstancePrimitive;
  worldTransform: Mat4;
  groupId: string | null;
  patternId: string | null;
  /** When true this instance is a pattern/replicate copy. */
  derived: boolean;
}

export interface MateParams {
  flipPrimary: boolean;
  flipSecondary: boolean;
  /** Revolute / cylindrical / screw angle in degrees. */
  angle: number;
  /** Slider / cylindrical / linear offset in mm. */
  offset: number;
  limitsEnabled: boolean;
  limitMin: number;
  limitMax: number;
  width: number;
}

export type MateStatus = "ok" | "error" | "scaffold" | "suppressed";

export interface AssemblyMate {
  id: string;
  name: string;
  type: MateType;
  connectorAId: string;
  connectorBId: string;
  instanceAId: string;
  instanceBId: string;
  params: MateParams;
  suppressed: boolean;
  status: MateStatus;
  statusMessage: string;
}

export interface AssemblyRelation {
  id: string;
  name: string;
  type: RelationType;
  mateAId: string;
  mateBId: string;
  ratio: number;
  pitch: number;
  status: "scaffold";
}

export interface InstanceGroup {
  id: string;
  name: string;
  instanceIds: string[];
}

export type PatternKind = "linear" | "circular" | "mirror" | "replicate";

export interface AssemblyPattern {
  id: string;
  name: string;
  kind: PatternKind;
  seedInstanceId: string;
  count: number;
  spacing: number;
  axis: Vec3;
  angle: number;
  instanceIds: string[];
  status: "scaffold";
}

export interface NamedPosition {
  id: string;
  name: string;
  description: string;
  mateValues: Record<string, { angle: number; offset: number }>;
}

export interface DisplayStateOverride {
  instanceId: string;
  visible: boolean;
  opacity: number;
  color: string | null;
}

export interface DisplayState {
  id: string;
  name: string;
  overrides: DisplayStateOverride[];
}

export interface ExplodeStep {
  instanceId: string;
  direction: Vec3;
  distance: number;
}

export interface ExplodedView {
  id: string;
  name: string;
  steps: ExplodeStep[];
}

export interface InContextPartStudio {
  id: string;
  name: string;
  sourceInstanceIds: string[];
  updateOnRebuild: boolean;
  createdAt: number;
  status: "scaffold";
}

export type BomTemplateId = "standard" | "indented" | "flattened" | "topLevel";

export type BomColumnId =
  | "item"
  | "partNumber"
  | "qty"
  | "description"
  | "material"
  | "revision"
  | "mass";

export interface BomColumn {
  id: BomColumnId;
  label: string;
  visible: boolean;
  width: number;
  align: "left" | "right" | "center";
}

export interface BomRow {
  id: string;
  item: number;
  instanceId: string | null;
  partNumber: string;
  qty: number;
  description: string;
  material: string;
  revision: string;
  massGrams: number;
  level: number;
  isAssembly: boolean;
}

export interface BomFormatting {
  headerBg: string;
  headerFg: string;
  altRowBg: string;
  fontSize: number;
  numberPrecision: number;
  massUnit: "g" | "kg";
  showGrid: boolean;
  wrapText: boolean;
  boldHeader: boolean;
}

export interface BomState {
  templateId: BomTemplateId;
  columns: BomColumn[];
  rows: BomRow[];
  formatting: BomFormatting;
  selectedRowId: string | null;
}

export const DEFAULT_MATE_PARAMS: MateParams = {
  flipPrimary: false,
  flipSecondary: false,
  angle: 0,
  offset: 0,
  limitsEnabled: false,
  limitMin: -180,
  limitMax: 180,
  width: 10,
};

export const IMPLEMENTED_MATES = new Set<MateType>(["fastened", "revolute"]);

export const MATE_CATALOG: {
  type: MateType;
  label: string;
  icon: string;
  dof: string;
  hint: string;
}[] = [
  {
    type: "fastened",
    label: "Fastened",
    icon: "⬡",
    dof: "0 remaining",
    hint: "Coincident origins and fully aligned frames",
  },
  {
    type: "revolute",
    label: "Revolute",
    icon: "↻",
    dof: "1 rotational",
    hint: "Origins coincide; rotate about the primary axis",
  },
  {
    type: "slider",
    label: "Slider",
    icon: "↔",
    dof: "1 translational",
    hint: "Slide along the primary axis",
  },
  {
    type: "planar",
    label: "Planar",
    icon: "▭",
    dof: "3 remaining",
    hint: "Faces stay coplanar",
  },
  {
    type: "cylindrical",
    label: "Cylindrical",
    icon: "◎",
    dof: "2 remaining",
    hint: "Slide and rotate about the primary axis",
  },
  {
    type: "pinSlot",
    label: "Pin Slot",
    icon: "⬭",
    dof: "1 remaining",
    hint: "Pin travels in a slot",
  },
  {
    type: "ball",
    label: "Ball",
    icon: "●",
    dof: "3 rotational",
    hint: "Origins coincide; spherical rotation",
  },
  {
    type: "parallel",
    label: "Parallel",
    icon: "∥",
    dof: "4 remaining",
    hint: "Primary axes stay parallel",
  },
  {
    type: "tangent",
    label: "Tangent",
    icon: "◠",
    dof: "5 remaining",
    hint: "Faces / cylinders stay tangent",
  },
  {
    type: "width",
    label: "Width",
    icon: "⊏",
    dof: "1 remaining",
    hint: "Center an instance between two planes",
  },
];

export const RELATION_CATALOG: {
  type: RelationType;
  label: string;
  icon: string;
  hint: string;
}[] = [
  {
    type: "gear",
    label: "Gear",
    icon: "⚙",
    hint: "Couple two revolute mates by a ratio",
  },
  {
    type: "rackAndPinion",
    label: "Rack and Pinion",
    icon: "⋀",
    hint: "Couple revolute rotation to slider translation",
  },
  {
    type: "screw",
    label: "Screw",
    icon: "~",
    hint: "Helical coupling of rotation and translation",
  },
  {
    type: "linear",
    label: "Linear",
    icon: "↔",
    hint: "Couple two slider offsets",
  },
];

export const BOM_TEMPLATES: {
  id: BomTemplateId;
  label: string;
  hint: string;
}[] = [
  { id: "standard", label: "Standard", hint: "One row per unique part number" },
  { id: "indented", label: "Indented", hint: "Nested sub-assemblies" },
  { id: "flattened", label: "Flattened", hint: "All parts, ignore grouping" },
  { id: "topLevel", label: "Top-level only", hint: "Direct children of this assembly" },
];

export const DEFAULT_BOM_COLUMNS: BomColumn[] = [
  { id: "item", label: "Item", visible: true, width: 48, align: "center" },
  { id: "partNumber", label: "Part number", visible: true, width: 120, align: "left" },
  { id: "qty", label: "Qty", visible: true, width: 48, align: "right" },
  { id: "description", label: "Description", visible: true, width: 180, align: "left" },
  { id: "material", label: "Material", visible: true, width: 110, align: "left" },
  { id: "revision", label: "Rev", visible: true, width: 48, align: "center" },
  { id: "mass", label: "Mass", visible: true, width: 72, align: "right" },
];

export const DEFAULT_BOM_FORMATTING: BomFormatting = {
  headerBg: "#1e3a5f",
  headerFg: "#e2e8f0",
  altRowBg: "#1e293b",
  fontSize: 11,
  numberPrecision: 2,
  massUnit: "g",
  showGrid: true,
  wrapText: false,
  boldHeader: true,
};

export const INSERTABLE_DOCUMENTS: CatalogDocument[] = [
  {
    id: "d-1",
    name: "Bracket Plate",
    kind: "part",
    partNumber: "BRK-1001",
    description: "Drive-side mounting plate",
    material: "Aluminum 6061",
    massGrams: 184,
    revision: "V3",
    latestRevision: "V3",
    workspaceDirty: false,
    primitive: { kind: "box", size: [2, 0.35, 1.2] },
    color: "#5b8def",
  },
  {
    id: "d-4",
    name: "Shaft Collar",
    kind: "part",
    partNumber: "CLR-204",
    description: "Set-screw shaft collar",
    material: "Steel AISI 1018",
    massGrams: 42,
    revision: "V2",
    latestRevision: "V3",
    workspaceDirty: true,
    primitive: { kind: "cylinder", radius: 0.28, height: 0.35, axis: "y" },
    color: "#38bdf8",
  },
  {
    id: "d-7",
    name: "Drive Shaft",
    kind: "part",
    partNumber: "SHF-110",
    description: "Ground drive shaft",
    material: "Steel AISI 1018",
    massGrams: 96,
    revision: "V1",
    latestRevision: "V1",
    workspaceDirty: false,
    primitive: { kind: "cylinder", radius: 0.12, height: 1.35, axis: "y" },
    color: "#94a3b8",
  },
  {
    id: "d-5",
    name: "PCB Frame",
    kind: "part",
    partNumber: "PCB-018",
    description: "Electronics mounting frame",
    material: "ABS",
    massGrams: 28,
    revision: "V4",
    latestRevision: "V4",
    workspaceDirty: false,
    primitive: { kind: "box", size: [1.4, 0.12, 0.9] },
    color: "#34d399",
  },
  {
    id: "d-8",
    name: "Idler Subassembly",
    kind: "assembly",
    partNumber: "IDL-ASSY",
    description: "Idler pulley stack",
    material: "Mixed",
    massGrams: 210,
    revision: "V1",
    latestRevision: "V2",
    workspaceDirty: true,
    primitive: { kind: "box", size: [0.8, 0.8, 0.8] },
    color: "#c084fc",
  },
];

export function defaultNameForMate(type: MateType, index: number): string {
  const def = MATE_CATALOG.find((m) => m.type === type);
  return `${def?.label ?? type} ${index}`;
}

export function defaultConnectorsForPrimitive(
  instanceId: string,
  primitive: InstancePrimitive,
): MateConnector[] {
  const frames: { name: string; frame: Frame; face: string }[] = [];

  if (primitive.kind === "box") {
    const [sx, sy, sz] = primitive.size;
    const hx = sx / 2;
    const hy = sy / 2;
    const hz = sz / 2;
    frames.push(
      { name: "Origin", frame: makeFrame([0, 0, 0], [0, 1, 0], [1, 0, 0]), face: "origin" },
      { name: "Top", frame: makeFrame([0, hy, 0], [0, 1, 0], [1, 0, 0]), face: "top" },
      { name: "Bottom", frame: makeFrame([0, -hy, 0], [0, -1, 0], [1, 0, 0]), face: "bottom" },
      { name: "Front", frame: makeFrame([0, 0, hz], [0, 0, 1], [1, 0, 0]), face: "front" },
      { name: "Back", frame: makeFrame([0, 0, -hz], [0, 0, -1], [1, 0, 0]), face: "back" },
      { name: "Right", frame: makeFrame([hx, 0, 0], [1, 0, 0], [0, 0, -1]), face: "right" },
      { name: "Left", frame: makeFrame([-hx, 0, 0], [-1, 0, 0], [0, 0, 1]), face: "left" },
    );
  } else {
    const h = primitive.height / 2;
    const axis: Vec3 =
      primitive.axis === "x" ? [1, 0, 0] : primitive.axis === "z" ? [0, 0, 1] : [0, 1, 0];
    const hint: Vec3 = primitive.axis === "y" ? [1, 0, 0] : [0, 1, 0];
    const top: Vec3 =
      primitive.axis === "x"
        ? [h, 0, 0]
        : primitive.axis === "z"
          ? [0, 0, h]
          : [0, h, 0];
    const bot: Vec3 =
      primitive.axis === "x"
        ? [-h, 0, 0]
        : primitive.axis === "z"
          ? [0, 0, -h]
          : [0, -h, 0];
    const r = primitive.radius;
    frames.push(
      { name: "Axis", frame: makeFrame([0, 0, 0], axis, hint), face: "axis" },
      { name: "Top", frame: makeFrame(top, axis, hint), face: "top" },
      {
        name: "Bottom",
        frame: makeFrame(bot, scaleVec(axis, -1), hint),
        face: "bottom",
      },
    );
    const radial: { name: string; origin: Vec3; z: Vec3 }[] =
      primitive.axis === "y"
        ? [
            { name: "Radial +X", origin: [r, 0, 0], z: [1, 0, 0] },
            { name: "Radial −X", origin: [-r, 0, 0], z: [-1, 0, 0] },
            { name: "Radial +Z", origin: [0, 0, r], z: [0, 0, 1] },
            { name: "Radial −Z", origin: [0, 0, -r], z: [0, 0, -1] },
          ]
        : primitive.axis === "x"
          ? [
              { name: "Radial +Y", origin: [0, r, 0], z: [0, 1, 0] },
              { name: "Radial −Y", origin: [0, -r, 0], z: [0, -1, 0] },
              { name: "Radial +Z", origin: [0, 0, r], z: [0, 0, 1] },
              { name: "Radial −Z", origin: [0, 0, -r], z: [0, 0, -1] },
            ]
          : [
              { name: "Radial +X", origin: [r, 0, 0], z: [1, 0, 0] },
              { name: "Radial −X", origin: [-r, 0, 0], z: [-1, 0, 0] },
              { name: "Radial +Y", origin: [0, r, 0], z: [0, 1, 0] },
              { name: "Radial −Y", origin: [0, -r, 0], z: [0, -1, 0] },
            ];
    for (const rad of radial) {
      frames.push({
        name: rad.name,
        frame: makeFrame(rad.origin, rad.z, axis),
        face: rad.name.toLowerCase(),
      });
    }
  }

  return frames.map((entry, i) => ({
    id: `mc_${instanceId}_${i}`,
    name: entry.name,
    instanceId,
    local: frameToMat4(entry.frame),
    implicit: true,
    ownerFace: entry.face,
  }));
}

function scaleVec(v: Vec3, s: number): Vec3 {
  return [v[0] * s, v[1] * s, v[2] * s];
}

export function identityWorld(): Mat4 {
  return identityMat4();
}
