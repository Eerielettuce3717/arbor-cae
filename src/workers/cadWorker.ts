/**
 * OpenCASCADE.js CAD worker — all heavy B-Rep math runs off the UI thread.
 *
 * Loads the OCCT WASM module, keeps shape handles in-process, tessellates to
 * transferable Float32Arrays, and exposes measure / mass-properties / analysis stubs.
 *
 * Two invariants govern this file:
 *
 * 1. OCCT objects are embind wrappers over the WASM heap. They are NOT garbage
 *    collected — every `new occ.X()` leaks until `.delete()` runs. Temporaries go
 *    through an `Arena`; anything a surviving `TopoDS_Shape` points into is kept
 *    alive by a ref-counted `OwnerGroup` attached to that shape.
 * 2. OCCT is not reentrant and `shapes` is shared mutable state, so requests are
 *    serialized through a single promise chain. `onmessage` must never await
 *    directly or concurrent requests will interleave and corrupt the shape table.
 */

import ocFullJS from "opencascade.js/dist/opencascade.full.js";
import ocFullWasm from "opencascade.js/dist/opencascade.full.wasm?url";
import type {
  OpenCascadeInstance,
  Poly_Triangulation,
  TopoDS_Shape,
} from "opencascade.js";
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

/* ---------- OCCT heap lifetime management ---------- */

/** Any embind-backed OCCT object with an explicit WASM destructor. */
interface OcctDisposable {
  delete(): void;
}

/** The shared demo body, used as the implicit rollup target for features. */
const BASE_SHAPE_ID = "demo";

/** Smallest length OCCT will reliably build geometry from, in model units. */
const MIN_LENGTH = 1e-4;

const DEFAULT_LINEAR_DEFLECTION = 0.08;
const DEFAULT_ANGULAR_DEFLECTION = 0.5;

/**
 * Delete in reverse construction order: later objects may reference earlier ones,
 * and OCCT's refcounting expects dependents to release first.
 */
function dropAll(objects: OcctDisposable[]): void {
  for (let i = objects.length - 1; i >= 0; i -= 1) {
    try {
      objects[i].delete();
    } catch {
      // Already reclaimed (double free is a no-op we tolerate during teardown).
    }
  }
  objects.length = 0;
}

/**
 * Builders whose internal storage a surviving shape points into.
 *
 * `BRepXxxAPI::Shape()` returns a reference to a member of the builder, so the
 * builder must outlive every shape derived from it. A single builder can back
 * more than one entry in `shapes` (a fillet result is stored under both its
 * feature id and the rollup id), hence the ref count.
 */
interface OwnerGroup {
  objects: OcctDisposable[];
  refs: number;
}

function retainGroup(group: OwnerGroup): OwnerGroup {
  group.refs += 1;
  return group;
}

function releaseGroup(group: OwnerGroup): void {
  group.refs -= 1;
  if (group.refs <= 0) dropAll(group.objects);
}

/**
 * Scoped ownership for one operation.
 *
 * `temp()` objects are value types, iterators, or one-shot algorithms whose
 * results have already been copied out; they are freed as soon as the operation
 * returns. `retain()` objects back a shape that outlives the operation and are
 * handed to an `OwnerGroup` via `takeOwnership()`.
 */
class Arena {
  private readonly temps: OcctDisposable[] = [];
  private readonly retained: OcctDisposable[] = [];

  temp<T extends OcctDisposable>(obj: T): T {
    this.temps.push(obj);
    return obj;
  }

  retain<T extends OcctDisposable>(obj: T): T {
    this.retained.push(obj);
    return obj;
  }

  /** Transfer builder ownership to a fresh group for a surviving shape. */
  takeOwnership(): OwnerGroup {
    const group: OwnerGroup = { objects: this.retained.slice(), refs: 0 };
    this.retained.length = 0;
    return group;
  }

  releaseTemps(): void {
    dropAll(this.temps);
  }

  /** Release everything, including would-be retained builders (failure path). */
  releaseAll(): void {
    dropAll(this.temps);
    dropAll(this.retained);
  }
}

interface ShapeEntry {
  shape: TopoDS_Shape;
  owner: OwnerGroup;
}

const shapes = new Map<string, ShapeEntry>();
let oc: OpenCascadeInstance | null = null;

function requireOc(): OpenCascadeInstance {
  if (!oc) throw new Error("OpenCASCADE is not initialized");
  return oc;
}

