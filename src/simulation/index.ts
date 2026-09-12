/**
 * Simulation Studio solver hooks.
 *
 * Modal Simulation: synchronous / blocking eigenmode solve on the UI thread
 * (or a dedicated worker) — suitable for small modal studies.
 *
 * Asynchronous Simulation: queued job with progress callbacks — suitable for
 * large static / transient / thermal runs on a worker pool or cloud.
 *
 * These hooks are UI infrastructure only; they map study parameters into a
 * future FEA backend without implementing solvers here.
 */

import { useCallback, useRef, useState } from "react";
import type {
  AsyncSimulationParams,
  ModalSimulationParams,
  SimulationResultSummary,
  SimulationRunStatus,
  SimulationStudy,
} from "../store/simulationTypes";

export interface ModalSimulationRequest {
  studyId: string;
  material: SimulationStudy["material"];
  mesh: SimulationStudy["mesh"];
  restraints: SimulationStudy["restraints"];
  modal: ModalSimulationParams;
}

export interface AsyncSimulationRequest {
  studyId: string;
  material: SimulationStudy["material"];
  mesh: SimulationStudy["mesh"];
  loads: SimulationStudy["loads"];
  restraints: SimulationStudy["restraints"];
  async: AsyncSimulationParams;
  studyKind: SimulationStudy["kind"];
}

export interface ModalSimulationHooks {
  status: SimulationRunStatus;
  result: SimulationResultSummary | null;
  /** Maps study params → modal eigen solve payload for a future FEA worker. */
  buildRequest: (study: SimulationStudy) => ModalSimulationRequest;
  run: (study: SimulationStudy) => Promise<SimulationResultSummary>;
  cancel: () => void;
}

export interface AsyncSimulationHooks {
  status: SimulationRunStatus;
  progress: number;
  jobId: string | null;
  result: SimulationResultSummary | null;
  /** Maps study params → async job envelope for a future solver queue. */
  buildRequest: (study: SimulationStudy) => AsyncSimulationRequest;
  enqueue: (study: SimulationStudy) => Promise<SimulationResultSummary>;
  cancel: () => void;
}

function stubFrequencies(modeCount: number): number[] {
  const base = 42.5;
  return Array.from({ length: modeCount }, (_, i) =>
    Number((base * (i + 1) * 1.17).toFixed(2)),
  );
}

/**
 * Hook for Modal Simulation (frequency / eigenmode) UI wiring.
 * Returns a scaffolded runner that records mapped params and fake modes.
 */
export function useModalSimulation(): ModalSimulationHooks {
  const [status, setStatus] = useState<SimulationRunStatus>("idle");
  const [result, setResult] = useState<SimulationResultSummary | null>(null);
  const cancelled = useRef(false);

  const buildRequest = useCallback(
    (study: SimulationStudy): ModalSimulationRequest => ({
      studyId: study.id,
      material: { ...study.material },
      mesh: { ...study.mesh },
      restraints: study.restraints.map((r) => ({ ...r, dofs: { ...r.dofs } })),
      modal: { ...study.modal },
    }),
    [],
  );

  const cancel = useCallback(() => {
    cancelled.current = true;
    setStatus("cancelled");
  }, []);

  const run = useCallback(
    async (study: SimulationStudy): Promise<SimulationResultSummary> => {
      cancelled.current = false;
      setStatus("running");
      const request = buildRequest(study);
      // Future: post request to FEA worker / OpenCascade + Eigen bridge.
      console.info("[SimulationStudio] ModalSimulation request", request);

      await new Promise((r) => setTimeout(r, 280));
      if (cancelled.current) {
        const cancelledResult: SimulationResultSummary = {
          studyId: study.id,
          status: "cancelled",
          maxDisplacementMm: null,
          maxVonMisesMPa: null,
          naturalFrequenciesHz: [],
          jobId: null,
          elapsedMs: null,
          message: "Modal simulation cancelled.",
        };
        setResult(cancelledResult);
        return cancelledResult;
      }

      const summary: SimulationResultSummary = {
        studyId: study.id,
        status: "converged",
        maxDisplacementMm: null,
        maxVonMisesMPa: null,
        naturalFrequenciesHz: stubFrequencies(request.modal.modeCount),
        jobId: null,
        elapsedMs: 280,
        message: `Modal scaffold: ${request.modal.modeCount} modes mapped for PBR/FEA handoff.`,
      };
      setStatus("converged");
      setResult(summary);
      return summary;
    },
    [buildRequest],
  );

  return { status, result, buildRequest, run, cancel };
}

/**
 * Hook for Asynchronous Simulation (queued / progressive) UI wiring.
 */
export function useAsyncSimulation(): AsyncSimulationHooks {
  const [status, setStatus] = useState<SimulationRunStatus>("idle");
  const [progress, setProgress] = useState(0);
  const [jobId, setJobId] = useState<string | null>(null);
  const [result, setResult] = useState<SimulationResultSummary | null>(null);
  const cancelled = useRef(false);

  const buildRequest = useCallback(
    (study: SimulationStudy): AsyncSimulationRequest => ({
      studyId: study.id,
      material: { ...study.material },
      mesh: { ...study.mesh },
      loads: study.loads.map((l) => ({
        ...l,
        direction: [...l.direction] as [number, number, number],
      })),
      restraints: study.restraints.map((r) => ({ ...r, dofs: { ...r.dofs } })),
      async: { ...study.async },
      studyKind: study.kind,
    }),
    [],
  );

  const cancel = useCallback(() => {
    cancelled.current = true;
    setStatus("cancelled");
  }, []);

  const enqueue = useCallback(
    async (study: SimulationStudy): Promise<SimulationResultSummary> => {
      cancelled.current = false;
      const request = buildRequest(study);
      const id = `job_${Math.random().toString(36).slice(2, 10)}`;
      setJobId(id);
      setStatus("queued");
      setProgress(0);
      console.info("[SimulationStudio] AsyncSimulation enqueue", { id, request });

      const steps = 5;
      for (let i = 1; i <= steps; i++) {
        await new Promise((r) => setTimeout(r, 120));
        if (cancelled.current) {
          const cancelledResult: SimulationResultSummary = {
            studyId: study.id,
            status: "cancelled",
            maxDisplacementMm: null,
            maxVonMisesMPa: null,
            naturalFrequenciesHz: [],
            jobId: id,
            elapsedMs: null,
            message: "Async simulation cancelled.",
          };
          setResult(cancelledResult);
          return cancelledResult;
        }
        setStatus("running");
        setProgress(i / steps);
      }

      const summary: SimulationResultSummary = {
        studyId: study.id,
        status: "converged",
        maxDisplacementMm: 0.42,
        maxVonMisesMPa: 118.5,
        naturalFrequenciesHz: [],
        jobId: id,
        elapsedMs: steps * 120,
        message: `Async scaffold job ${id} complete (${request.async.workerPool}).`,
      };
      setStatus("converged");
      setProgress(1);
      setResult(summary);
      return summary;
    },
    [buildRequest],
  );

  return { status, progress, jobId, result, buildRequest, enqueue, cancel };
}

export type {
  AsyncSimulationParams,
  ModalSimulationParams,
  SimulationResultSummary,
  SimulationStudy,
};
