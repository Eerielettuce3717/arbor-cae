import {
  BufferGeometry,
  Group,
  Line,
  LineBasicMaterial,
  OrthographicCamera,
  PerspectiveCamera,
  Raycaster,
  Sprite,
  SpriteMaterial,
  CanvasTexture,
  Vector2,
  Vector3,
  type Camera,
} from "three";
import {
  REFERENCE_ACCENT,
  REFERENCE_PLANES,
  visibleWorldHeight,
  type ReferencePlaneId,
} from "../components/viewport/ReferenceGeometry";
import type { SketchEntity } from "../components/partstudio/types";

/** Pixel radius for point / curve snaps. Planes snap anywhere on their face. */
export const INFERENCE_PIXEL_RADIUS = 12;

export type InferenceKind =
  | "origin"
  | "plane"
  | "point"
  | "endpoint"
  | "midpoint"
  | "center"
  | "curve";

export interface InferenceTarget {
  id: string;
  kind: InferenceKind;
  label: string;
  /** World-space snap location (planes use the ray hit instead). */
  point?: Vector3;
  line?: { start: Vector3; end: Vector3 };
  circle?: { center: Vector3; normal: Vector3; radius: number };
  plane?: {
    id: ReferencePlaneId;
    origin: Vector3;
    normal: Vector3;
    halfExtent: number;
  };
}

export interface InferenceHit {
  target: InferenceTarget;
  point: Vector3;
  /** Cursor distance in CSS pixels. */
  screenDistance: number;
}

export interface InferenceQuery {
  clientX: number;
  clientY: number;
  canvas: HTMLElement;
  camera: Camera;
  targets: InferenceTarget[];
  /** World size of the default planes (after auto-scale). */
  planeHalfExtent: number;
}

const PRIORITY: Record<InferenceKind, number> = {
  origin: 0,
  endpoint: 1,
  point: 1,
  midpoint: 2,
  center: 2,
  curve: 3,
  plane: 4,
};

const _ndc = new Vector2();
const _raycaster = new Raycaster();
const _hit = new Vector3();
const _tmp = new Vector3();
const _tmp2 = new Vector3();
const _screen = new Vector2();
const _origin = new Vector3();
const _dir = new Vector3();
const _planeOrigin = new Vector3();
const _planeNormal = new Vector3();

function setRayFromEvent(
  clientX: number,
  clientY: number,
  canvas: HTMLElement,
  camera: Camera,
) {
  const rect = canvas.getBoundingClientRect();
  const w = Math.max(rect.width, 1);
  const h = Math.max(rect.height, 1);
  _ndc.x = ((clientX - rect.left) / w) * 2 - 1;
  _ndc.y = -((clientY - rect.top) / h) * 2 + 1;
  _raycaster.setFromCamera(_ndc, camera);
  _origin.copy(_raycaster.ray.origin);
  _dir.copy(_raycaster.ray.direction);
  return { rect, w, h };
}

function projectToScreen(
  world: Vector3,
  camera: Camera,
  rect: DOMRect,
  out: Vector2,
) {
  _tmp.copy(world).project(camera);
  out.set(
    (_tmp.x * 0.5 + 0.5) * rect.width,
    (-_tmp.y * 0.5 + 0.5) * rect.height,
  );
}

function rayClosestToPoint(point: Vector3, out: Vector3): number {
  // t = (P - O) · D, D is unit.
  const t = Math.max(0, _tmp.copy(point).sub(_origin).dot(_dir));
  out.copy(_origin).addScaledVector(_dir, t);
  return out.distanceTo(point);
}

function rayPlaneHit(origin: Vector3, normal: Vector3, out: Vector3): boolean {
  const denom = normal.dot(_dir);
  if (!Number.isFinite(denom) || Math.abs(denom) < 1e-8) return false;
  const t = _tmp.copy(origin).sub(_origin).dot(normal) / denom;
  if (t < 0) return false;
  out.copy(_origin).addScaledVector(_dir, t);
  return Number.isFinite(out.x);
}

