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

  // Optional rotation of pass direction about face center.
  const angle = (params.angleDeg * Math.PI) / 180;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;

  const rotate = (x: number, y: number): CamPoint2 => {
    const dx = x - cx;
    const dy = y - cy;
    return {
      x: cx + dx * cos - dy * sin,
      y: cy + dx * sin + dy * cos,
    };
  };

  // Work in unrotated AABB; rotate points on emit when angle ≠ 0.
  const points: CamPoint2[] = [];
  let y = minY;
  let row = 0;

  while (y <= maxY + 1e-9) {
    const clampedY = Math.min(y, maxY);
    if (row % 2 === 0) {
      points.push(rotate(minX, clampedY));
      points.push(rotate(maxX, clampedY));
    } else {
      points.push(rotate(maxX, clampedY));
      points.push(rotate(minX, clampedY));
    }
    if (clampedY >= maxY) break;
    y += step;
    row += 1;
  }

  // Close with a perimeter pass for residual corners (simple box outline).
  points.push(rotate(minX, minY));
  points.push(rotate(maxX, minY));
  points.push(rotate(maxX, maxY));
  points.push(rotate(minX, maxY));
  points.push(rotate(minX, minY));

  return points;
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
