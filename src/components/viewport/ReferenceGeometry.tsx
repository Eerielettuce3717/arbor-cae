import {
  BufferGeometry,
  CanvasTexture,
  Color,
  DoubleSide,
  Float32BufferAttribute,
  Group,
  Line,
  LineBasicMaterial,
  LineLoop,
  Mesh,
  MeshBasicMaterial,
  OrthographicCamera,
  PerspectiveCamera,
  SphereGeometry,
  Sprite,
  SpriteMaterial,
  Vector3,
  type Camera,
} from "three";

/** OSHA / Haas orange — the only accent in the viewport. */
export const REFERENCE_ACCENT = 0xe85d04;
const PLANE_FILL = 0x1c222b;
const PLANE_EDGE = 0x4a5560;
const ORIGIN_CORE = 0xf3eee6;

/** Local-space half-extent of each default plane before camera scaling. */
export const REFERENCE_PLANE_SIZE = 1;

export const DATUM_COLORS = {
  x: 0xc43c2c,
  y: 0x3d8b4a,
  z: 0x3a6ea5,
  front: PLANE_FILL,
  top: PLANE_FILL,
  right: PLANE_FILL,
} as const;

export type ReferencePlaneId = "front" | "top" | "right";

export const REFERENCE_PLANES: {
  id: ReferencePlaneId;
  label: "Front" | "Top" | "Right";
  /** World-space unit normal (Y-up: Front +Z, Top +Y, Right +X). */
  normal: [number, number, number];
}[] = [
  { id: "front", label: "Front", normal: [0, 0, 1] },
  { id: "top", label: "Top", normal: [0, 1, 0] },
  { id: "right", label: "Right", normal: [1, 0, 0] },
];

interface PlaneRecord {
  id: ReferencePlaneId;
  label: string;
  mesh: Mesh;
  edge: LineLoop;
  edgeMat: LineBasicMaterial;
  fillMat: MeshBasicMaterial;
  normal: Vector3;
}

function axisLine(from: Vector3, to: Vector3, color: number): Line {
  const geo = new BufferGeometry().setFromPoints([from, to]);
  const mat = new LineBasicMaterial({
    color,
    depthTest: false,
    transparent: true,
    opacity: 0.95,
  });
  const line = new Line(geo, mat);
  line.renderOrder = 6;
  line.frustumCulled = false;
  return line;
}

function makePlaneGeometry(half: number): BufferGeometry {
  const geo = new BufferGeometry();
  const verts = new Float32Array([
    -half, -half, 0, half, -half, 0, half, half, 0,
    -half, -half, 0, half, half, 0, -half, half, 0,
  ]);
  geo.setAttribute("position", new Float32BufferAttribute(verts, 3));
  geo.computeVertexNormals();
  return geo;
}

function makeLabelSprite(text: string): Sprite {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 64;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.clearRect(0, 0, 256, 64);
    ctx.font = "600 36px 'Space Grotesk', 'IBM Plex Sans', sans-serif";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#8b949e";
    ctx.fillText(text, 8, 32);
  }
  const tex = new CanvasTexture(canvas);
  tex.needsUpdate = true;
  const mat = new SpriteMaterial({
    map: tex,
    depthTest: false,
    depthWrite: false,
    transparent: true,
    sizeAttenuation: false,
  });
  const sprite = new Sprite(mat);
  sprite.scale.set(0.092, 0.023, 1);
  sprite.center.set(0, 0.5);
  sprite.renderOrder = 8;
  sprite.frustumCulled = false;
  return sprite;
}

/**
 * World height of the view at `focus` — used so planes stay a constant
 * fraction of the screen as the camera zooms.
 */
export function visibleWorldHeight(camera: Camera, focus: Vector3): number {
  if ((camera as OrthographicCamera).isOrthographicCamera) {
    const cam = camera as OrthographicCamera;
    return (cam.top - cam.bottom) / Math.max(cam.zoom, 1e-6);
  }
  const cam = camera as PerspectiveCamera;
  const dist = Math.max(camera.position.distanceTo(focus), 1e-4);
  const vFov = (cam.fov * Math.PI) / 180;
  return 2 * Math.tan(vFov * 0.5) * dist;
}

/**
 * Origin triad + Front / Top / Right planes.
 *
 * Planes: translucent mill-control gray, 1px edge that goes orange on hover.
 * The whole group auto-scales from camera zoom so the datums stay pickable.
 */
export class ReferenceGeometry {
  readonly root = new Group();
  readonly pickables: Mesh[] = [];

  private readonly planes = new Map<ReferencePlaneId, PlaneRecord>();
  private readonly originMesh: Mesh;
  private hovered: ReferencePlaneId | null = null;
  private readonly focus = new Vector3();

