/**
 * Trace routing snap helpers — 45° (octilinear) and 90° (Manhattan).
 * Coordinates are board mm.
 */

import type { PcbPoint, SnapAngleMode } from "../store/pcbTypes";

const DEG = Math.PI / 180;

/** Nearest angle in degrees for the given snap mode. */
export function snapAngleDeg(angleDeg: number, mode: SnapAngleMode): number {
  const step = mode;
  const normalized = ((angleDeg % 360) + 360) % 360;
  return Math.round(normalized / step) * step;
}

/**
 * Snap `to` relative to `from` so the segment lies on a 45° or 90° ray.
 * Length is preserved along the snapped direction (projects onto the ray).
 */
export function snapPointToRoute(
  from: PcbPoint,
  to: PcbPoint,
  mode: SnapAngleMode,
): PcbPoint {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  if (dx === 0 && dy === 0) return { x: from.x, y: from.y };

  const angleDeg = (Math.atan2(dy, dx) / DEG);
  const snapped = snapAngleDeg(angleDeg, mode) * DEG;
  const dist = Math.hypot(dx, dy);
  return {
    x: from.x + Math.cos(snapped) * dist,
    y: from.y + Math.sin(snapped) * dist,
  };
}

/**
 * Optional grid snap after angle snap (mm). Pass 0 to skip.
 */
export function snapToGrid(p: PcbPoint, gridMm: number): PcbPoint {
  if (gridMm <= 0) return p;
  return {
    x: Math.round(p.x / gridMm) * gridMm,
    y: Math.round(p.y / gridMm) * gridMm,
  };
}

/**
 * Build an octilinear / Manhattan polyline from freehand points by snapping
 * each successive vertex relative to the previous committed vertex.
 */
export function snapPolyline(
  points: PcbPoint[],
  mode: SnapAngleMode,
  gridMm = 0,
): PcbPoint[] {
  if (points.length === 0) return [];
  const out: PcbPoint[] = [snapToGrid(points[0], gridMm)];
  for (let i = 1; i < points.length; i++) {
    const snapped = snapPointToRoute(out[i - 1], points[i], mode);
    out.push(snapToGrid(snapped, gridMm));
  }
  return out;
}

/** True when segment angle is within epsilon of a legal snap angle. */
export function isOnSnapAngle(
  a: PcbPoint,
  b: PcbPoint,
  mode: SnapAngleMode,
  epsilonDeg = 0.5,
): boolean {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  if (dx === 0 && dy === 0) return true;
  const angle = ((Math.atan2(dy, dx) / DEG) % 360 + 360) % 360;
  const snapped = snapAngleDeg(angle, mode);
  let delta = Math.abs(angle - snapped);
  if (delta > 180) delta = 360 - delta;
  return delta <= epsilonDeg;
}