function requireShape(shapeId: string): TopoDS_Shape {
  const entry = shapes.get(shapeId);
  if (!entry) throw new Error(`Unknown shape id: ${shapeId}`);
  return entry.shape;
}

/**
 * Publish a shape, releasing whatever previously occupied the id.
 *
 * The replacement is installed before the old group is released so that a shape
 * derived from the previous occupant (fillet-of-demo stored back into demo)
 * cannot be left pointing at freed WASM memory.
 */
function setShape(
  shapeId: string,
  shape: TopoDS_Shape,
  owner: OwnerGroup,
): void {
  const previous = shapes.get(shapeId);
  shapes.set(shapeId, { shape, owner: retainGroup(owner) });
  if (previous) releaseGroup(previous.owner);
}

function dropShape(shapeId: string): boolean {
  const entry = shapes.get(shapeId);
  if (!entry) return false;
  shapes.delete(shapeId);
  releaseGroup(entry.owner);
  return true;
}

/* ---------- Numeric validation ---------- */

/**
 * Reject non-finite input at the WASM boundary. A NaN reaching OCCT produces
 * either a hard abort or silently corrupt geometry, both of which are far
 * harder to diagnose than a rejected request.
 */
function finiteNumber(value: number, label: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(
      `${label} must be a finite number (received ${String(value)})`,
    );
  }
  return value;
}

/** Finite, strictly positive, and clamped away from OCCT's degeneracy floor. */
function positiveLength(value: number, label: string): number {
  const n = finiteNumber(value, label);
  if (n <= 0) {
    throw new Error(`${label} must be greater than zero (received ${n})`);
  }
  return Math.max(n, MIN_LENGTH);
}

/* ---------- Kernel initialization ---------- */

/**
 * In-flight init promise.
 *
 * `initKernel` used to test `if (oc) return` and then await, which let every
 * request that arrived before the first load resolved instantiate its own copy
 * of the ~40 MB OCCT module. Caching the promise collapses them onto one load.
 */
let kernelPromise: Promise<OpenCascadeInstance> | null = null;

function initKernel(): Promise<OpenCascadeInstance> {
  if (oc) return Promise.resolve(oc);
  if (kernelPromise) return kernelPromise;

  const load = (
    ocFullJS as (opts: {
      locateFile: (path: string) => string;
    }) => Promise<OpenCascadeInstance>
  )({
    // Vite serves the WASM as a URL; locateFile must return that string.
    locateFile: (path: string) => (path.endsWith(".wasm") ? ocFullWasm : path),
  });

  kernelPromise = load.then(
    (instance) => {
      oc = instance;
      return instance;
    },
    (err: unknown) => {
      // Clear the cache so a transient load failure stays retryable.
      kernelPromise = null;
      throw err instanceof Error
        ? err
        : new Error(`OpenCASCADE failed to load: ${String(err)}`);
    },
  );

  return kernelPromise;
}

/* ---------- Shape construction ---------- */

/** Demo solid: box with cylindrical boss (matches viewport demo proportions). */
function createDemoShape(shapeId: string = BASE_SHAPE_ID): string {
  const occ = requireOc();
  const arena = new Arena();

  try {
    const box = arena.retain(new occ.BRepPrimAPI_MakeBox_2(2, 0.35, 1.2));
    const boxShape = box.Shape();

    // Move box so bottom sits on Y=0 (MakeBox builds from origin).
    const tfBox = arena.temp(new occ.gp_Trsf_1());
    tfBox.SetTranslation_1(arena.temp(new occ.gp_Vec_4(-1, 0, -0.6)));
    const boxMoved = arena.temp(
      boxShape.Moved(arena.temp(new occ.TopLoc_Location_2(tfBox)), false),
    );

    const cyl = arena.retain(
      new occ.BRepPrimAPI_MakeCylinder_3(
        arena.temp(
          new occ.gp_Ax2_3(
            arena.temp(new occ.gp_Pnt_3(-0.55, 0.35, 0)),
            arena.temp(new occ.gp_Dir_4(0, 1, 0)),
          ),
        ),
        0.28,
        0.55,
      ),
    );
    const cylMoved = cyl.Shape();

    const fuse = arena.retain(
      new occ.BRepAlgoAPI_Fuse_3(
        boxMoved,
        cylMoved,
        arena.temp(new occ.Message_ProgressRange_1()),
      ),
    );
    fuse.Build(arena.temp(new occ.Message_ProgressRange_1()));
    if (!fuse.IsDone()) {
      throw new Error("Demo boolean fuse failed");
    }

    setShape(shapeId, fuse.Shape(), arena.takeOwnership());
    return shapeId;
  } catch (err) {
    arena.releaseAll();
    throw err;
  } finally {
    arena.releaseTemps();
  }
}

