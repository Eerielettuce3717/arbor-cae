/** Part Studio feature tree types, tool catalog, and default params. */

export type FeatureCategory =
  | "solid"
  | "surfacing"
  | "form"
  | "curves"
  | "org"
  | "frames"
  | "sheetMetal"
  | "appearance"
  | "material"
  | "configuration"
  | "sketch"
  | "system";

/** All Part Studio feature tool ids (Onshape-style catalog). */
export type FeatureToolType =
  // Solid / Basic
  | "extrude"
  | "revolve"
  | "sweep"
  | "loft"
  | "thicken"
  | "enclose"
  | "fillet"
  | "faceBlend"
  | "chamfer"
  | "draft"
  | "bodyDraft"
  | "rib"
  | "shell"
  | "hole"
  | "externalThread"
  | "boolean"
  | "split"
  | "transform"
  | "wrap"
  | "decal"
  | "deleteFace"
  | "moveFace"
  | "replaceFace"
  // Surfacing
  | "offsetSurface"
  | "boundarySurface"
  | "fill"
  | "moveBoundary"
  | "ruledSurface"
  | "mutualTrim"
  | "constrainedSurface"
  // Form Workspace (organic / T-Spline-style sculpt)
  | "sculpt"
  // Curves / Routing
  | "plane"
  | "helix"
  | "projectedCurve"
  | "fitSpline3d"
  | "bridgingCurve"
  | "compositeCurve"
  | "intersectionCurve"
  | "trimCurve"
  | "offsetCurve"
  | "isoparametricCurve"
  | "routingCurve"
  // Org
  | "mateConnector"
  | "derived"
  | "variable"
  | "compositePart"
  | "tag"
  // Frames
  | "frame"
  | "frameTrim"
  | "gusset"
  | "endCap"
  | "cutList"
  // Sheet Metal
  | "sheetMetalModel"
  | "flange"
  | "hem"
  | "tab"
  | "bend"
  | "jog"
  | "form"
  | "sheetMetalLoft"
  | "makeJoint"
  | "modifyJoint"
  | "corner"
  | "cornerBreak"
  | "bendRelief"
  | "tableFlatView"
  | "finishModel"
  // Appearance / Materials / Configs (studio-level features)
  | "appearance"
  | "partMaterial"
  | "configuration"
  // Sketch (tree entry)
  | "sketch";

/** Tools that have real OCCT worker evaluation. */
export const EVALUATED_FEATURE_TOOLS = new Set<FeatureToolType>([
  "extrude",
  "fillet",
  "boolean",
]);

/** Client-side Form Workspace evaluation (Catmull-Clark, no OCCT). */
export const SCULPT_FEATURE_TOOLS = new Set<FeatureToolType>(["sculpt"]);

export type FeatureFieldKind =
  | "number"
  | "boolean"
  | "text"
  | "select"
  | "entity"
  | "color"
  | "table";

export interface FeatureFieldDef {
  key: string;
  label: string;
  kind: FeatureFieldKind;
  unit?: string;
  options?: { value: string; label: string }[];
  min?: number;
  max?: number;
  step?: number;
  /** When true, field is shown but not evaluated yet. */
  scaffold?: boolean;
}

export interface FeatureToolDef {
  type: FeatureToolType;
  label: string;
  category: FeatureCategory;
  icon: string;
  /** Default param bag when inserting the feature. */
  defaults: Record<string, unknown>;
  fields: FeatureFieldDef[];
  evaluated: boolean;
}

export type FeatureStatus = "ok" | "warning" | "error" | "suppressed" | "scaffold";

export interface CadFeature {
  id: string;
  type: FeatureToolType;
  name: string;
  /** Insertion order index is implied by array position. */
  suppressed: boolean;
  status: FeatureStatus;
  params: Record<string, unknown>;
  /** Resulting B-Rep shape id in the CAD worker, if evaluated. */
  shapeId: string | null;
  /** Parent sketch / body references. */
  references: string[];
  createdAt: number;
  updatedAt: number;
}

