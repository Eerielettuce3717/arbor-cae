/**
 * 2.5D pocket clearing — parallel zigzag (raster) toolpath.
 *
 * Given an axis-aligned rectangle in the machining XY plane (face bounds),
 * generates an array of X,Y points that clear the pocket with a constant
 * stepover, alternating direction each pass (zigzag).
 */

import type { CamPoint2, FlatFaceId, PocketParams, StockDefinition } from "../store/camTypes";

export interface FaceBounds2D {
  /** Min corner in WCS XY (mm). */
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  /** Constant Z of the face in WCS (mm), before depth. */
  faceZ: number;
  /** Outward normal of the selected face (machine space). */
  normal: [number, number, number];
}

/**
 * Map a stock bounding-box face into a 2D machining rectangle in WCS.
 * For vertical faces we project onto the nearest horizontal-compatible
 * plane by swapping axes so pocket clearing always runs in XY.
 */
export function faceBoundsFromStock(
  stock: StockDefinition,
  wcsOrigin: [number, number, number],
  faceId: FlatFaceId,
): FaceBounds2D {
  const [sx, sy, sz] = stock.size;
  const [ox, oy, oz] = stock.origin;
  const [wx, wy, wz] = wcsOrigin;

  // Stock corners in machine space, then subtract WCS origin → WCS coords.
  const min = {
    x: ox - wx,
    y: oy - wy,
    z: oz - wz,
  };
  const max = {
    x: ox + sx - wx,
    y: oy + sy - wy,
    z: oz + sz - wz,
  };

  switch (faceId) {
    case "top":
      return {
        minX: min.x,
        minY: min.y,
        maxX: max.x,
        maxY: max.y,
        faceZ: max.z,
        normal: [0, 0, 1],
      };
    case "bottom":
      return {
        minX: min.x,
        minY: min.y,
        maxX: max.x,
        maxY: max.y,
        faceZ: min.z,
        normal: [0, 0, -1],
      };
    case "front":
      // Front (+Y): map X→X, Z→Y for 2.5D clearing on the vertical face.
      return {
        minX: min.x,
        minY: min.z,
        maxX: max.x,
        maxY: max.z,
        faceZ: max.y,
        normal: [0, 1, 0],
      };
    case "back":
      return {
        minX: min.x,
        minY: min.z,
        maxX: max.x,
        maxY: max.z,
        faceZ: min.y,
        normal: [0, -1, 0],
      };
    case "left":
      return {
        minX: min.y,
        minY: min.z,
        maxX: max.y,
        maxY: max.z,
        faceZ: min.x,
        normal: [-1, 0, 0],
      };
    case "right":
      return {
        minX: min.y,
        minY: min.z,
        maxX: max.y,
        maxY: max.z,
        faceZ: max.x,
        normal: [1, 0, 0],
      };
  }
}

export interface PocketClearInput {
  bounds: FaceBounds2D;
  toolDiameterMm: number;
  params: PocketParams;
}

/**
 * Generate a parallel zigzag (raster) toolpath as an ordered array of X,Y points.
 * Points lie in the face's 2D parameter space (already WCS-aligned for top/bottom).
 */
export function generatePocketZigzag(input: PocketClearInput): CamPoint2[] {
  const { bounds, toolDiameterMm, params } = input;
  const radius = toolDiameterMm / 2;
  const inset = radius + Math.max(0, params.stockToLeaveMm);
  const step = Math.max(toolDiameterMm * params.stepover, toolDiameterMm * 0.05);

  let minX = bounds.minX + inset;
  let maxX = bounds.maxX - inset;
  let minY = bounds.minY + inset;
  let maxY = bounds.maxY - inset;

  if (minX >= maxX || minY >= maxY) {
    // Face too small for tool — return a single center point.
    return [
      {
        x: (bounds.minX + bounds.maxX) / 2,
        y: (bounds.minY + bounds.maxY) / 2,
      },
    ];
  }

  // Rotate the raster *direction*, then clip every pass to the inset rectangle.
  //
  // The previous implementation generated full-width passes across the
  // axis-aligned inset box and rotated the emitted endpoints about the centre.
  // Rotating a rectangle's corners moves them outside that rectangle, so any
  // non-zero angle drove the tool past the inset boundary and through the
  // stock-to-leave margin. The perimeter pass was rotated the same way, so the
  // finishing loop left the pocket entirely.
  const angle = (params.angleDeg * Math.PI) / 180;
  // Pass direction and its perpendicular.
  const ux = Math.cos(angle);
  const uy = Math.sin(angle);
  const vx = -uy;
  const vy = ux;

  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;

  // Half-extent of the inset rectangle measured along the perpendicular, so the
  // scan lines span the whole pocket no matter how it is rotated.
  const halfW = (maxX - minX) / 2;
  const halfH = (maxY - minY) / 2;
  const vExtent = Math.abs(halfW * vx) + Math.abs(halfH * vy);

  const points: CamPoint2[] = [];
  let row = 0;

  for (let offset = -vExtent; offset <= vExtent + 1e-9; offset += step) {
    const clamped = Math.min(offset, vExtent);
    // Line through (cx,cy) + v*clamped, running along u.
    const px = cx + vx * clamped;
    const py = cy + vy * clamped;
    const span = clipLineToRect(px, py, ux, uy, minX, maxX, minY, maxY);
    if (span) {
      const a: CamPoint2 = { x: px + ux * span.tMin, y: py + uy * span.tMin };
      const b: CamPoint2 = { x: px + ux * span.tMax, y: py + uy * span.tMax };
      // Serpentine: alternate direction so the tool does not air-cut back.
      if (row % 2 === 0) {
        points.push(a, b);
      } else {
        points.push(b, a);
      }
      row += 1;
    }
    if (clamped >= vExtent) break;
  }

  if (points.length === 0) {
    return [{ x: cx, y: cy }];
  }

  // Perimeter pass for residual corners. This traces the inset rectangle itself
  // and is deliberately not rotated — the pocket boundary does not rotate with
  // the raster direction.
  points.push({ x: minX, y: minY });
  points.push({ x: maxX, y: minY });
  points.push({ x: maxX, y: maxY });
  points.push({ x: minX, y: maxY });
  points.push({ x: minX, y: minY });

  return points;
}

