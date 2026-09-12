/**
 * Instant 2D → 3D bridge: extrude board outline and place component bounding
 * boxes into a Three.js Group whenever the PCB canvas state updates.
 */

import {
  BoxGeometry,
  BufferGeometry,
  DoubleSide,
  ExtrudeGeometry,
  Group,
  Mesh,
  MeshStandardMaterial,
  Shape,
  Vector2,
  type Material,
} from "three";
import type {
  BoardOutline,
  PcbComponent,
  PcbTrace,
  RigidFlexWorkflow,
} from "../store/pcbTypes";

export interface PcbScene3DInput {
  outline: BoardOutline;
  components: PcbComponent[];
  traces: PcbTrace[];
  rigidFlex: RigidFlexWorkflow;
  /** Monotonic revision from the PCB store — drives rebuilds. */
  revision: number;
}

export interface PcbScene3DResult {
  root: Group;
  revision: number;
  boardMesh: Mesh;
  componentCount: number;
  traceCount: number;
}

const BOARD_MAT = () =>
  new MeshStandardMaterial({
    color: "#1a5c38",
    metalness: 0.05,
    roughness: 0.85,
    side: DoubleSide,
  });

const COPPER_MAT = () =>
  new MeshStandardMaterial({
    color: "#c45c26",
    metalness: 0.7,
    roughness: 0.35,
  });

function disposeObject(obj: Group | Mesh): void {
  obj.traverse((child) => {
    const mesh = child as Mesh;
    if (mesh.geometry) mesh.geometry.dispose();
    const mat = mesh.material as Material | Material[] | undefined;
    if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
    else mat?.dispose();
  });
}

function outlineToShape(outline: BoardOutline): Shape {
  const shape = new Shape();
  const pts = outline.points;
  if (pts.length < 3) {
    shape.moveTo(0, 0);
    shape.lineTo(10, 0);
    shape.lineTo(10, 10);
    shape.lineTo(0, 10);
    shape.closePath();
    return shape;
  }
  shape.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) {
    shape.lineTo(pts[i].x, pts[i].y);
  }
  shape.closePath();
  return shape;
}

function extrudeBoard(outline: BoardOutline): Mesh {
  const shape = outlineToShape(outline);
  const geo = new ExtrudeGeometry(shape, {
    depth: outline.thicknessMm,
    bevelEnabled: false,
  });
  // Extrude along +Z; board sits with top copper near z = thickness.
  geo.rotateX(-Math.PI / 2);
  const mesh = new Mesh(geo, BOARD_MAT());
  mesh.name = "pcb_board";
  mesh.position.set(0, 0, 0);
  return mesh;
}

function componentBox(comp: PcbComponent, boardThickness: number): Mesh {
  const geo = new BoxGeometry(comp.widthMm, comp.height3dMm, comp.heightMm);
  const mat = new MeshStandardMaterial({
    color: comp.color,
    metalness: 0.2,
    roughness: 0.55,
    transparent: true,
    opacity: 0.92,
  });
  const mesh = new Mesh(geo, mat);
  mesh.name = `pcb_comp_${comp.designator}`;
  const y =
    comp.layer === "top"
      ? boardThickness + comp.height3dMm / 2
      : -comp.height3dMm / 2;
  mesh.position.set(comp.x, y, -comp.y);
  mesh.rotation.y = (comp.rotationDeg * Math.PI) / 180;
  return mesh;
}

/** Thin copper ribbon along a trace polyline (box segments). */
function traceMeshes(
  traces: PcbTrace[],
  boardThickness: number,
): Mesh[] {
  const meshes: Mesh[] = [];
  const mat = COPPER_MAT();
  for (const trace of traces) {
    if (trace.draft || trace.vertices.length < 2) continue;
    const zLift =
      trace.layer === "bottomCopper" ? 0.02 : boardThickness + 0.02;
    for (let i = 1; i < trace.vertices.length; i++) {
      const a = trace.vertices[i - 1];
      const b = trace.vertices[i];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const len = Math.hypot(dx, dy);
      if (len < 1e-6) continue;
      const geo = new BoxGeometry(len, 0.035, Math.max(trace.widthMm, 0.15));
      const mesh = new Mesh(geo, mat.clone());
      mesh.name = `pcb_trace_${trace.id}_${i}`;
      const mx = (a.x + b.x) / 2;
      const my = (a.y + b.y) / 2;
      mesh.position.set(mx, zLift, -my);
      mesh.rotation.y = -Math.atan2(dy, dx);
      meshes.push(mesh);
    }
  }
  return meshes;
}

function flexBendGuides(rigidFlex: RigidFlexWorkflow): Mesh[] {
  if (!rigidFlex.enabled) return [];
  const guides: Mesh[] = [];
  for (const region of rigidFlex.regions) {
    if (region.kind !== "flex" || !region.bendLine) continue;
    const { a, b } = region.bendLine;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len = Math.hypot(dx, dy) || 1;
    const geo = new BoxGeometry(len, 0.05, 0.4);
    const mat = new MeshStandardMaterial({
      color: "#f59e0b",
      emissive: "#f59e0b",
      emissiveIntensity: 0.25,
      metalness: 0.1,
      roughness: 0.6,
    });
    const mesh = new Mesh(geo, mat);
    mesh.name = `pcb_bend_${region.id}`;
    mesh.position.set((a.x + b.x) / 2, 0.9, -((a.y + b.y) / 2));
    mesh.rotation.y = -Math.atan2(dy, dx);
    guides.push(mesh);
  }
  return guides;
}

/**
 * Build (or rebuild) a Three.js group from the current 2D PCB state.
 * Caller owns the previous root and should dispose it after swap.
 */
export function pcbTo3D(input: PcbScene3DInput): PcbScene3DResult {
  const root = new Group();
  root.name = "pcb_scene_3d";
  root.userData.revision = input.revision;

  const boardMesh = extrudeBoard(input.outline);
  root.add(boardMesh);

  for (const comp of input.components) {
    root.add(componentBox(comp, input.outline.thicknessMm));
  }

  for (const mesh of traceMeshes(input.traces, input.outline.thicknessMm)) {
    root.add(mesh);
  }

  for (const guide of flexBendGuides(input.rigidFlex)) {
    root.add(guide);
  }

  // Center-ish origin helper: shift so board centroid is near origin.
  const pts = input.outline.points;
  if (pts.length > 0) {
    const cx = pts.reduce((s, p) => s + p.x, 0) / pts.length;
    const cy = pts.reduce((s, p) => s + p.y, 0) / pts.length;
    root.position.set(-cx, 0, cy);
  }

  return {
    root,
    revision: input.revision,
    boardMesh,
    componentCount: input.components.length,
    traceCount: input.traces.filter((t) => !t.draft).length,
  };
}

/** Dispose a previously built PCB 3D root. */
export function disposePcb3D(root: Group | null): void {
  if (!root) return;
  disposeObject(root);
  root.clear();
}

/** Utility: outline as XY Vector2 ring (for future Shape ops). */
export function outlineAsVector2(outline: BoardOutline): Vector2[] {
  return outline.points.map((p) => new Vector2(p.x, p.y));
}

export type { BufferGeometry };