function closestOnSegment(
  a: Vector3,
  b: Vector3,
  p: Vector3,
  out: Vector3,
): number {
  _tmp.copy(b).sub(a);
  const lenSq = _tmp.lengthSq();
  if (lenSq < 1e-12) {
    out.copy(a);
    return out.distanceTo(p);
  }
  const t = Math.max(0, Math.min(1, _tmp2.copy(p).sub(a).dot(_tmp) / lenSq));
  out.copy(a).addScaledVector(_tmp, t);
  return out.distanceTo(p);
}

function inPlaneSquare(
  hit: Vector3,
  origin: Vector3,
  normal: Vector3,
  half: number,
): boolean {
  _tmp.copy(hit).sub(origin);
  if (Math.abs(normal.y) > 0.9) {
    return Math.abs(_tmp.x) <= half && Math.abs(_tmp.z) <= half;
  }
  if (Math.abs(normal.x) > 0.9) {
    return Math.abs(_tmp.y) <= half && Math.abs(_tmp.z) <= half;
  }
  return Math.abs(_tmp.x) <= half && Math.abs(_tmp.y) <= half;
}

/**
 * Build origin + default-plane targets. `planeHalfExtent` is world size / 2
 * after ReferenceGeometry auto-scale.
 */
export function defaultReferenceTargets(
  planeHalfExtent: number,
): InferenceTarget[] {
  const half = Math.max(planeHalfExtent, 1e-4);
  const targets: InferenceTarget[] = [
    {
      id: "origin",
      kind: "origin",
      label: "Origin",
      point: new Vector3(0, 0, 0),
    },
  ];
  for (const def of REFERENCE_PLANES) {
    targets.push({
      id: `plane-${def.id}`,
      kind: "plane",
      label: `${def.label} plane`,
      plane: {
        id: def.id,
        origin: new Vector3(0, 0, 0),
        normal: new Vector3(...def.normal),
        halfExtent: half,
      },
    });
  }
  return targets;
}

/**
 * Lift 2D sketch entities onto the Front (XY) plane in world space.
 * Scaffolding for 3D snap while the sketcher still draws in overlay space.
 */
export function sketchEntitiesToTargets(
  entities: SketchEntity[],
): InferenceTarget[] {
  const out: InferenceTarget[] = [];
  const to3 = (x: number, y: number) => new Vector3(x, y, 0);

  for (const e of entities) {
    switch (e.kind) {
      case "point":
        out.push({
          id: e.id,
          kind: "point",
          label: "Point",
          point: to3(e.position.x, e.position.y),
        });
        break;
      case "line":
        out.push(
          {
            id: `${e.id}:a`,
            kind: "endpoint",
            label: "Endpoint",
            point: to3(e.start.x, e.start.y),
          },
          {
            id: `${e.id}:b`,
            kind: "endpoint",
            label: "Endpoint",
            point: to3(e.end.x, e.end.y),
          },
          {
            id: `${e.id}:m`,
            kind: "midpoint",
            label: "Midpoint",
            point: to3(
              (e.start.x + e.end.x) * 0.5,
              (e.start.y + e.end.y) * 0.5,
            ),
          },
          {
            id: `${e.id}:curve`,
            kind: "curve",
            label: "Line",
            line: {
              start: to3(e.start.x, e.start.y),
              end: to3(e.end.x, e.end.y),
            },
          },
        );
        break;
      case "rectangle": {
        const { min, max } = e;
        const corners = [
          [min.x, min.y],
          [max.x, min.y],
          [max.x, max.y],
          [min.x, max.y],
        ] as const;
        for (let i = 0; i < 4; i++) {
          const a = corners[i];
          const b = corners[(i + 1) % 4];
          out.push({
            id: `${e.id}:c${i}`,
            kind: "endpoint",
            label: "Corner",
            point: to3(a[0], a[1]),
          });
          out.push({
            id: `${e.id}:e${i}`,
            kind: "curve",
            label: "Line",
            line: { start: to3(a[0], a[1]), end: to3(b[0], b[1]) },
          });
        }
        out.push({
          id: `${e.id}:center`,
          kind: "center",
          label: "Center",
          point: to3((min.x + max.x) * 0.5, (min.y + max.y) * 0.5),
        });
        break;
      }
      case "circle":
        out.push(
          {
            id: `${e.id}:center`,
            kind: "center",
            label: "Center",
            point: to3(e.center.x, e.center.y),
          },
          {
            id: `${e.id}:curve`,
            kind: "curve",
            label: "Circle",
            circle: {
              center: to3(e.center.x, e.center.y),
              normal: new Vector3(0, 0, 1),
              radius: e.radius,
            },
          },
        );
        break;
      default:
        break;
    }
  }
  return out;
}

