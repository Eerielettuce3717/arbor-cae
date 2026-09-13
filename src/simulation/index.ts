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

function stubFrequencies(_modeCount: number): number[] {
  // Do not invent eigenfrequencies — FEA is not wired.
  return [];
}

/**
 * Hook for Modal Simulation (frequency / eigenmode) UI wiring.
 * Returns a scaffolded runner that records mapped params; does not solve FEA.
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
      console.info("[SimulationStudio] ModalSimulation request (scaffold)", request);

      await new Promise((r) => setTimeout(r, 120));
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
        status: "failed",
        maxDisplacementMm: null,
        maxVonMisesMPa: null,
        naturalFrequenciesHz: stubFrequencies(request.modal.modeCount),
        jobId: null,
        elapsedMs: 120,
        message:
          "Modal FEA is not implemented — params were mapped only. No eigenfrequencies were computed.",
      };
      setStatus("failed");
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
      console.info("[SimulationStudio] AsyncSimulation enqueue (scaffold)", {
        id,
        request,
      });

      setStatus("running");
      setProgress(0.5);
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

      const summary: SimulationResultSummary = {
        studyId: study.id,
        status: "failed",
        maxDisplacementMm: null,
        maxVonMisesMPa: null,
        naturalFrequenciesHz: [],
        jobId: id,
        elapsedMs: 120,
        message: `Async FEA is not implemented — job ${id} was not sent to a worker pool.`,
      };
      setStatus("failed");
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
