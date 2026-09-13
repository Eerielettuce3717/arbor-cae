import {
  CONSTRAINT_TOOLBAR_ITEMS,
  SKETCH_TOOLBAR_ITEMS,
  SketchTool,
  type SketchConstraintType,
} from "./types";
import { useSketchStore } from "../../store/sketchStore";

const GROUP_ORDER = [
  "draw",
  "arc",
  "poly",
  "curve",
  "modify",
  "pattern",
  "insert",
  "constraint",
] as const;

const GROUP_LABEL: Record<(typeof GROUP_ORDER)[number], string> = {
  draw: "Draw",
  arc: "Arcs",
  poly: "Polygons",
  curve: "Curves",
  modify: "Modify",
  pattern: "Pattern",
  insert: "Insert",
  constraint: "Dims",
};

export function SketchToolbar() {
  const activeTool = useSketchStore((s) => s.activeTool);
  const activeConstraintTool = useSketchStore((s) => s.activeConstraintTool);
  const constructionMode = useSketchStore((s) => s.constructionMode);
  const setActiveTool = useSketchStore((s) => s.setActiveTool);
  const setActiveConstraintTool = useSketchStore(
    (s) => s.setActiveConstraintTool,
  );
  const toggleConstructionMode = useSketchStore(
    (s) => s.toggleConstructionMode,
  );
  const clearSketch = useSketchStore((s) => s.clearSketch);
  const setActive = useSketchStore((s) => s.setActive);

  return (
    <div className="pointer-events-auto flex max-w-full flex-col gap-1 border-b border-border bg-card/95 px-2 py-1.5">
      <div className="flex flex-wrap items-center gap-3">
        {GROUP_ORDER.map((group) => {
          const items = SKETCH_TOOLBAR_ITEMS.filter((t) => t.group === group);
          if (items.length === 0) return null;
          return (
            <div key={group} className="flex items-center gap-0.5">
              <span className="mr-1 text-[9px] font-semibold uppercase tracking-wider text-faint">
                {GROUP_LABEL[group]}
              </span>
              {items.map((item) => {
                const active = activeTool === item.tool;
                return (
                  <button
                    key={item.tool}
                    type="button"
                    title={
                      item.implemented
                        ? item.label
                        : `${item.label} (scaffolded)`
                    }
                    aria-label={item.label}
                    aria-pressed={active}
                    aria-disabled={!item.implemented}
                    onClick={() => setActiveTool(item.tool)}
                    className={`rounded px-1.5 py-0.5 text-[10px] ${
                      active
                        ? "bg-accent text-accent-foreground"
                        : item.implemented
                          ? "text-muted-foreground hover:bg-hover hover:text-accent"
                          : "text-faint/80 hover:bg-hover hover:text-muted-foreground"
                    } ${!item.implemented ? "opacity-70" : ""}`}
                  >
                    {shortLabel(item.label)}
                    {!item.implemented && (
                      <span className="ml-0.5 text-[8px] text-faint">·</span>
                    )}
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-1">
        <span className="mr-1 text-[9px] font-semibold uppercase tracking-wider text-faint">
          Constraints
        </span>
        {CONSTRAINT_TOOLBAR_ITEMS.map((item) => {
          const active = activeConstraintTool === item.type;
          return (
            <button
              key={item.type}
              type="button"
              title={
                item.implemented
                  ? item.label
                  : `${item.label} (scaffolded)`
              }
              aria-label={item.label}
              aria-pressed={active}
              onClick={() =>
                setActiveConstraintTool(
                  active ? null : (item.type as SketchConstraintType),
                )
              }
              className={`rounded px-1.5 py-0.5 text-[10px] ${
                active
                  ? "bg-emerald-700 text-white"
                  : item.implemented
                    ? "text-muted-foreground hover:bg-hover hover:text-accent"
                    : "text-faint/80 hover:bg-hover"
              }`}
            >
              {item.label}
            </button>
          );
        })}

        <div className="ml-auto flex items-center gap-1">
          <button
            type="button"
            onClick={toggleConstructionMode}
            className={`rounded border px-2 py-0.5 text-[10px] ${
              constructionMode
                ? "border-amber-600 bg-amber-900/40 text-amber-200"
                : "border-border text-muted-foreground hover:text-accent"
            }`}
          >
            Construction
          </button>
          <button
            type="button"
            onClick={() => setActiveTool(SketchTool.Select)}
            className="rounded border border-border px-2 py-0.5 text-[10px] text-muted-foreground hover:text-accent"
          >
            Select
          </button>
          <button
            type="button"
            onClick={clearSketch}
            className="rounded border border-border px-2 py-0.5 text-[10px] text-muted-foreground hover:text-rose-300"
          >
            Clear
          </button>
          <button
            type="button"
            onClick={() => setActive(false)}
            className="rounded border border-border px-2 py-0.5 text-[10px] text-muted-foreground hover:text-accent"
          >
            Exit sketch
          </button>
        </div>
      </div>
    </div>
  );
}

function shortLabel(label: string): string {
  const map: Record<string, string> = {
    "Corner Rectangle": "Rect",
    "Center Point Rectangle": "Ctr Rect",
    "Aligned Rectangle": "Align Rect",
    "Center Point Circle": "Circle",
    "3 Point Circle": "3pt Cir",
    "3 Point Arc": "3pt Arc",
    "Tangent Arc": "Tan Arc",
    "Center Point Arc": "Ctr Arc",
    "Elliptical Arc": "Ellip Arc",
    "Inscribed Polygon": "In Poly",
    "Circumscribed Polygon": "Cir Poly",
    "Spline Control Point": "Spline CP",
    "Sketch Chamfer": "Chamfer",
    "Sketch Fillet": "Fillet",
    "Sketch Split": "Split",
    "Sketch Mirror": "Mirror",
    "Linear Pattern": "L Pattern",
    "Circular Pattern": "C Pattern",
    "Transform Sketch": "Transform",
    "Insert DXF/DWG": "DXF/DWG",
    "Insert Image": "Image",
    "Midpoint Line": "Mid Line",
  };
  return map[label] ?? label;
}
