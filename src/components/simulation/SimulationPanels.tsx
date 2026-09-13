import type { ReactNode } from "react";
import {
  useAsyncSimulation,
  useModalSimulation,
} from "../../simulation";
import { useSimulationStore } from "../../store/simulationStore";
import type {
  SimulationPanelId,
  SimulationStudyKind,
} from "../../store/simulationTypes";

export function SimulationSidePanel() {
  const activePanel = useSimulationStore((s) => s.activePanel);
  const setActivePanel = useSimulationStore((s) => s.setActivePanel);

  if (activePanel === "none") return null;

  return (
    <aside className="absolute bottom-12 right-3 top-3 z-20 flex w-80 flex-col overflow-hidden rounded-md border border-border bg-card/95">
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          {panelTitle(activePanel)}
        </span>
        <button
          type="button"
          onClick={() => setActivePanel("none")}
          className="rounded px-1.5 text-faint hover:bg-hover hover:text-accent"
        >
          ×
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-3 text-xs">
        {activePanel === "study" && <StudyPanel />}
        {activePanel === "loads" && <LoadsPanel />}
        {activePanel === "restraints" && <RestraintsPanel />}
        {activePanel === "mesh" && <MeshPanel />}
        {activePanel === "modal" && <ModalSimulationPanel />}
        {activePanel === "async" && <AsyncSimulationPanel />}
        {activePanel === "results" && <ResultsPanel />}
      </div>
    </aside>
  );
}

function panelTitle(id: SimulationPanelId): string {
  switch (id) {
    case "study":
      return "Study";
    case "loads":
      return "Loads";
    case "restraints":
      return "Restraints";
    case "mesh":
      return "Mesh";
    case "modal":
      return "Modal Simulation";
    case "async":
      return "Asynchronous Simulation";
    case "results":
      return "Results";
    default:
      return "Simulation";
  }
}

function useActiveStudy() {
  const studies = useSimulationStore((s) => s.studies);
  const activeStudyId = useSimulationStore((s) => s.activeStudyId);
  return studies.find((s) => s.id === activeStudyId) ?? studies[0];
}

function StudyPanel() {
  const study = useActiveStudy();
  const updateStudy = useSimulationStore((s) => s.updateStudy);
  const updateMaterial = useSimulationStore((s) => s.updateMaterial);
  if (!study) return null;

  return (
    <div className="space-y-3">
      <ScaffoldBadge />
      <Field label="Name">
        <input
          className={inputClass}
          value={study.name}
          onChange={(e) => updateStudy(study.id, { name: e.target.value })}
        />
      </Field>
      <Field label="Study type">
        <select
          className={inputClass}
          value={study.kind}
          onChange={(e) =>
            updateStudy(study.id, {
              kind: e.target.value as SimulationStudyKind,
            })
          }
        >
          <option value="static">Static</option>
          <option value="modal">Modal</option>
          <option value="transient">Transient</option>
          <option value="thermal">Thermal</option>
        </select>
      </Field>
      <div className="grid grid-cols-2 gap-2">
        <NumField
          label="E (MPa)"
          value={study.material.youngsModulusMPa}
          onChange={(v) => updateMaterial({ youngsModulusMPa: v })}
        />
        <NumField
          label="ν"
          value={study.material.poissonsRatio}
          step={0.01}
          min={0}
          max={0.49}
          onChange={(v) => updateMaterial({ poissonsRatio: v })}
        />
        <NumField
          label="ρ (kg/m³)"
          value={study.material.densityKgM3}
          onChange={(v) => updateMaterial({ densityKgM3: v })}
        />
        <NumField
          label="Sy (MPa)"
          value={study.material.yieldMPa}
          onChange={(v) => updateMaterial({ yieldMPa: v })}
        />
      </div>
      <p className="text-[11px] leading-relaxed text-faint">
        Study definition feeds Modal and Asynchronous simulation hooks. No FEA
        solver is implemented in this scaffold.
      </p>
    </div>
  );
}

