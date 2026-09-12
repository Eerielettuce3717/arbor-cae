/**
 * OpenCASCADE.js CAD worker — all heavy B-Rep math runs off the UI thread.
 *
 * Loads the OCCT WASM module, keeps shape handles in-process, tessellates to
 * transferable Float32Arrays, and exposes measure / mass-properties / analysis stubs.
 */

import ocFullJS from "opencascade.js/dist/opencascade.full.js";
import ocFullWasm from "opencascade.js/dist/opencascade.full.wasm?url";
import type { OpenCascadeInstance, TopoDS_Shape } from "opencascade.js";
import type {
  AnalysisStubResult,
  AnalysisToolId,
  CadRequest,
  CadResponse,
  EvaluateBooleanParams,
  EvaluateExtrudeParams,
  EvaluateFilletParams,
  FeatureEvalResult,
  MassPropertiesResult,
  MeasureResult,
  MeasureTarget,
  MeshBuffers,
  TessellateOptions,
  Vec3,
} from "../cad/types";

const shapes = new Map<string, TopoDS_Shape>();
let oc: OpenCascadeInstance | null = null;

function requireOc(): OpenCascadeInstance {
  if (!oc) throw new Error("OpenCASCADE is not initialized");
  return oc;
}

function requireShape(shapeId: string): TopoDS_Shape {
  const shape = shapes.get(shapeId);
  if (!shape) throw new Error(`Unknown shape id: ${shapeId}`);
  return shape;
}

async function initKernel(): Promise<void> {
  if (oc) return;
  // Vite serves the WASM as a URL; locateFile must return that string.
  const instance = await (ocFullJS as (opts: {
    locateFile: (path: string) => string;
  }) => Promise<OpenCascadeInstance>)({
    locateFile: (path: string) =>
      path.endsWith(".wasm") ? ocFullWasm : path,
  });
  oc = instance;
}

/** Demo solid: box with cylindrical boss (matches viewport demo proportions). */
function createDemoShape(shapeId = "demo"): string {
  const occ = requireOc();
  const box = new occ.BRepPrimAPI_MakeBox_2(2, 0.35, 1.2);
  const boxShape = box.Shape();

  // Move box so bottom sits on Y=0 (MakeBox builds from origin).
  const tfBox = new occ.gp_Trsf_1();
  tfBox.SetTranslation_1(new occ.gp_Vec_4(-1, 0, -0.6));
  const boxMoved = boxShape.Moved(new occ.TopLoc_Location_2(tfBox), false);

  const cyl = new occ.BRepPrimAPI_MakeCylinder_3(
    new occ.gp_Ax2_3(
      new occ.gp_Pnt_3(-0.55, 0.35, 0),
      new occ.gp_Dir_4(0, 1, 0),
    ),
    0.28,
    0.55,
  );
  const cylMoved = cyl.Shape();

  const fuse = new occ.BRepAlgoAPI_Fuse_3(
    boxMoved,
    cylMoved,
    new occ.Message_ProgressRange_1(),
  );
  fuse.Build(new occ.Message_ProgressRange_1());
  if (!fuse.IsDone()) {
    throw new Error("Demo boolean fuse failed");
  }

  const result = fuse.Shape();
  shapes.set(shapeId, result);
  return shapeId;
}