export interface PartAppearance {
  color: string;
  metalness: number;
  roughness: number;
  opacity: number;
  name: string;
}

export interface OnshapeMaterial {
  id: string;
  name: string;
  library: "Onshape Material Library" | "Custom";
  density: number;
  /** kg/m³ */
  category: string;
  description: string;
}

export interface ConfigVariable {
  id: string;
  name: string;
  expression: string;
  value: number;
  unit: string;
}

export interface ConfigVisibilityRow {
  id: string;
  featureId: string;
  featureName: string;
  visible: boolean;
}

export interface ConfigTableColumn {
  id: string;
  name: string;
  kind: "variable" | "visibility" | "parameter";
}

export interface ConfigTableRow {
  id: string;
  configurationName: string;
  values: Record<string, string | number | boolean>;
}

export interface PartConfigurationState {
  activeConfigurationId: string;
  variables: ConfigVariable[];
  visibility: ConfigVisibilityRow[];
  columns: ConfigTableColumn[];
  rows: ConfigTableRow[];
}

/* ---------- Extrude / Fillet / Boolean typed params ---------- */

export type ExtrudeOperation = "new" | "add" | "remove" | "intersect";
export type ExtrudeEndType = "blind" | "symmetric" | "throughAll" | "upToFace";

export interface ExtrudeParams {
  depth: number;
  draft: number;
  operation: ExtrudeOperation;
  endType: ExtrudeEndType;
  direction: "normal" | "opposite" | "both";
  sketchId: string;
  profile: "rectangle" | "circle";
  width: number;
  height: number;
  radius: number;
}

export type BooleanOperation = "union" | "subtract" | "intersect";

export interface BooleanParams {
  operation: BooleanOperation;
  toolShapeId: string;
  targetShapeId: string;
  keepTools: boolean;
}

export interface FilletParams {
  radius: number;
  targetShapeId: string;
  edgeSelection: "all" | "manual";
  tangentPropagation: boolean;
}

/** Form Workspace / organic sculpt control-cage params. */
export interface SculptParams {
  /** Control-cage box size in mm. */
  size: number;
  /** Catmull-Clark subdivision levels (0–4). */
  levels: number;
  /** Flattened control-cage vertex positions [x,y,z, ...]. */
  cageVertices: number[];
  /** Show control cage overlay when feature is active. */
  showCage: boolean;
}

export const ONSHAPE_MATERIAL_LIBRARY: OnshapeMaterial[] = [
  {
    id: "abs",
    name: "ABS",
    library: "Onshape Material Library",
    density: 1020,
    category: "Plastics",
    description: "Acrylonitrile butadiene styrene",
  },
  {
    id: "aluminum-6061",
    name: "Aluminum 6061",
    library: "Onshape Material Library",
    density: 2700,
    category: "Metals",
    description: "General-purpose aluminum alloy",
  },
  {
    id: "steel-1018",
    name: "Steel AISI 1018",
    library: "Onshape Material Library",
    density: 7870,
    category: "Metals",
    description: "Low-carbon steel",
  },
  {
    id: "stainless-304",
    name: "Stainless Steel 304",
    library: "Onshape Material Library",
    density: 8000,
    category: "Metals",
    description: "Austenitic stainless steel",
  },
  {
    id: "brass",
    name: "Brass",
    library: "Onshape Material Library",
    density: 8500,
    category: "Metals",
    description: "Copper-zinc alloy",
  },
  {
    id: "nylon-6",
    name: "Nylon 6",
    library: "Onshape Material Library",
    density: 1130,
    category: "Plastics",
    description: "Polyamide 6",
  },
  {
    id: "titanium-6al4v",
    name: "Titanium 6Al-4V",
    library: "Onshape Material Library",
    density: 4430,
    category: "Metals",
    description: "Aerospace titanium alloy",
  },
  {
    id: "oak",
    name: "Oak",
    library: "Onshape Material Library",
    density: 750,
    category: "Wood",
    description: "Hardwood",
  },
];