  constructor() {
    this.root.name = "referenceGeometry";

    const half = REFERENCE_PLANE_SIZE / 2;

    for (const def of REFERENCE_PLANES) {
      const fillMat = new MeshBasicMaterial({
        color: PLANE_FILL,
        transparent: true,
        opacity: 0.16,
        side: DoubleSide,
        depthWrite: false,
      });
      const mesh = new Mesh(makePlaneGeometry(half), fillMat);
      mesh.name = `plane-${def.id}`;
      mesh.renderOrder = 1;
      mesh.userData.snapKind = "plane";
      mesh.userData.snapId = def.id;
      mesh.userData.label = def.label;

      if (def.id === "top") mesh.rotation.x = -Math.PI / 2;
      if (def.id === "right") mesh.rotation.y = Math.PI / 2;

      const edgeMat = new LineBasicMaterial({
        color: PLANE_EDGE,
        transparent: true,
        opacity: 0.85,
        depthTest: false,
      });
      const edge = new LineLoop(
        new BufferGeometry().setFromPoints([
          new Vector3(-half, -half, 0),
          new Vector3(half, -half, 0),
          new Vector3(half, half, 0),
          new Vector3(-half, half, 0),
        ]),
        edgeMat,
      );
      edge.renderOrder = 4;
      edge.frustumCulled = false;
      mesh.add(edge);

      const label = makeLabelSprite(def.label.toUpperCase());
      label.position.set(half * 0.78, half * 0.78, 0);
      mesh.add(label);

      this.root.add(mesh);
      this.pickables.push(mesh);
      this.planes.set(def.id, {
        id: def.id,
        label: def.label,
        mesh,
        edge,
        edgeMat,
        fillMat,
        normal: new Vector3(...def.normal),
      });
    }

    const axisLen = REFERENCE_PLANE_SIZE * 0.42;
    this.root.add(
      axisLine(new Vector3(0, 0, 0), new Vector3(axisLen, 0, 0), DATUM_COLORS.x),
      axisLine(new Vector3(0, 0, 0), new Vector3(0, axisLen, 0), DATUM_COLORS.y),
      axisLine(new Vector3(0, 0, 0), new Vector3(0, 0, axisLen), DATUM_COLORS.z),
    );

    const originMat = new MeshBasicMaterial({
      color: ORIGIN_CORE,
      depthTest: false,
    });
    this.originMesh = new Mesh(new SphereGeometry(0.035, 16, 12), originMat);
    this.originMesh.name = "origin";
    this.originMesh.renderOrder = 7;
    this.originMesh.userData.snapKind = "origin";
    this.originMesh.userData.snapId = "origin";
    this.originMesh.userData.label = "Origin";
    this.root.add(this.originMesh);
    this.pickables.push(this.originMesh);

    const ringGeo = new BufferGeometry().setFromPoints(
      circlePoints(0.055, 28),
    );
    const ring = new LineLoop(
      ringGeo,
      new LineBasicMaterial({
        color: REFERENCE_ACCENT,
        depthTest: false,
        transparent: true,
        opacity: 0.95,
      }),
    );
    ring.renderOrder = 8;
    ring.frustumCulled = false;
    this.originMesh.add(ring);
  }

  setHoveredPlane(id: ReferencePlaneId | null) {
    if (this.hovered === id) return;
    this.hovered = id;
    for (const rec of this.planes.values()) {
      const hot = rec.id === id;
      rec.edgeMat.color.setHex(hot ? REFERENCE_ACCENT : PLANE_EDGE);
      rec.edgeMat.opacity = hot ? 1 : 0.85;
      rec.fillMat.opacity = hot ? 0.28 : 0.16;
      rec.fillMat.color.setHex(hot ? 0x2a2118 : PLANE_FILL);
    }
  }

  hoveredPlane(): ReferencePlaneId | null {
    return this.hovered;
  }

  /**
   * Keep planes at ~30% of the current view height so they never vanish
   * when zooming, and never swallow the model when zoomed out.
   */
  updateScale(camera: Camera, focus?: Vector3) {
    if (focus) this.focus.copy(focus);
    const height = visibleWorldHeight(camera, this.focus);
    const worldSize = Math.max(height * 0.3, 0.08);
    const s = worldSize / REFERENCE_PLANE_SIZE;
    this.root.scale.setScalar(s);
    // Origin dot stays a readable screen size; counteract group scale a little.
    const originKeep = Math.min(1.15, Math.max(0.55, 0.22 / s));
    this.originMesh.scale.setScalar(originKeep);
  }

  planeWorldSize(): number {
    return REFERENCE_PLANE_SIZE * this.root.scale.x;
  }

  dispose() {
    this.root.traverse((obj) => {
      const mesh = obj as Mesh;
      mesh.geometry?.dispose();
      const mat = mesh.material;
      if (Array.isArray(mat)) {
        for (const m of mat) disposeMaterial(m);
      } else if (mat) {
        disposeMaterial(mat);
      }
    });
    this.root.removeFromParent();
    this.planes.clear();
    this.pickables.length = 0;
  }
}

function disposeMaterial(mat: { dispose: () => void; map?: CanvasTexture | null }) {
  mat.map?.dispose();
  mat.dispose();
}

function circlePoints(radius: number, segments: number): Vector3[] {
  const pts: Vector3[] = [];
  for (let i = 0; i < segments; i++) {
    const a = (i / segments) * Math.PI * 2;
    pts.push(new Vector3(Math.cos(a) * radius, Math.sin(a) * radius, 0));
  }
  return pts;
}

/**
 * Drop-in replacement for the older RGB datum factory.
 * Prefer `ReferenceGeometry` when hover / auto-scale are needed.
 */
export function createDatumGroup(): Group {
  return new ReferenceGeometry().root;
}

/** @deprecated Use REFERENCE_ACCENT */
export const ACCENT = new Color(REFERENCE_ACCENT);