function tessellateShape(
  shapeId: string,
  options: TessellateOptions = {},
): MeshBuffers {
  const occ = requireOc();
  const shape = requireShape(shapeId);
  const lin = options.linearDeflection ?? 0.08;
  const ang = options.angularDeflection ?? 0.5;

  new occ.BRepMesh_IncrementalMesh_2(shape, lin, false, ang, false);

  const positions: number[] = [];
  const normals: number[] = [];
  const indices: number[] = [];
  let vertexOffset = 0;

  // Embind exposes enum members as numbers; the published .d.ts types them as {}.
  const faceEnum = occ.TopAbs_ShapeEnum.TopAbs_FACE as unknown as import("opencascade.js").TopAbs_ShapeEnum;
  const shapeEnum = occ.TopAbs_ShapeEnum.TopAbs_SHAPE as unknown as import("opencascade.js").TopAbs_ShapeEnum;

  const explorer = new occ.TopExp_Explorer_2(shape, faceEnum, shapeEnum);

  while (explorer.More()) {
    const face = occ.TopoDS.Face_1(explorer.Current());
    const location = new occ.TopLoc_Location_1();
    const handle = occ.BRep_Tool.Triangulation(
      face,
      location,
      0 /* Poly_MeshPurpose_NONE */,
    );

    if (!handle.IsNull()) {
      const tri = handle.get();
      const nbNodes = tri.NbNodes();
      const trsf = location.Transformation();
      const faceVerts: Vec3[] = [];

      for (let i = 1; i <= nbNodes; i++) {
        const p = tri.Node(i).Transformed(trsf);
        const v: Vec3 = [p.X(), p.Y(), p.Z()];
        faceVerts.push(v);
        positions.push(v[0], v[1], v[2]);
        normals.push(0, 0, 0);
      }

      const orient = face.Orientation_1();
      const forward = orient === occ.TopAbs_Orientation.TopAbs_FORWARD;

      const nbTriangles = tri.NbTriangles();
      for (let t = 1; t <= nbTriangles; t++) {
        const triangle = tri.Triangle(t);
        let n1 = triangle.Value(1);
        let n2 = triangle.Value(2);
        const n3 = triangle.Value(3);
        if (!forward) {
          const tmp = n1;
          n1 = n2;
          n2 = tmp;
        }

        const i0 = vertexOffset + n1 - 1;
        const i1 = vertexOffset + n2 - 1;
        const i2 = vertexOffset + n3 - 1;
        indices.push(i0, i1, i2);

        // Accumulate face normals for smooth shading.
        const a = faceVerts[n1 - 1];
        const b = faceVerts[n2 - 1];
        const c = faceVerts[n3 - 1];
        const ax = b[0] - a[0];
        const ay = b[1] - a[1];
        const az = b[2] - a[2];
        const bx = c[0] - a[0];
        const by = c[1] - a[1];
        const bz = c[2] - a[2];
        const nx = ay * bz - az * by;
        const ny = az * bx - ax * bz;
        const nz = ax * by - ay * bx;
        for (const idx of [i0, i1, i2]) {
          normals[idx * 3] += nx;
          normals[idx * 3 + 1] += ny;
          normals[idx * 3 + 2] += nz;
        }
      }

      vertexOffset += nbNodes;
    }

    explorer.Next();
  }

  // Normalize accumulated normals.
  for (let i = 0; i < normals.length; i += 3) {
    const x = normals[i];
    const y = normals[i + 1];
    const z = normals[i + 2];
    const len = Math.hypot(x, y, z) || 1;
    normals[i] = x / len;
    normals[i + 1] = y / len;
    normals[i + 2] = z / len;
  }

  const pos = new Float32Array(positions);
  const nor = new Float32Array(normals);
  const idx = new Uint32Array(indices);

  return {
    positions: pos,
    normals: nor,
    indices: idx,
    vertexCount: pos.length / 3,
    triangleCount: idx.length / 3,
    shapeId,
  };
}

function pointToVertex(point: Vec3): TopoDS_Shape {
  const occ = requireOc();
  const pnt = new occ.gp_Pnt_3(point[0], point[1], point[2]);
  return new occ.BRepBuilderAPI_MakeVertex(pnt).Shape();
}

function resolveMeasureTarget(target: MeasureTarget): TopoDS_Shape {
  if (target.kind === "point") return pointToVertex(target.point);
  return requireShape(target.shapeId);
}

function measureDistance(
  a: MeasureTarget,
  b: MeasureTarget,
): MeasureResult {
  const occ = requireOc();

  // Fast path: pure point–point Euclidean distance.
  if (a.kind === "point" && b.kind === "point") {
    const dx = b.point[0] - a.point[0];
    const dy = b.point[1] - a.point[1];
    const dz = b.point[2] - a.point[2];
    return {
      distance: Math.hypot(dx, dy, dz),
      pointOnA: [...a.point] as Vec3,
      pointOnB: [...b.point] as Vec3,
      mode: "points",
    };
  }

  const shapeA = resolveMeasureTarget(a);
  const shapeB = resolveMeasureTarget(b);

  const dist = new occ.BRepExtrema_DistShapeShape_2(
    shapeA,
    shapeB,
    occ.Extrema_ExtFlag.Extrema_ExtFlag_MIN as unknown as import("opencascade.js").Extrema_ExtFlag,
    occ.Extrema_ExtAlgo.Extrema_ExtAlgo_Grad as unknown as import("opencascade.js").Extrema_ExtAlgo,
    new occ.Message_ProgressRange_1(),
  );

  if (!dist.IsDone() || dist.NbSolution() < 1) {
    throw new Error("Distance computation failed (no solution)");
  }

  const p1 = dist.PointOnShape1(1);
  const p2 = dist.PointOnShape2(1);
  const mode: MeasureResult["mode"] =
    a.kind === "point" && b.kind === "point" ? "points" : "shapes";

  return {
    distance: dist.Value(),
    pointOnA: [p1.X(), p1.Y(), p1.Z()],
    pointOnB: [p2.X(), p2.Y(), p2.Z()],
    mode,
  };
}

