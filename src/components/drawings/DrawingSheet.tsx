import { useMemo, useRef, type PointerEvent as ReactPointerEvent } from "react";
import {
  formatDimensionValue,
  projectBoxOutline,
  twoPointLinearDimension,
} from "../../drawings/projection";
import { useDrawingStore } from "../../store/drawingStore";
import {
  DRAWING_STYLES,
  sheetPixelSize,
  type DrawingDimension,
  type DrawingView,
} from "../../store/drawingTypes";

export interface DrawingSheetProps {
  className?: string;
}

function titleBlockCells(props: {
  title: string;
  partNumber: string;
  revision: string;
  scale: string;
  material: string;
  finish: string;
  drawnBy: string;
  checkedBy: string;
  date: string;
  company: string;
  units: string;
  projection: string;
  sheetName: string;
  sheetIndex: number;
  sheetCount: number;
}) {
  return [
    { label: "TITLE", value: props.title, span: 2 },
    { label: "PART NO.", value: props.partNumber, span: 1 },
    { label: "REV", value: props.revision, span: 1 },
    { label: "SCALE", value: props.scale, span: 1 },
    { label: "MATERIAL", value: props.material, span: 1 },
    { label: "FINISH", value: props.finish, span: 1 },
    { label: "UNITS", value: props.units, span: 1 },
    { label: "DRAWN", value: props.drawnBy || "—", span: 1 },
    { label: "CHECKED", value: props.checkedBy || "—", span: 1 },
    { label: "DATE", value: props.date, span: 1 },
    {
      label: "SHEET",
      value: `${props.sheetIndex}/${props.sheetCount} · ${props.sheetName}`,
      span: 1,
    },
    { label: "PROJ", value: props.projection === "thirdAngle" ? "3rd ∠" : "1st ∠", span: 1 },
    { label: "COMPANY", value: props.company, span: 2 },
  ];
}

