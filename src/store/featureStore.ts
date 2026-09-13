import { create } from "zustand";
import { cadClient } from "../cad/cadClient";
import type { MeshBuffers } from "../cad/types";
import { sculptMeshFromParams } from "../sculpt/FormWorkspace";
import {
  EVALUATED_FEATURE_TOOLS,
  FEATURE_TOOL_BY_TYPE,
  ONSHAPE_MATERIAL_LIBRARY,
  SCULPT_FEATURE_TOOLS,
  defaultNameForType,
  type BooleanParams,
  type CadFeature,
  type ConfigTableColumn,
  type ConfigTableRow,
  type ConfigVariable,
  type ConfigVisibilityRow,
  type ExtrudeParams,
  type FeatureToolType,
  type FilletParams,
  type OnshapeMaterial,
  type PartAppearance,
  type PartConfigurationState,
  type SculptParams,
} from "./featureTypes";

function uid(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

function countOfType(features: CadFeature[], type: FeatureToolType): number {
  return features.filter((f) => f.type === type).length + 1;
}

function createFeature(
  type: FeatureToolType,
  features: CadFeature[],
  overrides?: Partial<CadFeature>,
): CadFeature {
  const def = FEATURE_TOOL_BY_TYPE[type];
  const now = Date.now();
  return {
    id: uid(type.slice(0, 3)),
    type,
    name: defaultNameForType(type, countOfType(features, type)),
    suppressed: false,
    status:
      EVALUATED_FEATURE_TOOLS.has(type) || SCULPT_FEATURE_TOOLS.has(type)
        ? "ok"
        : "scaffold",
    params: { ...(def?.defaults ?? {}) },
    shapeId: null,
    references: [],
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function buildSampleFeatures(): CadFeature[] {
  const seed: CadFeature[] = [];
  const sk1 = createFeature("sketch", seed, {
    id: "sk1",
    name: "Sketch 1",
    status: "ok",
    params: { plane: "Front" },
  });
  seed.push(sk1);
  const ex1 = createFeature("extrude", seed, {
    id: "ex1",
    name: "Extrude 1",
    status: "ok",
    params: {
      ...FEATURE_TOOL_BY_TYPE.extrude.defaults,
      sketchId: "sk1",
      depth: 12,
      profile: "rectangle",
      width: 20,
      height: 12,
    },
    references: ["sk1"],
  });
  seed.push(ex1);
  const sk2 = createFeature("sketch", seed, {
    id: "sk2",
    name: "Sketch 2",
    status: "ok",
    params: { plane: "Top" },
  });
  seed.push(sk2);
  const cut1 = createFeature("extrude", seed, {
    id: "cut1",
    name: "Extrude Cut 1",
    status: "ok",
    params: {
      ...FEATURE_TOOL_BY_TYPE.extrude.defaults,
      sketchId: "sk2",
      operation: "remove",
      depth: 6,
      profile: "circle",
      radius: 4,
    },
    references: ["sk2"],
  });
  seed.push(cut1);
  const fil1 = createFeature("fillet", seed, {
    id: "fil1",
    name: "Fillet 1",
    status: "ok",
    params: {
      ...FEATURE_TOOL_BY_TYPE.fillet.defaults,
      radius: 1.5,
      targetShapeId: "demo",
    },
  });
  seed.push(fil1);
  return seed;
}

const DEFAULT_APPEARANCE: PartAppearance = {
  color: "#8b949e",
  metalness: 0.35,
  roughness: 0.45,
  opacity: 1,
  name: "Default",
};

const DEFAULT_CONFIG: PartConfigurationState = {
  activeConfigurationId: "default",
  variables: [
    {
      id: "var_depth",
      name: "extrudeDepth",
      expression: "12 mm",
      value: 12,
      unit: "mm",
    },
    {
      id: "var_fillet",
      name: "filletRadius",
      expression: "1.5 mm",
      value: 1.5,
      unit: "mm",
    },
  ],
  visibility: [],
  columns: [
    { id: "col_name", name: "Configuration", kind: "parameter" },
    { id: "col_depth", name: "extrudeDepth", kind: "variable" },
    { id: "col_fillet", name: "filletRadius", kind: "variable" },
    { id: "col_fil1", name: "Fillet 1", kind: "visibility" },
  ],
  rows: [
    {
      id: "cfg_default",
      configurationName: "Default",
      values: {
        col_depth: 12,
        col_fillet: 1.5,
        col_fil1: true,
      },
    },
    {
      id: "cfg_thin",
      configurationName: "Thin",
      values: {
        col_depth: 6,
        col_fillet: 0.5,
        col_fil1: false,
      },
    },
  ],
};

export interface FeatureStoreState {
  features: CadFeature[];
  selectedFeatureId: string | null;
  editorOpen: boolean;
  regenerating: boolean;
  lastError: string | null;
  lastMesh: MeshBuffers | null;

  appearance: PartAppearance;
  materialId: string;
  materials: OnshapeMaterial[];
  configurations: PartConfigurationState;

  selectFeature: (id: string | null) => void;
  openEditor: (id?: string) => void;
  closeEditor: () => void;

  addFeature: (type: FeatureToolType, atIndex?: number) => string;
  updateFeature: (id: string, patch: Partial<CadFeature>) => void;
  updateFeatureParams: (id: string, params: Record<string, unknown>) => void;
  renameFeature: (id: string, name: string) => void;
  suppressFeature: (id: string, suppressed: boolean) => void;
  removeFeature: (id: string) => void;
  /** Reorder features by moving `fromIndex` to `toIndex` (array splice). */
  reorderFeatures: (fromIndex: number, toIndex: number) => void;

  setAppearance: (patch: Partial<PartAppearance>) => void;
  setMaterialId: (materialId: string) => void;
  setActiveConfiguration: (configurationId: string) => void;
  upsertConfigVariable: (variable: ConfigVariable) => void;
  setFeatureVisibility: (featureId: string, visible: boolean) => void;
  upsertConfigRow: (row: ConfigTableRow) => void;
  upsertConfigColumn: (column: ConfigTableColumn) => void;

  /** Evaluate Extrude / Fillet / Boolean via CAD worker, or Sculpt via Catmull-Clark. */
  evaluateFeature: (id: string) => Promise<MeshBuffers | null>;
  regenerateTree: () => Promise<void>;
  /** Replace the feature tree with the built-in sample bracket model. */
  loadSampleFeatures: () => void;
}

export const useFeatureStore = create<FeatureStoreState>((set, get) => ({
  features: [],
  selectedFeatureId: null,
  editorOpen: false,
  regenerating: false,
  lastError: null,
  lastMesh: null,

  appearance: DEFAULT_APPEARANCE,
  materialId: "aluminum-6061",
  materials: ONSHAPE_MATERIAL_LIBRARY,
  configurations: DEFAULT_CONFIG,

  selectFeature: (id) => set({ selectedFeatureId: id }),

  openEditor: (id) =>
    set((s) => ({
      editorOpen: true,
      selectedFeatureId: id ?? s.selectedFeatureId,
    })),

  closeEditor: () => set({ editorOpen: false }),

  loadSampleFeatures: () => {
    const features = buildSampleFeatures();
    set({
      features,
      selectedFeatureId: features.find((f) => f.type === "extrude")?.id ?? features[0]?.id ?? null,
      lastMesh: null,
      lastError: null,
      configurations: {
        ...DEFAULT_CONFIG,
        visibility: features.map((f) => ({
          id: `vis_${f.id}`,
          featureId: f.id,
          featureName: f.name,
          visible: !f.suppressed,
        })),
      },
    });
  },

  addFeature: (type, atIndex) => {
    const features = get().features;
    const feature = createFeature(type, features);
    set((s) => {
      const next = [...s.features];
      const idx =
        atIndex === undefined
          ? next.length
          : Math.max(0, Math.min(atIndex, next.length));
      next.splice(idx, 0, feature);
      const visibility: ConfigVisibilityRow = {
        id: `vis_${feature.id}`,
        featureId: feature.id,
        featureName: feature.name,
        visible: true,
      };
      return {
        features: next,
        selectedFeatureId: feature.id,
        editorOpen: true,
        configurations: {
          ...s.configurations,
          visibility: [...s.configurations.visibility, visibility],
        },
      };
    });
    return feature.id;
  },

  updateFeature: (id, patch) =>
    set((s) => ({
      features: s.features.map((f) =>
        f.id === id ? { ...f, ...patch, updatedAt: Date.now() } : f,
      ),
    })),

  updateFeatureParams: (id, params) =>
    set((s) => ({
      features: s.features.map((f) =>
        f.id === id
          ? {
              ...f,
              params: { ...f.params, ...params },
              updatedAt: Date.now(),
            }
          : f,
      ),
    })),

  renameFeature: (id, name) =>
    set((s) => ({
      features: s.features.map((f) =>
        f.id === id ? { ...f, name, updatedAt: Date.now() } : f,
      ),
      configurations: {
        ...s.configurations,
        visibility: s.configurations.visibility.map((v) =>
          v.featureId === id ? { ...v, featureName: name } : v,
        ),
      },
    })),

  suppressFeature: (id, suppressed) =>
    set((s) => ({
      features: s.features.map((f) =>
        f.id === id
          ? {
              ...f,
              suppressed,
              status: suppressed ? "suppressed" : f.status === "suppressed" ? "ok" : f.status,
              updatedAt: Date.now(),
            }
          : f,
      ),
      configurations: {
        ...s.configurations,
        visibility: s.configurations.visibility.map((v) =>
          v.featureId === id ? { ...v, visible: !suppressed } : v,
        ),
      },
    })),

  removeFeature: (id) =>
    set((s) => ({
      features: s.features.filter((f) => f.id !== id),
      selectedFeatureId:
        s.selectedFeatureId === id ? null : s.selectedFeatureId,
      editorOpen: s.selectedFeatureId === id ? false : s.editorOpen,
      configurations: {
        ...s.configurations,
        visibility: s.configurations.visibility.filter(
          (v) => v.featureId !== id,
        ),
      },
    })),

  reorderFeatures: (fromIndex, toIndex) =>
    set((s) => {
      if (
        fromIndex === toIndex ||
        fromIndex < 0 ||
        toIndex < 0 ||
        fromIndex >= s.features.length ||
        toIndex >= s.features.length
      ) {
        return s;
      }
      const next = [...s.features];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return { features: next };
    }),

  setAppearance: (patch) =>
    set((s) => ({ appearance: { ...s.appearance, ...patch } })),

  setMaterialId: (materialId) => set({ materialId }),

  setActiveConfiguration: (configurationId) => {
    const { configurations, features } = get();
    const row = configurations.rows.find(
      (r) =>
        r.id === configurationId || r.configurationName === configurationId,
    );
    if (!row) {
      set({
        configurations: {
          ...configurations,
          activeConfigurationId: configurationId,
        },
      });
      return;
    }

    // Apply variable values to matching Extrude/Fillet params when present.
    const depth = row.values.col_depth;
    const fillet = row.values.col_fillet;
    const filVisible = row.values.col_fil1;

    set({
      configurations: {
        ...configurations,
        activeConfigurationId: row.id,
        variables: configurations.variables.map((v) => {
          if (v.name === "extrudeDepth" && typeof depth === "number") {
            return { ...v, value: depth, expression: `${depth} mm` };
          }
          if (v.name === "filletRadius" && typeof fillet === "number") {
            return { ...v, value: fillet, expression: `${fillet} mm` };
          }
          return v;
        }),
        visibility: configurations.visibility.map((v) => {
          if (v.featureId === "fil1" && typeof filVisible === "boolean") {
            return { ...v, visible: filVisible };
          }
          return v;
        }),
      },
      features: features.map((f) => {
        if (f.type === "extrude" && typeof depth === "number") {
          return {
            ...f,
            params: { ...f.params, depth },
            updatedAt: Date.now(),
          };
        }
        if (f.id === "fil1") {
          const next = {
            ...f,
            params:
              typeof fillet === "number"
                ? { ...f.params, radius: fillet }
                : f.params,
            suppressed: typeof filVisible === "boolean" ? !filVisible : f.suppressed,
            updatedAt: Date.now(),
          };
          return next;
        }
        return f;
      }),
    });
  },

  upsertConfigVariable: (variable) =>
    set((s) => {
      const exists = s.configurations.variables.some((v) => v.id === variable.id);
      return {
        configurations: {
          ...s.configurations,
          variables: exists
            ? s.configurations.variables.map((v) =>
                v.id === variable.id ? variable : v,
              )
            : [...s.configurations.variables, variable],
        },
      };
    }),

  setFeatureVisibility: (featureId, visible) => {
    get().suppressFeature(featureId, !visible);
  },

  upsertConfigRow: (row) =>
    set((s) => {
      const exists = s.configurations.rows.some((r) => r.id === row.id);
      return {
        configurations: {
          ...s.configurations,
          rows: exists
            ? s.configurations.rows.map((r) => (r.id === row.id ? row : r))
            : [...s.configurations.rows, row],
        },
      };
    }),

  upsertConfigColumn: (column) =>
    set((s) => {
      const exists = s.configurations.columns.some((c) => c.id === column.id);
      return {
        configurations: {
          ...s.configurations,
          columns: exists
            ? s.configurations.columns.map((c) =>
                c.id === column.id ? column : c,
              )
            : [...s.configurations.columns, column],
        },
      };
    }),

  evaluateFeature: async (id) => {
    const feature = get().features.find((f) => f.id === id);
    if (!feature || feature.suppressed) return null;
    const isOcct = EVALUATED_FEATURE_TOOLS.has(feature.type);
    const isSculpt = SCULPT_FEATURE_TOOLS.has(feature.type);
    if (!isOcct && !isSculpt) {
      set((s) => ({
        features: s.features.map((f) =>
          f.id === id ? { ...f, status: "scaffold" } : f,
        ),
      }));
      return null;
    }

    set({ regenerating: true, lastError: null });
    try {
      let mesh: MeshBuffers | null = null;
      let shapeId: string | null = feature.shapeId;

      if (feature.type === "sculpt") {
        const params = feature.params as unknown as SculptParams;
        const buffers = sculptMeshFromParams({
          size: Number(params.size) || 20,
          levels: Number(params.levels) || 2,
          cageVertices: Array.isArray(params.cageVertices)
            ? (params.cageVertices as number[])
            : undefined,
        });
        shapeId = `sculpt_${feature.id}`;
        mesh = {
          positions: buffers.positions,
          normals: buffers.normals,
          indices: buffers.indices,
          vertexCount: buffers.vertexCount,
          triangleCount: buffers.triangleCount,
          shapeId,
        };
      } else if (feature.type === "extrude") {
        const params = feature.params as unknown as ExtrudeParams;
        const result = await cadClient.evaluateExtrude({
          featureId: feature.id,
          depth: Number(params.depth) || 12,
          draft: Number(params.draft) || 0,
          operation: params.operation ?? "new",
          endType: params.endType ?? "blind",
          direction: params.direction ?? "normal",
          profile: params.profile ?? "rectangle",
          width: Number(params.width) || 20,
          height: Number(params.height) || 12,
          radius: Number(params.radius) || 6,
        });
        shapeId = result.shapeId;
        mesh = result.mesh;
      } else if (feature.type === "fillet") {
        const params = feature.params as unknown as FilletParams;
        const result = await cadClient.evaluateFillet({
          featureId: feature.id,
          radius: Number(params.radius) || 1.5,
          targetShapeId: String(params.targetShapeId || "demo"),
          edgeSelection: params.edgeSelection ?? "all",
          tangentPropagation: Boolean(params.tangentPropagation ?? true),
        });
        shapeId = result.shapeId;
        mesh = result.mesh;
      } else if (feature.type === "boolean") {
        const params = feature.params as unknown as BooleanParams;
        const result = await cadClient.evaluateBoolean({
          featureId: feature.id,
          operation: params.operation ?? "union",
          targetShapeId: String(params.targetShapeId || "demo"),
          toolShapeId: String(params.toolShapeId || ""),
          keepTools: Boolean(params.keepTools),
        });
        shapeId = result.shapeId;
        mesh = result.mesh;
      }

      set((s) => ({
        regenerating: false,
        lastMesh: mesh,
        features: s.features.map((f) =>
          f.id === id
            ? { ...f, shapeId, status: "ok", updatedAt: Date.now() }
            : f,
        ),
      }));
      return mesh;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      set((s) => ({
        regenerating: false,
        lastError: message,
        features: s.features.map((f) =>
          f.id === id ? { ...f, status: "error", updatedAt: Date.now() } : f,
        ),
      }));
      return null;
    }
  },

  regenerateTree: async () => {
    set({ regenerating: true, lastError: null });
    const { features, evaluateFeature } = get();
    let lastMesh: MeshBuffers | null = null;
    try {
      // Reset the rollup body before replaying the tree.
      //
      // Fillet and Boolean features write their result back over the shared
      // "demo" body so the next feature consumes it. Without this reset the
      // rollup carried over from the previous rebuild, so replaying the tree
      // filleted an already-filleted body and re-cut an already-cut one. Every
      // parameter edit therefore produced different geometry than a fresh load
      // of the same feature tree.
      await cadClient.createDemoShape("demo");

      for (const feature of features) {
        if (feature.suppressed) continue;
        if (
          !EVALUATED_FEATURE_TOOLS.has(feature.type) &&
          !SCULPT_FEATURE_TOOLS.has(feature.type)
        ) {
          continue;
        }
        const mesh = await evaluateFeature(feature.id);
        if (mesh) lastMesh = mesh;
      }
      // Drop superseded B-Rep handles so long sessions do not retain native memory.
      const keep = get()
        .features.map((f) => f.shapeId)
        .filter((id): id is string => Boolean(id));
      if (lastMesh?.shapeId) keep.push(lastMesh.shapeId);
      try {
        await cadClient.retainShapes(keep);
      } catch {
        // Eviction is best-effort; evaluation already succeeded.
      }
      set({ regenerating: false, lastMesh });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      set({ regenerating: false, lastError: message });
    }
  },
}));