/**
 * Clip the infinite line `(px,py) + t*(dx,dy)` to an axis-aligned rectangle.
 *
 * Liang-Barsky slab clipping. Returns the parametric range that lies inside the
 * rectangle, or null when the line misses it entirely. This is what guarantees
 * every emitted toolpath point stays within the inset (tool-safe) region.
 */
function clipLineToRect(
  px: number,
  py: number,
  dx: number,
  dy: number,
  minX: number,
  maxX: number,
  minY: number,
  maxY: number,
): { tMin: number; tMax: number } | null {
  let tMin = -Infinity;
  let tMax = Infinity;

  // Each slab contributes an entry/exit parameter; a near-zero direction
  // component means the line is parallel to that slab, so it is either wholly
  // inside it or wholly outside.
  const slab = (p: number, d: number, lo: number, hi: number): boolean => {
    if (Math.abs(d) < 1e-12) return p >= lo - 1e-9 && p <= hi + 1e-9;
    const t1 = (lo - p) / d;
    const t2 = (hi - p) / d;
    const enter = Math.min(t1, t2);
    const exit = Math.max(t1, t2);
    if (enter > tMin) tMin = enter;
    if (exit < tMax) tMax = exit;
    return true;
  };

  if (!slab(px, dx, minX, maxX)) return null;
  if (!slab(py, dy, minY, maxY)) return null;
  if (tMin > tMax) return null;
  return { tMin, tMax };
}

/**
 * Lift 2D zigzag points into 3D WCS with Z-stepped depth passes.
 * For non-horizontal faces, remap the 2D parameters back to XYZ.
 */
export function liftPocketTo3D(
  xyPoints: CamPoint2[],
  bounds: FaceBounds2D,
  faceId: FlatFaceId,
  params: PocketParams,
): { x: number; y: number; z: number }[] {
  const depth = Math.max(params.totalDepthMm, 0);
  const doc = Math.max(params.depthOfCutMm, 0.1);
  const passes = Math.max(1, Math.ceil(depth / doc));
  const out: { x: number; y: number; z: number }[] = [];

  for (let p = 1; p <= passes; p++) {
    const cut = Math.min(p * doc, depth);
    for (const pt of xyPoints) {
      out.push(mapFacePoint(pt, bounds, faceId, cut));
    }
  }
  return out;
}

function mapFacePoint(
  pt: CamPoint2,
  bounds: FaceBounds2D,
  faceId: FlatFaceId,
  cutDepth: number,
): { x: number; y: number; z: number } {
  const n = bounds.normal;
  // Cut into the material opposite the outward normal.
  const ox = -n[0] * cutDepth;
  const oy = -n[1] * cutDepth;
  const oz = -n[2] * cutDepth;

  switch (faceId) {
    case "top":
    case "bottom":
      return { x: pt.x, y: pt.y, z: bounds.faceZ + oz };
    case "front":
    case "back":
      // pt.x → X, pt.y → Z, face at Y
      return { x: pt.x, y: bounds.faceZ + oy, z: pt.y };
    case "left":
    case "right":
      // pt.x → Y, pt.y → Z, face at X
      return { x: bounds.faceZ + ox, y: pt.x, z: pt.y };
  }
}
