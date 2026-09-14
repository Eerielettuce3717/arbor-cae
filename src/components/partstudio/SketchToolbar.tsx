import { useState } from "react";
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
  const [openGroup, setOpenGroup] = useState<string | null>(null);

  return (
    <div className="pointer-events-auto flex h-9 max-w-full items-center gap-0.5 overflow-x-auto border-b border-border bg-card/95 px-2">
      {GROUP_ORDER.map((group) => {
        const items = SKETCH_TOOLBAR_ITEMS.filter((t) => t.group === group);
        if (items.length === 0) return null;
        const live = items.filter((t) => t.implemented);
        const current =
          live.find((t) => t.tool === activeTool) ?? live[0] ?? items[0];
        const open = openGroup === group;
        return (
          <div key={group} className="relative shrink-0">
            <button
              type="button"
              title={GROUP_LABEL[group]}
              aria-haspopup="menu"
              aria-expanded={open}
              onClick={() => setOpenGroup(open ? null : group)}
              className={`flex h-7 items-center gap-1 rounded px-1.5 text-[11px] ${
                items.some((t) => t.tool === activeTool)
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:bg-hover hover:text-accent"
              }`}
            >
              {shortLabel(current.label)}
              <span className="text-[8px] opacity-70">▾</span>
            </button>
            {open && (
              <>
                <button
                  type="button"
                  className="fixed inset-0 z-20 cursor-default"
                  aria-label="Close sketch tools"
                  onClick={() => setOpenGroup(null)}
                />
                <div
                  role="menu"
                  className="absolute left-0 top-full z-30 mt-0.5 min-w-[160px] rounded border border-border bg-card py-1"
                >
                  {items.map((item) => {
                    const active = activeTool === item.tool;
                    return (
                      <button
                        key={item.tool}
                        type="button"
                        role="menuitem"
                        title={
                          item.implemented
                            ? item.label
                            : `${item.label} (scaffolded)`
                        }
                        aria-label={item.label}
                        disabled={!item.implemented}
                        onClick={() => {
                          if (!item.implemented) return;
                          setActiveTool(item.tool);
                          setOpenGroup(null);
                        }}
                        className={`block w-full px-3 py-1.5 text-left text-[11px] ${
                          !item.implemented
                            ? "cursor-not-allowed text-faint"
                            : active
                              ? "bg-active text-accent"
                              : "text-foreground hover:bg-hover hover:text-accent"
                        }`}
                      >
                        {item.label}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        );
      })}

      <div className="mx-1 h-5 w-px shrink-0 bg-border" />

      {CONSTRAINT_TOOLBAR_ITEMS.filter((item) => item.implemented).map(
        (item) => {
          const active = activeConstraintTool === item.type;
          return (
            <button
              key={item.type}
              type="button"
              title={item.label}
              aria-label={item.label}
              aria-pressed={active}
              onClick={() =>
                setActiveConstraintTool(
                  active ? null : (item.type as SketchConstraintType),
                )
              }
              className={`h-7 shrink-0 rounded px-1.5 text-[11px] ${
                active
                  ? "bg-emerald-700 text-white"
                  : "text-muted-foreground hover:bg-hover hover:text-accent"
              }`}
            >
              {item.label}
            </button>
          );
        },
      )}

      <div className="ml-auto flex shrink-0 items-center gap-1 pl-2">
        <button
          type="button"
          onClick={toggleConstructionMode}
          className={`h-7 rounded border px-2 text-[11px] ${
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
          className="h-7 rounded border border-border px-2 text-[11px] text-muted-foreground hover:text-accent"
        >
          Select
        </button>
        <button
          type="button"
          onClick={clearSketch}
          className="h-7 rounded border border-border px-2 text-[11px] text-muted-foreground hover:text-rose-300"
        >
          Clear
        </button>
        <button
          type="button"
          onClick={() => setActive(false)}
          className="h-7 rounded border border-border px-2 text-[11px] text-muted-foreground hover:text-accent"
        >
          Exit sketch
        </button>
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
