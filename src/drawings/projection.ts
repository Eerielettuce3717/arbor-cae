/** 2D drawing projection & dimension math (sheet space in mm). */

export type Vec2 = { x: number; y: number };
export type Vec3 = { x: number; y: number; z: number };

export type ViewOrientation =
  | "front"
  | "top"
  | "right"
  | "left"
  | "bottom"
  | "back"
  | "iso";

/** Orthographic projection matrices (3×2) for standard views. */
const ORTHO: Record<ViewOrientation, [Vec3, Vec3]> = {
  front: [
    { x: 1, y: 0, z: 0 },
    { x: 0, y: 1, z: 0 },
  ],
  top: [
    { x: 1, y: 0, z: 0 },
    { x: 0, y: 0, z: -1 },
  ],
  right: [
    { x: 0, y: 0, z: -1 },
    { x: 0, y: 1, z: 0 },
  ],
  left: [
    { x: 0, y: 0, z: 1 },
    { x: 0, y: 1, z: 0 },
  ],
  bottom: [
    { x: 1, y: 0, z: 0 },
    { x: 0, y: 0, z: 1 },
  ],
  back: [
    { x: -1, y: 0, z: 0 },
    { x: 0, y: 1, z: 0 },
  ],
  iso: [
    { x: 0.7071, y: 0, z: -0.7071 },
    { x: -0.4082, y: 0.8165, z: -0.4082 },
  ],
};

function dot(a: Vec3, b: Vec3): number {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

/** Project a 3D model point into view-local 2D (before sheet transform). */
export function projectPoint3D(
  p: Vec3,
  orientation: ViewOrientation,
): Vec2 {
  const [u, v] = ORTHO[orientation];
  return { x: dot(p, u), y: dot(p, v) };
}

/** Map view-local 2D into sheet coordinates. */
export function viewToSheet(
  p: Vec2,
  origin: Vec2,
  scale: number,
  rotationDeg = 0,
): Vec2 {
  const rad = (rotationDeg * Math.PI) / 180;
  const c = Math.cos(rad);
  const s = Math.sin(rad);
  const x = p.x * scale;
  const y = p.y * scale;
  return {
    x: origin.x + x * c - y * s,
    y: origin.y + x * s + y * c,
  };
}

export function projectToSheet(
  p: Vec3,
  orientation: ViewOrientation,
  origin: Vec2,
  scale: number,
  rotationDeg = 0,
): Vec2 {
  return viewToSheet(projectPoint3D(p, orientation), origin, scale, rotationDeg);
}

export interface Box3 {
  min: Vec3;
  max: Vec3;
}

/** Eight corners of an AABB. */
export function boxCorners(box: Box3): Vec3[] {
  const { min, max } = box;
  return [
    { x: min.x, y: min.y, z: min.z },
    { x: max.x, y: min.y, z: min.z },
    { x: min.x, y: max.y, z: min.z },
    { x: max.x, y: max.y, z: min.z },
    { x: min.x, y: min.y, z: max.z },
    { x: max.x, y: min.y, z: max.z },
    { x: min.x, y: max.y, z: max.z },
    { x: max.x, y: max.y, z: max.z },
  ];
}

export interface ProjectedOutline {
  points: Vec2[];
  bounds: { min: Vec2; max: Vec2 };
}

/** Orthographic silhouette from model AABB (basic 2D projection). */
export function projectBoxOutline(
  box: Box3,
  orientation: ViewOrientation,
  origin: Vec2,
  scale: number,
  rotationDeg = 0,
): ProjectedOutline {
  const pts = boxCorners(box).map((c) =>
    projectToSheet(c, orientation, origin, scale, rotationDeg),
  );
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of pts) {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
  }
  // Convex hull of projected AABB is the axis-aligned bbox in view space
  // after rotation — use corner envelope as a closed polyline.
  const bounds = {
    min: { x: minX, y: minY },
    max: { x: maxX, y: maxY },
  };
  return {
    points: [
      { x: minX, y: minY },
      { x: maxX, y: minY },
      { x: maxX, y: maxY },
      { x: minX, y: maxY },
    ],
    bounds,
  };
}

export interface LinearDimensionResult {
  distance: number;
  midpoint: Vec2;
  direction: Vec2;
  /** Endpoints of the dimension line offset from geometry. */
  dimLine: [Vec2, Vec2];
  /** Extension line starts (on geometry) and ends (at dim line). */
  extA: [Vec2, Vec2];
  extB: [Vec2, Vec2];
  textAnchor: Vec2;
}

function len(v: Vec2): number {
  return Math.hypot(v.x, v.y);
}

function norm(v: Vec2): Vec2 {
  const l = len(v) || 1;
  return { x: v.x / l, y: v.y / l };
}

function perp(v: Vec2): Vec2 {
  return { x: -v.y, y: v.x };
}

/**
 * Two-point linear dimension in sheet space.
 * `offset` is signed distance of the dimension line from the segment.
 */
export function twoPointLinearDimension(
  a: Vec2,
  b: Vec2,
  offset = 12,
): LinearDimensionResult {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const distance = Math.hypot(dx, dy);
  const dir = norm({ x: dx, y: dy });
  const n = perp(dir);
  const midpoint = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  const o = { x: n.x * offset, y: n.y * offset };
  const aOff = { x: a.x + o.x, y: a.y + o.y };
  const bOff = { x: b.x + o.x, y: b.y + o.y };
  const textAnchor = {
    x: midpoint.x + o.x,
    y: midpoint.y + o.y,
  };
  return {
    distance,
    midpoint,
    direction: dir,
    dimLine: [aOff, bOff],
    extA: [a, aOff],
    extB: [b, bOff],
    textAnchor,
  };
}

/** Format a sheet dimension value given units + precision. */
export function formatDimensionValue(
  valueMm: number,
  units: "mm" | "inch",
  precision: number,
): string {
  const v = units === "inch" ? valueMm / 25.4 : valueMm;
  return v.toFixed(Math.max(0, precision));
}

export { ORTHO };