/* ---------- Tessellation ---------- */

/** Row-major 3x4 rigid transform pulled out of a `gp_Trsf` as plain numbers. */
type Affine3x4 = [
  number, number, number, number,
  number, number, number, number,
  number, number, number, number,
];

const IDENTITY_3X4: Affine3x4 = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0];

/**
 * Visit every triangulated face of `shape`.
 *
 * The triangulation handle and location are freed per face rather than pooled
 * for the whole traversal, so the WASM heap stays flat across large models.
 */
function forEachTriangulatedFace(
  occ: OpenCascadeInstance,
  shape: TopoDS_Shape,
  visit: (
    tri: Poly_Triangulation,
    transform: Affine3x4,
    reversed: boolean,
  ) => void,
): void {
  // Embind exposes enum members as numbers; the published .d.ts types them as {}.
  const faceEnum =
    occ.TopAbs_ShapeEnum
      .TopAbs_FACE as unknown as import("opencascade.js").TopAbs_ShapeEnum;
  const shapeEnum =
    occ.TopAbs_ShapeEnum
      .TopAbs_SHAPE as unknown as import("opencascade.js").TopAbs_ShapeEnum;

  const outer = new Arena();
  const explorer = outer.temp(
    new occ.TopExp_Explorer_2(shape, faceEnum, shapeEnum),
  );

  try {
    while (explorer.More()) {
      const perFace = new Arena();
      try {
        const face = occ.TopoDS.Face_1(explorer.Current());
        const location = perFace.temp(new occ.TopLoc_Location_1());
        const handle = perFace.temp(
          occ.BRep_Tool.Triangulation(
            face,
            location,
            0 /* Poly_MeshPurpose_NONE */,
          ),
        );

        if (!handle.IsNull()) {
          const tri = handle.get();
          if (tri) {
            let transform = IDENTITY_3X4;
            if (!location.IsIdentity()) {
              // Read the matrix once instead of calling gp_Pnt::Transformed per
              // node — that returns by value and leaked one WASM object per
              // vertex, which dominated heap growth on every re-tessellation.
              const trsf = location.Transformation();
              transform = [
                trsf.Value(1, 1), trsf.Value(1, 2), trsf.Value(1, 3), trsf.Value(1, 4),
                trsf.Value(2, 1), trsf.Value(2, 2), trsf.Value(2, 3), trsf.Value(2, 4),
                trsf.Value(3, 1), trsf.Value(3, 2), trsf.Value(3, 3), trsf.Value(3, 4),
              ];
            }
            // A REVERSED face stores its triangles with the opposite winding,
            // so consumers must swap two corners to keep outward normals.
            const reversed =
              face.Orientation_1() !== occ.TopAbs_Orientation.TopAbs_FORWARD;
            visit(tri, transform, reversed);
          }
        }
      } finally {
        perFace.releaseTemps();
      }
      explorer.Next();
    }
  } finally {
    outer.releaseTemps();
  }
}

/**
 * Tessellate a stored B-Rep into flat typed arrays.
 *
 * Buffers are sized by a counting pass and filled in place. The previous
 * implementation accumulated into `number[]` and copied at the end, which cost
 * roughly 4x peak memory (boxed doubles plus the final copy) and destroyed
 * cache locality on large models.
 */