function num(
  key: string,
  label: string,
  opts?: Partial<FeatureFieldDef>,
): FeatureFieldDef {
  return { key, label, kind: "number", step: 0.1, scaffold: true, ...opts };
}

function bool(
  key: string,
  label: string,
  opts?: Partial<FeatureFieldDef>,
): FeatureFieldDef {
  return { key, label, kind: "boolean", scaffold: true, ...opts };
}

function text(
  key: string,
  label: string,
  opts?: Partial<FeatureFieldDef>,
): FeatureFieldDef {
  return { key, label, kind: "text", scaffold: true, ...opts };
}

function sel(
  key: string,
  label: string,
  options: { value: string; label: string }[],
  opts?: Partial<FeatureFieldDef>,
): FeatureFieldDef {
  return { key, label, kind: "select", options, scaffold: true, ...opts };
}

function entity(
  key: string,
  label: string,
  opts?: Partial<FeatureFieldDef>,
): FeatureFieldDef {
  return { key, label, kind: "entity", scaffold: true, ...opts };
}

function tool(
  type: FeatureToolType,
  label: string,
  category: FeatureCategory,
  icon: string,
  defaults: Record<string, unknown>,
  fields: FeatureFieldDef[],
  evaluated = false,
): FeatureToolDef {
  return {
    type,
    label,
    category,
    icon,
    defaults,
    fields: fields.map((f) => ({ ...f, scaffold: evaluated ? false : f.scaffold !== false })),
    evaluated,
  };
}

