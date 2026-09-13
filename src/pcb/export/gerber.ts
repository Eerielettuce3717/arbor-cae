/**
 * RS-274X Gerber generator for top copper (.GTL) from PCB Studio geometry.
 *
 * Emits unit declaration (%MOMM*), format (%FSLAX46Y46*), custom aperture
 * macros for rectangular pads, circular apertures for traces/vias, and
 * absolute coordinate flash/draw commands.
 */

import type {
  BoardOutline,
  PcbComponent,
  PcbLayerId,
  PcbTrace,
  PcbVia,
} from "../../store/pcbTypes";

export interface GerberExportInput {
  outline: BoardOutline;
  components: PcbComponent[];
  traces: PcbTrace[];
  vias: PcbVia[];
  /** Layer to emit — default top copper → .GTL */
  layer?: "topCopper" | "bottomCopper";
  partName?: string;
}

/** Format Gerber coordinate (mm → 4.6 integer, no decimal). */
function gerberCoord(mm: number): string {
  const scaled = Math.round(mm * 1_000_000);
  return String(scaled);
}

function xy(x: number, y: number): string {
  return `X${gerberCoord(x)}Y${gerberCoord(y)}`;
}

interface AperturePool {
  adLines: string[];
  codes: Map<string, number>;
  next: number;
  rectMacroDefined: boolean;
  macroLines: string[];
}

function createPool(): AperturePool {
  return {
    adLines: [],
    codes: new Map(),
    next: 10,
    rectMacroDefined: false,
    macroLines: [],
  };
}

function ensureCircle(pool: AperturePool, diamMm: number): number {
  const key = `C:${diamMm.toFixed(6)}`;
  const existing = pool.codes.get(key);
  if (existing != null) return existing;
  const d = pool.next++;
  pool.codes.set(key, d);
  pool.adLines.push(`%ADD${d}C,${diamMm.toFixed(6)}*%`);
  return d;
}

/**
 * Custom aperture macro RECTPAD — primitive 21 (centered rectangle)
 * with width, height, and rotation parameters.
 */
function ensureRect(
  pool: AperturePool,
  w: number,
  h: number,
  rotationDeg: number,
): number {
  const key = `R:${w.toFixed(6)}x${h.toFixed(6)}@${rotationDeg.toFixed(3)}`;
  const existing = pool.codes.get(key);
  if (existing != null) return existing;

  if (!pool.rectMacroDefined) {
    pool.rectMacroDefined = true;
    pool.macroLines.push("%AMRECTPAD*", "21,1,$1,$2,0,0,$3*", "%");
  }

  const d = pool.next++;
  pool.codes.set(key, d);
  pool.adLines.push(
    `%ADD${d}RECTPAD,${w.toFixed(6)}X${h.toFixed(6)}X${rotationDeg.toFixed(3)}*%`,
  );
  return d;
}

function viaOnLayer(v: PcbVia, layer: PcbLayerId): boolean {
  if (v.fromLayer === layer || v.toLayer === layer) return true;
  // Through-hole vias always appear on both copper faces.
  return (
    (layer === "topCopper" || layer === "bottomCopper") &&
    v.fromLayer === "topCopper" &&
    v.toLayer === "bottomCopper"
  );
}

/**
 * Generate an RS-274X Gerber string for copper (default Top Copper → .GTL).
 */
export function generateGerber(input: GerberExportInput): string {
  const layer = input.layer ?? "topCopper";
  const pool = createPool();
  const drawOps: string[] = [];

  // Board outline as thin stroke (fab guide).
  if (input.outline.points.length >= 2) {
    const outlineD = ensureCircle(pool, 0.1);
    const pts = input.outline.points;
    drawOps.push(`G04 Board outline*`);
    drawOps.push(`D${outlineD}*`);
    drawOps.push(`${xy(pts[0].x, pts[0].y)}D02*`);
    for (let i = 1; i < pts.length; i++) {
      drawOps.push(`${xy(pts[i].x, pts[i].y)}D01*`);
    }
    drawOps.push(`${xy(pts[0].x, pts[0].y)}D01*`);
  }

  // Rectangular pads via custom aperture macro.
  for (const c of input.components) {
    for (const pad of c.pads) {
      if (pad.layer !== layer) continue;
      const d = ensureRect(pool, pad.widthMm, pad.heightMm, c.rotationDeg);
      drawOps.push(`G04 ${c.designator} ${pad.id}*`);
      drawOps.push(`D${d}*`);
      drawOps.push(`${xy(pad.x, pad.y)}D03*`);
    }
  }

  // Traces as circular aperture linear draws.
  for (const t of input.traces) {
    if (t.draft || t.layer !== layer || t.vertices.length < 2) continue;
    const d = ensureCircle(pool, t.widthMm);
    drawOps.push(`G04 Net ${t.net}*`);
    drawOps.push(`D${d}*`);
    drawOps.push(`${xy(t.vertices[0].x, t.vertices[0].y)}D02*`);
    for (let i = 1; i < t.vertices.length; i++) {
      drawOps.push(`${xy(t.vertices[i].x, t.vertices[i].y)}D01*`);
    }
  }

  // Via pads flashed as circles.
  for (const v of input.vias) {
    if (!viaOnLayer(v, layer)) continue;
    const d = ensureCircle(pool, v.padMm);
    drawOps.push(`G04 Via ${v.id}*`);
    drawOps.push(`D${d}*`);
    drawOps.push(`${xy(v.x, v.y)}D03*`);
  }

  const out: string[] = [];
  out.push(`G04 Arbor PCB Studio — RS-274X*`);
  out.push(`G04 ${input.partName ?? input.outline.name} / ${layer}*`);
  out.push(`%FSLAX46Y46*%`);
  out.push(`%MOMM*%`);
  out.push(`%LPD*%`);
  out.push(...pool.macroLines);
  out.push(...pool.adLines);
  out.push(`G75*`);
  out.push(`G01*`);
  out.push(...drawOps);
  out.push(`M02*`);

  return out.join("\n") + "\n";
}

/** Convenience: top copper layer Gerber (.GTL). */
export function generateGtl(input: GerberExportInput): string {
  return generateGerber({ ...input, layer: "topCopper" });
}