function LoadsPanel() {
  const study = useActiveStudy();
  const addLoad = useSimulationStore((s) => s.addLoad);
  const updateLoad = useSimulationStore((s) => s.updateLoad);
  if (!study) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <ScaffoldBadge />
        <ActionBtn label="Add Load" onClick={addLoad} />
      </div>
      {study.loads.map((load) => (
        <div
          key={load.id}
          className="space-y-2 rounded border border-border bg-background/60 p-2"
        >
          <Field label="Name">
            <input
              className={inputClass}
              value={load.name}
              onChange={(e) => updateLoad(load.id, { name: e.target.value })}
            />
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Kind">
              <select
                className={inputClass}
                value={load.kind}
                onChange={(e) =>
                  updateLoad(load.id, {
                    kind: e.target.value as typeof load.kind,
                  })
                }
              >
                <option value="force">Force</option>
                <option value="pressure">Pressure</option>
                <option value="gravity">Gravity</option>
                <option value="torque">Torque</option>
              </select>
            </Field>
            <NumField
              label="Magnitude"
              value={load.magnitude}
              onChange={(v) => updateLoad(load.id, { magnitude: v })}
            />
          </div>
          <Field label="Face">
            <input
              className={inputClass}
              value={load.faceLabel}
              onChange={(e) =>
                updateLoad(load.id, { faceLabel: e.target.value })
              }
            />
          </Field>
        </div>
      ))}
    </div>
  );
}

function RestraintsPanel() {
  const study = useActiveStudy();
  const addRestraint = useSimulationStore((s) => s.addRestraint);
  const updateRestraint = useSimulationStore((s) => s.updateRestraint);
  if (!study) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <ScaffoldBadge />
        <ActionBtn label="Add Restraint" onClick={addRestraint} />
      </div>
      {study.restraints.map((r) => (
        <div
          key={r.id}
          className="space-y-2 rounded border border-border bg-background/60 p-2"
        >
          <Field label="Name">
            <input
              className={inputClass}
              value={r.name}
              onChange={(e) => updateRestraint(r.id, { name: e.target.value })}
            />
          </Field>
          <Field label="Kind">
            <select
              className={inputClass}
              value={r.kind}
              onChange={(e) =>
                updateRestraint(r.id, {
                  kind: e.target.value as typeof r.kind,
                })
              }
            >
              <option value="fixed">Fixed</option>
              <option value="slider">Slider</option>
              <option value="pin">Pin</option>
              <option value="roller">Roller</option>
            </select>
          </Field>
          <Field label="Face">
            <input
              className={inputClass}
              value={r.faceLabel}
              onChange={(e) =>
                updateRestraint(r.id, { faceLabel: e.target.value })
              }
            />
          </Field>
        </div>
      ))}
    </div>
  );
}

function MeshPanel() {
  const study = useActiveStudy();
  const updateMesh = useSimulationStore((s) => s.updateMesh);
  if (!study) return null;

  return (
    <div className="space-y-3">
      <ScaffoldBadge />
      <NumField
        label="Element size (mm)"
        value={study.mesh.elementSizeMm}
        step={0.1}
        onChange={(v) => updateMesh({ elementSizeMm: v })}
      />
      <NumField
        label="Min size (mm)"
        value={study.mesh.minSizeMm}
        step={0.1}
        onChange={(v) => updateMesh({ minSizeMm: v })}
      />
      <NumField
        label="Growth rate"
        value={study.mesh.growthRate}
        step={0.05}
        onChange={(v) => updateMesh({ growthRate: v })}
      />
      <Field label="Element order">
        <select
          className={inputClass}
          value={study.mesh.order}
          onChange={(e) =>
            updateMesh({ order: Number(e.target.value) as 1 | 2 })
          }
        >
          <option value={1}>Linear (1st)</option>
          <option value={2}>Quadratic (2nd)</option>
        </select>
      </Field>
      <label className="flex items-center gap-2 text-muted-foreground">
        <input
          type="checkbox"
          checked={study.mesh.curvatureRefine}
          onChange={(e) => updateMesh({ curvatureRefine: e.target.checked })}
        />
        Curvature-based refine
      </label>
    </div>
  );
}

