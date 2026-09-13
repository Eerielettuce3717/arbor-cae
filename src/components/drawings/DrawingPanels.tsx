import type { ReactNode } from "react";
import { useDrawingStore, type DrawingPanelId } from "../../store/drawingStore";
import {
  ANNOTATION_CATALOG,
  DIMENSION_CATALOG,
  SHEET_FORMATS,
  TABLE_CATALOG,
  VIEW_CATALOG,
  type DrawingUnit,
  type MbdCheckStatus,
  type ProjectionStandard,
  type SheetFormat,
} from "../../store/drawingTypes";

const inputClass =
  "w-full rounded border border-border bg-background px-2 py-1 text-xs text-foreground outline-none focus:border-accent";

function ScaffoldBadge() {
  return (
    <span className="rounded bg-muted px-1 py-0.5 text-[9px] uppercase tracking-wide text-faint">
      UI only
    </span>
  );
}

function mbdColor(status: MbdCheckStatus): string {
  switch (status) {
    case "pass":
      return "text-emerald-400";
    case "warn":
      return "text-amber-300";
    case "fail":
      return "text-rose-400";
    default:
      return "text-faint";
  }
}

export function DrawingSidePanel() {
  const panel = useDrawingStore((s) => s.activePanel);
  const setActivePanel = useDrawingStore((s) => s.setActivePanel);
  if (panel === "none") return null;

  return (
    <div
      className="absolute inset-0 z-40 flex items-start justify-end bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        if (e.target === e.currentTarget) setActivePanel("none");
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") setActivePanel("none");
      }}
    >
      <div className="flex max-h-[calc(100%-2rem)] w-full max-w-md flex-col overflow-hidden rounded-lg border border-border bg-card">
        <header className="flex items-center justify-between border-b border-border px-3 py-2">
          <h2 className="text-sm font-semibold text-foreground">
            {panelTitle(panel)}
          </h2>
          <button
            type="button"
            onClick={() => setActivePanel("none")}
            className="rounded px-2 py-1 text-sm text-muted-foreground hover:bg-hover hover:text-accent"
            aria-label="Close"
          >
            ×
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-hidden">
          {panel === "templates" && <TemplatesPanel />}
          {panel === "sheets" && <SheetsPanel />}
          {panel === "styles" && <StylesPanel />}
          {panel === "properties" && <PropertiesPanel />}
          {panel === "views" && <ViewsPanel />}
          {panel === "dimensions" && <DimensionsPanel />}
          {panel === "annotations" && <AnnotationsPanel />}
          {panel === "tables" && <TablesPanel />}
          {panel === "mbd" && <MbdPanel />}
          {panel === "tolerances" && <TolerancesPanel />}
          {panel === "export" && <ExportPanel />}
        </div>
      </div>
    </div>
  );
}

function panelTitle(panel: DrawingPanelId): string {
  switch (panel) {
    case "templates":
      return "Custom Templates";
    case "sheets":
      return "Sheets";
    case "styles":
      return "Styles";
    case "properties":
      return "Properties";
    case "views":
      return "Views";
    case "dimensions":
      return "Dimensions";
    case "annotations":
      return "Annotations";
    case "tables":
      return "Tables";
    case "mbd":
      return "Model-Based Definition";
    case "tolerances":
      return "Default Tolerances Library";
    case "export":
      return "Update / Export / Print";
    default:
      return "Drawing";
  }
}

function TemplatesPanel() {
  const templates = useDrawingStore((s) => s.templates);
  const templateId = useDrawingStore((s) => s.templateId);
  const applyTemplate = useDrawingStore((s) => s.applyTemplate);

  return (
    <div className="space-y-2 overflow-y-auto p-3 text-xs">
      <p className="text-[11px] text-faint">
        Apply a custom title-block template. Format, projection, and company fields
        update the active sheet.
      </p>
      {templates.map((tpl) => (
        <button
          key={tpl.id}
          type="button"
          onClick={() => applyTemplate(tpl.id)}
          className={`flex w-full flex-col rounded border px-2 py-2 text-left ${
            templateId === tpl.id
              ? "border-accent bg-accent/10"
              : "border-border hover:bg-hover"
          }`}
        >
          <span className="font-medium text-foreground">{tpl.name}</span>
          <span className="text-[10px] text-faint">
            {SHEET_FORMATS[tpl.format].label} ·{" "}
            {tpl.landscape ? "Landscape" : "Portrait"} · {tpl.projection} ·{" "}
            {tpl.titleBlockStyle}
          </span>
        </button>
      ))}
      {templates.length === 0 && (
        <p className="text-faint">No templates available.</p>
      )}
    </div>
  );
}

