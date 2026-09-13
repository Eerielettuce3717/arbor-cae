import type { ReactNode } from "react";
import { useSimulationStore } from "../../store/simulationStore";

export function SimulationTree() {
  const studies = useSimulationStore((s) => s.studies);
  const activeStudyId = useSimulationStore((s) => s.activeStudyId);
  const selectedNodeId = useSimulationStore((s) => s.selectedNodeId);
  const selectStudy = useSimulationStore((s) => s.selectStudy);
  const selectNode = useSimulationStore((s) => s.selectNode);
  const setActivePanel = useSimulationStore((s) => s.setActivePanel);
  const setActiveTool = useSimulationStore((s) => s.setActiveTool);

  const study = studies.find((s) => s.id === activeStudyId) ?? studies[0];

  return (
    <div className="flex h-full min-h-0 flex-col text-xs">
      <div className="flex items-center gap-1 border-b border-border px-2 py-1 text-[10px] text-faint">
        <span className="text-accent">{study?.kind ?? "study"}</span>
        <span>·</span>
        <span>{study?.solverMode ?? "modal"}</span>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-1">
        <Section label="Studies">
          {studies.map((s) => (
            <div key={s.id}>
              <Row
                icon="▣"
                label={s.name}
                selected={selectedNodeId === s.id}
                onClick={() => {
                  selectStudy(s.id);
                  setActivePanel("study");
                  setActiveTool("study");
                }}
              />
              <div className="ml-3 border-l border-border/60 pl-1">
                <Row
                  icon="↓"
                  label={`Loads (${s.loads.length})`}
                  selected={selectedNodeId === `${s.id}:loads`}
                  onClick={() => {
                    selectNode(`${s.id}:loads`);
                    setActivePanel("loads");
                    setActiveTool("loads");
                  }}
                />
                <Row
                  icon="⚓"
                  label={`Restraints (${s.restraints.length})`}
                  selected={selectedNodeId === `${s.id}:rest`}
                  onClick={() => {
                    selectNode(`${s.id}:rest`);
                    setActivePanel("restraints");
                    setActiveTool("restraints");
                  }}
                />
                <Row
                  icon="▦"
                  label={`Mesh ${s.mesh.elementSizeMm} mm`}
                  selected={selectedNodeId === `${s.id}:mesh`}
                  onClick={() => {
                    selectNode(`${s.id}:mesh`);
                    setActivePanel("mesh");
                    setActiveTool("mesh");
                  }}
                />
              </div>
            </div>
          ))}
        </Section>

        <Section label="Solvers">
          <Row
            icon="∿"
            label="Modal Simulation"
            selected={selectedNodeId === "solver:modal"}
            badge="hook"
            onClick={() => {
              selectNode("solver:modal");
              setActivePanel("modal");
              setActiveTool("modal");
            }}
          />
          <Row
            icon="⟳"
            label="Asynchronous Simulation"
            selected={selectedNodeId === "solver:async"}
            badge="hook"
            onClick={() => {
              selectNode("solver:async");
              setActivePanel("async");
              setActiveTool("async");
            }}
          />
        </Section>

        <Section label="Results">
          <Row
            icon="▤"
            label="Last Result"
            selected={selectedNodeId === "results"}
            onClick={() => {
              selectNode("results");
              setActivePanel("results");
              setActiveTool("results");
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
      <div className="px-1.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-faint">
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
          ? "bg-accent/20 text-foreground"
          : muted
            ? "text-faint"
            : "text-muted-foreground hover:bg-hover hover:text-accent"
      }`}
    >
      <span className="w-4 shrink-0 text-center text-[10px] opacity-70">
        {icon}
      </span>
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {badge && (
        <span className="shrink-0 rounded bg-active px-1 text-[9px] text-accent/80">
          {badge}
        </span>
      )}
    </button>
  );
}
