/**
 * Fanuc-style post-processor: toolpath → ISO G-code (.nc).
 */

import type {
  CamPoint3,
  PocketParams,
  ToolDefinition,
  Toolpath,
  WcsOrigin,
} from "../store/camTypes";

export interface PostOptions {
  programNumber?: number;
  absolute?: boolean;
  unitsMm?: boolean;
  safeZ?: number;
  tool: ToolDefinition;
  wcs: WcsOrigin;
  params: PocketParams;
  /** Optional comment header. */
  partName?: string;
}

function fmt(n: number, digits = 3): string {
  const v = Number.isFinite(n) ? n : 0;
  return v.toFixed(digits);
}

function xyz(p: CamPoint3): string {
  return `X${fmt(p.x)} Y${fmt(p.y)} Z${fmt(p.z)}`;
}

/**
 * Convert a CAM toolpath into standard Fanuc / Haas-compatible G-code.
 */
export function postProcessFanuc(
  toolpath: Toolpath,
  options: PostOptions,
): string {
  const programNumber = options.programNumber ?? 1001;
  const safeZ = options.safeZ ?? 25;
  const { tool, wcs, params } = options;
  const lines: string[] = [];

  lines.push(`%`);
  lines.push(`O${String(programNumber).padStart(4, "0")}`);
  lines.push(`(CAD ENGINE CAM STUDIO)`);
  if (options.partName) lines.push(`(${options.partName})`);
  lines.push(`(${toolpath.name})`);
  lines.push(`(${tool.name} D=${fmt(tool.diameterMm, 2)}MM)`);
  lines.push(`G90 G17 G40 G49 G80`);
  lines.push(options.unitsMm === false ? `G20` : `G21`);
  lines.push(`${wcs.frame}`);
  lines.push(`T1 M06`);
  lines.push(`S${Math.round(params.spindleRpm)} M03`);
  lines.push(`G00 X0 Y0`);
  lines.push(`G43 H1 Z${fmt(safeZ)}`);
  lines.push(`M08`);

  let first = true;
  for (const seg of toolpath.segments) {
    if (seg.points.length === 0) continue;
    if (seg.rapid || first) {
      const p0 = seg.points[0];
      lines.push(`G00 X${fmt(p0.x)} Y${fmt(p0.y)}`);
      lines.push(`G00 Z${fmt(safeZ)}`);
      lines.push(`G00 Z${fmt(p0.z + 2)}`);
      lines.push(`G01 Z${fmt(p0.z)} F${fmt(params.plungeMmMin, 1)}`);
      for (let i = 1; i < seg.points.length; i++) {
        lines.push(`G01 ${xyz(seg.points[i])} F${fmt(params.feedMmMin, 1)}`);
      }
      first = false;
    } else {
      for (const p of seg.points) {
        lines.push(`G01 ${xyz(p)} F${fmt(params.feedMmMin, 1)}`);
      }
    }
  }

  lines.push(`G00 Z${fmt(safeZ)}`);
  lines.push(`M09`);
  lines.push(`M05`);
  lines.push(`G91 G28 Z0`);
  lines.push(`G90`);
  lines.push(`M30`);
  lines.push(`%`);
  return lines.join("\n") + "\n";
}
