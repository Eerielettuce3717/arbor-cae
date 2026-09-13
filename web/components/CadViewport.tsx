"use client";

import { useCallback, useMemo, useRef, useState, type PointerEvent } from "react";

type Layer = "sketch" | "solid" | "trace" | "path";
type Feature = "extrude" | "hole" | "size";
type Pt3 = [number, number, number];
type Pt2 = { x: number; y: number };

const LAYERS: { id: Layer; label: string }[] = [
  { id: "sketch", label: "Sketch" },
  { id: "solid", label: "Solid" },
  { id: "trace", label: "Trace" },
  { id: "path", label: "Path" },
];

const COS = Math.sqrt(3) / 2;
const SIN = 0.5;
const OX = 358;
const OY = 352;
const SCALE = 7.15;
const VIEW = [1, 1.15, 1] as const;

function iso(x: number, y: number, z: number): Pt2 {
  return {
    x: OX + (x - z) * COS * SCALE,
    y: OY - (y + (x + z) * SIN) * SCALE,
  };
}

function toPath(points: Pt2[], close = true) {
  return (
    points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(" ") +
    (close ? " Z" : "")
  );
}

function hexRing(af: number): [number, number][] {
  const r = af / Math.sqrt(3);
  return Array.from({ length: 6 }, (_, i) => {
    const a = Math.PI / 6 + (i * Math.PI) / 3;
    return [r * Math.cos(a), r * Math.sin(a)] as [number, number];
  });
}

function normal(face: Pt3[]): Pt3 {
  const [a, b, c] = face;
  const nx = (b[1] - a[1]) * (c[2] - a[2]) - (b[2] - a[2]) * (c[1] - a[1]);
  const ny = (b[2] - a[2]) * (c[0] - a[0]) - (b[0] - a[0]) * (c[2] - a[2]);
  const nz = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
  const m = Math.hypot(nx, ny, nz) || 1;
  return [nx / m, ny / m, nz / m] as Pt3;
}

function facing(face: Pt3[]) {
  const n = normal(face);
  return n[0] * VIEW[0] + n[1] * VIEW[1] + n[2] * VIEW[2] > 0.04;
}

function depth(face: Pt3[]) {
  const c = face.reduce(
    (acc, p) => [acc[0] + p[0], acc[1] + p[1], acc[2] + p[2]],
    [0, 0, 0],
  );
  const k = 1 / face.length;
  return (c[0] * k) * VIEW[0] + (c[1] * k) * VIEW[1] + (c[2] * k) * VIEW[2];
}

function shade(face: Pt3[]) {
  const n = normal(face);
  if (n[1] > 0.7) return "#2A3340";
  if (n[0] > n[2]) return "#1A222C";
  return "#121820";
}

function prismFaces(ring: [number, number][], y0: number, y1: number): Pt3[][] {
  const top: Pt3[] = ring.map(([x, z]) => [x, y1, z] as Pt3).reverse();
  const bottom: Pt3[] = ring.map(([x, z]) => [x, y0, z] as Pt3);
  const sides: Pt3[][] = ring.map(([x0, z0], i) => {
    const [x1, z1] = ring[(i + 1) % ring.length];
    return [
      [x0, y0, z0],
      [x1, y0, z1],
      [x1, y1, z1],
      [x0, y1, z0],
    ] as Pt3[];
  });
  return [bottom, top, ...sides];
}

function circlePath(y: number, r: number, steps = 48) {
  const pts = Array.from({ length: steps }, (_, i) => {
    const a = (i / steps) * Math.PI * 2;
    return iso(r * Math.cos(a), y, r * Math.sin(a));
  });
  return toPath(pts);
}

function boreWall(y0: number, y1: number, r: number, steps = 22) {
  const top: Pt2[] = [];
  const bot: Pt2[] = [];
  for (let i = 0; i <= steps; i += 1) {
    // Far side of the bore (away from the camera), visible through the hole.
    const a = Math.PI * 0.15 + (i / steps) * Math.PI * 0.7;
    top.push(iso(r * Math.cos(a), y1, r * Math.sin(a)));
    bot.push(iso(r * Math.cos(a), y0, r * Math.sin(a)));
  }
  return toPath([...top, ...bot.reverse()]);
}

