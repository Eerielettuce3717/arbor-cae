/** Simulation Studio domain types: studies, modal / async solvers, result hooks. */

export type SimulationToolId =
  | "select"
  | "study"
  | "loads"
  | "restraints"
  | "mesh"
  | "modal"
  | "async"
  | "results";

export type SimulationStudyKind =
  | "static"
  | "modal"
  | "transient"
  | "thermal";

export type SimulationSolverMode = "modal" | "asynchronous";

export type SimulationRunStatus =
  | "idle"
  | "queued"
  | "running"
  | "converged"
  | "failed"
  | "cancelled";

export type SimulationPanelId =
  | "none"
  | "study"
  | "loads"
  | "restraints"
  | "mesh"
  | "modal"
  | "async"
  | "results";

export interface SimulationMaterialProps {
  youngsModulusMPa: number;
  poissonsRatio: number;
  densityKgM3: number;
  yieldMPa: number;
}

export interface SimulationLoad {
  id: string;
  name: string;
  kind: "force" | "pressure" | "gravity" | "torque";
  magnitude: number;
  direction: [number, number, number];
  faceLabel: string;
}

export interface SimulationRestraint {
  id: string;
  name: string;
  kind: "fixed" | "slider" | "pin" | "roller";
  faceLabel: string;
  dofs: {
    tx: boolean;
    ty: boolean;
    tz: boolean;
    rx: boolean;
    ry: boolean;
    rz: boolean;
  };
}

export interface SimulationMeshSettings {
  elementSizeMm: number;
  minSizeMm: number;
  growthRate: number;
  order: 1 | 2;
  curvatureRefine: boolean;
}

export interface ModalSimulationParams {
  modeCount: number;
  frequencyMinHz: number;
  frequencyMaxHz: number;
  includeRigidBodyModes: boolean;
  massNormalization: "unit" | "max";
}

export interface AsyncSimulationParams {
  jobName: string;
  maxWallTimeMin: number;
  checkpointIntervalSec: number;
  workerPool: "local" | "cloud";
  notifyOnComplete: boolean;
  priority: "low" | "normal" | "high";
}

export interface SimulationStudy {
  id: string;
  name: string;
  kind: SimulationStudyKind;
  solverMode: SimulationSolverMode;
  material: SimulationMaterialProps;
  loads: SimulationLoad[];
  restraints: SimulationRestraint[];
  mesh: SimulationMeshSettings;
  modal: ModalSimulationParams;
  async: AsyncSimulationParams;
  suppressed: boolean;
}

export interface SimulationResultSummary {
  studyId: string;
  status: SimulationRunStatus;
  maxDisplacementMm: number | null;
  maxVonMisesMPa: number | null;
  naturalFrequenciesHz: number[];
  jobId: string | null;
  elapsedMs: number | null;
  message: string;
}

export const DEFAULT_SIM_MATERIAL: SimulationMaterialProps = {
  youngsModulusMPa: 68900,
  poissonsRatio: 0.33,
  densityKgM3: 2700,
  yieldMPa: 276,
};

export const DEFAULT_MESH: SimulationMeshSettings = {
  elementSizeMm: 2.5,
  minSizeMm: 0.5,
  growthRate: 1.4,
  order: 2,
  curvatureRefine: true,
};

export const DEFAULT_MODAL_PARAMS: ModalSimulationParams = {
  modeCount: 6,
  frequencyMinHz: 0,
  frequencyMaxHz: 5000,
  includeRigidBodyModes: false,
  massNormalization: "unit",
};

export const DEFAULT_ASYNC_PARAMS: AsyncSimulationParams = {
  jobName: "Async Study 1",
  maxWallTimeMin: 60,
  checkpointIntervalSec: 30,
  workerPool: "local",
  notifyOnComplete: true,
  priority: "normal",
};

export const SIMULATION_TOOLBAR_GROUPS: {
  id: string;
  label: string;
  tools: { id: SimulationToolId; label: string }[];
}[] = [
  {
    id: "define",
    label: "Define",
    tools: [
      { id: "study", label: "Study" },
      { id: "loads", label: "Loads" },
      { id: "restraints", label: "Restraints" },
      { id: "mesh", label: "Mesh" },
    ],
  },
  {
    id: "solve",
    label: "Solve",
    tools: [
      { id: "modal", label: "Modal Sim" },
      { id: "async", label: "Async Sim" },
    ],
  },
  {
    id: "review",
    label: "Review",
    tools: [{ id: "results", label: "Results" }],
  },
];
