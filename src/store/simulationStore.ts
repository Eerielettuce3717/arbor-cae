import { create } from "zustand";
import {
  DEFAULT_ASYNC_PARAMS,
  DEFAULT_MESH,
  DEFAULT_MODAL_PARAMS,
  DEFAULT_SIM_MATERIAL,
  type AsyncSimulationParams,
  type ModalSimulationParams,
  type SimulationLoad,
  type SimulationMeshSettings,
  type SimulationMaterialProps,
  type SimulationPanelId,
  type SimulationRestraint,
  type SimulationResultSummary,
  type SimulationStudy,
  type SimulationStudyKind,
  type SimulationToolId,
} from "./simulationTypes";

function uid(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

function seedStudy(): SimulationStudy {
  return {
    id: "study_1",
    name: "Modal Bracket Study",
    kind: "modal",
    solverMode: "modal",
    material: { ...DEFAULT_SIM_MATERIAL },
    loads: [
      {
        id: "load_1",
        name: "Gravity",
        kind: "gravity",
        magnitude: 9.81,
        direction: [0, 0, -1],
        faceLabel: "Body",
      },
    ],
    restraints: [
      {
        id: "fix_1",
        name: "Fixed Mount",
        kind: "fixed",
        faceLabel: "Mount Face",
        dofs: {
          tx: true,
          ty: true,
          tz: true,
          rx: true,
          ry: true,
          rz: true,
        },
      },
    ],
    mesh: { ...DEFAULT_MESH },
    modal: { ...DEFAULT_MODAL_PARAMS },
    async: { ...DEFAULT_ASYNC_PARAMS },
    suppressed: false,
  };
}

interface SimulationState {
  studies: SimulationStudy[];
  activeStudyId: string | null;
  activeTool: SimulationToolId;
  activePanel: SimulationPanelId;
  selectedNodeId: string | null;
  lastResult: SimulationResultSummary | null;
  statusMessage: string;

  setActiveTool: (tool: SimulationToolId) => void;
  setActivePanel: (panel: SimulationPanelId) => void;
  selectStudy: (id: string) => void;
  selectNode: (id: string | null) => void;
  updateStudy: (
    id: string,
    patch: Partial<
      Pick<SimulationStudy, "name" | "kind" | "solverMode" | "suppressed">
    >,
  ) => void;
  updateMaterial: (patch: Partial<SimulationMaterialProps>) => void;
  updateMesh: (patch: Partial<SimulationMeshSettings>) => void;
  updateModalParams: (patch: Partial<ModalSimulationParams>) => void;
  updateAsyncParams: (patch: Partial<AsyncSimulationParams>) => void;
  addLoad: () => void;
  updateLoad: (id: string, patch: Partial<SimulationLoad>) => void;
  addRestraint: () => void;
  updateRestraint: (id: string, patch: Partial<SimulationRestraint>) => void;
  setLastResult: (result: SimulationResultSummary | null) => void;
  setStatusMessage: (message: string) => void;
  loadSampleSimulation: () => void;
}

const TOOL_TO_PANEL: Partial<Record<SimulationToolId, SimulationPanelId>> = {
  study: "study",
  loads: "loads",
  restraints: "restraints",
  mesh: "mesh",
  modal: "modal",
  async: "async",
  results: "results",
};

export const useSimulationStore = create<SimulationState>((set, get) => {
  return {
    studies: [],
    activeStudyId: null,
    activeTool: "study",
    activePanel: "study",
    selectedNodeId: null,
    lastResult: null,
    statusMessage:
      "Simulation Studio — no study yet. Load the sample or define a study.",

    loadSampleSimulation: () => {
      const study = seedStudy();
      set({
        studies: [study],
        activeStudyId: study.id,
        selectedNodeId: study.id,
        lastResult: null,
        statusMessage:
          "Sample study loaded — Modal/Async report failure until an FEA solver is wired.",
      });
    },

    setActiveTool: (tool) => {
      const panel = TOOL_TO_PANEL[tool];
      set({
        activeTool: tool,
        ...(panel ? { activePanel: panel } : {}),
        statusMessage:
          tool === "modal"
            ? "Modal Simulation ready — map eigenmode params and run."
            : tool === "async"
              ? "Asynchronous Simulation ready — enqueue job with progress hooks."
              : `Tool: ${tool}`,
      });
    },

    setActivePanel: (panel) => set({ activePanel: panel }),

    selectStudy: (id) =>
      set({
        activeStudyId: id,
        selectedNodeId: id,
        activePanel: "study",
      }),

    selectNode: (id) => set({ selectedNodeId: id }),

    updateStudy: (id, patch) => {
      set({
        studies: get().studies.map((s) =>
          s.id === id ? { ...s, ...patch } : s,
        ),
        statusMessage: "Study updated.",
      });
    },

    updateMaterial: (patch) => {
      const { studies, activeStudyId } = get();
      set({
        studies: studies.map((s) =>
          s.id === activeStudyId
            ? { ...s, material: { ...s.material, ...patch } }
            : s,
        ),
      });
    },

    updateMesh: (patch) => {
      const { studies, activeStudyId } = get();
      set({
        studies: studies.map((s) =>
          s.id === activeStudyId ? { ...s, mesh: { ...s.mesh, ...patch } } : s,
        ),
      });
    },

    updateModalParams: (patch) => {
      const { studies, activeStudyId } = get();
      set({
        studies: studies.map((s) =>
          s.id === activeStudyId
            ? { ...s, modal: { ...s.modal, ...patch }, solverMode: "modal" }
            : s,
        ),
      });
    },

    updateAsyncParams: (patch) => {
      const { studies, activeStudyId } = get();
      set({
        studies: studies.map((s) =>
          s.id === activeStudyId
            ? {
                ...s,
                async: { ...s.async, ...patch },
                solverMode: "asynchronous",
              }
            : s,
        ),
      });
    },

    addLoad: () => {
      const { studies, activeStudyId } = get();
      const study = studies.find((s) => s.id === activeStudyId);
      if (!study) return;
      const load: SimulationLoad = {
        id: uid("load"),
        name: `Force ${study.loads.length + 1}`,
        kind: "force",
        magnitude: 100,
        direction: [0, 0, -1],
        faceLabel: "Selected Face",
      };
      set({
        studies: studies.map((s) =>
          s.id === activeStudyId ? { ...s, loads: [...s.loads, load] } : s,
        ),
        selectedNodeId: load.id,
        activePanel: "loads",
        statusMessage: `${load.name} added.`,
      });
    },

    updateLoad: (id, patch) => {
      const { studies, activeStudyId } = get();
      set({
        studies: studies.map((s) =>
          s.id === activeStudyId
            ? {
                ...s,
                loads: s.loads.map((l) =>
                  l.id === id
                    ? {
                        ...l,
                        ...patch,
                        direction: patch.direction
                          ? ([...patch.direction] as [
                              number,
                              number,
                              number,
                            ])
                          : l.direction,
                      }
                    : l,
                ),
              }
            : s,
        ),
      });
    },

    addRestraint: () => {
      const { studies, activeStudyId } = get();
      const study = studies.find((s) => s.id === activeStudyId);
      if (!study) return;
      const restraint: SimulationRestraint = {
        id: uid("rest"),
        name: `Restraint ${study.restraints.length + 1}`,
        kind: "fixed",
        faceLabel: "Selected Face",
        dofs: {
          tx: true,
          ty: true,
          tz: true,
          rx: true,
          ry: true,
          rz: true,
        },
      };
      set({
        studies: studies.map((s) =>
          s.id === activeStudyId
            ? { ...s, restraints: [...s.restraints, restraint] }
            : s,
        ),
        selectedNodeId: restraint.id,
        activePanel: "restraints",
        statusMessage: `${restraint.name} added.`,
      });
    },

    updateRestraint: (id, patch) => {
      const { studies, activeStudyId } = get();
      set({
        studies: studies.map((s) =>
          s.id === activeStudyId
            ? {
                ...s,
                restraints: s.restraints.map((r) =>
                  r.id === id
                    ? {
                        ...r,
                        ...patch,
                        dofs: patch.dofs ? { ...r.dofs, ...patch.dofs } : r.dofs,
                      }
                    : r,
                ),
              }
            : s,
        ),
      });
    },

    setLastResult: (result) => set({ lastResult: result }),
    setStatusMessage: (message) => set({ statusMessage: message }),
  };
});

export type { SimulationStudyKind };