function tessellateShape(
  shapeId: string,
  options: TessellateOptions = {},
): MeshBuffers {
  const occ = requireOc();
  const shape = requireShape(shapeId);
  const lin = positiveLength(
    options.linearDeflection ?? DEFAULT_LINEAR_DEFLECTION,
    "linearDeflection",
  );
  const ang = positiveLength(
    options.angularDeflection ?? DEFAULT_ANGULAR_DEFLECTION,
    "angularDeflection",
  );

  const arena = new Arena();
  try {
    // The mesher writes triangulations onto each TFace; it is not needed after
    // construction, so it is a pure temporary.
    arena.temp(new occ.BRepMesh_IncrementalMesh_2(shape, lin, false, ang, false));

    let nodeTotal = 0;
    let triangleTotal = 0;
    forEachTriangulatedFace(occ, shape, (tri) => {
      nodeTotal += tri.NbNodes();
      triangleTotal += tri.NbTriangles();
    });

    const positions = new Float32Array(nodeTotal * 3);
    const normals = new Float32Array(nodeTotal * 3);
    const indices = new Uint32Array(triangleTotal * 3);

    let vertexOffset = 0;
    let indexCursor = 0;

    forEachTriangulatedFace(occ, shape, (tri, m, reversed) => {
      const nbNodes = tri.NbNodes();
      const base = vertexOffset * 3;

      for (let i = 1; i <= nbNodes; i += 1) {
        const node = tri.Node(i);
        const x = node.X();
        const y = node.Y();
        const z = node.Z();
        const o = base + (i - 1) * 3;
        positions[o] = m[0] * x + m[1] * y + m[2] * z + m[3];
        positions[o + 1] = m[4] * x + m[5] * y + m[6] * z + m[7];
        positions[o + 2] = m[8] * x + m[9] * y + m[10] * z + m[11];
      }

      const nbTriangles = tri.NbTriangles();
      for (let t = 1; t <= nbTriangles; t += 1) {
        const triangle = tri.Triangle(t);
        const v1 = triangle.Value(1);
        const v2 = triangle.Value(2);
        const v3 = triangle.Value(3);
        // Swap the first two corners on reversed faces so every emitted
        // triangle winds counter-clockwise when seen from outside the solid.
        const a = vertexOffset + (reversed ? v2 : v1) - 1;
        const b = vertexOffset + (reversed ? v1 : v2) - 1;
        const c = vertexOffset + v3 - 1;

        indices[indexCursor] = a;
        indices[indexCursor + 1] = b;
        indices[indexCursor + 2] = c;
        indexCursor += 3;

        // Area-weighted vertex normals: the unnormalized cross product is
        // proportional to triangle area, which is the weighting we want.
        const ax = positions[a * 3];
        const ay = positions[a * 3 + 1];
        const az = positions[a * 3 + 2];
        const ux = positions[b * 3] - ax;
        const uy = positions[b * 3 + 1] - ay;
        const uz = positions[b * 3 + 2] - az;
        const vx = positions[c * 3] - ax;
        const vy = positions[c * 3 + 1] - ay;
        const vz = positions[c * 3 + 2] - az;
        const nx = uy * vz - uz * vy;
        const ny = uz * vx - ux * vz;
        const nz = ux * vy - uy * vx;

        normals[a * 3] += nx;
        normals[a * 3 + 1] += ny;
        normals[a * 3 + 2] += nz;
        normals[b * 3] += nx;
        normals[b * 3 + 1] += ny;
        normals[b * 3 + 2] += nz;
        normals[c * 3] += nx;
        normals[c * 3 + 1] += ny;
        normals[c * 3 + 2] += nz;
      }

      vertexOffset += nbNodes;
    });

    for (let i = 0; i < normals.length; i += 3) {
      const x = normals[i];
      const y = normals[i + 1];
      const z = normals[i + 2];
      const len = Math.hypot(x, y, z);
      if (len > 1e-12) {
        normals[i] = x / len;
        normals[i + 1] = y / len;
        normals[i + 2] = z / len;
      } else {
        // Isolated or fully degenerate vertex: a zero normal renders black, so
        // fall back to +Y rather than shipping (0,0,0) to the GPU.
        normals[i] = 0;
        normals[i + 1] = 1;
        normals[i + 2] = 0;
      }
    }

    return {
      positions,
      normals,
      indices,
      vertexCount: nodeTotal,
      triangleCount: triangleTotal,
      shapeId,
    };
  } finally {
    arena.releaseTemps();
  }
}

/* ---------- Measurement ---------- */

function makeVertex(arena: Arena, point: Vec3): TopoDS_Shape {
  const occ = requireOc();
  const pnt = arena.temp(
    new occ.gp_Pnt_3(
      finiteNumber(point[0], "Measure point X"),
      finiteNumber(point[1], "Measure point Y"),
      finiteNumber(point[2], "Measure point Z"),
    ),
  );
  return arena.temp(new occ.BRepBuilderAPI_MakeVertex(pnt)).Shape();
}

function resolveMeasureTarget(
  arena: Arena,
  target: MeasureTarget,
): TopoDS_Shape {
  if (target.kind === "point") return makeVertex(arena, target.point);
  return requireShape(target.shapeId);
}