function computeMassProperties(shapeId: string): MassPropertiesResult {
  const occ = requireOc();
  const shape = requireShape(shapeId);

  const volProps = new occ.GProp_GProps_1();
  occ.BRepGProp.VolumeProperties_1(shape, volProps, true, false, false);

  const surfProps = new occ.GProp_GProps_1();
  occ.BRepGProp.SurfaceProperties_1(shape, surfProps, false, false);

  const com = volProps.CentreOfMass();
  const inertia = volProps.MatrixOfInertia();
  const moments: Vec3 = [
    inertia.Value(1, 1),
    inertia.Value(2, 2),
    inertia.Value(3, 3),
  ];

  return {
    shapeId,
    volume: volProps.Mass(),
    surfaceArea: surfProps.Mass(),
    centerOfMass: [com.X(), com.Y(), com.Z()],
    principalMoments: moments,
  };
}

function runAnalysisStub(
  tool: Exclude<AnalysisToolId, "measure" | "mass-properties">,
  shapeId: string,
): AnalysisStubResult {
  requireShape(shapeId);
  return {
    tool,
    status: "stub",
    message: `${tool} is mapped to the CAD worker but not yet implemented in the OCCT kernel bridge.`,
  };
}

/** Build a planar wire profile on XY for Extrude evaluation. */
function makeExtrudeProfile(params: EvaluateExtrudeParams): TopoDS_Shape {
  const occ = requireOc();

  if (params.profile === "circle") {
    const r = Math.max(params.radius, 0.01);
    const axis = new occ.gp_Ax2_3(
      new occ.gp_Pnt_3(0, 0, 0),
      new occ.gp_Dir_4(0, 0, 1),
    );
    const circle = new occ.gp_Circ_2(axis, r);
    const edge = new occ.BRepBuilderAPI_MakeEdge_8(circle).Edge();
    const wire = new occ.BRepBuilderAPI_MakeWire_2(edge).Wire();
    return new occ.BRepBuilderAPI_MakeFace_15(wire, true).Face();
  }

  const w = Math.max(params.width, 0.01);
  const h = Math.max(params.height, 0.01);
  const hx = w / 2;
  const hy = h / 2;
  const p1 = new occ.gp_Pnt_3(-hx, -hy, 0);
  const p2 = new occ.gp_Pnt_3(hx, -hy, 0);
  const p3 = new occ.gp_Pnt_3(hx, hy, 0);
  const p4 = new occ.gp_Pnt_3(-hx, hy, 0);

  const e1 = new occ.BRepBuilderAPI_MakeEdge_3(p1, p2).Edge();
  const e2 = new occ.BRepBuilderAPI_MakeEdge_3(p2, p3).Edge();
  const e3 = new occ.BRepBuilderAPI_MakeEdge_3(p3, p4).Edge();
  const e4 = new occ.BRepBuilderAPI_MakeEdge_3(p4, p1).Edge();

  const mw = new occ.BRepBuilderAPI_MakeWire_1();
  mw.Add_1(e1);
  mw.Add_1(e2);
  mw.Add_1(e3);
  mw.Add_1(e4);
  return new occ.BRepBuilderAPI_MakeFace_15(mw.Wire(), true).Face();
}

/**
 * Extrude evaluation math: prism from a rectangle/circle profile.
 * Draft / through-all / boolean ops against existing bodies are approximated.
 */
