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

/** Approximate segment–segment clearance (centerline distance − half widths). */
function segmentClearanceMm(
  a0: PcbPoint,
  a1: PcbPoint,
  aw: number,
  b0: PcbPoint,
  b1: PcbPoint,
  bw: number,
): number {
  const samples = 8;
  let minD = Infinity;
  for (let i = 0; i <= samples; i++) {
    const ta = i / samples;
    const ax = a0.x + (a1.x - a0.x) * ta;
    const ay = a0.y + (a1.y - a0.y) * ta;
    for (let j = 0; j <= samples; j++) {
      const tb = j / samples;
      const bx = b0.x + (b1.x - b0.x) * tb;
      const by = b0.y + (b1.y - b0.y) * tb;
      const d = Math.hypot(ax - bx, ay - by);
      if (d < minD) minD = d;
    }
  }
  return minD - aw / 2 - bw / 2;
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
