/**
 * Excellon drill file generator (.DRL) from PCB vias / plated holes.
 *
 * Uses metric units, trailing-zero suppression, and tool definitions
 * grouped by drill diameter.
 */

import type { PcbVia } from "../../store/pcbTypes";

export interface ExcellonExportInput {
  vias: PcbVia[];
  partName?: string;
}

/** Format Excellon coordinate (mm → 3.3 style: µm as integer ×1000). */
function excellonCoord(mm: number): string {
  const scaled = Math.round(mm * 1000);
  return String(scaled);
}

function xy(x: number, y: number): string {
  return `X${excellonCoord(x)}Y${excellonCoord(y)}`;
}

/**
 * Generate a classic Excellon drill program for all vias.
 */
export function generateExcellon(input: ExcellonExportInput): string {
  const lines: string[] = [];
  const vias = input.vias;

  // Group tools by drill diameter (rounded to 1 µm).
  const toolMap = new Map<string, { diam: number; holes: PcbVia[] }>();
  for (const v of vias) {
    const key = v.drillMm.toFixed(3);
    let group = toolMap.get(key);
    if (!group) {
      group = { diam: v.drillMm, holes: [] };
      toolMap.set(key, group);
    }
    group.holes.push(v);
  }

  const tools = [...toolMap.values()].sort((a, b) => a.diam - b.diam);

  lines.push(`M48`);
  lines.push(`;CAD Engine PCB Studio — Excellon`);
  if (input.partName) lines.push(`;${input.partName}`);
  lines.push(`;FORMAT={2:4/ Absolute / Metric}`);
  lines.push(`METRIC,TZ`);
  lines.push(`FMAT,2`);

  tools.forEach((t, i) => {
    const toolNum = String(i + 1).padStart(2, "0");
    lines.push(`T${toolNum}C${t.diam.toFixed(3)}`);
  });

  lines.push(`%`);
  lines.push(`G90`);
  lines.push(`G05`);
  lines.push(`M72`);

  if (tools.length === 0) {
    lines.push(`;No drill hits`);
  } else {
    tools.forEach((t, i) => {
      const toolNum = String(i + 1).padStart(2, "0");
      lines.push(`T${toolNum}`);
      for (const h of t.holes) {
        lines.push(xy(h.x, h.y));
      }
    });
  }

  lines.push(`M30`);
  return lines.join("\n") + "\n";
}