/**
 * Pick the best snap under the cursor. Point-like snaps win over planes
 * when they sit within `INFERENCE_PIXEL_RADIUS`.
 */
export function resolveInference3D(query: InferenceQuery): InferenceHit | null {
  const { canvas, camera, targets, planeHalfExtent } = query;
  camera.updateMatrixWorld(true);
  const { rect } = setRayFromEvent(
    query.clientX,
    query.clientY,
    canvas,
    camera,
  );
  const cursor = new Vector2(
    query.clientX - rect.left,
    query.clientY - rect.top,
  );

  let best: InferenceHit | null = null;

  for (const target of targets) {
    let world: Vector3 | null = null;

    if (target.point) {
      rayClosestToPoint(target.point, _hit);
      world = target.point;
    } else if (target.line) {
      // Closest point on the ray to the segment, via plane hit + segment clamp.
      const { start, end } = target.line;
      // Intersect ray with the plane of the line (Front XY) then clamp.
      if (rayPlaneHit(_planeOrigin.set(0, 0, 0), _planeNormal.set(0, 0, 1), _hit)) {
        closestOnSegment(start, end, _hit, _tmp);
        world = _tmp.clone();
      }
    } else if (target.circle) {
      if (
        rayPlaneHit(
          target.circle.center,
          target.circle.normal,
          _hit,
        )
      ) {
        _tmp.copy(_hit).sub(target.circle.center);
        _tmp.projectOnPlane(target.circle.normal);
        const d = _tmp.length();
        if (d < 1e-8) {
          world = target.circle.center;
        } else {
          _tmp.multiplyScalar(target.circle.radius / d);
          world = _tmp2.copy(target.circle.center).add(_tmp).clone();
        }
      }
    } else if (target.plane) {
      const half = target.plane.halfExtent || planeHalfExtent;
      if (rayPlaneHit(target.plane.origin, target.plane.normal, _hit)) {
        if (inPlaneSquare(_hit, target.plane.origin, target.plane.normal, half)) {
          world = _hit.clone();
        }
      }
    }

    if (!world) continue;

    projectToScreen(world, camera, rect, _screen);
    const screenDistance = _screen.distanceTo(cursor);
    const isPlane = target.kind === "plane";
    if (!isPlane && screenDistance > INFERENCE_PIXEL_RADIUS) continue;

    const next: InferenceHit = { target, point: world, screenDistance };
    if (!best) {
      best = next;
      continue;
    }
    const pNew = PRIORITY[target.kind];
    const pOld = PRIORITY[best.target.kind];
    if (pNew < pOld) best = next;
    else if (pNew === pOld && screenDistance < best.screenDistance) best = next;
  }

  return best;
}