function measureDistance(a: MeasureTarget, b: MeasureTarget): MeasureResult {
  const occ = requireOc();

  // Fast path: pure point–point Euclidean distance, no kernel round trip.
  if (a.kind === "point" && b.kind === "point") {
    const dx = finiteNumber(b.point[0], "Point B X") - finiteNumber(a.point[0], "Point A X");
    const dy = finiteNumber(b.point[1], "Point B Y") - finiteNumber(a.point[1], "Point A Y");
    const dz = finiteNumber(b.point[2], "Point B Z") - finiteNumber(a.point[2], "Point A Z");
    return {
      distance: Math.hypot(dx, dy, dz),
      pointOnA: [...a.point] as Vec3,
      pointOnB: [...b.point] as Vec3,
      mode: "points",
    };
  }

  const arena = new Arena();
  try {
    const shapeA = resolveMeasureTarget(arena, a);
    const shapeB = resolveMeasureTarget(arena, b);

    const dist = arena.temp(
      new occ.BRepExtrema_DistShapeShape_2(
        shapeA,
        shapeB,
        occ.Extrema_ExtFlag
          .Extrema_ExtFlag_MIN as unknown as import("opencascade.js").Extrema_ExtFlag,
        occ.Extrema_ExtAlgo
          .Extrema_ExtAlgo_Grad as unknown as import("opencascade.js").Extrema_ExtAlgo,
        arena.temp(new occ.Message_ProgressRange_1()),
      ),
    );

    if (!dist.IsDone() || dist.NbSolution() < 1) {
      throw new Error("Distance computation failed (no solution)");
    }

    const p1 = dist.PointOnShape1(1);
    const p2 = dist.PointOnShape2(1);

    return {
      distance: dist.Value(),
      pointOnA: [p1.X(), p1.Y(), p1.Z()],
      pointOnB: [p2.X(), p2.Y(), p2.Z()],
      mode: "shapes",
    };
  } finally {
    arena.releaseTemps();
  }
}