function ViewGeometry({
  view,
  selected,
  onSelect,
}: {
  view: DrawingView;
  selected: boolean;
  onSelect: () => void;
}) {
  const outline = useMemo(
    () =>
      projectBoxOutline(
        view.modelBox,
        view.orientation,
        view.origin,
        view.scale,
        view.rotationDeg,
      ),
    [view],
  );

  const path = outline.points
    .map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`)
    .join(" ");

  const stroke = selected ? "#38bdf8" : view.status === "scaffold" ? "#64748b" : "#0f172a";
  const dash = view.status === "scaffold" ? "4 3" : undefined;

  return (
    <g
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      className="cursor-pointer"
    >
      {/* Center lines */}
      <line
        x1={outline.bounds.min.x - 6}
        y1={(outline.bounds.min.y + outline.bounds.max.y) / 2}
        x2={outline.bounds.max.x + 6}
        y2={(outline.bounds.min.y + outline.bounds.max.y) / 2}
        stroke="#94a3b8"
        strokeWidth={0.35}
        strokeDasharray="6 2 1 2"
      />
      <line
        x1={(outline.bounds.min.x + outline.bounds.max.x) / 2}
        y1={outline.bounds.min.y - 6}
        x2={(outline.bounds.min.x + outline.bounds.max.x) / 2}
        y2={outline.bounds.max.y + 6}
        stroke="#94a3b8"
        strokeWidth={0.35}
        strokeDasharray="6 2 1 2"
      />
      <path
        d={`${path} Z`}
        fill={selected ? "rgba(56,189,248,0.08)" : "rgba(255,255,255,0.92)"}
        stroke={stroke}
        strokeWidth={selected ? 0.7 : 0.45}
        strokeDasharray={dash}
      />
      {/* Simple internal feature hint */}
      <rect
        x={view.origin.x - 12 * view.scale}
        y={view.origin.y - 8 * view.scale}
        width={24 * view.scale}
        height={16 * view.scale}
        fill="none"
        stroke={stroke}
        strokeWidth={0.35}
        strokeDasharray={dash}
      />
      {view.type === "section" && view.sectionPlane && (
        <line
          x1={outline.bounds.min.x}
          y1={view.origin.y}
          x2={outline.bounds.max.x}
          y2={view.origin.y}
          stroke="#e11d48"
          strokeWidth={0.5}
          strokeDasharray="3 2"
        />
      )}
      {view.type === "detail" && view.detailCircle && (
        <circle
          cx={view.origin.x}
          cy={view.origin.y}
          r={view.detailCircle.radius}
          fill="none"
          stroke="#0ea5e9"
          strokeWidth={0.45}
          strokeDasharray="2 2"
        />
      )}
      <text
        x={view.origin.x}
        y={outline.bounds.max.y + 8}
        textAnchor="middle"
        fontSize={3.2}
        fill="#334155"
        style={{ fontFamily: "IBM Plex Sans, sans-serif" }}
      >
        {view.name}
        {view.status === "scaffold" ? " (scaffold)" : ""} · {view.orientation}
      </text>
    </g>
  );
}

function LinearDimGraphic({
  dim,
  units,
  precision,
  selected,
  onSelect,
}: {
  dim: DrawingDimension;
  units: "mm" | "inch";
  precision: number;
  selected: boolean;
  onSelect: () => void;
}) {
  const geom = twoPointLinearDimension(dim.pointA, dim.pointB, dim.offset);
  const value =
    dim.valueOverride ??
    formatDimensionValue(geom.distance, units, precision);
  const stroke = dim.status === "dangling" ? "#f43f5e" : selected ? "#38bdf8" : "#0f172a";

  return (
    <g
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      className="cursor-pointer"
    >
      <line
        x1={geom.extA[0].x}
        y1={geom.extA[0].y}
        x2={geom.extA[1].x}
        y2={geom.extA[1].y}
        stroke={stroke}
        strokeWidth={0.25}
      />
      <line
        x1={geom.extB[0].x}
        y1={geom.extB[0].y}
        x2={geom.extB[1].x}
        y2={geom.extB[1].y}
        stroke={stroke}
        strokeWidth={0.25}
      />
      <line
        x1={geom.dimLine[0].x}
        y1={geom.dimLine[0].y}
        x2={geom.dimLine[1].x}
        y2={geom.dimLine[1].y}
        stroke={stroke}
        strokeWidth={0.35}
      />
      {/* Arrowheads (simple) */}
      <circle cx={geom.dimLine[0].x} cy={geom.dimLine[0].y} r={0.8} fill={stroke} />
      <circle cx={geom.dimLine[1].x} cy={geom.dimLine[1].y} r={0.8} fill={stroke} />
      <text
        x={geom.textAnchor.x}
        y={geom.textAnchor.y - 1.5}
        textAnchor="middle"
        fontSize={3.5}
        fill={stroke}
        style={{ fontFamily: "IBM Plex Sans, sans-serif" }}
      >
        {value}
        {dim.status === "scaffold" ? "*" : ""}
        {dim.status === "dangling" ? " !" : ""}
      </text>
    </g>
  );
}

/**
 * SVG drawing sheet with title block, projected geometry, and dimensions.
 * Custom Templates / Sheets / Styles / Properties drive the sheet chrome.
 */
export function DrawingSheet({ className }: DrawingSheetProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);

  const properties = useDrawingStore((s) => s.properties);
  const styleId = useDrawingStore((s) => s.styleId);
  const styles = useDrawingStore((s) => s.styles);
  const sheets = useDrawingStore((s) => s.sheets);
  const activeSheetId = useDrawingStore((s) => s.activeSheetId);
  const views = useDrawingStore((s) => s.views);
  const dimensions = useDrawingStore((s) => s.dimensions);
  const annotations = useDrawingStore((s) => s.annotations);
  const tables = useDrawingStore((s) => s.tables);
  const selectedViewId = useDrawingStore((s) => s.selectedViewId);
  const selectedDimensionId = useDrawingStore((s) => s.selectedDimensionId);
  const draftDimPoint = useDrawingStore((s) => s.draftDimPoint);
  const activeTool = useDrawingStore((s) => s.activeTool);

  const selectView = useDrawingStore((s) => s.selectView);
  const selectDimension = useDrawingStore((s) => s.selectDimension);
  const placeDimensionClick = useDrawingStore((s) => s.placeDimensionClick);

  const style = styles.find((s) => s.id === styleId) ?? DRAWING_STYLES[0];
  const size = sheetPixelSize(properties.format, properties.landscape);
  const margin = 8;
  const tbH = 42;
  const tbW = Math.min(160, size.widthMm * 0.38);
  const activeSheet = sheets.find((s) => s.id === activeSheetId) ?? sheets[0];
  const sheetIndex = sheets.findIndex((s) => s.id === activeSheetId) + 1;

  const cells = titleBlockCells({
    ...properties,
    sheetName: activeSheet?.name ?? "Sheet",
    sheetIndex: Math.max(1, sheetIndex),
    sheetCount: sheets.length,
  });

  function clientToSheet(e: ReactPointerEvent<SVGSVGElement>): Vec2Like | null {
    const svg = svgRef.current;
    if (!svg) return null;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const ctm = svg.getScreenCTM();
    if (!ctm) return null;
    const local = pt.matrixTransform(ctm.inverse());
    return { x: local.x, y: local.y };
  }

  function onPointerDown(e: ReactPointerEvent<SVGSVGElement>) {
    if (activeTool !== "twoPointLinear") {
      if (e.target === e.currentTarget) selectView(null);
      return;
    }
    const p = clientToSheet(e);
    if (!p) return;
    placeDimensionClick(p);
  }

  return (
    <div className={`flex h-full min-h-0 w-full items-center justify-center overflow-auto bg-background p-4 ${className ?? ""}`}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${size.widthMm} ${size.heightMm}`}
        width="100%"
        height="100%"
        className="max-h-full max-w-full rounded border border-border bg-[#e8edf5]"
        style={{ aspectRatio: `${size.widthMm} / ${size.heightMm}` }}
        onPointerDown={onPointerDown}
      >
        {/* Sheet border */}
        <rect
          x={margin}
          y={margin}
          width={size.widthMm - margin * 2}
          height={size.heightMm - margin * 2}
          fill="none"
          stroke="#0f172a"
          strokeWidth={0.6}
        />
        <rect
          x={margin + 3}
          y={margin + 3}
          width={size.widthMm - margin * 2 - 6}
          height={size.heightMm - margin * 2 - 6}
          fill="none"
          stroke="#0f172a"
          strokeWidth={0.25}
        />

        {/* Views */}
        {views
          .filter((v) => v.visible)
          .map((view) => (
            <ViewGeometry
              key={view.id}
              view={view}
              selected={selectedViewId === view.id}
              onSelect={() => selectView(view.id)}
            />
          ))}

        {/* Dimensions */}
        {properties.annotationsVisible &&
          dimensions.map((dim) =>
            dim.type === "twoPointLinear" || dim.status === "scaffold" ? (
              <LinearDimGraphic
                key={dim.id}
                dim={dim}
                units={properties.units}
                precision={properties.precision}
                selected={selectedDimensionId === dim.id}
                onSelect={() => selectDimension(dim.id)}
              />
            ) : null,
          )}

        {/* Draft dim point */}
        {draftDimPoint && (
          <circle
            cx={draftDimPoint.x}
            cy={draftDimPoint.y}
            r={1.2}
            fill="#38bdf8"
          />
        )}

        {/* Annotation placeholders */}
        {properties.annotationsVisible &&
          annotations.map((ann) => (
            <g key={ann.id}>
              {ann.type === "balloon" ? (
                <>
                  <circle
                    cx={ann.position.x}
                    cy={ann.position.y}
                    r={4}
                    fill="#fff"
                    stroke="#0f172a"
                    strokeWidth={0.4}
                    strokeDasharray="2 1"
                  />
                  <text
                    x={ann.position.x}
                    y={ann.position.y + 1.2}
                    textAnchor="middle"
                    fontSize={3}
                    fill="#0f172a"
                  >
                    {ann.text}
                  </text>
                </>
              ) : (
                <text
                  x={ann.position.x}
                  y={ann.position.y}
                  fontSize={2.8}
                  fill="#475569"
                  style={{ fontFamily: style.fontFamily }}
                >
                  {ann.text.split("\n")[0]}
                  {ann.status === "scaffold" ? " *" : ""}
                </text>
              )}
            </g>
          ))}

        {/* Table placeholders (top-left revision-style) */}
        {tables.map((tbl) => {
          const x = tbl.position.x;
          const y = tbl.position.y;
          const colW = 28;
          return (
            <g key={tbl.id} opacity={0.9}>
              <text
                x={x}
                y={y}
                fontSize={2.6}
                fill="#334155"
                style={{ fontFamily: style.fontFamily }}
              >
                {tbl.name}
                {tbl.status === "scaffold" ? " *" : ""}
              </text>
              {tbl.columns.map((c, i) => (
                <text
                  key={c}
                  x={x + i * colW}
                  y={y + 5}
                  fontSize={2.2}
                  fill="#64748b"
                >
                  {c}
                </text>
              ))}
              {tbl.rows.slice(0, 2).map((row, ri) =>
                row.map((cell, ci) => (
                  <text
                    key={`${ri}-${ci}`}
                    x={x + ci * colW}
                    y={y + 10 + ri * 4}
                    fontSize={2.2}
                    fill="#0f172a"
                  >
                    {cell}
                  </text>
                )),
              )}
            </g>
          );
        })}

        {/* Title block */}
        <g transform={`translate(${size.widthMm - margin - 3 - tbW}, ${size.heightMm - margin - 3 - tbH})`}>
          <rect
            x={0}
            y={0}
            width={tbW}
            height={tbH}
            fill="#f8fafc"
            stroke="#0f172a"
            strokeWidth={0.45}
          />
          {/* Company banner */}
          <rect x={0} y={0} width={tbW} height={7} fill="#1e293b" />
          <text
            x={tbW / 2}
            y={4.8}
            textAnchor="middle"
            fontSize={3.2}
            fill="#e2e8f0"
            fontWeight={600}
            style={{ fontFamily: style.fontFamily }}
          >
            {properties.company}
          </text>
          {cells.map((cell, i) => {
            const col = i % 4;
            const row = Math.floor(i / 4);
            const cw = tbW / 4;
            const ch = (tbH - 7) / 3;
            const cx = col * cw;
            const cy = 7 + row * ch;
            return (
              <g key={`${cell.label}-${i}`}>
                <rect
                  x={cx}
                  y={cy}
                  width={cw * (cell.span > 1 && col === 0 ? Math.min(cell.span, 4 - col) : 1)}
                  height={ch}
                  fill="none"
                  stroke="#94a3b8"
                  strokeWidth={0.2}
                />
                <text
                  x={cx + 1.2}
                  y={cy + 2.8}
                  fontSize={1.8}
                  fill="#64748b"
                  style={{ fontFamily: style.fontFamily }}
                >
                  {cell.label}
                </text>
                <text
                  x={cx + 1.2}
                  y={cy + ch - 1.5}
                  fontSize={2.6}
                  fill="#0f172a"
                  style={{ fontFamily: style.fontFamily }}
                >
                  {cell.value}
                </text>
              </g>
            );
          })}
        </g>

        {/* Projection symbol hint */}
        <g transform={`translate(${margin + 8}, ${size.heightMm - margin - 22})`}>
          <circle cx={6} cy={6} r={5} fill="none" stroke="#64748b" strokeWidth={0.35} />
          <circle cx={6} cy={6} r={2} fill="none" stroke="#64748b" strokeWidth={0.35} />
          <text x={14} y={7.5} fontSize={2.4} fill="#64748b">
            {properties.projection === "thirdAngle" ? "3rd angle" : "1st angle"} ·{" "}
            {properties.units} · prec {properties.precision}
          </text>
        </g>
      </svg>
    </div>
  );
}

type Vec2Like = { x: number; y: number };

export default DrawingSheet;
