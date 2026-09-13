/**
 * Fusion-style Form Workspace: quad control cage + TransformControls gizmo
 * + live Catmull-Clark smooth preview under the cage.
 */

import {
  BufferGeometry,
  Color,
  DoubleSide,
  Float32BufferAttribute,
  Group,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  MeshStandardMaterial,
  Object3D,
  Raycaster,
  SphereGeometry,
  Vector2,
  Vector3,
  type Camera,
  type Material,
} from "three";
import { TransformControls } from "three/examples/jsm/controls/TransformControls.js";
import type { OnshapeControls } from "../components/viewport/controls/OnshapeControls";
import {
  averageVec3,
  cloneQuadMesh,
  createBoxCage,
  flattenVertices,
  quadMeshToTriangleBuffers,
  subdivideCatmullClark,
  unflattenVertices,
  type QuadMesh,
  type Vec3,
} from "../utils/subdivision";

export type CageSelectionKind = "vertex" | "edge" | "face";

export interface CageSelection {
  kind: CageSelectionKind;
  /** Vertex indices involved in the selection. */
  indices: number[];
}

export type GizmoMode = "translate" | "rotate" | "scale";

export interface FormWorkspaceOptions {
  scene: Object3D;
  camera: Camera;
  domElement: HTMLElement;
  orbitControls: OnshapeControls;
  size?: number;
  levels?: number;
  cageVertices?: number[];
  onCageChanged?: (flatVertices: number[]) => void;
  onStatus?: (message: string) => void;
}

export class FormWorkspace {
  readonly root = new Group();
  private cageMesh: QuadMesh;
  private levels: number;
  private smoothMesh: Mesh | null = null;
  private cageLines: LineSegments | null = null;
  private cageFacesMesh: Mesh | null = null;
  private vertexHandles: Mesh[] = [];
  private pickables: Object3D[] = [];
  private transform: TransformControls;
  private pivot = new Object3D();
  private selection: CageSelection | null = null;
  private selectionRest: Vec3[] = [];
  private raycaster = new Raycaster();
  private pointer = new Vector2();
  private camera: Camera;
  private domElement: HTMLElement;
  private orbitControls: OnshapeControls;
  private onCageChanged?: (flatVertices: number[]) => void;
  private onStatus?: (message: string) => void;
  private dragging = false;
  private disposed = false;

  private onPointerDown = (e: PointerEvent) => this.handlePointerDown(e);
  private onKeyDown = (e: KeyboardEvent) => this.handleKeyDown(e);

  constructor(options: FormWorkspaceOptions) {
    this.camera = options.camera;
    this.domElement = options.domElement;
    this.orbitControls = options.orbitControls;
    this.onCageChanged = options.onCageChanged;
    this.onStatus = options.onStatus;
    this.levels = options.levels ?? 2;

    const size = options.size ?? 20;
    if (options.cageVertices && options.cageVertices.length >= 24) {
      const box = createBoxCage(size);
      box.vertices = unflattenVertices(options.cageVertices);
      this.cageMesh = box;
    } else {
      this.cageMesh = createBoxCage(size);
    }

    this.root.name = "formWorkspace";
    options.scene.add(this.root);
    this.root.add(this.pivot);

    this.transform = new TransformControls(this.camera, this.domElement);
    this.transform.setSize(0.85);
    this.transform.setMode("translate");
    this.transform.addEventListener("dragging-changed", (event) => {
      const dragging = Boolean(
        (event as unknown as { value: boolean }).value,
      );
      this.dragging = dragging;
      this.orbitControls.enabled = !dragging;
      if (!dragging) {
        this.commitSelectionTransform();
        this.onCageChanged?.(flattenVertices(this.cageMesh.vertices));
      } else {
        this.captureSelectionRest();
      }
    });
    this.transform.addEventListener("objectChange", () => {
      if (!this.dragging) return;
      this.applyPivotToSelection();
      this.rebuildGeometry(false);
    });
    // TransformControls is an Object3D helper in recent three versions.
    this.root.add(this.transform.getHelper());

    this.rebuildGeometry(true);
    this.domElement.addEventListener("pointerdown", this.onPointerDown);
    window.addEventListener("keydown", this.onKeyDown);
    this.onStatus?.(
      "Form Workspace · click vertex / edge / face · W/E/R gizmo · Subdiv live",
    );
  }

  setCamera(camera: Camera) {
    this.camera = camera;
    this.transform.camera = camera;
  }

  setLevels(levels: number) {
    this.levels = Math.max(0, Math.min(4, Math.floor(levels)));
    this.rebuildGeometry(false);
    this.onStatus?.(
      `Form Workspace · Catmull-Clark level ${this.levels}`,
    );
  }

  getLevels(): number {
    return this.levels;
  }

