import { useState, type ReactNode } from "react";
import {
  Box,
  Circle,
  Combine,
  Cuboid,
  Hexagon,
  Layers,
  Maximize2,
  Minus,
  MoreHorizontal,
  Move3d,
  Ruler,
  Square,
  Spline,
  Weight,
} from "lucide-react";

export interface RibbonTool {
  id: string;
  label: string;
  implemented?: boolean;
  active?: boolean;
}

export interface RibbonGroup {
  id: string;
  label: string;
  tools: RibbonTool[];
}

const ICON_BY_HINT: { match: RegExp; Icon: typeof Minus }[] = [
  { match: /line|wcs/i, Icon: Minus },
  { match: /circle|via/i, Icon: Circle },
  { match: /rect|stock|select face/i, Icon: Square },
  { match: /extrude|pocket/i, Icon: Box },
  { match: /boolean|combine/i, Icon: Combine },
  { match: /sculpt|form/i, Icon: Cuboid },
  { match: /measure/i, Icon: Ruler },
  { match: /mass|props/i, Icon: Weight },
  { match: /fit/i, Icon: Maximize2 },
  { match: /iso|camera/i, Icon: Move3d },
  { match: /section|edges|display/i, Icon: Layers },
  { match: /insert|place/i, Icon: Hexagon },
  { match: /spline|arc|fillet/i, Icon: Spline },
];

function ToolGlyph({ label }: { label: string }) {
  const hit = ICON_BY_HINT.find((row) => row.match.test(label));
  const Icon = hit?.Icon;
  if (!Icon) {
    return (
      <span className="w-3.5 text-center text-[10px] font-semibold">
        {label.slice(0, 1)}
      </span>
    );
  }
  return <Icon className="h-3.5 w-3.5" strokeWidth={1.75} />;
}

export function CommandRibbon({
  groups,
  onSelect,
  status,
}: {
  groups: RibbonGroup[];
  onSelect: (id: string) => void;
  status?: ReactNode;
}) {
  const [moreOpen, setMoreOpen] = useState(false);
  const primary = groups.map((group) => ({
    ...group,
    tools: group.tools.filter((t) => t.implemented !== false),
  })).filter((g) => g.tools.length > 0);
  const stubs = groups.flatMap((g) =>
    g.tools.filter((t) => t.implemented === false),
  );

  return (
    <div
      data-explorer="toolbar"
      className="flex h-9 shrink-0 items-center gap-0 overflow-x-auto border-b border-border bg-muted/80 px-1"
    >
      {primary.map((group, index) => (
        <div key={group.id} className="flex h-full shrink-0 items-center">
          {index > 0 && (
            <div className="mx-1 h-5 w-px bg-border" aria-hidden />
          )}
          <span className="mr-0.5 hidden px-1 text-[9px] font-semibold uppercase tracking-wider text-faint lg:inline">
            {group.label}
          </span>
          {group.tools.map((tool) => (
            <button
              key={tool.id}
              type="button"
              title={tool.label}
              aria-label={tool.label}
              aria-pressed={!!tool.active}
              onClick={() => onSelect(tool.id)}
              className={`flex h-7 items-center gap-1 rounded px-1.5 text-[11px] ${
                tool.active
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:bg-hover hover:text-accent"
              }`}
            >
              <ToolGlyph label={tool.label} />
              <span className="hidden whitespace-nowrap sm:inline">
                {tool.label}
              </span>
            </button>
          ))}
        </div>
      ))}

      {stubs.length > 0 && (
        <div className="relative ml-1 flex h-full shrink-0 items-center">
          <div className="mx-1 h-5 w-px bg-border" aria-hidden />
          <button
            type="button"
            title="More tools (not implemented)"
            aria-haspopup="menu"
            aria-expanded={moreOpen}
            onClick={() => setMoreOpen((v) => !v)}
            className="flex h-7 items-center gap-1 rounded px-1.5 text-[11px] text-faint hover:bg-hover hover:text-accent"
          >
            <MoreHorizontal className="h-3.5 w-3.5" strokeWidth={1.75} />
            More
          </button>
          {moreOpen && (
            <>
              <button
                type="button"
                className="fixed inset-0 z-20 cursor-default"
                aria-label="Close more tools"
                onClick={() => setMoreOpen(false)}
              />
              <div
                role="menu"
                className="absolute left-0 top-full z-30 mt-0.5 max-h-72 w-56 overflow-y-auto rounded border border-border bg-card py-1"
              >
                <p className="px-3 py-1 text-[9px] font-semibold uppercase tracking-wider text-faint">
                  Not implemented
                </p>
                {stubs.map((tool) => (
                  <div
                    key={tool.id}
                    role="menuitem"
                    title={`${tool.label} (not implemented)`}
                    className="px-3 py-1.5 text-left text-[11px] text-faint"
                  >
                    {tool.label}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {status && (
        <div className="ml-auto flex shrink-0 items-center gap-2 px-2 text-[11px] text-muted-foreground">
          {status}
        </div>
      )}
    </div>
  );
}

export default CommandRibbon;
