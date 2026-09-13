/** Shared CAD kernel types (main thread ↔ worker). */

export type Vec3 = [number, number, number];

/** Tessellated B-Rep face mesh transferred as typed arrays. */
export interface MeshBuffers {
  /** Interleaved xyz positions (length = vertexCount * 3). */
  positions: Float32Array;
  /** Interleaved xyz normals (length = vertexCount * 3). */
  normals: Float32Array;
  /** Triangle indices (length = triangleCount * 3). */
  indices: Uint32Array;
  vertexCount: number;
  triangleCount: number;
  shapeId: string;
}

export interface MassPropertiesResult {
  shapeId: string;
  /** Volume in model units³ (Mass() of volume props). */
  volume: number;
  /** Surface area in model units². */
  surfaceArea: number;
  centerOfMass: Vec3;
  /** Principal moments of inertia (Ixx, Iyy, Izz). */
  principalMoments: Vec3;
}

export type MeasureMode = "points" | "shapes";

export interface MeasurePointTarget {
  kind: "point";
  point: Vec3;
}

export interface MeasureShapeTarget {
  kind: "shape";
  shapeId: string;
}

export type MeasureTarget = MeasurePointTarget | MeasureShapeTarget;

export interface MeasureResult {
  distance: number;
  pointOnA: Vec3;
  pointOnB: Vec3;
  mode: MeasureMode;
}

/** Analysis overlays — core math for measure/mass; others are worker stubs. */
export type AnalysisToolId =
  | "measure"
  | "mass-properties"
  | "curve-surface-analysis"
  | "deviation-analysis"
  | "connection-analysis"
  | "dihedral-analysis"
  | "interference-detection"
  | "zebra-stripes"
  | "reflection-analysis"
  | "curvature-color-map"
  | "draft-analysis"
  | "thickness-analysis"
  | "flatten-surfaces";

export interface AnalysisStubResult {
  tool: AnalysisToolId;
  status: "stub";
  message: string;
}

/** Analysis tools with real OCCT worker math (not stub overlays). */
export const IMPLEMENTED_ANALYSIS_TOOLS = new Set<AnalysisToolId>([
  "measure",
  "mass-properties",
]);

export interface TessellateOptions {
  linearDeflection?: number;
  angularDeflection?: number;
}

/* ---------- Feature evaluation (Extrude / Fillet / Boolean) ---------- */

export type ExtrudeEvalOperation = "new" | "add" | "remove" | "intersect";
export type ExtrudeEvalEndType = "blind" | "symmetric" | "throughAll" | "upToFace";

export interface EvaluateExtrudeParams {
  featureId: string;
  depth: number;
  draft: number;
  operation: ExtrudeEvalOperation;
  endType: ExtrudeEvalEndType;
  direction: "normal" | "opposite" | "both";
  profile: "rectangle" | "circle";
  width: number;
  height: number;
  radius: number;
}

export interface EvaluateFilletParams {
  featureId: string;
  radius: number;
  targetShapeId: string;
  edgeSelection: "all" | "manual";
  tangentPropagation: boolean;
}

export type BooleanEvalOperation = "union" | "subtract" | "intersect";

export interface EvaluateBooleanParams {
  featureId: string;
  operation: BooleanEvalOperation;
  targetShapeId: string;
  toolShapeId: string;
  keepTools: boolean;
}

export interface FeatureEvalResult {
  shapeId: string;
  mesh: MeshBuffers;
}

/* ---------- Worker protocol ---------- */

export type CadRequest =
  | { id: string; op: "init" }
  | { id: string; op: "createDemoShape"; shapeId?: string }
  | {
      id: string;
      op: "tessellate";
      shapeId: string;
      options?: TessellateOptions;
    }
  | {
      id: string;
      op: "measure";
      a: MeasureTarget;
      b: MeasureTarget;
    }
  | { id: string; op: "massProperties"; shapeId: string }
  | {
      id: string;
      op: "runAnalysis";
      tool: Exclude<AnalysisToolId, "measure" | "mass-properties">;
      shapeId: string;
      params?: Record<string, unknown>;
    }
  | { id: string; op: "evaluateExtrude"; params: EvaluateExtrudeParams }
  | { id: string; op: "evaluateFillet"; params: EvaluateFilletParams }
  | { id: string; op: "evaluateBoolean"; params: EvaluateBooleanParams }
  | { id: string; op: "retainShapes"; shapeIds: string[] }
  | { id: string; op: "deleteShape"; shapeId: string };

export type CadSuccessPayload =
  | { op: "init"; ready: true; version: string }
  | { op: "createDemoShape"; shapeId: string }
  | { op: "tessellate"; mesh: MeshBuffers }
  | { op: "measure"; result: MeasureResult }
  | { op: "massProperties"; result: MassPropertiesResult }
  | { op: "runAnalysis"; result: AnalysisStubResult }
  | { op: "evaluateExtrude"; result: FeatureEvalResult }
  | { op: "evaluateFillet"; result: FeatureEvalResult }
  | { op: "evaluateBoolean"; result: FeatureEvalResult }
  | { op: "retainShapes"; kept: number; dropped: number }
  | { op: "deleteShape"; shapeId: string; deleted: boolean };

export type CadResponse =
  | { id: string; ok: true; payload: CadSuccessPayload }
  | { id: string; ok: false; error: string }
  | { id: string; ok: true; progress: string };

export const ANALYSIS_OVERLAY_TOOLS: {
  id: Exclude<AnalysisToolId, "measure" | "mass-properties">;
  label: string;
  description: string;
}[] = [
  {
    id: "curve-surface-analysis",
    label: "Curve / Surface Analysis",
    description: "Evaluate continuity and parameterization quality.",
  },
  {
    id: "deviation-analysis",
    label: "Deviation Analysis",
    description: "Compare surfaces against reference geometry.",
  },
  {
    id: "connection-analysis",
    label: "Connection Analysis",
    description: "Inspect edge/face connectivity and gaps.",
  },
  {
    id: "dihedral-analysis",
    label: "Dihedral Analysis",
    description: "Angle between adjacent faces along shared edges.",
  },
  {
    id: "interference-detection",
    label: "Interference Detection",
    description: "Detect solid–solid clashes and clearances.",
  },
  {
    id: "zebra-stripes",
    label: "Zebra Stripes",
    description: "Reflection stripe overlay for surface fairness.",
  },
  {
    id: "reflection-analysis",
    label: "Reflection Analysis",
    description: "Environment-map reflection quality check.",
  },
  {
    id: "curvature-color-map",
    label: "Curvature Color Map",
    description: "Gaussian / mean curvature false-color map.",
  },
  {
    id: "draft-analysis",
    label: "Draft Analysis",
    description: "Draft angle relative to a pull direction.",
  },
  {
    id: "thickness-analysis",
    label: "Thickness Analysis",
    description: "Local wall thickness sampling.",
  },
  {
    id: "flatten-surfaces",
    label: "Flatten Surfaces",
    description: "Developable / UV flatten preview.",
  },
];