function ModalSimulationPanel() {
  const study = useActiveStudy();
  const updateModalParams = useSimulationStore((s) => s.updateModalParams);
  const setLastResult = useSimulationStore((s) => s.setLastResult);
  const setStatusMessage = useSimulationStore((s) => s.setStatusMessage);
  const setActivePanel = useSimulationStore((s) => s.setActivePanel);
  const modal = useModalSimulation();

  if (!study) return null;

  return (
    <div className="space-y-3">
      <ScaffoldBadge label="Modal hook" />
      <NumField
        label="Mode count"
        value={study.modal.modeCount}
        min={1}
        max={50}
        onChange={(v) => updateModalParams({ modeCount: Math.round(v) })}
      />
      <div className="grid grid-cols-2 gap-2">
        <NumField
          label="f min (Hz)"
          value={study.modal.frequencyMinHz}
          onChange={(v) => updateModalParams({ frequencyMinHz: v })}
        />
        <NumField
          label="f max (Hz)"
          value={study.modal.frequencyMaxHz}
          onChange={(v) => updateModalParams({ frequencyMaxHz: v })}
        />
      </div>
      <Field label="Mass normalization">
        <select
          className={inputClass}
          value={study.modal.massNormalization}
          onChange={(e) =>
            updateModalParams({
              massNormalization: e.target.value as "unit" | "max",
            })
          }
        >
          <option value="unit">Unit mass</option>
          <option value="max">Max component</option>
        </select>
      </Field>
      <label className="flex items-center gap-2 text-muted-foreground">
        <input
          type="checkbox"
          checked={study.modal.includeRigidBodyModes}
          onChange={(e) =>
            updateModalParams({ includeRigidBodyModes: e.target.checked })
          }
        />
        Include rigid-body modes
      </label>
      <div className="flex flex-wrap gap-1.5">
        <ActionBtn
          label={modal.status === "running" ? "Running…" : "Run Modal"}
          primary
          disabled={modal.status === "running"}
          onClick={async () => {
            const result = await modal.run(study);
            setLastResult(result);
            setStatusMessage(result.message);
            setActivePanel("results");
          }}
        />
        <ActionBtn label="Cancel" onClick={modal.cancel} />
      </div>
      <p className="text-[11px] text-faint">
        Status: <span className="text-accent">{modal.status}</span>
      </p>
    </div>
  );
}

function AsyncSimulationPanel() {
  const study = useActiveStudy();
  const updateAsyncParams = useSimulationStore((s) => s.updateAsyncParams);
  const setLastResult = useSimulationStore((s) => s.setLastResult);
  const setStatusMessage = useSimulationStore((s) => s.setStatusMessage);
  const setActivePanel = useSimulationStore((s) => s.setActivePanel);
  const asyncSim = useAsyncSimulation();

  if (!study) return null;

  return (
    <div className="space-y-3">
      <ScaffoldBadge label="Async hook" />
      <Field label="Job name">
        <input
          className={inputClass}
          value={study.async.jobName}
          onChange={(e) => updateAsyncParams({ jobName: e.target.value })}
        />
      </Field>
      <div className="grid grid-cols-2 gap-2">
        <NumField
          label="Wall time (min)"
          value={study.async.maxWallTimeMin}
          onChange={(v) => updateAsyncParams({ maxWallTimeMin: v })}
        />
        <NumField
          label="Checkpoint (s)"
          value={study.async.checkpointIntervalSec}
          onChange={(v) => updateAsyncParams({ checkpointIntervalSec: v })}
        />
      </div>
      <Field label="Worker pool">
        <select
          className={inputClass}
          value={study.async.workerPool}
          onChange={(e) =>
            updateAsyncParams({
              workerPool: e.target.value as "local" | "cloud",
            })
          }
        >
          <option value="local">Local</option>
          <option value="cloud">Cloud</option>
        </select>
      </Field>
      <Field label="Priority">
        <select
          className={inputClass}
          value={study.async.priority}
          onChange={(e) =>
            updateAsyncParams({
              priority: e.target.value as "low" | "normal" | "high",
            })
          }
        >
          <option value="low">Low</option>
          <option value="normal">Normal</option>
          <option value="high">High</option>
        </select>
      </Field>
      <label className="flex items-center gap-2 text-muted-foreground">
        <input
          type="checkbox"
          checked={study.async.notifyOnComplete}
          onChange={(e) =>
            updateAsyncParams({ notifyOnComplete: e.target.checked })
          }
        />
        Notify on complete
      </label>
      <div className="h-1.5 overflow-hidden rounded bg-background">
        <div
          className="h-full bg-accent transition-all"
          style={{ width: `${Math.round(asyncSim.progress * 100)}%` }}
        />
      </div>
      <div className="flex flex-wrap gap-1.5">
        <ActionBtn
          label={
            asyncSim.status === "running" || asyncSim.status === "queued"
              ? "Queued…"
              : "Enqueue Async"
          }
          primary
          disabled={
            asyncSim.status === "running" || asyncSim.status === "queued"
          }
          onClick={async () => {
            const result = await asyncSim.enqueue(study);
            setLastResult(result);
            setStatusMessage(result.message);
            setActivePanel("results");
          }}
        />
        <ActionBtn label="Cancel" onClick={asyncSim.cancel} />
      </div>
      <p className="text-[11px] text-faint">
        Status: <span className="text-accent">{asyncSim.status}</span>
        {asyncSim.jobId ? ` · ${asyncSim.jobId}` : ""}
      </p>
    </div>
  );
}

