import type { ReactNode } from "react";
import { useDrawingStore, type DrawingPanelId } from "../../store/drawingStore";

const QUICK_PANELS: { id: DrawingPanelId; label: string }[] = [
  { id: "templates", label: "Templates" },
  { id: "sheets", label: "Sheets" },
  { id: "styles", label: "Styles" },
  { id: "properties", label: "Properties" },
  { id: "views", label: "Views" },
  { id: "dimensions", label: "Dims" },
  { id: "annotations", label: "Annot." },
  { id: "tables", label: "Tables" },
  { id: "mbd", label: "MBD" },
  { id: "tolerances", label: "Tols" },
  { id: "export", label: "Output" },
];

export function DrawingTree() {
  const sheets = useDrawingStore((s) => s.sheets);
  const activeSheetId = useDrawingStore((s) => s.activeSheetId);
  const views = useDrawingStore((s) => s.views);
  const dimensions = useDrawingStore((s) => s.dimensions);
  const annotations = useDrawingStore((s) => s.annotations);
  const tables = useDrawingStore((s) => s.tables);
  const selectedViewId = useDrawingStore((s) => s.selectedViewId);
  const selectedDimensionId = useDrawingStore((s) => s.selectedDimensionId);
  const setActiveSheet = useDrawingStore((s) => s.setActiveSheet);
  const selectView = useDrawingStore((s) => s.selectView);
  const selectDimension = useDrawingStore((s) => s.selectDimension);
  const setActivePanel = useDrawingStore((s) => s.setActivePanel);
  const activePanel = useDrawingStore((s) => s.activePanel);
  const properties = useDrawingStore((s) => s.properties);
  const exportState = useDrawingStore((s) => s.exportState);

  return (
    <div className="flex h-full min-h-0 flex-col text-xs">
      <div className="flex flex-wrap gap-0.5 border-b border-border px-1 py-1">
        {QUICK_PANELS.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() =>
              setActivePanel(activePanel === p.id ? "none" : p.id)
            }
            className={`rounded px-1.5 py-0.5 text-[10px] ${
              activePanel === p.id
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:bg-hover hover:text-accent"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="border-b border-border px-2 py-1 text-[10px] text-faint">
        {properties.format} · {properties.units} · {properties.scale}
        {exportState.danglingCount > 0 && (
          <span className="ml-2 text-rose-300">
            · {exportState.danglingCount} dangling
          </span>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-1">
        <Section label="Sheets">
          {sheets.map((sh) => (
            <Row
              key={sh.id}
              icon="▭"
              label={sh.name}
              selected={activeSheetId === sh.id}
              onClick={() => setActiveSheet(sh.id)}
              muted={!sh.active}
            />
          ))}
        </Section>

        <Section label="Views">
          {views.map((v) => (
            <Row
              key={v.id}
              icon="▣"
              label={`${v.name}${v.status === "scaffold" ? " *" : ""}`}
              selected={selectedViewId === v.id}
              onClick={() => selectView(v.id)}
            />
          ))}
        </Section>

        <Section label="Dimensions">
          {dimensions.length === 0 && <Row icon="○" label="None" muted />}
          {dimensions.map((d) => (
            <Row
              key={d.id}
              icon="↔"
              label={`${d.name}${d.status === "dangling" ? " !" : d.status === "scaffold" ? " *" : ""}`}
              selected={selectedDimensionId === d.id}
              onClick={() => selectDimension(d.id)}
            />
          ))}
        </Section>

        <Section label="Annotations">
          {annotations.length === 0 && <Row icon="○" label="None" muted />}
          {annotations.map((a) => (
            <Row key={a.id} icon="✎" label={`${a.name} *`} muted />
          ))}
        </Section>

        <Section label="Tables">
          {tables.map((t) => (
            <Row key={t.id} icon="▤" label={`${t.name} *`} muted />
          ))}
        </Section>
      </div>
    </div>
  );
}

function Section({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="mb-2">
      <div className="px-1 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-faint">
        {label}
      </div>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

function Row({
  icon,
  label,
  selected,
  muted,
  onClick,
}: {
  icon: string;
  label: string;
  selected?: boolean;
  muted?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-1.5 rounded px-1.5 py-1 text-left ${
        selected
          ? "bg-accent/15 text-accent"
          : muted
            ? "text-faint"
            : "text-muted-foreground hover:bg-hover hover:text-accent"
      }`}
    >
      <span className="w-3 text-center text-[10px] opacity-70">{icon}</span>
      <span className="truncate">{label}</span>
    </button>
  );
}

export default DrawingTree;
