import type { ReactNode } from "react";
import { useAssemblyStore } from "../../store/assemblyStore";
import {
  IMPLEMENTED_MATES,
  MATE_CATALOG,
  type AssemblyInstance,
  type AssemblyMate,
} from "../../store/assemblyTypes";

function statusDot(status: AssemblyMate["status"]): string {
  switch (status) {
    case "ok":
      return "text-emerald-400";
    case "error":
      return "text-rose-400";
    case "suppressed":
      return "text-faint";
    default:
      return "text-faint";
  }
}

export function InstanceTree() {
  const instances = useAssemblyStore((s) => s.instances);
  const mates = useAssemblyStore((s) => s.mates);
  const groups = useAssemblyStore((s) => s.groups);
  const patterns = useAssemblyStore((s) => s.patterns);
  const connectors = useAssemblyStore((s) => s.connectors);
  const selectedInstanceIds = useAssemblyStore((s) => s.selectedInstanceIds);
  const selectedMateId = useAssemblyStore((s) => s.selectedMateId);
  const selectInstances = useAssemblyStore((s) => s.selectInstances);
  const selectMate = useAssemblyStore((s) => s.selectMate);
  const setInstanceGrounded = useAssemblyStore((s) => s.setInstanceGrounded);
  const setInstanceVisible = useAssemblyStore((s) => s.setInstanceVisible);
  const setInstanceSuppressed = useAssemblyStore((s) => s.setInstanceSuppressed);
  const suppressMate = useAssemblyStore((s) => s.suppressMate);
  const snapMode = useAssemblyStore((s) => s.snapMode);
  const showMatesMode = useAssemblyStore((s) => s.showMatesMode);

  return (
    <div className="flex h-full min-h-0 flex-col text-xs">
      <div className="flex items-center gap-1 border-b border-border px-2 py-1 text-[10px] text-faint">
        <span className={snapMode ? "text-accent" : ""}>
          {snapMode ? "Snap on" : "Snap off"}
        </span>
        <span>·</span>
        <span className={showMatesMode ? "text-amber-300" : ""}>
          {showMatesMode ? "Mates shown" : "Mates hidden"}
        </span>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-1">
        <Section label="Origin">
          <Row icon="·" label="Origin / Planes" muted />
        </Section>

        <Section label="Instances">
          {instances.map((inst) => (
            <InstanceRow
              key={inst.id}
              inst={inst}
              selected={selectedInstanceIds.includes(inst.id)}
              connectorCount={connectors.filter((c) => c.instanceId === inst.id).length}
              onSelect={() => selectInstances([inst.id])}
              onGround={() => setInstanceGrounded(inst.id, !inst.grounded)}
              onVisible={() => setInstanceVisible(inst.id, !inst.visible)}
              onSuppress={() => setInstanceSuppressed(inst.id, !inst.suppressed)}
            />
          ))}
        </Section>

        <Section label="Mates">
          {mates.length === 0 && <Row icon="○" label="No mates" muted />}
          {mates.map((mate) => (
            <MateRow
              key={mate.id}
              mate={mate}
              selected={selectedMateId === mate.id}
              onSelect={() => selectMate(mate.id)}
              onSuppress={() => suppressMate(mate.id, !mate.suppressed)}
            />
          ))}
        </Section>

        {groups.length > 0 && (
          <Section label="Groups">
            {groups.map((g) => (
              <Row
                key={g.id}
                icon="⧉"
                label={`${g.name} (${g.instanceIds.length})`}
              />
            ))}
          </Section>
        )}

        {patterns.length > 0 && (
          <Section label="Patterns">
            {patterns.map((p) => (
              <Row
                key={p.id}
                icon="▦"
                label={p.name}
                badge="UI"
              />
            ))}
          </Section>
        )}
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
      <div className="px-2 py-1 text-[9px] font-semibold uppercase tracking-wider text-faint">
        {label}
      </div>
      {children}
    </div>
  );
}