  getCageFlat(): number[] {
    return flattenVertices(this.cageMesh.vertices);
  }

  setGizmoMode(mode: GizmoMode) {
    this.transform.setMode(mode);
    this.onStatus?.(`Gizmo · ${mode}`);
  }

  clearSelection() {
    this.transform.detach();
    this.selection = null;
    this.highlightSelection(null);
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.domElement.removeEventListener("pointerdown", this.onPointerDown);
    window.removeEventListener("keydown", this.onKeyDown);
    this.transform.detach();
    this.transform.dispose();
    this.root.parent?.remove(this.root);
    this.disposeCageVisuals();
  }

  private handleKeyDown(e: KeyboardEvent) {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
      return;
    }
    if (e.key === "w" || e.key === "W") this.setGizmoMode("translate");
    if (e.key === "e" || e.key === "E") this.setGizmoMode("rotate");
    if (e.key === "r" || e.key === "R") this.setGizmoMode("scale");
    if (e.key === "Escape") this.clearSelection();
  }

  private handlePointerDown(e: PointerEvent) {
    if (e.button !== 0 || this.dragging) return;
    // Ignore clicks on the gizmo itself.
    if (this.transform.dragging) return;

    const rect = this.domElement.getBoundingClientRect();
    this.pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.pointer, this.camera);

    const hits = this.raycaster.intersectObjects(this.pickables, true);
    if (hits.length === 0) {
      this.clearSelection();
      return;
    }

    const obj = hits[0].object;
    const kind = obj.userData.cageKind as CageSelectionKind | undefined;
    if (!kind) return;

    e.stopPropagation();

    if (kind === "vertex") {
      this.select({ kind: "vertex", indices: [obj.userData.vertexIndex as number] });
    } else if (kind === "edge") {
      this.select({
        kind: "edge",
        indices: [...(obj.userData.edgeIndices as number[])],
      });
    } else if (kind === "face") {
      const faceIndex = obj.userData.faceIndex as number;
      const face = this.cageMesh.faces[faceIndex];
      this.select({ kind: "face", indices: [...face] });
    }
  }

  private select(sel: CageSelection) {
    this.selection = sel;
    this.highlightSelection(sel);
    const center = averageVec3(
      sel.indices.map((i) => this.cageMesh.vertices[i]),
    );
    this.pivot.position.set(center.x, center.y, center.z);
    this.pivot.rotation.set(0, 0, 0);
    this.pivot.scale.set(1, 1, 1);
    this.pivot.updateMatrixWorld(true);
    this.transform.attach(this.pivot);
    this.onStatus?.(
      `Selected ${sel.kind} · ${sel.indices.length} vert(s) · W/E/R to change gizmo`,
    );
  }

  private captureSelectionRest() {
    if (!this.selection) return;
    this.selectionRest = this.selection.indices.map((i) => ({
      ...this.cageMesh.vertices[i],
    }));
  }

  private applyPivotToSelection() {
    if (!this.selection || this.selectionRest.length === 0) return;
    this.pivot.updateMatrixWorld(true);
    const m = this.pivot.matrixWorld;
    const center = averageVec3(this.selectionRest);
    const v = new Vector3();

    for (let i = 0; i < this.selection.indices.length; i++) {
      const rest = this.selectionRest[i];
      // Local offset from selection center at drag start → apply pivot transform.
      v.set(rest.x - center.x, rest.y - center.y, rest.z - center.z);
      v.applyMatrix4(m);
      const vi = this.selection.indices[i];
      this.cageMesh.vertices[vi] = { x: v.x, y: v.y, z: v.z };
    }
  }

  private commitSelectionTransform() {
    if (!this.selection) return;
    this.applyPivotToSelection();
    // Reset pivot to new center without residual rotation/scale.
    const center = averageVec3(
      this.selection.indices.map((i) => this.cageMesh.vertices[i]),
    );
    this.pivot.position.set(center.x, center.y, center.z);
    this.pivot.rotation.set(0, 0, 0);
    this.pivot.scale.set(1, 1, 1);
    this.selectionRest = [];
    this.rebuildGeometry(true);
  }

  private rebuildGeometry(rebuildPickables: boolean) {
    this.disposeCageVisuals(rebuildPickables);

    // Smooth Catmull-Clark preview.
    const smooth = subdivideCatmullClark(this.cageMesh, this.levels);
    const buffers = quadMeshToTriangleBuffers(smooth);
    const geo = new BufferGeometry();
    geo.setAttribute(
      "position",
      new Float32BufferAttribute(buffers.positions, 3),
    );
    geo.setAttribute("normal", new Float32BufferAttribute(buffers.normals, 3));
    geo.setIndex(Array.from(buffers.indices));
    const mat = new MeshStandardMaterial({
      color: new Color("#6ea8fe"),
      metalness: 0.2,
      roughness: 0.4,
      side: DoubleSide,
      transparent: true,
      opacity: 0.92,
    });
    this.smoothMesh = new Mesh(geo, mat);
    this.smoothMesh.name = "sculptSmooth";
    this.smoothMesh.userData.partId = "sculpt-form";
    this.root.add(this.smoothMesh);

    // Control cage wireframe.
    const cageLineGeo = this.buildCageLineGeometry(this.cageMesh);
    this.cageLines = new LineSegments(
      cageLineGeo,
      new LineBasicMaterial({
        color: 0xf8fafc,
        transparent: true,
        opacity: 0.95,
      }),
    );
    this.cageLines.name = "sculptCageLines";
    this.root.add(this.cageLines);

    // Invisible face pick mesh + subtle translucent cage faces.
    const faceGeo = this.buildCageFaceGeometry(this.cageMesh);
    this.cageFacesMesh = new Mesh(
      faceGeo,
      new MeshStandardMaterial({
        color: new Color("#94a3b8"),
        metalness: 0,
        roughness: 1,
        side: DoubleSide,
        transparent: true,
        opacity: 0.12,
        depthWrite: false,
      }),
    );
    this.cageFacesMesh.name = "sculptCageFaces";
    this.root.add(this.cageFacesMesh);

    if (rebuildPickables) {
      this.pickables = [];
      this.vertexHandles = [];

      // Vertex spheres — one shared geometry; dispose once after handles are removed.
      const sphere = new SphereGeometry(0.45, 12, 12);
      sphere.userData.sharedGeometry = true;
      const handleMat = new MeshStandardMaterial({
        color: new Color("#fbbf24"),
        emissive: new Color("#78350f"),
        emissiveIntensity: 0.35,
        metalness: 0.1,
        roughness: 0.5,
      });
      for (let i = 0; i < this.cageMesh.vertices.length; i++) {
        const v = this.cageMesh.vertices[i];
        const handle = new Mesh(sphere, handleMat.clone());
        handle.userData.sharedGeometry = true;
        handle.position.set(v.x, v.y, v.z);
        handle.userData.cageKind = "vertex";
        handle.userData.vertexIndex = i;
        handle.name = `cageVert_${i}`;
        this.root.add(handle);
        this.vertexHandles.push(handle);
        this.pickables.push(handle);
      }

      // Edge pick cylinders approximated as thick line segments via invisible tubes (use line hit via fat points — use mid spheres).
      for (const face of this.cageMesh.faces) {
        const n = face.length;
        for (let i = 0; i < n; i++) {
          const a = face[i];
          const b = face[(i + 1) % n];
          if (a > b) continue; // unique edges
          const va = this.cageMesh.vertices[a];
          const vb = this.cageMesh.vertices[b];
          const mid = averageVec3([va, vb]);
          const edgeHandle = new Mesh(
            new SphereGeometry(0.32, 10, 10),
            new MeshStandardMaterial({
              color: new Color("#e85d04"),
              transparent: true,
              opacity: 0.85,
            }),
          );
          edgeHandle.position.set(mid.x, mid.y, mid.z);
          edgeHandle.userData.cageKind = "edge";
          edgeHandle.userData.edgeIndices = [a, b];
          edgeHandle.name = `cageEdge_${a}_${b}`;
          this.root.add(edgeHandle);
          this.pickables.push(edgeHandle);
        }
      }

      // Face centers for picking.
      this.cageMesh.faces.forEach((face, fi) => {
        const center = averageVec3(face.map((i) => this.cageMesh.vertices[i]));
        const faceHandle = new Mesh(
          new SphereGeometry(0.38, 10, 10),
          new MeshStandardMaterial({
            color: new Color("#e85d04"),
            transparent: true,
            opacity: 0.75,
          }),
        );
        faceHandle.position.set(center.x, center.y, center.z);
        faceHandle.userData.cageKind = "face";
        faceHandle.userData.faceIndex = fi;
        faceHandle.name = `cageFace_${fi}`;
        this.root.add(faceHandle);
        this.pickables.push(faceHandle);
      });
    } else {
      // Update handle positions only.
      for (let i = 0; i < this.vertexHandles.length; i++) {
        const v = this.cageMesh.vertices[i];
        this.vertexHandles[i].position.set(v.x, v.y, v.z);
      }
      for (const obj of this.pickables) {
        const kind = obj.userData.cageKind as CageSelectionKind;
        if (kind === "edge") {
          const [a, b] = obj.userData.edgeIndices as number[];
          const mid = averageVec3([
            this.cageMesh.vertices[a],
            this.cageMesh.vertices[b],
          ]);
          obj.position.set(mid.x, mid.y, mid.z);
        } else if (kind === "face") {
          const fi = obj.userData.faceIndex as number;
          const face = this.cageMesh.faces[fi];
          const center = averageVec3(face.map((i) => this.cageMesh.vertices[i]));
          obj.position.set(center.x, center.y, center.z);
        }
      }
    }

    this.highlightSelection(this.selection);
  }

  private highlightSelection(sel: CageSelection | null) {
    for (const obj of this.pickables) {
      const mat = (obj as Mesh).material as MeshStandardMaterial;
      const kind = obj.userData.cageKind as CageSelectionKind;
      let selected = false;
      if (sel) {
        if (kind === "vertex" && sel.kind === "vertex") {
          selected = sel.indices.includes(obj.userData.vertexIndex as number);
        } else if (kind === "edge" && sel.kind === "edge") {
          const ids = obj.userData.edgeIndices as number[];
          selected =
            ids.length === sel.indices.length &&
            ids.every((id) => sel.indices.includes(id));
        } else if (kind === "face" && sel.kind === "face") {
          const fi = obj.userData.faceIndex as number;
          const face = this.cageMesh.faces[fi];
          selected =
            face.length === sel.indices.length &&
            face.every((id) => sel.indices.includes(id));
        }
      }
      mat.emissive = new Color(selected ? "#f59e0b" : "#000000");
      mat.emissiveIntensity = selected ? 0.8 : kind === "vertex" ? 0.35 : 0;
      mat.needsUpdate = true;
    }
  }

  private buildCageLineGeometry(mesh: QuadMesh): BufferGeometry {
    const positions: number[] = [];
    const seen = new Set<string>();
    for (const face of mesh.faces) {
      const n = face.length;
      for (let i = 0; i < n; i++) {
        const a = face[i];
        const b = face[(i + 1) % n];
        const key = a < b ? `${a}_${b}` : `${b}_${a}`;
        if (seen.has(key)) continue;
        seen.add(key);
        const va = mesh.vertices[a];
        const vb = mesh.vertices[b];
        positions.push(va.x, va.y, va.z, vb.x, vb.y, vb.z);
      }
    }
    const geo = new BufferGeometry();
    geo.setAttribute("position", new Float32BufferAttribute(positions, 3));
    return geo;
  }

  private buildCageFaceGeometry(mesh: QuadMesh): BufferGeometry {
    const buffers = quadMeshToTriangleBuffers(mesh);
    const geo = new BufferGeometry();
    geo.setAttribute(
      "position",
      new Float32BufferAttribute(buffers.positions, 3),
    );
    geo.setAttribute("normal", new Float32BufferAttribute(buffers.normals, 3));
    geo.setIndex(Array.from(buffers.indices));
    return geo;
  }

  private disposeCageVisuals(clearPickables = true) {
    const remove = (obj: Object3D | null) => {
      if (!obj) return;
      this.root.remove(obj);
      disposeObject(obj);
    };
    remove(this.smoothMesh);
    remove(this.cageLines);
    remove(this.cageFacesMesh);
    this.smoothMesh = null;
    this.cageLines = null;
    this.cageFacesMesh = null;

    if (clearPickables) {
      let sharedGeo: { dispose: () => void } | null = null;
      for (const h of this.pickables) {
        this.root.remove(h);
        const mesh = h as Mesh;
        if (mesh.userData.sharedGeometry && mesh.geometry) {
          sharedGeo = mesh.geometry;
        }
        disposeObject(h, { skipSharedGeometry: true });
      }
      sharedGeo?.dispose();
      this.pickables = [];
      this.vertexHandles = [];
    }
  }
}

function disposeObject(
  root: Object3D,
  opts?: { skipSharedGeometry?: boolean },
) {
  root.traverse((obj) => {
    const mesh = obj as Mesh;
    if (mesh.geometry) {
      if (!(opts?.skipSharedGeometry && mesh.userData.sharedGeometry)) {
        mesh.geometry.dispose();
      }
    }
    const mat = mesh.material as Material | Material[] | undefined;
    if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
    else mat?.dispose();
  });
}

export function defaultSculptCageFlat(size = 20): number[] {
  return flattenVertices(createBoxCage(size).vertices);
}

export function sculptMeshFromParams(params: {
  size?: number;
  levels?: number;
  cageVertices?: number[];
}): ReturnType<typeof quadMeshToTriangleBuffers> {
  const size = Number(params.size) || 20;
  let cage = createBoxCage(size);
  if (params.cageVertices && params.cageVertices.length >= 24) {
    cage = cloneQuadMesh(cage);
    cage.vertices = unflattenVertices(params.cageVertices);
  }
  const levels = Number(params.levels) || 2;
  return quadMeshToTriangleBuffers(subdivideCatmullClark(cage, levels));
}
