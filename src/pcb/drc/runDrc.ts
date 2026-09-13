import type {
  BoardOutline,
  PcbComponent,
  PcbPad,
  PcbPoint,
  PcbTrace,
  PcbVia,
} from "../../store/pcbTypes";
import { getDrcProfile } from "./profiles";
import type {
  DrcResult,
  DrcViolation,
  ManufacturingProfileId,
} from "./types";

export interface DrcBoardInput {
  outline: BoardOutline;
  components: PcbComponent[];
  traces: PcbTrace[];
  vias: PcbVia[];
}

function dist(a: PcbPoint, b: PcbPoint): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.hypot(dx, dy);
}

/** Point-in-polygon (ray cast). Outline assumed closed. */
function pointInPolygon(p: PcbPoint, poly: PcbPoint[]): boolean {
  if (poly.length < 3) return true;
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const yi = poly[i].y;
    const yj = poly[j].y;
    const xi = poly[i].x;
    const xj = poly[j].x;
    const intersect =
      yi > p.y !== yj > p.y &&
      p.x < ((xj - xi) * (p.y - yi)) / (yj - yi + Number.EPSILON) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

/** Minimum center-to-center pitch among pads of one component. */
export function minPadPitchMm(pads: PcbPad[]): number | null {
  if (pads.length < 2) return null;
  let min = Infinity;
  for (let i = 0; i < pads.length; i++) {
    for (let j = i + 1; j < pads.length; j++) {
      const d = dist(
        { x: pads[i].x, y: pads[i].y },
        { x: pads[j].x, y: pads[j].y },
      );
      if (d > 1e-6 && d < min) min = d;
    }
  }
  return Number.isFinite(min) ? min : null;
}

/** Shortest distance from point `p` to segment `a`–`b`. */
function pointSegmentDistance(
  px: number,
  py: number,
  ax: number,
  ay: number,
  bx: number,
  by: number,
): number {
  const dx = bx - ax;
  const dy = by - ay;
  const lenSq = dx * dx + dy * dy;
  if (lenSq < 1e-18) return Math.hypot(px - ax, py - ay);
  // Projection parameter clamped to the segment.
  let t = ((px - ax) * dx + (py - ay) * dy) / lenSq;
  if (t < 0) t = 0;
  else if (t > 1) t = 1;
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

/** Sign of the cross product (b-a) x (c-a); 0 when collinear. */
function orientation(
  ax: number,
  ay: number,
  bx: number,
  by: number,
  cx: number,
  cy: number,
): number {
  const v = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
  if (v > 1e-12) return 1;
  if (v < -1e-12) return -1;
  return 0;
}

function onSegment(
  ax: number,
  ay: number,
  bx: number,
  by: number,
  px: number,
  py: number,
): boolean {
  return (
    px >= Math.min(ax, bx) - 1e-12 &&
    px <= Math.max(ax, bx) + 1e-12 &&
    py >= Math.min(ay, by) - 1e-12 &&
    py <= Math.max(ay, by) + 1e-12
  );
}

/**
 * Exact segment–segment clearance: true centreline distance minus half widths.
 *
 * This replaces an 8x8 sampled approximation. Sampling only evaluates 81 fixed
 * parameter pairs, and the true minimum between two segments generally does not
 * fall on a sample point, so a narrow gap between two long traces could sit
 * between samples and report as passing. DRC gates manufacturing export, so a
 * false negative here ships a board with sub-minimum clearance.
 *
 * In 2D the minimum is zero when the segments cross; otherwise it is attained at
 * one of the four endpoints, so the four point-to-segment distances are exact.
 */
function segmentClearanceMm(
  a0: PcbPoint,
  a1: PcbPoint,
  aw: number,
  b0: PcbPoint,
  b1: PcbPoint,
  bw: number,
): number {
  const halfWidths = aw / 2 + bw / 2;

  const o1 = orientation(a0.x, a0.y, a1.x, a1.y, b0.x, b0.y);
  const o2 = orientation(a0.x, a0.y, a1.x, a1.y, b1.x, b1.y);
  const o3 = orientation(b0.x, b0.y, b1.x, b1.y, a0.x, a0.y);
  const o4 = orientation(b0.x, b0.y, b1.x, b1.y, a1.x, a1.y);

  const crosses =
    (o1 !== o2 && o3 !== o4) ||
    (o1 === 0 && onSegment(a0.x, a0.y, a1.x, a1.y, b0.x, b0.y)) ||
    (o2 === 0 && onSegment(a0.x, a0.y, a1.x, a1.y, b1.x, b1.y)) ||
    (o3 === 0 && onSegment(b0.x, b0.y, b1.x, b1.y, a0.x, a0.y)) ||
    (o4 === 0 && onSegment(b0.x, b0.y, b1.x, b1.y, a1.x, a1.y));

  if (crosses) return -halfWidths;

  const d = Math.min(
    pointSegmentDistance(a0.x, a0.y, b0.x, b0.y, b1.x, b1.y),
    pointSegmentDistance(a1.x, a1.y, b0.x, b0.y, b1.x, b1.y),
    pointSegmentDistance(b0.x, b0.y, a0.x, a0.y, a1.x, a1.y),
    pointSegmentDistance(b1.x, b1.y, a0.x, a0.y, a1.x, a1.y),
  );

  return d - halfWidths;
}

/**
 * Run configurable DRC against board geometry for the selected fab profile.
 * Export must be blocked when `passed === false`.
 */
export function runDrc(
  board: DrcBoardInput,
  profileId: ManufacturingProfileId,
): DrcResult {
  const profile = getDrcProfile(profileId);
  const { limits } = profile;
  const violations: DrcViolation[] = [];
  let n = 0;
  const add = (
    rule: DrcViolation["rule"],
    message: string,
    refs: string[],
    severity: DrcViolation["severity"] = "error",
  ) => {
    violations.push({
      id: `drc_${++n}`,
      rule,
      severity,
      message,
      refs,
    });
  };

  const committed = board.traces.filter((t) => !t.draft);

  // --- Min trace width ---
  for (const t of committed) {
    if (t.widthMm + 1e-9 < limits.minTraceWidthMm) {
      add(
        "minTraceWidth",
        `Trace ${t.net} width ${t.widthMm.toFixed(3)} mm < ${limits.minTraceWidthMm} mm (${profile.name}).`,
        [t.id],
      );
    }
  }

  // --- Pin pitch (component pads) ---
  if (limits.minPinPitchMm != null) {
    for (const c of board.components) {
      const pitch = minPadPitchMm(c.pads);
      if (pitch != null && pitch + 1e-9 < limits.minPinPitchMm) {
        add(
          "minPinPitch",
          `${c.designator} pin pitch ${pitch.toFixed(3)} mm < ${limits.minPinPitchMm} mm (${profile.name}).`,
          [c.id, ...c.pads.map((p) => p.id)],
        );
      }
    }
  }

  // --- Drill / annular ring ---
  for (const v of board.vias) {
    if (v.drillMm + 1e-9 < limits.minDrillMm) {
      add(
        "minDrill",
        `Via ${v.id} drill ${v.drillMm.toFixed(3)} mm < ${limits.minDrillMm} mm.`,
        [v.id],
      );
    }
    const ring = (v.padMm - v.drillMm) / 2;
    if (ring + 1e-9 < limits.minAnnularRingMm) {
      add(
        "minAnnularRing",
        `Via ${v.id} annular ring ${ring.toFixed(3)} mm < ${limits.minAnnularRingMm} mm.`,
        [v.id],
      );
    }
  }

  // --- Trace clearance (same copper layer) ---
  for (let i = 0; i < committed.length; i++) {
    for (let j = i + 1; j < committed.length; j++) {
      const a = committed[i];
      const b = committed[j];
      if (a.layer !== b.layer) continue;
      if (a.net === b.net) continue;
      for (let ai = 0; ai < a.vertices.length - 1; ai++) {
        for (let bi = 0; bi < b.vertices.length - 1; bi++) {
          const clearance = segmentClearanceMm(
            a.vertices[ai],
            a.vertices[ai + 1],
            a.widthMm,
            b.vertices[bi],
            b.vertices[bi + 1],
            b.widthMm,
          );
          if (clearance + 1e-9 < limits.minClearanceMm) {
            add(
              "minClearance",
              `Clearance ${clearance.toFixed(3)} mm between ${a.net} and ${b.net} < ${limits.minClearanceMm} mm.`,
              [a.id, b.id],
            );
          }
        }
      }
    }
  }

  // --- Board bounds ---
  if (limits.enforceBoardBounds && board.outline.points.length >= 3) {
    const poly = board.outline.points;
    for (const t of committed) {
      for (const v of t.vertices) {
        if (!pointInPolygon(v, poly)) {
          add(
            "traceOnBoard",
            `Trace ${t.net} vertex (${v.x.toFixed(2)}, ${v.y.toFixed(2)}) outside board outline.`,
            [t.id],
          );
          break;
        }
      }
    }
    for (const via of board.vias) {
      if (!pointInPolygon({ x: via.x, y: via.y }, poly)) {
        add(
          "viaOnBoard",
          `Via ${via.id} at (${via.x.toFixed(2)}, ${via.y.toFixed(2)}) outside board outline.`,
          [via.id],
        );
      }
    }
  }

  const errors = violations.filter((v) => v.severity === "error");
  return {
    profileId: profile.id,
    profileName: profile.name,
    passed: errors.length === 0,
    violations,
    checkedAt: new Date().toISOString(),
  };
}
