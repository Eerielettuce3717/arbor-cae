"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useCallback, useMemo, useRef, useState, type PointerEvent } from "react";

type Layer = "sketch" | "solid" | "trace" | "path";
type Feature = "extrude" | "hole" | "fillet";

const LAYERS: { id: Layer; label: string }[] = [
  { id: "sketch", label: "Sketch" },
  { id: "solid", label: "Solid" },
  { id: "trace", label: "Trace" },
  { id: "path", label: "Path" },
];

const COS = Math.sqrt(3) / 2;
const SIN = 0.5;

function iso(
  x: number,
  y: number,
  z: number,
  originX: number,
  originY: number,
  scale: number,
) {
  return {
    x: originX + (x - z) * COS * scale,
    y: originY - (y + (x + z) * SIN) * scale,
  };
}

function pts(
  coords: [number, number, number][],
  ox: number,
  oy: number,
  s: number,
) {
  return coords.map(([x, y, z]) => iso(x, y, z, ox, oy, s));
}

function toPath(points: { x: number; y: number }[], close = true) {
  return (
    points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ") +
    (close ? " Z" : "")
  );
}

type Geom = {
  t: number;
  r: number;
  holeH: { x: number; y: number };
  holeV: { x: number; y: number };
  holeRx: number;
  holeRy: number;
};