export function CadViewport() {
  const svgRef = useRef<SVGSVGElement>(null);
  const [layer, setLayer] = useState<Layer>("solid");
  const [feature, setFeature] = useState<Feature>("hole");
  const [height, setHeight] = useState(16);
  const [hole, setHole] = useState(10);
  const [af, setAf] = useState(24);
  const [cursor, setCursor] = useState<{ x: number; y: number } | null>(null);

  const onMove = useCallback((event: PointerEvent<SVGSVGElement>) => {
    const svg = svgRef.current;
    if (!svg) return;
    const ctm = svg.getScreenCTM();
    if (!ctm) return;
    const p = svg.createSVGPoint();
    p.x = event.clientX;
    p.y = event.clientY;
    const loc = p.matrixTransform(ctm.inverse());
    setCursor({
      x: Number(((loc.x - 70) / 4.2).toFixed(2)),
      y: Number(((410 - loc.y) / 4.2).toFixed(2)),
    });
  }, []);

  const maxHole = Math.max(6, af * 0.62);
  const holeR = Math.min(hole, maxHole) / 2;
  const ring = useMemo(() => hexRing(af), [af]);

  const faces = useMemo(() => {
    return prismFaces(ring, 0, height)
      .filter(facing)
      .sort((a, b) => depth(a) - depth(b));
  }, [ring, height]);

  const selectedStroke = "#E85D04";
  const live = "#F3EEE6";
  const dim = "#8B949E";
  const bodyStroke = feature === "extrude" || feature === "size" ? selectedStroke : live;
  const holeStroke = feature === "hole" ? selectedStroke : live;

  return (
    <div className="flex h-full min-h-[22rem] flex-col border border-rule bg-panel lg:min-h-[34rem]">
      <div className="flex flex-wrap items-stretch border-b border-rule">
        <p className="flex min-h-11 items-center px-3 font-mono text-[10px] uppercase tracking-[0.16em] text-mute">
          Viewport
        </p>
        <div role="tablist" aria-label="Drawing layer" className="ml-auto flex">
          {LAYERS.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={layer === item.id}
              onClick={() => setLayer(item.id)}
              className={`min-h-11 border-l border-rule px-3 font-mono text-[10px] uppercase tracking-[0.14em] sm:px-4 ${
                layer === item.id ? "bg-ink text-signal" : "text-mute hover:text-paper"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[11.5rem_1fr]">
        <aside className="order-2 border-t border-rule lg:order-1 lg:border-t-0 lg:border-r">
          <p className="border-b border-rule px-3 py-2 font-mono text-[10px] uppercase tracking-[0.16em] text-mute">
            Feature tree
          </p>
          <ul className="font-mono text-[11px]">
            {(
              [
                { id: "extrude" as const, label: `Extrude  ${height.toFixed(1)} mm` },
                { id: "hole" as const, label: `Bore Ø   ${Math.min(hole, maxHole).toFixed(1)} mm` },
                { id: "size" as const, label: `Hex AF   ${af.toFixed(1)} mm` },
              ] as const
            ).map((item, index) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => setFeature(item.id)}
                  className={`relative flex min-h-11 w-full items-center justify-between border-b border-rule px-3 text-left ${
                    feature === item.id ? "bg-ink text-signal" : "text-paper hover:bg-ink"
                  }`}
                >
                  {feature === item.id ? (
                    <span className="absolute inset-y-0 left-0 w-[3px] bg-signal" />
                  ) : null}
                  <span>
                    <span className="mr-2 text-mute">{String(index + 1).padStart(2, "0")}</span>
                    {item.label}
                  </span>
                </button>
              </li>
            ))}
          </ul>
          <div className="space-y-4 p-3">
            <Param
              id="height"
              label="Height"
              value={height}
              min={8}
              max={22}
              onChange={(v) => {
                setFeature("extrude");
                setHeight(v);
              }}
            />
            <Param
              id="hole"
              label="Bore Ø"
              value={Math.min(hole, maxHole)}
              min={6}
              max={18}
              onChange={(v) => {
                setFeature("hole");
                setHole(v);
              }}
            />
            <Param
              id="af"
              label="Across flats"
              value={af}
              min={16}
              max={32}
              onChange={(v) => {
                setFeature("size");
                setAf(v);
              }}
            />
          </div>
        </aside>

        <div className="relative order-1 min-h-[18rem] bg-ink lg:order-2">
          <svg
            ref={svgRef}
            viewBox="0 0 720 460"
            className="h-full w-full touch-none"
            role="img"
            aria-label="Parametric hex standoff. Drag height, bore, or across-flats to edit."
            onPointerMove={onMove}
            onPointerLeave={() => setCursor(null)}
          >
            <defs>
              <pattern id="minor" width="24" height="24" patternUnits="userSpaceOnUse">
                <path d="M 24 0 L 0 0 0 24" fill="none" stroke="#2C3642" strokeWidth="0.6" />
              </pattern>
            </defs>
            <rect width="720" height="460" fill="#0A0C0F" />
            <rect x="16" y="16" width="688" height="428" fill="url(#minor)" />
            <rect x="16" y="16" width="688" height="428" fill="none" stroke="#2C3642" />

            {layer === "sketch" ? (
              <SketchLayer
                af={af}
                hole={Math.min(hole, maxHole)}
                feature={feature}
                live={live}
                selectedStroke={selectedStroke}
                dim={dim}
              />
            ) : (
              <g>
                {faces.map((face, i) => (
                  <path
                    key={i}
                    d={toPath(face.map(([x, y, z]) => iso(x, y, z)))}
                    fill={shade(face)}
                    stroke={bodyStroke}
                    strokeWidth="1.35"
                    strokeLinejoin="miter"
                  />
                ))}
                <path
                  d={circlePath(0, holeR)}
                  fill="none"
                  stroke={holeStroke}
                  strokeWidth="1"
                  opacity="0.35"
                />
                <path d={boreWall(0, height, holeR)} fill="#0E1319" stroke="none" />
                <path
                  d={circlePath(height, holeR)}
                  fill="#0A0C0F"
                  stroke={holeStroke}
                  strokeWidth="1.5"
                />
                {layer === "trace" ? (
                  <g fill="none">
                    <path
                      d={circlePath(height + 0.05, holeR + 2.4)}
                      stroke={selectedStroke}
                      strokeWidth="2.2"
                    />
                    <path
                      d={toPath(
                        [
                          iso(holeR + 2.4, height + 0.05, 0),
                          iso(af * 0.42, height + 0.05, 0),
                          iso(af * 0.48, height + 0.05, af * 0.18),
                        ],
                        false,
                      )}
                      stroke={selectedStroke}
                      strokeWidth="2"
                    />
                    <circle
                      cx={iso(af * 0.48, height, af * 0.18).x}
                      cy={iso(af * 0.48, height, af * 0.18).y}
                      r="4.5"
                      stroke={selectedStroke}
                      strokeWidth="1.4"
                    />
                  </g>
                ) : null}
                {layer === "path" ? (
                  <path
                    d={zigzagPath(af, height, holeR)}
                    fill="none"
                    stroke={selectedStroke}
                    strokeWidth="1.15"
                  />
                ) : null}
                <text
                  x={iso(0, height, 0).x + 16}
                  y={iso(0, height, 0).y - 10}
                  fill={holeStroke}
                  fontFamily="IBM Plex Mono, ui-monospace, monospace"
                  fontSize="11"
                >
                  Ø{Math.min(hole, maxHole).toFixed(1)}
                </text>
                <text
                  x="488"
                  y="372"
                  fill={dim}
                  fontFamily="IBM Plex Mono, ui-monospace, monospace"
                  fontSize="10"
                >
                  {layer === "trace"
                    ? "PAD · RING"
                    : layer === "path"
                      ? "FACE CLEAR"
                      : `H ${height.toFixed(1)}  AF ${af.toFixed(1)}`}
                </text>
              </g>
            )}

            {cursor ? (
              <g pointerEvents="none">
                <line
                  x1="16"
                  x2="704"
                  y1={410 - cursor.y * 4.2}
                  y2={410 - cursor.y * 4.2}
                  stroke={selectedStroke}
                  strokeWidth="0.6"
                  opacity="0.45"
                />
                <line
                  y1="16"
                  y2="444"
                  x1={70 + cursor.x * 4.2}
                  x2={70 + cursor.x * 4.2}
                  stroke={selectedStroke}
                  strokeWidth="0.6"
                  opacity="0.45"
                />
              </g>
            ) : null}

            <g fontFamily="IBM Plex Mono, ui-monospace, monospace" fontSize="10" fill="#8B949E">
              <text x="28" y="36">
                HEX STANDOFF · ISO
              </text>
              <text x="28" y="430">
                {cursor
                  ? `X ${cursor.x.toFixed(2)}   Y ${cursor.y.toFixed(2)}`
                  : "X —     Y —"}
              </text>
              <text x="520" y="412">
                ARBOR
              </text>
              <text x="520" y="428">
                REV 14  ·  SCALE 2:1
              </text>
            </g>
          </svg>
        </div>
      </div>
    </div>
  );
}

function zigzagPath(af: number, y: number, holeR: number) {
  const r0 = holeR + 2.2;
  const r1 = af * 0.42;
  const pts: Pt2[] = [];
  const rings = 4;
  const steps = 28;
  for (let ring = 0; ring < rings; ring += 1) {
    const r = r0 + ((r1 - r0) * ring) / (rings - 1);
    for (let i = 0; i <= steps; i += 1) {
      const a = (i / steps) * Math.PI * 2 + ring * 0.18;
      const rr = r + (i % 2 === 0 ? 0.35 : -0.35);
      pts.push(iso(rr * Math.cos(a), y + 0.06, rr * Math.sin(a)));
    }
  }
  return toPath(pts, false);
}

function SketchLayer({
  af,
  hole,
  feature,
  live,
  selectedStroke,
  dim,
}: {
  af: number;
  hole: number;
  feature: Feature;
  live: string;
  selectedStroke: string;
  dim: string;
}) {
  const k = 7.2;
  const cx = 360;
  const cy = 236;
  const px = (x: number) => cx + x * k;
  const py = (z: number) => cy - z * k;
  const hex = hexRing(af).map(([x, z]) => ({ x: px(x), y: py(z) }));
  const r = (hole / 2) * k;
  const hexStroke = feature === "extrude" || feature === "size" ? selectedStroke : live;
  const holeStroke = feature === "hole" ? selectedStroke : live;
  const left = px(-af / 2);
  const right = px(af / 2);

  return (
    <g>
      <line x1={cx} y1={cy - af * k} x2={cx} y2={cy + af * k} stroke={dim} strokeDasharray="3 4" />
      <line x1={cx - af * k} y1={cy} x2={cx + af * k} y2={cy} stroke={dim} strokeDasharray="3 4" />
      <path d={toPath(hex)} fill="none" stroke={hexStroke} strokeWidth="1.6" />
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={holeStroke} strokeWidth="1.6" />
      <line x1={cx - 10} y1={cy} x2={cx + 10} y2={cy} stroke={holeStroke} strokeWidth="0.8" />
      <line x1={cx} y1={cy - 10} x2={cx} y2={cy + 10} stroke={holeStroke} strokeWidth="0.8" />
      <Dim x1={left} x2={right} y={cy + af * k * 0.72} label={`${af.toFixed(1)} AF`} color={feature === "size" ? selectedStroke : dim} />
      <Dim x1={cx - r} x2={cx + r} y={cy - r - 18} label={`Ø${hole.toFixed(1)}`} color={feature === "hole" ? selectedStroke : dim} />
    </g>
  );
}

function Param({
  id,
  label,
  value,
  min,
  max,
  onChange,
}: {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}) {
  return (
    <label htmlFor={id} className="block">
      <span className="mb-2 flex justify-between font-mono text-[10px] uppercase tracking-[0.14em] text-mute">
        <span>{label}</span>
        <span className="text-paper">{value.toFixed(1)}</span>
      </span>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step="0.1"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </label>
  );
}

function Dim({
  x1,
  x2,
  y,
  label,
  color,
}: {
  x1: number;
  x2: number;
  y: number;
  label: string;
  color: string;
}) {
  return (
    <g>
      <line x1={x1} y1={y - 6} x2={x1} y2={y + 6} stroke={color} />
      <line x1={x2} y1={y - 6} x2={x2} y2={y + 6} stroke={color} />
      <line x1={x1} y1={y} x2={x2} y2={y} stroke={color} />
      <text
        x={(x1 + x2) / 2}
        y={y - 6}
        textAnchor="middle"
        fill={color}
        fontFamily="IBM Plex Mono, ui-monospace, monospace"
        fontSize="11"
      >
        {label}
      </text>
    </g>
  );
}