function computeMassProperties(shapeId: string): MassPropertiesResult {
  const occ = requireOc();
  const shape = requireShape(shapeId);
  const arena = new Arena();

  try {
    const volProps = arena.temp(new occ.GProp_GProps_1());
    occ.BRepGProp.VolumeProperties_1(shape, volProps, true, false, false);

    const surfProps = arena.temp(new occ.GProp_GProps_1());
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
  } finally {
    arena.releaseTemps();
  }
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

/* ---------- Feature evaluation ---------- */

/** Build a planar wire profile on XY for Extrude evaluation. */
function makeExtrudeProfile(
  arena: Arena,
  params: EvaluateExtrudeParams,
): TopoDS_Shape {
  const occ = requireOc();

  if (params.profile === "circle") {
    const r = positiveLength(params.radius, "Extrude radius");
    const axis = arena.temp(
      new occ.gp_Ax2_3(
        arena.temp(new occ.gp_Pnt_3(0, 0, 0)),
        arena.temp(new occ.gp_Dir_4(0, 0, 1)),
      ),
    );
    const circle = arena.temp(new occ.gp_Circ_2(axis, r));
    const edge = arena.retain(new occ.BRepBuilderAPI_MakeEdge_8(circle)).Edge();
    const wire = arena.retain(new occ.BRepBuilderAPI_MakeWire_2(edge)).Wire();
    return arena.retain(new occ.BRepBuilderAPI_MakeFace_15(wire, true)).Face();
  }

  const w = positiveLength(params.width, "Extrude width");
  const h = positiveLength(params.height, "Extrude height");
  const hx = w / 2;
  const hy = h / 2;
  const p1 = arena.temp(new occ.gp_Pnt_3(-hx, -hy, 0));
  const p2 = arena.temp(new occ.gp_Pnt_3(hx, -hy, 0));
  const p3 = arena.temp(new occ.gp_Pnt_3(hx, hy, 0));
  const p4 = arena.temp(new occ.gp_Pnt_3(-hx, hy, 0));

  const e1 = arena.retain(new occ.BRepBuilderAPI_MakeEdge_3(p1, p2)).Edge();
  const e2 = arena.retain(new occ.BRepBuilderAPI_MakeEdge_3(p2, p3)).Edge();
  const e3 = arena.retain(new occ.BRepBuilderAPI_MakeEdge_3(p3, p4)).Edge();
  const e4 = arena.retain(new occ.BRepBuilderAPI_MakeEdge_3(p4, p1)).Edge();

  const mw = arena.retain(new occ.BRepBuilderAPI_MakeWire_1());
  mw.Add_1(e1);
  mw.Add_1(e2);
  mw.Add_1(e3);
  mw.Add_1(e4);
  return arena.retain(new occ.BRepBuilderAPI_MakeFace_15(mw.Wire(), true)).Face();
}

/**
 * Extrude evaluation math: prism from a rectangle/circle profile.
 *
 * Draft and up-to-face are still approximations; the depth/direction algebra is
 * exact. A negative depth is treated as a direction flip rather than being
 * clamped, which is what every mainstream modeler does.
 */
function evaluateExtrude(params: EvaluateExtrudeParams): FeatureEvalResult {
  const occ = requireOc();
  const arena = new Arena();

  try {
    const face = makeExtrudeProfile(arena, params);

    const requested = finiteNumber(params.depth, "Extrude depth");
    const magnitude = Math.max(Math.abs(requested), MIN_LENGTH);
    const symmetric =
      params.endType === "symmetric" || params.direction === "both";
    // Symmetric extrudes split the requested depth across both sides so the
    // total thickness still matches what the user typed.
    const perSide = symmetric ? magnitude / 2 : magnitude;
    const sign =
      (requested < 0 ? -1 : 1) * (params.direction === "opposite" ? -1 : 1);
    const primaryDepth = perSide * sign;

    const prism = arena.retain(
      new occ.BRepPrimAPI_MakePrism_1(
        face,
        arena.temp(new occ.gp_Vec_4(0, 0, primaryDepth)),
        false,
        true,
      ),
    );
    let result = prism.Shape();

    if (symmetric) {
      // Mirror of the primary run. Deriving this from -primaryDepth (rather
      // than -abs(depth)) is what makes "symmetric + opposite" actually
      // straddle the sketch plane instead of stacking two identical prisms.
      const prismNeg = arena.retain(
        new occ.BRepPrimAPI_MakePrism_1(
          face,
          arena.temp(new occ.gp_Vec_4(0, 0, -primaryDepth)),
          false,
          true,
        ),
      );
      const fuse = arena.retain(
        new occ.BRepAlgoAPI_Fuse_3(
          result,
          prismNeg.Shape(),
          arena.temp(new occ.Message_ProgressRange_1()),
        ),
      );
      fuse.Build(arena.temp(new occ.Message_ProgressRange_1()));
      if (!fuse.IsDone()) throw new Error("Symmetric extrude fuse failed");
      result = fuse.Shape();
    }

    // Optional draft approximation via uniform scale about mid-height.
    const draft = finiteNumber(params.draft, "Extrude draft");
    if (Math.abs(draft) > 1e-6) {
      const draftRad = (draft * Math.PI) / 180;
      const scale = Math.max(0.1, 1 - Math.tan(Math.abs(draftRad)) * 0.05);
      const pivotZ = symmetric ? 0 : primaryDepth / 2;
      const trsf = arena.temp(new occ.gp_Trsf_1());
      trsf.SetScale(arena.temp(new occ.gp_Pnt_3(0, 0, pivotZ)), scale);
      result = arena
        .retain(new occ.BRepBuilderAPI_Transform_2(result, trsf, false))
        .Shape();
    }

    // Boolean against the rollup body when operation is add/remove/intersect.
    if (params.operation !== "new" && shapes.has(BASE_SHAPE_ID)) {
      const target = requireShape(BASE_SHAPE_ID);
      const progress = arena.temp(new occ.Message_ProgressRange_1());
      let booleanOp;
      if (params.operation === "add") {
        booleanOp = arena.retain(
          new occ.BRepAlgoAPI_Fuse_3(target, result, progress),
        );
      } else if (params.operation === "remove") {
        booleanOp = arena.retain(
          new occ.BRepAlgoAPI_Cut_3(target, result, progress),
        );
      } else {
        booleanOp = arena.retain(
          new occ.BRepAlgoAPI_Common_3(target, result, progress),
        );
      }
      booleanOp.Build(arena.temp(new occ.Message_ProgressRange_1()));
      if (!booleanOp.IsDone()) {
        throw new Error(`Extrude ${params.operation} boolean failed`);
      }
      result = booleanOp.Shape();
    }

    const shapeId = `feat_${params.featureId}`;
    const owner = arena.takeOwnership();
    setShape(shapeId, result, owner);
    return { shapeId, mesh: tessellateShape(shapeId) };
  } catch (err) {
    arena.releaseAll();
    throw err;
  } finally {
    arena.releaseTemps();
  }
}

/** Fillet evaluation: blend edges of the target body. */
function evaluateFillet(params: EvaluateFilletParams): FeatureEvalResult {
  const occ = requireOc();
  const targetId = params.targetShapeId || BASE_SHAPE_ID;
  if (!shapes.has(targetId)) {
    createDemoShape(targetId);
  }
  const target = requireShape(targetId);
  const radius = positiveLength(params.radius, "Fillet radius");

  const arena = new Arena();
  try {
    const fillet = arena.retain(
      new occ.BRepFilletAPI_MakeFillet(
        target,
        occ.ChFi3d_FilletShape
          .ChFi3d_Rational as unknown as import("opencascade.js").ChFi3d_FilletShape,
      ),
    );

    const edgeEnum =
      occ.TopAbs_ShapeEnum
        .TopAbs_EDGE as unknown as import("opencascade.js").TopAbs_ShapeEnum;
    const shapeEnum =
      occ.TopAbs_ShapeEnum
        .TopAbs_SHAPE as unknown as import("opencascade.js").TopAbs_ShapeEnum;
    const explorer = arena.temp(
      new occ.TopExp_Explorer_2(target, edgeEnum, shapeEnum),
    );

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

    fillet.Build(arena.temp(new occ.Message_ProgressRange_1()));
    if (!fillet.IsDone()) {
      throw new Error(
        "Fillet build failed — radius may be too large for geometry",
      );
    }

    const result = fillet.Shape();
    const shapeId = `feat_${params.featureId}`;
    const owner = arena.takeOwnership();
    setShape(shapeId, result, owner);
    // Advance the rollup so downstream features consume the filleted body.
    // regenerateTree() resets the rollup first, which is what keeps this
    // chaining idempotent across rebuilds.
    if (targetId === BASE_SHAPE_ID) {
      setShape(BASE_SHAPE_ID, result, owner);
    }
    return { shapeId, mesh: tessellateShape(shapeId) };
  } catch (err) {
    arena.releaseAll();
    throw err;
  } finally {
    arena.releaseTemps();
  }
}

/** Boolean evaluation: union / subtract / intersect two shapes. */
function evaluateBoolean(params: EvaluateBooleanParams): FeatureEvalResult {
  const occ = requireOc();
  const targetId = params.targetShapeId || BASE_SHAPE_ID;
  if (!shapes.has(targetId)) {
    createDemoShape(targetId);
  }
  const target = requireShape(targetId);

  const arena = new Arena();
  /** Set when we synthesize a cutter, so it can be dropped if unwanted. */
  let synthesizedToolId: string | null = null;

  try {
    let tool: TopoDS_Shape;
    if (params.toolShapeId && shapes.has(params.toolShapeId)) {
      tool = requireShape(params.toolShapeId);
    } else {
      // Default tool: small box cutter when no tool shape is selected yet.
      const toolArena = new Arena();
      try {
        const box = toolArena.retain(new occ.BRepPrimAPI_MakeBox_2(0.8, 0.8, 0.8));
        const tf = toolArena.temp(new occ.gp_Trsf_1());
        tf.SetTranslation_1(toolArena.temp(new occ.gp_Vec_4(-0.4, 0.1, -0.4)));
        const moved = box
          .Shape()
          .Moved(toolArena.temp(new occ.TopLoc_Location_2(tf)), false);
        synthesizedToolId = `tool_${params.featureId}`;
        setShape(synthesizedToolId, moved, toolArena.takeOwnership());
        tool = requireShape(synthesizedToolId);
      } catch (err) {
        toolArena.releaseAll();
        throw err;
      } finally {
        toolArena.releaseTemps();
      }
    }

    const progress = arena.temp(new occ.Message_ProgressRange_1());
    let booleanOp;
    if (params.operation === "union") {
      booleanOp = arena.retain(
        new occ.BRepAlgoAPI_Fuse_3(target, tool, progress),
      );
    } else if (params.operation === "subtract") {
      booleanOp = arena.retain(
        new occ.BRepAlgoAPI_Cut_3(target, tool, progress),
      );
    } else {
      booleanOp = arena.retain(
        new occ.BRepAlgoAPI_Common_3(target, tool, progress),
      );
    }
    booleanOp.Build(arena.temp(new occ.Message_ProgressRange_1()));
    if (!booleanOp.IsDone()) {
      throw new Error(`Boolean ${params.operation} failed`);
    }

    const result = booleanOp.Shape();
    const shapeId = `feat_${params.featureId}`;
    const owner = arena.takeOwnership();
    setShape(shapeId, result, owner);
    if (targetId === BASE_SHAPE_ID) {
      setShape(BASE_SHAPE_ID, result, owner);
    }

    // Free the cutter's B-Rep now that the result owns its own geometry.
    if (!params.keepTools) {
      if (params.toolShapeId) dropShape(params.toolShapeId);
      if (synthesizedToolId) dropShape(synthesizedToolId);
    }

    return { shapeId, mesh: tessellateShape(shapeId) };
  } catch (err) {
    arena.releaseAll();
    if (synthesizedToolId) dropShape(synthesizedToolId);
    throw err;
  } finally {
    arena.releaseTemps();
  }
}

/** Drop every shape not in `keep`, so long sessions do not retain dead B-Rep. */
function retainShapes(shapeIds: string[]): { kept: number; dropped: number } {
  const keep = new Set(shapeIds.filter(Boolean));
  // Always preserve the shared rollup body used as a boolean target.
  keep.add(BASE_SHAPE_ID);
  let dropped = 0;
  for (const id of [...shapes.keys()]) {
    if (!keep.has(id) && dropShape(id)) {
      dropped += 1;
    }
  }
  return { kept: shapes.size, dropped };
}

function collectTransferables(mesh: MeshBuffers): Transferable[] {
  // Distinct buffers only: postMessage throws if the same ArrayBuffer appears
  // twice in the transfer list, and a zero-length mesh can share allocations.
  const seen = new Set<ArrayBufferLike>();
  const out: Transferable[] = [];
  for (const view of [mesh.positions, mesh.normals, mesh.indices]) {
    if (!seen.has(view.buffer)) {
      seen.add(view.buffer);
      out.push(view.buffer as Transferable);
    }
  }
  return out;
}

/* ---------- Request dispatch ---------- */

async function handleRequest(req: CadRequest): Promise<{
  response: CadResponse;
  transfer?: Transferable[];
}> {
  await initKernel();

  switch (req.op) {
    case "init": {
      if (!shapes.has(BASE_SHAPE_ID)) createDemoShape(BASE_SHAPE_ID);
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
      const shapeId = createDemoShape(req.shapeId ?? BASE_SHAPE_ID);
      return {
        response: {
          id: req.id,
          ok: true,
          payload: { op: "createDemoShape", shapeId },
        },
      };
    }
    case "tessellate": {
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
    case "retainShapes": {
      const { kept, dropped } = retainShapes(req.shapeIds);
      return {
        response: {
          id: req.id,
          ok: true,
          payload: { op: "retainShapes", kept, dropped },
        },
      };
    }
    case "deleteShape": {
      const deleted = dropShape(req.shapeId);
      return {
        response: {
          id: req.id,
          ok: true,
          payload: { op: "deleteShape", shapeId: req.shapeId, deleted },
        },
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

function postToMain(message: CadResponse, transfer?: Transferable[]): void {
  const target = self as unknown as Worker;
  if (transfer && transfer.length > 0) {
    target.postMessage(message, transfer);
  } else {
    target.postMessage(message);
  }
}

/**
 * Serialization tail.
 *
 * OCCT is not reentrant and every operation mutates the shared `shapes` table,
 * so requests are chained rather than awaited concurrently. Without this, two
 * in-flight feature evaluations interleave at their `await` points and race on
 * the rollup body.
 */
let requestChain: Promise<void> = Promise.resolve();

async function processRequest(req: CadRequest): Promise<void> {
  try {
    const { response, transfer } = await handleRequest(req);
    postToMain(response, transfer);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    postToMain({ id: req?.id ?? "unknown", ok: false, error: message });
  }
}

self.onmessage = (event: MessageEvent<CadRequest>) => {
  const req = event.data;
  // Never returns rejected: processRequest swallows and reports every failure,
  // so one bad request cannot poison the queue for every later request.
  requestChain = requestChain.then(() => processRequest(req));
};

export {};