export function CadViewport() {
  const reduce = useReducedMotion();
  const svgRef = useRef<SVGSVGElement>(null);
  const [layer, setLayer] = useState<Layer>("solid");
  const [feature, setFeature] = useState<Feature>("hole");
  const [thick, setThick] = useState(8);
  const [hole, setHole] = useState(6.8);
  const [fillet, setFillet] = useState(4);
  const [cursor, setCursor] = useState<{ x: number; y: number } | null>(null);

  const L = 80;
  const H = 54;
  const W = 50;
  const ox = 400;
  const oy = 335;
  const s = 2.85;

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

  const geom = useMemo(() => {
    const t = thick;
    const r = Math.min(fillet, t + 6);
    const holeH = iso(52, t, W / 2, ox, oy, s);
    const holeV = iso(t, 34, W / 2, ox, oy, s);
    const holeRx = hole * COS * s * 0.78;
    const holeRy = hole * SIN * s * 1.2;
    return { t, r, holeH, holeV, holeRx, holeRy };
  }, [thick, fillet, hole, L, H, W, ox, oy, s]);

  const sketchPath = useMemo(() => {
    const t = thick;
    const r = Math.min(fillet, 12);
    const px = (mm: number) => 92 + mm * 4.35;
    const py = (mm: number) => 400 - mm * 4.35;
    const outer = `M ${px(0)} ${py(0)} L ${px(L)} ${py(0)} L ${px(L)} ${py(t)} L ${px(t + r)} ${py(t)} A ${r * 4.35} ${r * 4.35} 0 0 0 ${px(t)} ${py(t + r)} L ${px(t)} ${py(H)} L ${px(0)} ${py(H)} Z`;
    return { px, py, outer, t, r };
  }, [thick, fillet]);

  const selectedStroke = "#E85D04";
  const live = "#F3EEE6";
  const dim = "#8B949E";

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
                { id: "extrude" as const, label: `Extrude  ${thick.toFixed(1)} mm` },
                { id: "hole" as const, label: `Hole Ø   ${hole.toFixed(1)} mm` },
                { id: "fillet" as const, label: `Fillet R ${fillet.toFixed(1)} mm` },
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
                    <motion.span
                      layoutId={reduce ? undefined : "feature-rail"}
                      className="absolute inset-y-0 left-0 w-[3px] bg-signal"
                    />
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
              id="thick"
              label="Thickness"
              value={thick}
              min={4}
              max={14}
              onChange={(v) => {
                setFeature("extrude");
                setThick(v);
              }}
            />
            <Param
              id="hole"
              label="Hole Ø"
              value={hole}
              min={4}
              max={12}
              onChange={(v) => {
                setFeature("hole");
                setHole(v);
              }}
            />
            <Param
              id="fillet"
              label="Fillet R"
              value={fillet}
              min={0}
              max={12}
              onChange={(v) => {
                setFeature("fillet");
                setFillet(v);
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
            aria-label="Parametric L-bracket. Drag the thickness, hole, or fillet sliders to edit."
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
                sketchPath={sketchPath}
                hole={hole}
                feature={feature}
                live={live}
                selectedStroke={selectedStroke}
                dim={dim}
                L={L}
                H={H}
              />
            ) : (
              <SolidLayer
                geom={geom}
                layer={layer}
                feature={feature}
                live={live}
                selectedStroke={selectedStroke}
                dim={dim}
                hole={hole}
                W={W}
                thick={thick}
                ox={ox}
                oy={oy}
                s={s}
                L={L}
              />
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
                BRACKET PLATE · ISO
              </text>
              <text x="28" y="430">
                {cursor
                  ? `X ${cursor.x.toFixed(2)}   Y ${cursor.y.toFixed(2)}`
                  : "X —     Y —"}
              </text>
              <text x="520" y="412">
                CAD ENGINE
              </text>
              <text x="520" y="428">
                REV 14  ·  SCALE 1:2
              </text>
            </g>
          </svg>
        </div>
      </div>
    </div>
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
        step={0.1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </label>
  );
}

function SketchLayer({
  sketchPath,
  hole,
  feature,
  live,
  selectedStroke,
  dim,
  L,
  H,
}: {
  sketchPath: {
    px: (mm: number) => number;
    py: (mm: number) => number;
    outer: string;
    t: number;
    r: number;
  };
  hole: number;
  feature: Feature;
  live: string;
  selectedStroke: string;
  dim: string;
  L: number;
  H: number;
}) {
  const { px, py, outer, t } = sketchPath;
  const hx = 56;
  const hy = t / 2 + 18;
  return (
    <g>
      <line x1={px(0)} y1={py(-8)} x2={px(0)} y2={py(H + 8)} stroke={dim} strokeDasharray="3 4" />
      <line x1={px(-8)} y1={py(0)} x2={px(L + 8)} y2={py(0)} stroke={dim} strokeDasharray="3 4" />
      <path d={outer} fill="none" stroke={feature === "extrude" || feature === "fillet" ? selectedStroke : live} strokeWidth="1.6" />
      <circle
        cx={px(hx)}
        cy={py(hy)}
        r={(hole / 2) * 4.35}
        fill="none"
        stroke={feature === "hole" ? selectedStroke : live}
        strokeWidth="1.6"
      />
      <line
        x1={px(hx) - 10}
        y1={py(hy)}
        x2={px(hx) + 10}
        y2={py(hy)}
        stroke={feature === "hole" ? selectedStroke : dim}
        strokeWidth="0.8"
      />
      <line
        x1={px(hx)}
        y1={py(hy) - 10}
        x2={px(hx)}
        y2={py(hy) + 10}
        stroke={feature === "hole" ? selectedStroke : dim}
        strokeWidth="0.8"
      />
      <Dim
        x1={px(0)}
        x2={px(L)}
        y={py(-14)}
        label="80.0"
        color={feature === "extrude" ? selectedStroke : dim}
      />
      <Dim
        x1={px(hx) - (hole / 2) * 4.35}
        x2={px(hx) + (hole / 2) * 4.35}
        y={py(hy + 16)}
        label={`Ø${hole.toFixed(1)}`}
        color={feature === "hole" ? selectedStroke : dim}
      />
    </g>
  );
}

function IsoFace({
  corners,
  ox,
  oy,
  s,
  fill,
  stroke,
}: {
  corners: [number, number, number][];
  ox: number;
  oy: number;
  s: number;
  fill: string;
  stroke: string;
}) {
  return (
    <path
      d={toPath(pts(corners, ox, oy, s))}
      fill={fill}
      stroke={stroke}
      strokeWidth="1.35"
      strokeLinejoin="miter"
    />
  );
}

function SolidLayer({
  geom,
  layer,
  feature,
  live,
  selectedStroke,
  dim,
  hole,
  W,
  thick,
  ox,
  oy,
  s,
  L,
}: {
  geom: Geom;
  layer: Layer;
  feature: Feature;
  live: string;
  selectedStroke: string;
  dim: string;
  hole: number;
  W: number;
  thick: number;
  ox: number;
  oy: number;
  s: number;
  L: number;
}) {
  const t = thick;
  const H = 54;
  const bodyStroke = feature === "extrude" || feature === "fillet" ? selectedStroke : live;
  const holeStroke = feature === "hole" ? selectedStroke : live;
  const traces = layer === "trace";
  const path = layer === "path";
  const shadeA = "#12171F";
  const shadeB = "#1A222C";
  const shadeC = "#242C38";

  const zig: [number, number, number][] = [];
  for (let i = 0; i < 8; i += 1) {
    const z = 8 + i * ((W - 16) / 7);
    zig.push([t + 10, t + 0.4, z]);
    zig.push([L - 10, t + 0.4, z]);
  }

  return (
    <g>
      <IsoFace
        corners={[[0, 0, W], [L, 0, W], [L, t, W], [0, t, W]]}
        ox={ox}
        oy={oy}
        s={s}
        fill={shadeA}
        stroke={dim}
      />
      <IsoFace
        corners={[[0, 0, 0], [0, H, 0], [0, H, W], [0, 0, W]]}
        ox={ox}
        oy={oy}
        s={s}
        fill={shadeA}
        stroke={bodyStroke}
      />
      <IsoFace
        corners={[[t, 0, 0], [L, 0, 0], [L, t, 0], [t, t, 0]]}
        ox={ox}
        oy={oy}
        s={s}
        fill={shadeB}
        stroke={bodyStroke}
      />
      <IsoFace
        corners={[[L, 0, 0], [L, 0, W], [L, t, W], [L, t, 0]]}
        ox={ox}
        oy={oy}
        s={s}
        fill={shadeC}
        stroke={bodyStroke}
      />
      <IsoFace
        corners={[[t, t, 0], [L, t, 0], [L, t, W], [t, t, W]]}
        ox={ox}
        oy={oy}
        s={s}
        fill={shadeC}
        stroke={bodyStroke}
      />
      <IsoFace
        corners={[[0, t, 0], [t, t, 0], [t, H, 0], [0, H, 0]]}
        ox={ox}
        oy={oy}
        s={s}
        fill={shadeB}
        stroke={feature === "fillet" ? selectedStroke : bodyStroke}
      />
      <IsoFace
        corners={[[t, t, 0], [t, H, 0], [t, H, W], [t, t, W]]}
        ox={ox}
        oy={oy}
        s={s}
        fill={shadeB}
        stroke={feature === "fillet" ? selectedStroke : bodyStroke}
      />
      <IsoFace
        corners={[[0, H, 0], [t, H, 0], [t, H, W], [0, H, W]]}
        ox={ox}
        oy={oy}
        s={s}
        fill={shadeC}
        stroke={bodyStroke}
      />
      <ellipse
        cx={geom.holeH.x}
        cy={geom.holeH.y}
        rx={geom.holeRx}
        ry={geom.holeRy}
        fill="#0A0C0F"
        stroke={holeStroke}
        strokeWidth="1.5"
      />
      <ellipse
        cx={geom.holeV.x}
        cy={geom.holeV.y}
        rx={geom.holeRy * 0.9}
        ry={geom.holeRx * 1.1}
        fill="#0A0C0F"
        stroke={holeStroke}
        strokeWidth="1.5"
      />
      {traces ? (
        <g>
          <IsoFace
            corners={[
              [t + 6, t + 0.5, 6],
              [L - 8, t + 0.5, 6],
              [L - 8, t + 0.5, W - 6],
              [t + 6, t + 0.5, W - 6],
            ]}
            ox={ox}
            oy={oy}
            s={s}
            fill="none"
            stroke={selectedStroke}
          />
          <path
            d={toPath(
              pts(
                [
                  [t + 14, t + 0.5, 12],
                  [40, t + 0.5, 22],
                  [L - 16, t + 0.5, W / 2],
                ],
                ox,
                oy,
                s,
              ),
              false,
            )}
            fill="none"
            stroke={selectedStroke}
            strokeWidth="2"
          />
        </g>
      ) : null}
      {path ? (
        <path
          d={toPath(pts(zig, ox, oy, s), false)}
          fill="none"
          stroke={selectedStroke}
          strokeWidth="1.15"
        />
      ) : null}
      <text
        x={geom.holeH.x + 14}
        y={geom.holeH.y - 12}
        fill={holeStroke}
        fontFamily="IBM Plex Mono, ui-monospace, monospace"
        fontSize="11"
      >
        Ø{hole.toFixed(1)}
      </text>
      <text
        x={ox + 90}
        y={oy + 36}
        fill={dim}
        fontFamily="IBM Plex Mono, ui-monospace, monospace"
        fontSize="10"
      >
        {layer === "trace"
          ? "COPPER · VOLTERA"
          : layer === "path"
            ? "ZIGZAG POCKET"
            : `THK ${thick.toFixed(1)}`}
      </text>
    </g>
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