function evaluateExtrude(params: EvaluateExtrudeParams): FeatureEvalResult {
  const occ = requireOc();
  const face = makeExtrudeProfile(params);

  let depth = Math.max(params.depth, 0.01);
  if (params.endType === "symmetric" || params.direction === "both") {
    depth = depth / 2;
  }
  if (params.direction === "opposite") {
    depth = -depth;
  }

  // Blind prism along +Z (model units = mm in UI).
  const vec = new occ.gp_Vec_4(0, 0, depth);
  const prism = new occ.BRepPrimAPI_MakePrism_1(face, vec, false, true);
  let result = prism.Shape();

  if (params.endType === "symmetric" || params.direction === "both") {
    const vecNeg = new occ.gp_Vec_4(0, 0, -Math.abs(depth));
    const prismNeg = new occ.BRepPrimAPI_MakePrism_1(face, vecNeg, false, true);
    const fuse = new occ.BRepAlgoAPI_Fuse_3(
      result,
      prismNeg.Shape(),
      new occ.Message_ProgressRange_1(),
    );
    fuse.Build(new occ.Message_ProgressRange_1());
    if (!fuse.IsDone()) throw new Error("Symmetric extrude fuse failed");
    result = fuse.Shape();
  }

  // Optional draft approximation via uniform scale about mid-height (scaffold-lite).
  if (Math.abs(params.draft) > 1e-6) {
    const draftRad = (params.draft * Math.PI) / 180;
    const scale = Math.max(0.1, 1 - Math.tan(Math.abs(draftRad)) * 0.05);
    const trsf = new occ.gp_Trsf_1();
    trsf.SetScale(new occ.gp_Pnt_3(0, 0, depth / 2), scale);
    result = new occ.BRepBuilderAPI_Transform_2(result, trsf, false).Shape();
  }

  // Boolean against demo body when operation is add/remove/intersect.
  if (params.operation !== "new" && shapes.has("demo")) {
    const target = requireShape("demo");
    const progress = new occ.Message_ProgressRange_1();
    let booleanOp;
    if (params.operation === "add") {
      booleanOp = new occ.BRepAlgoAPI_Fuse_3(target, result, progress);
    } else if (params.operation === "remove") {
      booleanOp = new occ.BRepAlgoAPI_Cut_3(target, result, progress);
    } else {
      booleanOp = new occ.BRepAlgoAPI_Common_3(target, result, progress);
    }
    booleanOp.Build(new occ.Message_ProgressRange_1());
    if (!booleanOp.IsDone()) {
      throw new Error(`Extrude ${params.operation} boolean failed`);
    }
    result = booleanOp.Shape();
  }

  const shapeId = `feat_${params.featureId}`;
  shapes.set(shapeId, result);
  const mesh = tessellateShape(shapeId);
  return { shapeId, mesh };
}

/** Fillet evaluation: blend all edges of the target body. */
function evaluateFillet(params: EvaluateFilletParams): FeatureEvalResult {
  const occ = requireOc();
  const targetId = params.targetShapeId || "demo";
  if (!shapes.has(targetId)) {
    createDemoShape(targetId);
  }
  const target = requireShape(targetId);
  const radius = Math.max(params.radius, 0.01);

  const fillet = new occ.BRepFilletAPI_MakeFillet(
    target,
    occ.ChFi3d_FilletShape.ChFi3d_Rational as unknown as import("opencascade.js").ChFi3d_FilletShape,
  );

  const edgeEnum = occ.TopAbs_ShapeEnum.TopAbs_EDGE as unknown as import("opencascade.js").TopAbs_ShapeEnum;
  const shapeEnum = occ.TopAbs_ShapeEnum.TopAbs_SHAPE as unknown as import("opencascade.js").TopAbs_ShapeEnum;
  const explorer = new occ.TopExp_Explorer_2(target, edgeEnum, shapeEnum);

  let edgeCount = 0;
  while (explorer.More()) {
    const edge = occ.TopoDS.Edge_1(explorer.Current());
    fillet.Add_2(radius, edge);
    edgeCount += 1;
    explorer.Next();
    // Manual selection would filter here; "all" fillets every edge.
    if (params.edgeSelection === "manual" && edgeCount >= 4) break;
  }

  if (edgeCount === 0) {
    throw new Error("Fillet: no edges found on target shape");
  }

  fillet.Build(new occ.Message_ProgressRange_1());
  if (!fillet.IsDone()) {
    throw new Error("Fillet build failed — radius may be too large for geometry");
  }

  const shapeId = `feat_${params.featureId}`;
  shapes.set(shapeId, fillet.Shape());
  // Also update demo so subsequent ops see the filleted body when targeting demo.
  if (targetId === "demo") {
    shapes.set("demo", fillet.Shape());
  }
  const mesh = tessellateShape(shapeId);
  return { shapeId, mesh };
}