function SheetsPanel() {
  const sheets = useDrawingStore((s) => s.sheets);
  const activeSheetId = useDrawingStore((s) => s.activeSheetId);
  const setActiveSheet = useDrawingStore((s) => s.setActiveSheet);
  const addSheet = useDrawingStore((s) => s.addSheet);
  const renameSheet = useDrawingStore((s) => s.renameSheet);

  return (
    <div className="flex h-full flex-col p-3 text-xs">
      <p className="mb-2 text-[11px] text-faint">
        Manage multi-sheet drawings. Each sheet carries format and template.
      </p>
      <button
        type="button"
        onClick={() => addSheet()}
        className="mb-2 rounded bg-accent px-2 py-1.5 text-xs text-accent-foreground hover:bg-accent"
      >
        + Add Sheet
      </button>
      <div className="min-h-0 flex-1 space-y-1 overflow-y-auto">
        {sheets.map((sh) => (
          <div
            key={sh.id}
            className={`rounded border p-2 ${
              activeSheetId === sh.id
                ? "border-accent bg-accent/10"
                : "border-border"
            }`}
          >
            <button
              type="button"
              className="w-full text-left font-medium text-foreground"
              onClick={() => setActiveSheet(sh.id)}
            >
              {sh.name}
            </button>
            <div className="mt-1 text-[10px] text-faint">
              {sh.format} · {sh.landscape ? "Land" : "Port"}
            </div>
            <input
              className={`${inputClass} mt-1`}
              value={sh.name}
              onChange={(e) => renameSheet(sh.id, e.target.value)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function StylesPanel() {
  const styles = useDrawingStore((s) => s.styles);
  const styleId = useDrawingStore((s) => s.styleId);
  const setStyle = useDrawingStore((s) => s.setStyle);

  return (
    <div className="space-y-2 overflow-y-auto p-3 text-xs">
      <p className="text-[11px] text-faint">
        Drafting styles control line weight, font, and dimension appearance.
      </p>
      {styles.map((sty) => (
        <button
          key={sty.id}
          type="button"
          onClick={() => setStyle(sty.id)}
          className={`flex w-full flex-col rounded border px-2 py-2 text-left ${
            styleId === sty.id
              ? "border-accent bg-accent/10"
              : "border-border hover:bg-hover"
          }`}
        >
          <span className="font-medium text-foreground">{sty.name}</span>
          <span className="text-[10px] text-faint">
            {sty.lineWeightMm} mm · {sty.fontSizeMm} pt · arrow {sty.dimArrowSize}
          </span>
        </button>
      ))}
    </div>
  );
}

function PropertiesPanel() {
  const properties = useDrawingStore((s) => s.properties);
  const updateProperties = useDrawingStore((s) => s.updateProperties);

  return (
    <div className="space-y-3 overflow-y-auto p-3 text-xs">
      <p className="text-[11px] text-faint">
        Units, precision, annotations visibility, and sheet formats feed the title
        block.
      </p>

      <Field label="Units">
        <select
          className={inputClass}
          value={properties.units}
          onChange={(e) =>
            updateProperties({ units: e.target.value as DrawingUnit })
          }
        >
          <option value="mm">Millimeters</option>
          <option value="inch">Inches</option>
        </select>
      </Field>

      <Field label="Precision">
        <input
          type="number"
          min={0}
          max={6}
          className={inputClass}
          value={properties.precision}
          onChange={(e) =>
            updateProperties({ precision: Number(e.target.value) || 0 })
          }
        />
      </Field>

      <Field label="Annotations">
        <label className="flex items-center gap-2 text-foreground">
          <input
            type="checkbox"
            checked={properties.annotationsVisible}
            onChange={(e) =>
              updateProperties({ annotationsVisible: e.target.checked })
            }
          />
          Show dimensions & annotations
        </label>
      </Field>

      <Field label="Format">
        <select
          className={inputClass}
          value={properties.format}
          onChange={(e) =>
            updateProperties({ format: e.target.value as SheetFormat })
          }
        >
          {Object.entries(SHEET_FORMATS).map(([id, sz]) => (
            <option key={id} value={id}>
              {sz.label}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Orientation">
        <select
          className={inputClass}
          value={properties.landscape ? "landscape" : "portrait"}
          onChange={(e) =>
            updateProperties({ landscape: e.target.value === "landscape" })
          }
        >
          <option value="landscape">Landscape</option>
          <option value="portrait">Portrait</option>
        </select>
      </Field>

      <Field label="Projection">
        <select
          className={inputClass}
          value={properties.projection}
          onChange={(e) =>
            updateProperties({
              projection: e.target.value as ProjectionStandard,
            })
          }
        >
          <option value="thirdAngle">Third Angle</option>
          <option value="firstAngle">First Angle</option>
        </select>
      </Field>

      <Field label="Title">
        <input
          className={inputClass}
          value={properties.title}
          onChange={(e) => updateProperties({ title: e.target.value })}
        />
      </Field>
      <Field label="Part Number">
        <input
          className={inputClass}
          value={properties.partNumber}
          onChange={(e) => updateProperties({ partNumber: e.target.value })}
        />
      </Field>
      <Field label="Scale">
        <input
          className={inputClass}
          value={properties.scale}
          onChange={(e) => updateProperties({ scale: e.target.value })}
        />
      </Field>
      <Field label="Material">
        <input
          className={inputClass}
          value={properties.material}
          onChange={(e) => updateProperties({ material: e.target.value })}
        />
      </Field>
      <Field label="Revision">
        <input
          className={inputClass}
          value={properties.revision}
          onChange={(e) => updateProperties({ revision: e.target.value })}
        />
      </Field>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block space-y-1">
      <span className="text-[10px] font-semibold uppercase tracking-wide text-faint">
        {label}
      </span>
      {children}
    </label>
  );
}

function ViewsPanel() {
  const views = useDrawingStore((s) => s.views);
  const selectedViewId = useDrawingStore((s) => s.selectedViewId);
  const selectView = useDrawingStore((s) => s.selectView);
  const setActiveTool = useDrawingStore((s) => s.setActiveTool);

  return (
    <div className="flex h-full flex-col text-xs">
      <div className="border-b border-border p-3">
        <p className="mb-2 text-[11px] text-faint">
          Target views — Projected is live; others are scaffolded.
        </p>
        <div className="flex flex-wrap gap-1">
          {VIEW_CATALOG.map((v) => (
            <button
              key={v.type}
              type="button"
              onClick={() => setActiveTool(v.type)}
              className="rounded border border-border px-2 py-1 text-[11px] text-muted-foreground hover:border-accent hover:text-accent"
              title={v.description}
            >
              {v.label}
              {!v.implemented && (
                <span className="ml-1 text-[9px] text-faint">·</span>
              )}
            </button>
          ))}
        </div>
      </div>
      <div className="min-h-0 flex-1 space-y-1 overflow-y-auto p-2">
        {views.map((view) => (
          <button
            key={view.id}
            type="button"
            onClick={() => selectView(view.id)}
            className={`flex w-full items-center justify-between rounded border px-2 py-1.5 text-left ${
              selectedViewId === view.id
                ? "border-accent bg-accent/10"
                : "border-border hover:bg-hover"
            }`}
          >
            <span>
              <span className="text-foreground">{view.name}</span>
              <span className="ml-2 text-[10px] text-faint">
                {view.type} · {view.orientation}
              </span>
            </span>
            {view.status === "scaffold" && <ScaffoldBadge />}
          </button>
        ))}
      </div>
    </div>
  );
}

function DimensionsPanel() {
  const dimensions = useDrawingStore((s) => s.dimensions);
  const selectedDimensionId = useDrawingStore((s) => s.selectedDimensionId);
  const selectDimension = useDrawingStore((s) => s.selectDimension);
  const setActiveTool = useDrawingStore((s) => s.setActiveTool);

  return (
    <div className="flex h-full flex-col text-xs">
      <div className="border-b border-border p-3">
        <p className="mb-2 text-[11px] text-faint">
          2 Point Linear is implemented; remaining dimension types are UI scaffolds.
        </p>
        <div className="flex flex-wrap gap-1">
          {DIMENSION_CATALOG.map((d) => (
            <button
              key={d.type}
              type="button"
              onClick={() => setActiveTool(d.type)}
              className="rounded border border-border px-2 py-1 text-[11px] text-muted-foreground hover:border-accent hover:text-accent"
            >
              {d.label}
              {!d.implemented && (
                <span className="ml-1 text-[9px] text-faint">·</span>
              )}
            </button>
          ))}
        </div>
      </div>
      <div className="min-h-0 flex-1 space-y-1 overflow-y-auto p-2">
        {dimensions.length === 0 && (
          <p className="p-2 text-faint">No dimensions yet.</p>
        )}
        {dimensions.map((dim) => (
          <button
            key={dim.id}
            type="button"
            onClick={() => selectDimension(dim.id)}
            className={`flex w-full items-center justify-between rounded border px-2 py-1.5 text-left ${
              selectedDimensionId === dim.id
                ? "border-accent bg-accent/10"
                : "border-border hover:bg-hover"
            }`}
          >
            <span>
              <span className="text-foreground">{dim.name}</span>
              <span className="ml-2 text-[10px] text-faint">{dim.type}</span>
            </span>
            {(dim.status === "scaffold" || dim.status === "dangling") && (
              <span
                className={`rounded px-1 py-0.5 text-[9px] uppercase ${
                  dim.status === "dangling"
                    ? "bg-rose-900/40 text-rose-300"
                    : "bg-muted text-faint"
                }`}
              >
                {dim.status}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

function AnnotationsPanel() {
  const annotations = useDrawingStore((s) => s.annotations);
  const setActiveTool = useDrawingStore((s) => s.setActiveTool);

  return (
    <div className="flex h-full flex-col text-xs">
      <div className="border-b border-border p-3">
        <p className="mb-2 text-[11px] text-faint">
          Hole/Thread, Datum, GTOL, Surface Finish, Weld, Note, Balloon — scaffolded.
        </p>
        <div className="flex flex-wrap gap-1">
          {ANNOTATION_CATALOG.map((a) => (
            <button
              key={a.type}
              type="button"
              onClick={() => setActiveTool(a.type)}
              className="rounded border border-border px-2 py-1 text-[11px] text-muted-foreground hover:border-accent hover:text-accent"
            >
              {a.label} <ScaffoldBadge />
            </button>
          ))}
        </div>
      </div>
      <div className="min-h-0 flex-1 space-y-1 overflow-y-auto p-2">
        {annotations.length === 0 && (
          <p className="p-2 text-faint">No annotations yet.</p>
        )}
        {annotations.map((ann) => (
          <div
            key={ann.id}
            className="flex items-center justify-between rounded border border-border px-2 py-1.5"
          >
            <span>
              <span className="text-foreground">{ann.name}</span>
              <span className="ml-2 text-[10px] text-faint">{ann.type}</span>
            </span>
            <ScaffoldBadge />
          </div>
        ))}
      </div>
    </div>
  );
}

function TablesPanel() {
  const tables = useDrawingStore((s) => s.tables);
  const setActiveTool = useDrawingStore((s) => s.setActiveTool);

  return (
    <div className="flex h-full flex-col text-xs">
      <div className="border-b border-border p-3">
        <p className="mb-2 text-[11px] text-faint">
          BOM, Cut List, Hole, Custom, Revision tables — scaffolded.
        </p>
        <div className="flex flex-wrap gap-1">
          {TABLE_CATALOG.map((t) => (
            <button
              key={t.type}
              type="button"
              onClick={() => setActiveTool(t.type)}
              className="rounded border border-border px-2 py-1 text-[11px] text-muted-foreground hover:border-accent hover:text-accent"
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>
      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-2">
        {tables.map((tbl) => (
          <div
            key={tbl.id}
            className="rounded border border-border bg-background/40 p-2"
          >
            <div className="mb-1 flex items-center justify-between">
              <span className="font-medium text-foreground">{tbl.name}</span>
              <ScaffoldBadge />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-[10px] text-muted-foreground">
                <thead>
                  <tr>
                    {tbl.columns.map((c) => (
                      <th key={c} className="border-b border-border px-1 py-0.5 text-left">
                        {c}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tbl.rows.map((row, i) => (
                    <tr key={i}>
                      {row.map((cell, j) => (
                        <td key={j} className="px-1 py-0.5">
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MbdPanel() {
  const mbdChecks = useDrawingStore((s) => s.mbdChecks);
  const runMbdChecks = useDrawingStore((s) => s.runMbdChecks);

  return (
    <div className="space-y-3 overflow-y-auto p-3 text-xs">
      <p className="text-[11px] text-faint">
        Model-Based Definition status checks for datums, dimensions, tolerances,
        GD&T coverage, and dangling entities.
      </p>
      <button
        type="button"
        onClick={() => runMbdChecks()}
        className="rounded bg-accent px-2 py-1.5 text-xs text-accent-foreground hover:bg-accent"
      >
        Run MBD Check
      </button>
      <ul className="space-y-2">
        {mbdChecks.map((c) => (
          <li
            key={c.id}
            className="rounded border border-border bg-background/40 px-2 py-2"
          >
            <div className="flex items-center justify-between">
              <span className="font-medium text-foreground">{c.label}</span>
              <span className={`text-[10px] uppercase ${mbdColor(c.status)}`}>
                {c.status}
              </span>
            </div>
            <p className="mt-1 text-[10px] text-faint">{c.detail}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

function TolerancesPanel() {
  const library = useDrawingStore((s) => s.toleranceLibrary);
  const activeToleranceId = useDrawingStore((s) => s.activeToleranceId);
  const setActiveTolerance = useDrawingStore((s) => s.setActiveTolerance);

  return (
    <div className="space-y-2 overflow-y-auto p-3 text-xs">
      <p className="text-[11px] text-faint">
        Default Tolerances Library — applied as general note on the sheet.
      </p>
      {library.map((tol) => (
        <button
          key={tol.id}
          type="button"
          onClick={() => setActiveTolerance(tol.id)}
          className={`flex w-full flex-col rounded border px-2 py-2 text-left ${
            activeToleranceId === tol.id
              ? "border-accent bg-accent/10"
              : "border-border hover:bg-hover"
          }`}
        >
          <span className="font-medium text-foreground">{tol.name}</span>
          <span className="text-[10px] text-faint">
            {tol.standard} · F {tol.linearFine} · M {tol.linearMedium} · C{" "}
            {tol.linearCoarse} · ∠ {tol.angular}
          </span>
          <span className="mt-1 text-[10px] text-muted-foreground">{tol.description}</span>
        </button>
      ))}
    </div>
  );
}

function ExportPanel() {
  const exportState = useDrawingStore((s) => s.exportState);
  const updateDrawing = useDrawingStore((s) => s.updateDrawing);
  const scanDangling = useDrawingStore((s) => s.scanDangling);
  const exportDrawing = useDrawingStore((s) => s.exportDrawing);
  const printDrawing = useDrawingStore((s) => s.printDrawing);
  const dimensions = useDrawingStore((s) => s.dimensions);
  const annotations = useDrawingStore((s) => s.annotations);

  const danglingDims = dimensions.filter((d) => d.status === "dangling");
  const danglingAnns = annotations.filter((a) => a.status === "dangling");

  return (
    <div className="space-y-3 overflow-y-auto p-3 text-xs">
      <p className="text-[11px] text-faint">
        Update drawing from model, scan dangling entities, then export or print.
      </p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => updateDrawing()}
          className="rounded bg-accent px-2 py-1.5 text-accent-foreground hover:bg-accent"
        >
          Update
        </button>
        <button
          type="button"
          onClick={() => scanDangling()}
          className="rounded border border-border px-2 py-1.5 text-muted-foreground hover:border-accent hover:text-accent"
        >
          Scan Dangling
        </button>
        <button
          type="button"
          onClick={() => exportDrawing("pdf")}
          className="rounded border border-border px-2 py-1.5 text-muted-foreground hover:border-accent hover:text-accent"
        >
          Export PDF
        </button>
        <button
          type="button"
          onClick={() => exportDrawing("dxf")}
          className="rounded border border-border px-2 py-1.5 text-muted-foreground hover:border-accent hover:text-accent"
        >
          Export DXF
        </button>
        <button
          type="button"
          onClick={() => printDrawing()}
          className="rounded border border-border px-2 py-1.5 text-muted-foreground hover:border-accent hover:text-accent"
        >
          Print
        </button>
      </div>

      <div className="rounded border border-border bg-background/40 p-2">
        <div className="text-[10px] uppercase text-faint">Status</div>
        <p className="mt-1 text-foreground">{exportState.message}</p>
        <p className="mt-1 text-[10px] text-faint">
          Dangling: {exportState.danglingCount} · Print ready:{" "}
          {exportState.printReady ? "yes" : "no"} · Format:{" "}
          {exportState.exportFormat.toUpperCase()}
          {exportState.lastUpdatedAt
            ? ` · Updated ${new Date(exportState.lastUpdatedAt).toLocaleTimeString()}`
            : ""}
        </p>
      </div>

      {(danglingDims.length > 0 || danglingAnns.length > 0) && (
        <div className="space-y-1">
          <div className="text-[10px] font-semibold uppercase text-rose-300">
            Dangling Entities
          </div>
          {danglingDims.map((d) => (
            <div key={d.id} className="text-rose-300/90">
              Dim · {d.name} ({d.type})
            </div>
          ))}
          {danglingAnns.map((a) => (
            <div key={a.id} className="text-rose-300/90">
              Ann · {a.name} ({a.type})
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
