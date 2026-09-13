import type { ReactNode } from "react";
import { usePcbStore } from "../../store/pcbStore";

export function PcbTree() {
  const outline = usePcbStore((s) => s.outline);
  const components = usePcbStore((s) => s.components);
  const traces = usePcbStore((s) => s.traces);
  const rigidFlex = usePcbStore((s) => s.rigidFlex);
  const altium365 = usePcbStore((s) => s.altium365);
  const selectedId = usePcbStore((s) => s.selectedId);
  const select = usePcbStore((s) => s.select);
  const setActivePanel = usePcbStore((s) => s.setActivePanel);
  const setActiveTool = usePcbStore((s) => s.setActiveTool);
  const snapMode = usePcbStore((s) => s.snapMode);

  return (
    <div className="flex h-full min-h-0 flex-col text-xs">
      <div className="flex items-center gap-1 border-b border-eng-border px-2 py-1 text-[10px] text-eng-faint">
        <span className="text-sky-300">{outline.thicknessMm} mm</span>
        <span>·</span>
        <span>{snapMode}° snap</span>
        <span>·</span>
        <span>{altium365.connected ? "A365" : "local"}</span>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-1">
        <Section label="Board">
          <Row
            icon="▭"
            label={outline.name}
            selected={selectedId === "board"}
            onClick={() => {
              select("board");
              setActivePanel("board");
              setActiveTool("outline");
            }}
          />
        </Section>

        <Section label="Components">
          {components.map((c) => (
            <Row
              key={c.id}
              icon="▣"
              label={`${c.designator} · ${c.footprint}`}
              selected={selectedId === c.id}
              onClick={() => {
                select(c.id);
                setActivePanel("components");
              }}
            />
          ))}
        </Section>

        <Section label="Traces">
          {traces.length === 0 && <Row icon="○" label="No traces" muted />}
          {traces.map((t) => (
            <Row
              key={t.id}
              icon="〰"
              label={`${t.net} (${t.vertices.length})`}
              selected={selectedId === t.id}
              badge={t.draft ? "draft" : undefined}
              onClick={() => {
                select(t.id);
                setActivePanel("traces");
                setActiveTool("route");
              }}
            />
          ))}
        </Section>

        <Section label="Workflows">
          <Row
            icon="⟷"
            label={`Rigid-Flex${rigidFlex.enabled ? " · on" : ""}`}
            selected={selectedId === "rigidFlex"}
            badge="scaffold"
            onClick={() => {
              select("rigidFlex");
              setActivePanel("rigidFlex");
              setActiveTool("rigidFlex");
            }}
          />
          <Row
            icon="☁"
            label="Altium 365"
            selected={selectedId === "altium365"}
            badge="scaffold"
            onClick={() => {
              select("altium365");
              setActivePanel("altium365");
              setActiveTool("altium365");
            }}
          />
          <Row
            icon="⇪"
            label="Export Manufacturing"
            selected={selectedId === "manufacturing"}
            onClick={() => {
              select("manufacturing");
              setActivePanel("manufacturing");
              setActiveTool("manufacturing");
            }}
          />
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
      <div className="px-1.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-eng-faint">
        {label}
      </div>
      {children}
    </div>
  );
}

function Row({
  icon,
  label,
  selected,
  muted,
  badge,
  onClick,
}: {
  icon: string;
  label: string;
  selected?: boolean;
  muted?: boolean;
  badge?: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-1.5 rounded px-1.5 py-1 text-left ${
        selected
          ? "bg-sky-700/40 text-eng-text"
          : muted
            ? "text-eng-faint"
            : "text-eng-muted hover:bg-eng-hover hover:text-eng-text"
      }`}
    >
      <span className="w-4 shrink-0 text-center text-[10px] opacity-70">
        {icon}
      </span>
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {badge && (
        <span className="shrink-0 rounded bg-eng-active px-1 text-[9px] text-sky-300/80">
          {badge}
        </span>
      )}
    </button>
  );
}