/** Boolean evaluation: union / subtract / intersect two shapes. */
function evaluateBoolean(params: EvaluateBooleanParams): FeatureEvalResult {
  const occ = requireOc();
  const targetId = params.targetShapeId || "demo";
  if (!shapes.has(targetId)) {
    createDemoShape(targetId);
  }
  const target = requireShape(targetId);

  let tool: TopoDS_Shape;
  if (params.toolShapeId && shapes.has(params.toolShapeId)) {
    tool = requireShape(params.toolShapeId);
  } else {
    // Default tool: small box cutter when no tool shape is selected yet.
    const box = new occ.BRepPrimAPI_MakeBox_2(0.8, 0.8, 0.8);
    const tf = new occ.gp_Trsf_1();
    tf.SetTranslation_1(new occ.gp_Vec_4(-0.4, 0.1, -0.4));
    tool = box.Shape().Moved(new occ.TopLoc_Location_2(tf), false);
    shapes.set(`tool_${params.featureId}`, tool);
  }

  const progress = new occ.Message_ProgressRange_1();
  let booleanOp;
  if (params.operation === "union") {
    booleanOp = new occ.BRepAlgoAPI_Fuse_3(target, tool, progress);
  } else if (params.operation === "subtract") {
    booleanOp = new occ.BRepAlgoAPI_Cut_3(target, tool, progress);
  } else {
    booleanOp = new occ.BRepAlgoAPI_Common_3(target, tool, progress);
  }
  booleanOp.Build(new occ.Message_ProgressRange_1());
  if (!booleanOp.IsDone()) {
    throw new Error(`Boolean ${params.operation} failed`);
  }

  const result = booleanOp.Shape();
  const shapeId = `feat_${params.featureId}`;
  shapes.set(shapeId, result);
  if (targetId === "demo") {
    shapes.set("demo", result);
  }
  if (!params.keepTools && params.toolShapeId) {
    shapes.delete(params.toolShapeId);
  }

  const mesh = tessellateShape(shapeId);
  return { shapeId, mesh };
}

function collectTransferables(mesh: MeshBuffers): Transferable[] {
  return [mesh.positions.buffer, mesh.normals.buffer, mesh.indices.buffer];
}

async function handleRequest(req: CadRequest): Promise<{
  response: CadResponse;
  transfer?: Transferable[];
}> {
  switch (req.op) {
    case "init": {
      await initKernel();
      if (!shapes.has("demo")) createDemoShape("demo");
      return {
        response: {
          id: req.id,
          ok: true,
          payload: {
            op: "init",
            ready: true,
            version: "opencascade.js@beta",
          },
        },
      };
    }
    case "createDemoShape": {
      await initKernel();
      const shapeId = createDemoShape(req.shapeId ?? "demo");
      return {
        response: {
          id: req.id,
          ok: true,
          payload: { op: "createDemoShape", shapeId },
        },
      };
    }
    case "tessellate": {
      await initKernel();
      const mesh = tessellateShape(req.shapeId, req.options);
      return {
        response: {
          id: req.id,
          ok: true,
          payload: { op: "tessellate", mesh },
        },
        transfer: collectTransferables(mesh),
      };
    }
    case "measure": {
      await initKernel();
      const result = measureDistance(req.a, req.b);
      return {
        response: {
          id: req.id,
          ok: true,
          payload: { op: "measure", result },
        },
      };
    }
    case "massProperties": {
      await initKernel();
      const result = computeMassProperties(req.shapeId);
      return {
        response: {
          id: req.id,
          ok: true,
          payload: { op: "massProperties", result },
        },
      };
    }
    case "runAnalysis": {
      await initKernel();
      const result = runAnalysisStub(req.tool, req.shapeId);
      return {
        response: {
          id: req.id,
          ok: true,
          payload: { op: "runAnalysis", result },
        },
      };
    }
    case "evaluateExtrude": {
      await initKernel();
      const result = evaluateExtrude(req.params);
      return {
        response: {
          id: req.id,
          ok: true,
          payload: { op: "evaluateExtrude", result },
        },
        transfer: collectTransferables(result.mesh),
      };
    }
    case "evaluateFillet": {
      await initKernel();
      const result = evaluateFillet(req.params);
      return {
        response: {
          id: req.id,
          ok: true,
          payload: { op: "evaluateFillet", result },
        },
        transfer: collectTransferables(result.mesh),
      };
    }
    case "evaluateBoolean": {
      await initKernel();
      const result = evaluateBoolean(req.params);
      return {
        response: {
          id: req.id,
          ok: true,
          payload: { op: "evaluateBoolean", result },
        },
        transfer: collectTransferables(result.mesh),
      };
    }
    default: {
      const _exhaustive: never = req;
      void _exhaustive;
      return {
        response: {
          id: (req as CadRequest).id,
          ok: false,
          error: "Unknown CAD worker operation",
        },
      };
    }
  }
}

const postToMain = (message: CadResponse, transfer?: Transferable[]) => {
  if (transfer && transfer.length > 0) {
    (self as unknown as Worker).postMessage(message, transfer);
  } else {
    (self as unknown as Worker).postMessage(message);
  }
};

self.onmessage = async (event: MessageEvent<CadRequest>) => {
  const req = event.data;
  try {
    const { response, transfer } = await handleRequest(req);
    postToMain(response, transfer);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    postToMain({ id: req.id, ok: false, error: message });
  }
};

export {};