function ResultsPanel() {
  const lastResult = useSimulationStore((s) => s.lastResult);

  if (!lastResult) {
    return (
      <div className="space-y-2">
        <ScaffoldBadge />
        <p className="text-faint">
          No results yet. Run Modal or Asynchronous simulation.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <ScaffoldBadge />
      <div className="rounded border border-border bg-background/60 p-2 space-y-1">
        <Row label="Status" value={lastResult.status} />
        <Row label="Message" value={lastResult.message} />
        {lastResult.jobId && <Row label="Job" value={lastResult.jobId} />}
        {lastResult.elapsedMs != null && (
          <Row label="Elapsed" value={`${lastResult.elapsedMs} ms`} />
        )}
        {lastResult.maxDisplacementMm != null && (
          <Row
            label="Max U"
            value={`${lastResult.maxDisplacementMm.toFixed(3)} mm`}
          />
        )}
        {lastResult.maxVonMisesMPa != null && (
          <Row
            label="Max σvm"
            value={`${lastResult.maxVonMisesMPa.toFixed(1)} MPa`}
          />
        )}
      </div>
      {lastResult.naturalFrequenciesHz.length > 0 && (
        <div>
          <div className="mb-1 text-[10px] uppercase tracking-wide text-faint">
            Natural frequencies (Hz)
          </div>
          <ul className="space-y-0.5 font-mono text-[11px] text-accent/90">
            {lastResult.naturalFrequenciesHz.map((f, i) => (
              <li key={i}>
                Mode {i + 1}: {f.toFixed(2)}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2 text-[11px]">
      <span className="w-16 shrink-0 text-faint">{label}</span>
      <span className="min-w-0 break-words text-foreground">{value}</span>
    </div>
  );
}

function ScaffoldBadge({ label = "UI only" }: { label?: string }) {
  return (
    <span className="inline-flex rounded bg-active px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-accent/90">
      {label}
    </span>
  );
}

const inputClass =
  "w-full rounded border border-border bg-background px-2 py-1.5 text-foreground";

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block space-y-1">
      <span className="text-[10px] font-medium uppercase tracking-wide text-faint">
        {label}
      </span>
      {children}
    </label>
  );
}

function NumField({
  label,
  value,
  onChange,
  step,
  min,
  max,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step?: number;
  min?: number;
  max?: number;
}) {
  return (
    <Field label={label}>
      <input
        type="number"
        className={inputClass}
        value={value}
        step={step}
        min={min}
        max={max}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </Field>
  );
}

function ActionBtn({
  label,
  onClick,
  primary,
  disabled,
}: {
  label: string;
  onClick: () => void;
  primary?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`rounded px-2.5 py-1.5 text-[11px] font-medium disabled:opacity-40 ${
        primary
          ? "bg-accent text-accent-foreground hover:bg-accent"
          : "border border-border text-muted-foreground hover:border-accent hover:text-accent"
      }`}
    >
      {label}
    </button>
  );
}
