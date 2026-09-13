import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { useSketchStore } from "../../store/sketchStore";
import {
  circleFromCenterRadius,
  rectangleFromCenter,
  rectangleFromCorners,
} from "./geometry";
import { resolveInference } from "./inference";
import { SketchToolbar } from "./SketchToolbar";
import {
  SketchTool,
  type InferenceSnap,
  type SketchEntity,
  type Vec2,
} from "./types";

export interface SketchCanvasProps {
  className?: string;
  /** World units across the shorter canvas axis. */
  viewSize?: number;
}

const SNAP_PX = 12;

/**
 * 2D sketcher overlay — SVG plane with toolbar, automatic inferencing UI,
 * and implemented drawing for Line / Rectangle / Circle (+ coincident & dimension).
 */
export function SketchCanvas({ className, viewSize = 220 }: SketchCanvasProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [viewport, setViewport] = useState({ w: 800, h: 600 });

  const active = useSketchStore((s) => s.active);
  const sketchName = useSketchStore((s) => s.sketchName);
  const entities = useSketchStore((s) => s.entities);
  const constraints = useSketchStore((s) => s.constraints);
  const selectedIds = useSketchStore((s) => s.selectedIds);
  const draft = useSketchStore((s) => s.draft);
  const inference = useSketchStore((s) => s.inference);
  const snappedCursor = useSketchStore((s) => s.snappedCursor);
  const statusMessage = useSketchStore((s) => s.statusMessage);
  const constructionMode = useSketchStore((s) => s.constructionMode);

  const setCursor = useSketchStore((s) => s.setCursor);
  const pointerDown = useSketchStore((s) => s.pointerDown);
  const cancelDraft = useSketchStore((s) => s.cancelDraft);
  const removeSelected = useSketchStore((s) => s.removeSelected);
  const setActiveTool = useSketchStore((s) => s.setActiveTool);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const ro = new ResizeObserver((entries) => {
      const cr = entries[0]?.contentRect;
      if (!cr) return;
      setViewport({ w: Math.max(1, cr.width), h: Math.max(1, cr.height) });
    });
    ro.observe(svg);
    return () => ro.disconnect();
  }, [active]);

  const worldScale = useMemo(() => {
    const minSide = Math.min(viewport.w, viewport.h);
    return viewSize / minSide;
  }, [viewSize, viewport.h, viewport.w]);

  const viewBox = useMemo(() => {
    const halfW = (viewport.w * worldScale) / 2;
    const halfH = (viewport.h * worldScale) / 2;
    // Y-down viewBox; geometry group flips to Y-up.
    return `${-halfW} ${-halfH} ${halfW * 2} ${halfH * 2}`;
  }, [viewport.h, viewport.w, worldScale]);

  const clientToWorld = useCallback(
    (clientX: number, clientY: number): Vec2 | null => {
      const svg = svgRef.current;
      if (!svg) return null;
      const rect = svg.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return null;
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      return {
        x: (clientX - cx) * worldScale,
        y: -((clientY - cy) * worldScale),
      };
    },
    [worldScale],
  );

  const thresholdWorld = SNAP_PX * worldScale;

  const runInference = useCallback(
    (raw: Vec2) => {
      const alignOrigin = draft?.points[0] ?? null;
      return resolveInference(raw, entities, {
        threshold: thresholdWorld,
        alignOrigin,
        enableGrid: false,
      });
    },
    [draft, entities, thresholdWorld],
  );

  const onPointerMove = useCallback(
    (e: ReactPointerEvent<SVGSVGElement>) => {
      const raw = clientToWorld(e.clientX, e.clientY);
      if (!raw) return;
      const { snapped, snaps } = runInference(raw);
      setCursor(raw, snaps, snapped);
    },
    [clientToWorld, runInference, setCursor],
  );

  const onPointerDown = useCallback(
    (e: ReactPointerEvent<SVGSVGElement>) => {
      if (e.button !== 0) return;
      e.currentTarget.setPointerCapture(e.pointerId);
      const raw = clientToWorld(e.clientX, e.clientY);
      if (!raw) return;
      const { snapped, snaps } = runInference(raw);
      setCursor(raw, snaps, snapped);
      pointerDown(snapped);
    },
    [clientToWorld, pointerDown, runInference, setCursor],
  );

  const onPointerLeave = useCallback(() => {
    setCursor(null, [], null);
  }, [setCursor]);

  useEffect(() => {
    if (!active) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        cancelDraft();
        setActiveTool(SketchTool.Select);
      } else if (e.key === "Delete" || e.key === "Backspace") {
        removeSelected();
      } else if (e.key === "l" || e.key === "L") {
        setActiveTool(SketchTool.Line);
      } else if (e.key === "r" || e.key === "R") {
        setActiveTool(SketchTool.CornerRectangle);
      } else if (e.key === "c" || e.key === "C") {
        setActiveTool(SketchTool.CenterPointCircle);
      } else if (e.key === "d" || e.key === "D") {
        setActiveTool(SketchTool.Dimension);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, cancelDraft, removeSelected, setActiveTool]);

  const preview = useMemo(
    () => buildPreview(draft, snappedCursor),
    [draft, snappedCursor],
  );

  if (!active) return null;

  const axisExtent = Math.max(viewport.w, viewport.h) * worldScale;

  return (
    <div
      className={`absolute inset-0 z-30 flex flex-col ${className ?? ""}`}
      data-testid="sketch-canvas"
    >
      <SketchToolbar />

      <div className="relative min-h-0 flex-1">
        <div className="pointer-events-none absolute inset-0 bg-accent/10" />

        <svg
          ref={svgRef}
          className="absolute inset-0 h-full w-full cursor-crosshair touch-none"
          viewBox={viewBox}
          preserveAspectRatio="none"
          onPointerMove={onPointerMove}
          onPointerDown={onPointerDown}
          onPointerLeave={onPointerLeave}
        >
          <defs>
            <pattern
              id="sketch-grid"
              width="10"
              height="10"
              patternUnits="userSpaceOnUse"
            >
              <path
                d="M 10 0 L 0 0 0 10"
                fill="none"
                stroke="rgba(100,116,139,0.28)"
                strokeWidth="0.35"
              />
            </pattern>
          </defs>

          <g transform="scale(1,-1)">
            <rect
              x={-axisExtent}
              y={-axisExtent}
              width={axisExtent * 2}
              height={axisExtent * 2}
              fill="url(#sketch-grid)"
              opacity={0.55}
            />

            <line
              x1={-axisExtent}
              y1={0}
              x2={axisExtent}
              y2={0}
              stroke="#64748b"
              strokeWidth={0.4}
            />
            <line
              x1={0}
              y1={-axisExtent}
              x2={0}
              y2={axisExtent}
              stroke="#64748b"
              strokeWidth={0.4}
            />
            <circle cx={0} cy={0} r={1.2} fill="#94a3b8" />

            {entities.map((entity) => (
              <EntityGraphic
                key={entity.id}
                entity={entity}
                selected={selectedIds.includes(entity.id)}
              />
            ))}

            {preview}

            <InferenceOverlay snaps={inference} cursor={snappedCursor} />
          </g>
        </svg>

        <div className="pointer-events-none absolute bottom-2 left-2 right-2 flex items-end justify-between gap-2">
          <div className="rounded border border-border/80 bg-card/90 px-2 py-1 text-[10px] text-muted-foreground">
            <span className="font-medium text-accent">{sketchName}</span>
            <span className="mx-1.5 text-faint">·</span>
            <span>{statusMessage}</span>
            {constructionMode && (
              <>
                <span className="mx-1.5 text-faint">·</span>
                <span className="text-amber-300">construction</span>
              </>
            )}
          </div>
          <div className="rounded border border-border/80 bg-card/90 px-2 py-1 font-mono text-[10px] text-faint">
            {entities.length} ents · {constraints.length} cons
            {snappedCursor && (
              <>
                {" "}
                · ({snappedCursor.x.toFixed(1)}, {snappedCursor.y.toFixed(1)})
              </>
            )}
            {inference[0] && (
              <>
                {" "}
                · snap:{" "}
                <span className="text-accent">{inference[0].label}</span>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function EntityGraphic({
  entity,
  selected,
}: {
  entity: SketchEntity;
  selected: boolean;
}) {
  const stroke = entity.construction
    ? "#f59e0b"
    : selected
      ? "#e85d04"
      : "#e2e8f0";
  const dash = entity.construction ? "4 3" : undefined;
  const width = selected ? 1.6 : 1.1;

  switch (entity.kind) {
    case "line":
      return (
        <g>
          <line
            x1={entity.start.x}
            y1={entity.start.y}
            x2={entity.end.x}
            y2={entity.end.y}
            stroke={stroke}
            strokeWidth={width}
            strokeDasharray={dash}
          />
          <circle cx={entity.start.x} cy={entity.start.y} r={1.4} fill={stroke} />
          <circle cx={entity.end.x} cy={entity.end.y} r={1.4} fill={stroke} />
        </g>
      );
    case "rectangle": {
      const w = entity.max.x - entity.min.x;
      const h = entity.max.y - entity.min.y;
      return (
        <rect
          x={entity.min.x}
          y={entity.min.y}
          width={w}
          height={h}
          fill="none"
          stroke={stroke}
          strokeWidth={width}
          strokeDasharray={dash}
        />
      );
    }
    case "circle":
      return (
        <g>
          <circle
            cx={entity.center.x}
            cy={entity.center.y}
            r={entity.radius}
            fill="none"
            stroke={stroke}
            strokeWidth={width}
            strokeDasharray={dash}
          />
          <circle
            cx={entity.center.x}
            cy={entity.center.y}
            r={1.2}
            fill={stroke}
          />
        </g>
      );
    case "point":
      return (
        <circle
          cx={entity.position.x}
          cy={entity.position.y}
          r={2}
          fill={stroke}
        />
      );
    case "dimension":
      return (
        <g transform={`translate(${entity.labelAt.x}, ${entity.labelAt.y}) scale(1,-1)`}>
          <rect
            x={-2}
            y={-10}
            width={Math.max(36, entity.value.toFixed(2).length * 7)}
            height={12}
            rx={2}
            fill="#0f172a"
            stroke="#e85d04"
            strokeWidth={0.8}
          />
          <text
            x={2}
            y={-1}
            fill="#7dd3fc"
            fontSize={8}
            fontFamily="IBM Plex Sans, sans-serif"
          >
            {entity.value.toFixed(2)}
          </text>
        </g>
      );
    case "stub":
      return (
        <g opacity={0.5}>
          {entity.points.map((p, i) => (
            <circle key={i} cx={p.x} cy={p.y} r={1.5} fill="#64748b" />
          ))}
        </g>
      );
    default:
      return null;
  }
}

function buildPreview(
  draft: { tool: SketchTool; points: Vec2[] } | null,
  cursor: Vec2 | null,
): ReactNode {
  if (!draft || !cursor || draft.points.length === 0) return null;
  const start = draft.points[0];
  const stroke = "#e85d04";
  const dash = "3 2";

  if (draft.tool === SketchTool.Line) {
    return (
      <line
        x1={start.x}
        y1={start.y}
        x2={cursor.x}
        y2={cursor.y}
        stroke={stroke}
        strokeWidth={1}
        strokeDasharray={dash}
      />
    );
  }

  if (
    draft.tool === SketchTool.CornerRectangle ||
    draft.tool === SketchTool.CenterPointRectangle
  ) {
    const box =
      draft.tool === SketchTool.CenterPointRectangle
        ? rectangleFromCenter(start, cursor)
        : rectangleFromCorners(start, cursor);
    return (
      <rect
        x={box.min.x}
        y={box.min.y}
        width={box.max.x - box.min.x}
        height={box.max.y - box.min.y}
        fill="rgba(56,189,248,0.08)"
        stroke={stroke}
        strokeWidth={1}
        strokeDasharray={dash}
      />
    );
  }

  if (draft.tool === SketchTool.CenterPointCircle) {
    const c = circleFromCenterRadius(start, cursor);
    return (
      <g>
        <circle
          cx={c.center.x}
          cy={c.center.y}
          r={c.radius}
          fill="rgba(56,189,248,0.06)"
          stroke={stroke}
          strokeWidth={1}
          strokeDasharray={dash}
        />
        <line
          x1={start.x}
          y1={start.y}
          x2={cursor.x}
          y2={cursor.y}
          stroke={stroke}
          strokeWidth={0.6}
          strokeDasharray="2 2"
        />
      </g>
    );
  }

  return null;
}

/** Automatic inferencing UI: snap glyphs + H/V alignment guides. */
function InferenceOverlay({
  snaps,
  cursor,
}: {
  snaps: InferenceSnap[];
  cursor: Vec2 | null;
}) {
  if (!cursor || snaps.length === 0) return null;

  return (
    <g className="inference-overlay">
      {snaps.map((snap, i) => {
        if (
          (snap.kind === "horizontal" || snap.kind === "vertical") &&
          snap.guideFrom
        ) {
          return (
            <line
              key={`guide-${i}`}
              x1={snap.guideFrom.x}
              y1={snap.guideFrom.y}
              x2={snap.position.x}
              y2={snap.position.y}
              stroke="#22d3ee"
              strokeWidth={0.5}
              strokeDasharray="4 3"
              opacity={0.9}
            />
          );
        }
        return null;
      })}

      {snaps.map((snap, i) => (
        <g key={`snap-${i}`} transform={`translate(${snap.position.x}, ${snap.position.y})`}>
          <SnapGlyph kind={snap.kind} />
          <g transform="scale(1,-1)">
            <text
              x={4}
              y={-4}
              fill="#67e8f9"
              fontSize={7}
              fontFamily="IBM Plex Sans, sans-serif"
            >
              {snap.label}
            </text>
          </g>
        </g>
      ))}
    </g>
  );
}

function SnapGlyph({ kind }: { kind: InferenceSnap["kind"] }) {
  const color = "#22d3ee";
  switch (kind) {
    case "endpoint":
    case "coincident":
      return <rect x={-2.5} y={-2.5} width={5} height={5} fill={color} />;
    case "midpoint":
      return (
        <polygon points="0,-3.5 3.5,3.5 -3.5,3.5" fill={color} />
      );
    case "center":
      return (
        <g>
          <circle r={3.5} fill="none" stroke={color} strokeWidth={0.8} />
          <circle r={1.2} fill={color} />
        </g>
      );
    case "horizontal":
    case "vertical":
      return (
        <g stroke={color} strokeWidth={0.9}>
          <line x1={-4} y1={0} x2={4} y2={0} />
          <line x1={0} y1={-4} x2={0} y2={4} />
        </g>
      );
    case "grid":
      return <circle r={2} fill={color} opacity={0.7} />;
    default:
      return <circle r={2.5} fill={color} />;
  }
}

export default SketchCanvas;