function Row({
  icon,
  label,
  muted,
  badge,
  selected,
  onClick,
}: {
  icon: string;
  label: string;
  muted?: boolean;
  badge?: string;
  selected?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-2 rounded px-2 py-1.5 text-left ${
        selected
          ? "bg-active text-accent"
          : muted
            ? "text-faint"
            : "text-muted-foreground hover:bg-hover hover:text-accent"
      }`}
    >
      <span className="w-3 text-center text-[10px]">{icon}</span>
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {badge && (
        <span className="text-[9px] uppercase tracking-wide text-faint">{badge}</span>
      )}
    </button>
  );
}

function InstanceRow({
  inst,
  selected,
  connectorCount,
  onSelect,
  onGround,
  onVisible,
  onSuppress,
}: {
  inst: AssemblyInstance;
  selected: boolean;
  connectorCount: number;
  onSelect: () => void;
  onGround: () => void;
  onVisible: () => void;
  onSuppress: () => void;
}) {
  return (
    <div
      className={`group flex w-full items-center gap-1 rounded ${
        selected ? "bg-active text-accent" : "text-muted-foreground hover:bg-hover"
      }`}
    >
      <button
        type="button"
        onClick={onSelect}
        className="flex min-w-0 flex-1 items-center gap-2 px-2 py-1.5 text-left"
      >
        <span className="w-3 text-center text-[10px]">
          {inst.kind === "assembly" ? "⧉" : "◼"}
        </span>
        <span
          className={`min-w-0 truncate ${inst.suppressed ? "line-through opacity-60" : ""}`}
        >
          {inst.name}
        </span>
        {inst.grounded && (
          <span className="text-[9px] uppercase text-amber-300">fix</span>
        )}
        {inst.derived && (
          <span className="text-[9px] uppercase text-faint">pat</span>
        )}
      </button>
      <span className="text-[9px] text-faint" title="Mate connectors">
        ⊕{connectorCount}
      </span>
      <button
        type="button"
        title={inst.grounded ? "Unground" : "Ground"}
        onClick={onGround}
        className="rounded px-1 text-[10px] text-faint opacity-0 hover:text-amber-300 group-hover:opacity-100"
      >
        ⚓
      </button>
      <button
        type="button"
        title={inst.visible ? "Hide" : "Show"}
        onClick={onVisible}
        className="rounded px-1 text-[10px] text-faint opacity-0 hover:text-accent group-hover:opacity-100"
      >
        {inst.visible ? "◉" : "○"}
      </button>
      <button
        type="button"
        title={inst.suppressed ? "Unsuppress" : "Suppress"}
        onClick={onSuppress}
        className="rounded px-1 text-[10px] text-faint opacity-0 hover:text-accent group-hover:opacity-100"
      >
        {inst.suppressed ? "☑" : "☐"}
      </button>
    </div>
  );
}

function MateRow({
  mate,
  selected,
  onSelect,
  onSuppress,
}: {
  mate: AssemblyMate;
  selected: boolean;
  onSelect: () => void;
  onSuppress: () => void;
}) {
  const def = MATE_CATALOG.find((m) => m.type === mate.type);
  const implemented = IMPLEMENTED_MATES.has(mate.type);
  return (
    <div
      className={`group flex w-full items-center gap-1 rounded ${
        selected ? "bg-active text-accent" : "text-muted-foreground hover:bg-hover"
      }`}
    >
      <button
        type="button"
        onClick={onSelect}
        className="flex min-w-0 flex-1 items-center gap-2 px-2 py-1.5 text-left"
        title={mate.statusMessage}
      >
        <span className={`w-3 text-center text-[9px] ${statusDot(mate.status)}`}>
          {mate.suppressed ? "⊘" : implemented ? "●" : "○"}
        </span>
        <span className="w-3 text-center text-[10px]">{def?.icon ?? "⬡"}</span>
        <span className={`min-w-0 truncate ${mate.suppressed ? "line-through opacity-60" : ""}`}>
          {mate.name}
        </span>
        {!implemented && (
          <span className="text-[9px] uppercase text-faint">UI</span>
        )}
      </button>
      <button
        type="button"
        title={mate.suppressed ? "Unsuppress" : "Suppress"}
        onClick={onSuppress}
        className="rounded px-1 text-[10px] text-faint opacity-0 hover:text-accent group-hover:opacity-100"
      >
        {mate.suppressed ? "☑" : "☐"}
      </button>
    </div>
  );
}

export default InstanceTree;
