import { useSimulationStore } from "../../store/simulationStore";

/**
 * Lightweight graphics placeholder for Simulation Studio.
 * Future: overlay FEA mesh / contour results on the CAD viewport.
 */
export function SimulationViewport() {
  const studies = useSimulationStore((s) => s.studies);
  const activeStudyId = useSimulationStore((s) => s.activeStudyId);
  const lastResult = useSimulationStore((s) => s.lastResult);
  const statusMessage = useSimulationStore((s) => s.statusMessage);
  const study = studies.find((s) => s.id === activeStudyId) ?? studies[0];

  return (
    <div className="relative h-full w-full overflow-hidden bg-background">
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            "linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      />
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="max-w-md rounded-lg border border-border bg-card/80 px-6 py-5 text-center">
          <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-accent/80">
            Simulation Graphics
          </div>
          <div className="text-sm font-medium text-foreground">
            {study?.name ?? "Study"}
          </div>
          <p className="mt-2 text-[11px] leading-relaxed text-faint">
            No FEA mesh or contour overlay yet. Run Modal/Async to get an
            honest failure — results never invent stress or frequencies.
          </p>
          {lastResult && (
            <div className="mt-3 rounded border border-border bg-background/70 px-3 py-2 text-left text-[11px] text-muted-foreground">
              <div>
                Last:{" "}
                <span className="text-accent">{lastResult.status}</span>
              </div>
              {lastResult.naturalFrequenciesHz.length > 0 && (
                <div className="mt-1 font-mono text-[10px] text-accent/80">
                  f₁ = {lastResult.naturalFrequenciesHz[0]?.toFixed(2)} Hz
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      <div className="absolute bottom-3 left-3 right-3 flex justify-center">
        <div className="max-w-xl truncate rounded border border-border bg-card/90 px-3 py-1.5 text-[11px] text-accent/90">
          {statusMessage}
        </div>
      </div>
    </div>
  );
}