function makePointSprite(): Sprite {
  const canvas = document.createElement("canvas");
  canvas.width = 32;
  canvas.height = 32;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.clearRect(0, 0, 32, 32);
    ctx.strokeStyle = "#e85d04";
    ctx.lineWidth = 3;
    ctx.strokeRect(7, 7, 18, 18);
  }
  const tex = new CanvasTexture(canvas);
  const mat = new SpriteMaterial({
    map: tex,
    depthTest: false,
    depthWrite: false,
    transparent: true,
    sizeAttenuation: false,
  });
  const sprite = new Sprite(mat);
  sprite.scale.set(0.042, 0.042, 1);
  sprite.renderOrder = 30;
  sprite.frustumCulled = false;
  sprite.visible = false;
  return sprite;
}

/**
 * Raycaster-backed inferencing session. Call `query` from pointermove when a
 * sketch or mate tool is active; `overlay` is added to the Three.js scene.
 */
export class InferenceEngine {
  readonly overlay = new Group();
  readonly raycaster = _raycaster;

  private readonly pointCue: Sprite;
  private readonly lineCue: Line;
  private readonly lineGeo: BufferGeometry;
  private lastHit: InferenceHit | null = null;

  constructor() {
    this.overlay.name = "inferenceOverlay";
    this.pointCue = makePointSprite();
    this.lineGeo = new BufferGeometry().setFromPoints([
      new Vector3(),
      new Vector3(),
    ]);
    this.lineCue = new Line(
      this.lineGeo,
      new LineBasicMaterial({
        color: REFERENCE_ACCENT,
        depthTest: false,
        transparent: true,
        opacity: 1,
      }),
    );
    this.lineCue.renderOrder = 29;
    this.lineCue.frustumCulled = false;
    this.lineCue.visible = false;
    this.overlay.add(this.pointCue, this.lineCue);
  }

  last(): InferenceHit | null {
    return this.lastHit;
  }

  query(input: InferenceQuery): InferenceHit | null {
    const hit = resolveInference3D(input);
    this.show(hit);
    return hit;
  }

  show(hit: InferenceHit | null) {
    this.lastHit = hit;
    if (!hit) {
      this.pointCue.visible = false;
      this.lineCue.visible = false;
      return;
    }

    const isPoint =
      hit.target.kind === "origin" ||
      hit.target.kind === "point" ||
      hit.target.kind === "endpoint" ||
      hit.target.kind === "midpoint" ||
      hit.target.kind === "center";

    this.pointCue.visible = isPoint;
    if (isPoint) this.pointCue.position.copy(hit.point);

    if (hit.target.kind === "curve" && hit.target.line) {
      this.lineCue.visible = true;
      const pos = this.lineGeo.getAttribute("position");
      pos.setXYZ(0, hit.target.line.start.x, hit.target.line.start.y, hit.target.line.start.z);
      pos.setXYZ(1, hit.target.line.end.x, hit.target.line.end.y, hit.target.line.end.z);
      pos.needsUpdate = true;
    } else if (hit.target.kind === "curve" && hit.target.circle) {
      this.pointCue.visible = true;
      this.pointCue.position.copy(hit.point);
      this.lineCue.visible = false;
    } else {
      this.lineCue.visible = false;
    }
  }

  clear() {
    this.show(null);
  }

  dispose() {
    this.pointCue.material.map?.dispose();
    this.pointCue.material.dispose();
    this.lineGeo.dispose();
    (this.lineCue.material as LineBasicMaterial).dispose();
    this.overlay.removeFromParent();
  }
}

/**
 * World-space snap radius matching `INFERENCE_PIXEL_RADIUS` at the camera.
 * Useful if a caller wants a 3D threshold instead of screen-space.
 */
export function worldSnapRadius(
  camera: Camera,
  canvasHeight: number,
  focus = new Vector3(),
): number {
  const height = visibleWorldHeight(camera, focus);
  return (INFERENCE_PIXEL_RADIUS / Math.max(canvasHeight, 1)) * height;
}

export function isPerspective(camera: Camera): camera is PerspectiveCamera {
  return (camera as PerspectiveCamera).isPerspectiveCamera === true;
}

export function isOrthographic(camera: Camera): camera is OrthographicCamera {
  return (camera as OrthographicCamera).isOrthographicCamera === true;
}