/** Full Part Studio feature tool catalog. */
export const FEATURE_TOOL_CATALOG: FeatureToolDef[] = [
  // —— Solid / Basic ——
  tool(
    "extrude",
    "Extrude",
    "solid",
    "▣",
    {
      depth: 12,
      draft: 0,
      operation: "new",
      endType: "blind",
      direction: "normal",
      sketchId: "",
      profile: "rectangle",
      width: 20,
      height: 12,
      radius: 6,
    },
    [
      sel("operation", "Operation", [
        { value: "new", label: "New" },
        { value: "add", label: "Add" },
        { value: "remove", label: "Remove" },
        { value: "intersect", label: "Intersect" },
      ]),
      sel("endType", "End type", [
        { value: "blind", label: "Blind" },
        { value: "symmetric", label: "Symmetric" },
        { value: "throughAll", label: "Through all" },
        { value: "upToFace", label: "Up to face" },
      ]),
      num("depth", "Depth", { unit: "mm", min: 0.01 }),
      num("draft", "Draft", { unit: "°" }),
      sel("direction", "Direction", [
        { value: "normal", label: "Normal" },
        { value: "opposite", label: "Opposite" },
        { value: "both", label: "Both" },
      ]),
      sel("profile", "Profile", [
        { value: "rectangle", label: "Rectangle" },
        { value: "circle", label: "Circle" },
      ]),
      num("width", "Width", { unit: "mm", min: 0.01 }),
      num("height", "Height", { unit: "mm", min: 0.01 }),
      num("radius", "Radius", { unit: "mm", min: 0.01 }),
      entity("sketchId", "Sketch"),
    ],
    true,
  ),
  tool("revolve", "Revolve", "solid", "↻", { angle: 360, axis: "sketch-axis" }, [
    num("angle", "Angle", { unit: "°" }),
    entity("axis", "Axis"),
    entity("sketchId", "Sketch"),
  ]),
  tool("sweep", "Sweep", "solid", "↝", { twist: 0 }, [
    entity("profile", "Profile"),
    entity("path", "Path"),
    num("twist", "Twist", { unit: "°" }),
  ]),
  tool("loft", "Loft", "solid", "⋒", { ruled: false, endConditions: "normal" }, [
    entity("profiles", "Profiles"),
    bool("ruled", "Ruled"),
    sel("endConditions", "End conditions", [
      { value: "normal", label: "Normal to profile" },
      { value: "direction", label: "Direction" },
      { value: "curvature", label: "Curvature" },
    ]),
  ]),
  tool("thicken", "Thicken", "solid", "▤", { thickness: 1, direction: "both" }, [
    entity("faces", "Faces / surfaces"),
    num("thickness", "Thickness", { unit: "mm" }),
    sel("direction", "Direction", [
      { value: "one", label: "One side" },
      { value: "both", label: "Both sides" },
    ]),
  ]),
  tool("enclose", "Enclose", "solid", "⬡", { regions: [] }, [
    entity("regions", "Regions"),
  ]),
  tool(
    "fillet",
    "Fillet",
    "solid",
    "⌒",
    {
      radius: 1.5,
      targetShapeId: "demo",
      edgeSelection: "all",
      tangentPropagation: true,
    },
    [
      num("radius", "Radius", { unit: "mm", min: 0.01 }),
      sel("edgeSelection", "Edges", [
        { value: "all", label: "All edges" },
        { value: "manual", label: "Manual selection" },
      ]),
      bool("tangentPropagation", "Tangent propagation"),
      entity("targetShapeId", "Target body"),
    ],
    true,
  ),
  tool("faceBlend", "Face Blend", "solid", "∿", { radius: 2, holdLine: false }, [
    entity("faces", "Faces"),
    num("radius", "Radius", { unit: "mm" }),
    bool("holdLine", "Hold line"),
  ]),
  tool("chamfer", "Chamfer", "solid", "∠", { distance: 1, angle: 45 }, [
    num("distance", "Distance", { unit: "mm" }),
    num("angle", "Angle", { unit: "°" }),
    entity("edges", "Edges"),
  ]),
  tool("draft", "Draft", "solid", "⟋", { angle: 3, pullDirection: "z" }, [
    num("angle", "Angle", { unit: "°" }),
    entity("faces", "Faces"),
    entity("neutralPlane", "Neutral plane"),
  ]),
  tool("bodyDraft", "Body Draft", "solid", "⟋", { angle: 3 }, [
    num("angle", "Angle", { unit: "°" }),
    entity("bodies", "Bodies"),
    entity("pullDirection", "Pull direction"),
  ]),
  tool("rib", "Rib", "solid", "┃", { thickness: 2, extend: true }, [
    entity("sketchId", "Sketch"),
    num("thickness", "Thickness", { unit: "mm" }),
    bool("extend", "Extend to bounding faces"),
  ]),
  tool("shell", "Shell", "solid", "▢", { thickness: 1.5, facesToRemove: [] }, [
    num("thickness", "Thickness", { unit: "mm" }),
    entity("facesToRemove", "Faces to remove"),
  ]),
  tool(
    "hole",
    "Hole",
    "solid",
    "◎",
    { diameter: 6, depth: 12, style: "simple", tipAngle: 118 },
    [
      sel("style", "Hole style", [
        { value: "simple", label: "Simple" },
        { value: "counterbore", label: "Counterbore" },
        { value: "countersink", label: "Countersink" },
        { value: "tapped", label: "Tapped" },
      ]),
      num("diameter", "Diameter", { unit: "mm" }),
      num("depth", "Depth", { unit: "mm" }),
      num("tipAngle", "Tip angle", { unit: "°" }),
      entity("positions", "Sketch points"),
    ],
  ),
  tool(
    "externalThread",
    "External Thread",
    "solid",
    "T",
    { size: "M6x1", length: 12, handedness: "right" },
    [
      text("size", "Thread size"),
      num("length", "Length", { unit: "mm" }),
      sel("handedness", "Handedness", [
        { value: "right", label: "Right" },
        { value: "left", label: "Left" },
      ]),
      entity("cylindricalFace", "Cylindrical face"),
    ],
  ),
  tool(
    "boolean",
    "Boolean",
    "solid",
    "∪",
    {
      operation: "union",
      toolShapeId: "",
      targetShapeId: "demo",
      keepTools: false,
    },
    [
      sel("operation", "Operation", [
        { value: "union", label: "Union" },
        { value: "subtract", label: "Subtract" },
        { value: "intersect", label: "Intersect" },
      ]),
      entity("targetShapeId", "Target"),
      entity("toolShapeId", "Tool"),
      bool("keepTools", "Keep tools"),
    ],
    true,
  ),
  tool("split", "Split", "solid", "✂", { keepBoth: true }, [
    entity("targets", "Targets"),
    entity("tool", "Split tool"),
    bool("keepBoth", "Keep both sides"),
  ]),
  tool("transform", "Transform", "solid", "✥", { dx: 0, dy: 0, dz: 0, copy: false }, [
    entity("bodies", "Bodies"),
    num("dx", "ΔX", { unit: "mm" }),
    num("dy", "ΔY", { unit: "mm" }),
    num("dz", "ΔZ", { unit: "mm" }),
    bool("copy", "Copy"),
  ]),
  tool("wrap", "Wrap", "solid", "⟳", { method: "tangent" }, [
    entity("sketch", "Sketch"),
    entity("face", "Target face"),
    sel("method", "Method", [
      { value: "tangent", label: "Tangent" },
      { value: "normal", label: "Normal" },
    ]),
  ]),
  tool("decal", "Decal", "solid", "🖼", { imageUrl: "", scale: 1 }, [
    text("imageUrl", "Image"),
    entity("face", "Face"),
    num("scale", "Scale"),
  ]),
  tool("deleteFace", "Delete Face", "solid", "⌫", { heal: true }, [
    entity("faces", "Faces"),
    bool("heal", "Heal"),
  ]),
  tool("moveFace", "Move Face", "solid", "⇔", { distance: 1 }, [
    entity("faces", "Faces"),
    num("distance", "Distance", { unit: "mm" }),
  ]),
  tool("replaceFace", "Replace Face", "solid", "⇄", {}, [
    entity("faces", "Faces to replace"),
    entity("replacement", "Replacement surface"),
  ]),

  // —— Surfacing ——
  tool("offsetSurface", "Offset Surface", "surfacing", "▦", { distance: 1 }, [
    entity("faces", "Faces"),
    num("distance", "Offset", { unit: "mm" }),
  ]),
  tool("boundarySurface", "Boundary Surface", "surfacing", "◫", { continuity: "G1" }, [
    entity("boundaries", "Boundaries"),
    sel("continuity", "Continuity", [
      { value: "G0", label: "G0" },
      { value: "G1", label: "G1" },
      { value: "G2", label: "G2" },
    ]),
  ]),
  tool("fill", "Fill", "surfacing", "▣", { continuity: "G1" }, [
    entity("edges", "Bounding edges"),
    sel("continuity", "Continuity", [
      { value: "G0", label: "G0" },
      { value: "G1", label: "G1" },
      { value: "G2", label: "G2" },
    ]),
  ]),
  tool("moveBoundary", "Move Boundary", "surfacing", "↔", { distance: 1 }, [
    entity("boundary", "Boundary"),
    num("distance", "Distance", { unit: "mm" }),
  ]),
  tool("ruledSurface", "Ruled Surface", "surfacing", "▤", { length: 10 }, [
    entity("edge", "Edge"),
    num("length", "Length", { unit: "mm" }),
    entity("direction", "Direction"),
  ]),
  tool("mutualTrim", "Mutual Trim", "surfacing", "✂", { keep: "outer" }, [
    entity("surfaces", "Surfaces"),
    sel("keep", "Keep", [
      { value: "outer", label: "Outer" },
      { value: "inner", label: "Inner" },
    ]),
  ]),
  tool("constrainedSurface", "Constrained Surface", "surfacing", "◈", { degree: 3 }, [
    entity("boundaries", "Boundaries"),
    entity("guides", "Guides"),
    num("degree", "Degree"),
  ]),

  // —— Form Workspace ——
  tool(
    "sculpt",
    "Sculpt",
    "form",
    "⬡",
    {
      size: 20,
      levels: 2,
      showCage: true,
      cageVertices: [
        -10, -10, -10, 10, -10, -10, 10, 10, -10, -10, 10, -10, -10, -10, 10, 10,
        -10, 10, 10, 10, 10, -10, 10, 10,
      ],
    },
    [
      num("size", "Cage size", { unit: "mm", min: 1, max: 500, step: 1 }),
      num("levels", "Subdivision levels", {
        min: 0,
        max: 4,
        step: 1,
      }),
      bool("showCage", "Show control cage"),
    ],
    true,
  ),

  // —— Curves / Routing ——
  tool("plane", "Plane", "curves", "▭", { offset: 0, type: "offset" }, [
    sel("type", "Plane type", [
      { value: "offset", label: "Offset" },
      { value: "threePoint", label: "Three point" },
      { value: "lineAngle", label: "Line at angle" },
      { value: "mid", label: "Mid plane" },
    ]),
    num("offset", "Offset", { unit: "mm" }),
    entity("references", "References"),
  ]),
  tool("helix", "Helix", "curves", "🌀", { revolutions: 4, pitch: 2, radius: 5 }, [
    num("revolutions", "Revolutions"),
    num("pitch", "Pitch", { unit: "mm" }),
    num("radius", "Radius", { unit: "mm" }),
    entity("axis", "Axis"),
  ]),
  tool("projectedCurve", "Projected Curve", "curves", "↘", { direction: "normal" }, [
    entity("curve", "Curve"),
    entity("face", "Face / sketch"),
    sel("direction", "Direction", [
      { value: "normal", label: "Normal" },
      { value: "along", label: "Along vector" },
    ]),
  ]),
  tool("fitSpline3d", "3D Fit Spline", "curves", "∿", { closed: false }, [
    entity("points", "Points"),
    bool("closed", "Closed"),
  ]),
  tool("bridgingCurve", "Bridging Curve", "curves", "⌒", { continuity: "G2" }, [
    entity("start", "Start"),
    entity("end", "End"),
    sel("continuity", "Continuity", [
      { value: "G1", label: "G1" },
      { value: "G2", label: "G2" },
    ]),
  ]),
  tool("compositeCurve", "Composite Curve", "curves", "⛓", {}, [
    entity("curves", "Curves"),
  ]),
  tool("intersectionCurve", "Intersection Curve", "curves", "✕", {}, [
    entity("surfaceA", "Surface A"),
    entity("surfaceB", "Surface B"),
  ]),
  tool("trimCurve", "Trim Curve", "curves", "✂", {}, [
    entity("curve", "Curve"),
    entity("trimTool", "Trim tool"),
  ]),
  tool("offsetCurve", "Offset Curve", "curves", "⇉", { distance: 2 }, [
    entity("curve", "Curve"),
    num("distance", "Distance", { unit: "mm" }),
  ]),
  tool("isoparametricCurve", "Isoparametric Curve", "curves", "═", { u: 0.5, v: 0.5 }, [
    entity("face", "Face"),
    num("u", "U", { min: 0, max: 1 }),
    num("v", "V", { min: 0, max: 1 }),
  ]),
  tool("routingCurve", "Routing Curve", "curves", "⛓", { diameter: 6 }, [
    entity("path", "Path points"),
    num("diameter", "Route diameter", { unit: "mm" }),
  ]),

  // —— Org ——
  tool("mateConnector", "Mate Connector", "org", "⊕", { owner: "part" }, [
    entity("origin", "Origin"),
    entity("owner", "Owner"),
  ]),
  tool("derived", "Derived", "org", "↗", { sourceDocument: "" }, [
    text("sourceDocument", "Source document"),
    entity("parts", "Parts / sketches"),
  ]),
  tool("variable", "Variable", "org", "#", { name: "d1", expression: "10 mm" }, [
    text("name", "Name"),
    text("expression", "Expression"),
  ]),
  tool("compositePart", "Composite Part", "org", "⧉", { closed: true }, [
    entity("parts", "Parts"),
    bool("closed", "Closed composite"),
  ]),
  tool("tag", "Tag", "org", "🏷", { tagName: "", color: "#e85d04" }, [
    text("tagName", "Tag name"),
    entity("entities", "Entities"),
  ]),

  // —— Frames ——
  tool("frame", "Frame", "frames", "匚", { profile: "ISO 40x40", corner: "butt" }, [
    text("profile", "Profile"),
    entity("path", "Sketch / path"),
    sel("corner", "Corner", [
      { value: "butt", label: "Butt" },
      { value: "miter", label: "Miter" },
      { value: "cope", label: "Cope" },
    ]),
  ]),
  tool("frameTrim", "Frame Trim", "frames", "✂", { method: "miter" }, [
    entity("members", "Members"),
    sel("method", "Trim method", [
      { value: "miter", label: "Miter" },
      { value: "butt", label: "Butt" },
      { value: "cope", label: "Cope" },
    ]),
  ]),
  tool("gusset", "Gusset", "frames", "△", { thickness: 3, offset: 0 }, [
    entity("faces", "Faces"),
    num("thickness", "Thickness", { unit: "mm" }),
    num("offset", "Offset", { unit: "mm" }),
  ]),
  tool("endCap", "End Cap", "frames", "▮", { thickness: 3, inset: 0 }, [
    entity("ends", "Member ends"),
    num("thickness", "Thickness", { unit: "mm" }),
    num("inset", "Inset", { unit: "mm" }),
  ]),
  tool("cutList", "Cut List", "frames", "☰", { includeAngles: true }, [
    bool("includeAngles", "Include cut angles"),
    bool("groupByProfile", "Group by profile"),
  ]),

  // —— Sheet Metal ——
  tool(
    "sheetMetalModel",
    "Sheet Metal Model",
    "sheetMetal",
    "▤",
    { thickness: 1.5, kFactor: 0.44, bendRadius: 1.5 },
    [
      num("thickness", "Thickness", { unit: "mm" }),
      num("kFactor", "K-factor"),
      num("bendRadius", "Default bend radius", { unit: "mm" }),
    ],
  ),
  tool("flange", "Flange", "sheetMetal", "⌐", { angle: 90, length: 20 }, [
    entity("edges", "Edges"),
    num("angle", "Angle", { unit: "°" }),
    num("length", "Length", { unit: "mm" }),
  ]),
  tool("hem", "Hem", "sheetMetal", "↩", { style: "flat", length: 5 }, [
    entity("edges", "Edges"),
    sel("style", "Style", [
      { value: "flat", label: "Flat" },
      { value: "open", label: "Open" },
      { value: "rolled", label: "Rolled" },
    ]),
    num("length", "Length", { unit: "mm" }),
  ]),
  tool("tab", "Tab", "sheetMetal", "⊓", { width: 10, depth: 5 }, [
    entity("edge", "Edge"),
    num("width", "Width", { unit: "mm" }),
    num("depth", "Depth", { unit: "mm" }),
  ]),
  tool("bend", "Bend", "sheetMetal", "⌒", { angle: 90, radius: 1.5 }, [
    entity("sketchLine", "Bend line"),
    num("angle", "Angle", { unit: "°" }),
    num("radius", "Radius", { unit: "mm" }),
  ]),
  tool("jog", "Jog", "sheetMetal", "↯", { offset: 5, angle: 45 }, [
    entity("sketchLine", "Jog line"),
    num("offset", "Offset", { unit: "mm" }),
    num("angle", "Angle", { unit: "°" }),
  ]),
  tool("form", "Form", "sheetMetal", "◎", { toolName: "louver" }, [
    text("toolName", "Form tool"),
    entity("faces", "Faces"),
  ]),
  tool("sheetMetalLoft", "Loft (Sheet Metal)", "sheetMetal", "⋒", {}, [
    entity("profiles", "Profiles"),
  ]),
  tool("makeJoint", "Make Joint", "sheetMetal", "⧓", {}, [
    entity("edges", "Edges"),
  ]),
  tool("modifyJoint", "Modify Joint", "sheetMetal", "⧓", { gap: 0.1 }, [
    entity("joint", "Joint"),
    num("gap", "Gap", { unit: "mm" }),
  ]),
  tool("corner", "Corner", "sheetMetal", "⌜", { style: "closed" }, [
    entity("corner", "Corner"),
    sel("style", "Style", [
      { value: "closed", label: "Closed" },
      { value: "open", label: "Open" },
      { value: "overlap", label: "Overlap" },
    ]),
  ]),
  tool("cornerBreak", "Corner Break", "sheetMetal", "⌟", { radius: 1 }, [
    entity("corners", "Corners"),
    num("radius", "Radius", { unit: "mm" }),
  ]),
  tool("bendRelief", "Bend Relief", "sheetMetal", "⊔", { width: 1, depth: 1.5 }, [
    entity("bends", "Bends"),
    num("width", "Width", { unit: "mm" }),
    num("depth", "Depth", { unit: "mm" }),
  ]),
  tool("tableFlatView", "Table and Flat View", "sheetMetal", "▤", { showBendNotes: true }, [
    bool("showBendNotes", "Show bend notes"),
    bool("showTable", "Show bend table"),
  ]),
  tool("finishModel", "Finish Model", "sheetMetal", "✓", {}, [
    bool("activateFlat", "Activate flat pattern"),
  ]),

  // —— Appearance / Material / Configuration ——
  tool(
    "appearance",
    "Appearance",
    "appearance",
    "🎨",
    {
      color: "#8b949e",
      metalness: 0.35,
      roughness: 0.45,
      opacity: 1,
      name: "Part Appearance",
    },
    [
      { key: "name", label: "Name", kind: "text", scaffold: false },
      { key: "color", label: "Color", kind: "color", scaffold: false },
      num("metalness", "Metalness", { min: 0, max: 1, step: 0.05, scaffold: false }),
      num("roughness", "Roughness", { min: 0, max: 1, step: 0.05, scaffold: false }),
      num("opacity", "Opacity", { min: 0, max: 1, step: 0.05, scaffold: false }),
    ],
  ),
  tool(
    "partMaterial",
    "Part Material",
    "material",
    "⚗",
    { materialId: "aluminum-6061" },
    [
      {
        key: "materialId",
        label: "Onshape Material Library",
        kind: "select",
        scaffold: false,
        options: ONSHAPE_MATERIAL_LIBRARY.map((m) => ({
          value: m.id,
          label: `${m.name} (${m.density} kg/m³)`,
        })),
      },
    ],
  ),
  tool(
    "configuration",
    "Configuration",
    "configuration",
    "⚙",
    { activeConfigurationId: "default" },
    [
      text("activeConfigurationId", "Active configuration"),
      {
        key: "variablesTable",
        label: "Variables",
        kind: "table",
        scaffold: false,
      },
      {
        key: "visibilityTable",
        label: "Visibility",
        kind: "table",
        scaffold: false,
      },
      {
        key: "configTable",
        label: "Configuration table",
        kind: "table",
        scaffold: false,
      },
    ],
  ),
  tool("sketch", "Sketch", "sketch", "◇", {}, [
    text("plane", "Plane"),
  ]),
];

export const FEATURE_TOOL_BY_TYPE: Record<FeatureToolType, FeatureToolDef> =
  Object.fromEntries(FEATURE_TOOL_CATALOG.map((t) => [t.type, t])) as Record<
    FeatureToolType,
    FeatureToolDef
  >;

export const FEATURE_CATEGORIES: { id: FeatureCategory; label: string }[] = [
  { id: "solid", label: "Solid / Basic" },
  { id: "surfacing", label: "Surfacing" },
  { id: "form", label: "Form Workspace" },
  { id: "curves", label: "Curves / Routing" },
  { id: "org", label: "Organization" },
  { id: "frames", label: "Frames" },
  { id: "sheetMetal", label: "Sheet Metal" },
  { id: "appearance", label: "Appearance" },
  { id: "material", label: "Materials" },
  { id: "configuration", label: "Configurations" },
  { id: "sketch", label: "Sketch" },
];

export function defaultNameForType(type: FeatureToolType, index: number): string {
  const def = FEATURE_TOOL_BY_TYPE[type];
  return `${def?.label ?? type} ${index}`;
}
