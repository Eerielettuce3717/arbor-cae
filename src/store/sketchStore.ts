import { create } from "zustand";
import {
  applyCoincident,
  circleFromCenterRadius,
  measureEntity,
  rectangleFromCenter,
  rectangleFromCorners,
} from "../components/partstudio/geometry";
import type {
  DraftStroke,
  EntityId,
  InferenceSnap,
  SketchConstraint,
  SketchConstraintType,
  SketchEntity,
  SketchTool,
  Vec2,
} from "../components/partstudio/types";
import {
  IMPLEMENTED_CONSTRAINTS,
  IMPLEMENTED_SKETCH_TOOLS,
  SketchConstraintType as ConstraintEnum,
  SketchTool as ToolEnum,
} from "../components/partstudio/types";

function uid(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

export interface SketchStoreState {
  active: boolean;
  sketchId: string | null;
  sketchName: string;
  activeTool: SketchTool;
  activeConstraintTool: SketchConstraintType | null;
  entities: SketchEntity[];
  constraints: SketchConstraint[];
  selectedIds: EntityId[];
  draft: DraftStroke | null;
  cursor: Vec2 | null;
  inference: InferenceSnap[];
  snappedCursor: Vec2 | null;
  constructionMode: boolean;
  statusMessage: string;

  setActive: (active: boolean, sketch?: { id: string; name: string }) => void;
  setActiveTool: (tool: SketchTool) => void;
  setActiveConstraintTool: (type: SketchConstraintType | null) => void;
  toggleConstructionMode: () => void;
  setCursor: (world: Vec2 | null, snaps?: InferenceSnap[], snapped?: Vec2 | null) => void;
  clearDraft: () => void;
  selectEntities: (ids: EntityId[]) => void;
  removeSelected: () => void;
  clearSketch: () => void;

  /** Pointer press in sketch space (already inferred/snapped). */
  pointerDown: (world: Vec2) => void;
  /** Pointer move while drafting. */
  pointerMove: (world: Vec2) => void;
  /** Cancel current draft (Esc). */
  cancelDraft: () => void;

  addConstraint: (
    type: SketchConstraintType,
    entityIds: EntityId[],
    opts?: { value?: number; inferred?: boolean; handles?: string[] },
  ) => void;
}

function finishLine(
  start: Vec2,
  end: Vec2,
  construction: boolean,
): { entity: SketchEntity; coincidentTargets: Vec2[] } {
  return {
    entity: {
      id: uid("ln"),
      kind: "line",
      start: { ...start },
      end: { ...end },
      construction,
      sourceTool: ToolEnum.Line,
    },
    coincidentTargets: [start, end],
  };
}

function finishRectangle(
  a: Vec2,
  b: Vec2,
  fromCenter: boolean,
  construction: boolean,
  tool: SketchTool,
): SketchEntity {
  const box = fromCenter
    ? rectangleFromCenter(a, b)
    : rectangleFromCorners(a, b);
  return {
    id: uid("rect"),
    kind: "rectangle",
    min: box.min,
    max: box.max,
    fromCenter,
    construction,
    sourceTool: tool,
  };
}

function finishCircle(
  center: Vec2,
  edge: Vec2,
  construction: boolean,
): SketchEntity {
  const c = circleFromCenterRadius(center, edge);
  return {
    id: uid("cir"),
    kind: "circle",
    center: c.center,
    radius: Math.max(c.radius, 1e-6),
    construction,
    sourceTool: ToolEnum.CenterPointCircle,
  };
}

function maybeCoincidentAt(
  entities: SketchEntity[],
  point: Vec2,
  newEntityId: EntityId,
  add: SketchStoreState["addConstraint"],
): void {
  for (const e of entities) {
    if (e.id === newEntityId) continue;
    const anchors: Vec2[] = [];
    if (e.kind === "point") anchors.push(e.position);
    if (e.kind === "line") anchors.push(e.start, e.end);
    if (e.kind === "rectangle") {
      anchors.push(
        { x: e.min.x, y: e.min.y },
        { x: e.max.x, y: e.min.y },
        { x: e.max.x, y: e.max.y },
        { x: e.min.x, y: e.max.y },
      );
    }
    if (e.kind === "circle") anchors.push(e.center);
    for (const a of anchors) {
      const snapped = applyCoincident(a, point);
      if (snapped.x === point.x && snapped.y === point.y) {
        // Only when points are already equal (snap already applied).
        if (Math.hypot(a.x - point.x, a.y - point.y) < 1e-9) {
          add(ConstraintEnum.Coincident, [e.id, newEntityId], {
            inferred: true,
          });
          return;
        }
      }
    }
  }
}

export const useSketchStore = create<SketchStoreState>((set, get) => ({
  active: false,
  sketchId: null,
  sketchName: "Sketch",
  activeTool: ToolEnum.Line,
  activeConstraintTool: null,
  entities: [],
  constraints: [],
  selectedIds: [],
  draft: null,
  cursor: null,
  inference: [],
  snappedCursor: null,
  constructionMode: false,
  statusMessage: "Select a sketch tool to begin",

  setActive: (active, sketch) =>
    set({
      active,
      sketchId: sketch?.id ?? (active ? get().sketchId : null),
      sketchName: sketch?.name ?? get().sketchName,
      draft: active ? get().draft : null,
      statusMessage: active
        ? `Editing ${sketch?.name ?? get().sketchName}`
        : "Sketch inactive",
    }),

  setActiveTool: (tool) => {
    if (!IMPLEMENTED_SKETCH_TOOLS.has(tool) && tool !== ToolEnum.Select) {
      set({
        activeTool: tool,
        draft: null,
        statusMessage: `${tool} — scaffolded (not implemented yet)`,
      });
      return;
    }
    set({
      activeTool: tool,
      draft: null,
      activeConstraintTool: null,
      statusMessage: `Tool: ${tool}`,
    });
  },

  setActiveConstraintTool: (type) => {
    if (type && !IMPLEMENTED_CONSTRAINTS.has(type)) {
      set({
        activeConstraintTool: type,
        statusMessage: `${type} — scaffolded (not implemented yet)`,
      });
      return;
    }
    set({
      activeConstraintTool: type,
      activeTool: type ? ToolEnum.Select : get().activeTool,
      statusMessage: type ? `Constraint: ${type}` : "Constraint cleared",
    });
  },

  toggleConstructionMode: () =>
    set((s) => ({
      constructionMode: !s.constructionMode,
      statusMessage: !s.constructionMode
        ? "Construction geometry on"
        : "Construction geometry off",
    })),

  setCursor: (world, snaps = [], snapped = null) =>
    set({
      cursor: world,
      inference: snaps,
      snappedCursor: snapped,
    }),

  clearDraft: () => set({ draft: null }),

  selectEntities: (ids) => set({ selectedIds: ids }),

  removeSelected: () => {
    const { selectedIds } = get();
    if (selectedIds.length === 0) return;
    set((s) => ({
      entities: s.entities.filter((e) => !selectedIds.includes(e.id)),
      constraints: s.constraints.filter(
        (c) => !c.entityIds.some((id) => selectedIds.includes(id)),
      ),
      selectedIds: [],
      statusMessage: "Deleted selection",
    }));
  },

  clearSketch: () =>
    set({
      entities: [],
      constraints: [],
      selectedIds: [],
      draft: null,
      inference: [],
      statusMessage: "Sketch cleared",
    }),

  cancelDraft: () =>
    set({ draft: null, statusMessage: "Draft cancelled" }),

  addConstraint: (type, entityIds, opts) => {
    const constraint: SketchConstraint = {
      id: uid("con"),
      type,
      entityIds,
      value: opts?.value,
      inferred: opts?.inferred,
      handles: opts?.handles,
    };
    set((s) => ({
      constraints: [...s.constraints, constraint],
      statusMessage: opts?.inferred
        ? `Inferred ${type}`
        : `Added ${type}`,
    }));
  },

  pointerDown: (world) => {
    const state = get();
    const tool = state.activeTool;
    const construction = state.constructionMode;

    // Manual coincident: pick two entities when constraint tool is active.
    if (state.activeConstraintTool === ConstraintEnum.Coincident) {
      const hit = hitTest(state.entities, world);
      if (!hit) {
        set({ statusMessage: "Click an entity for coincident" });
        return;
      }
      const selected = state.selectedIds.includes(hit)
        ? state.selectedIds
        : [...state.selectedIds, hit].slice(-2);
      set({ selectedIds: selected });
      if (selected.length === 2) {
        get().addConstraint(ConstraintEnum.Coincident, selected);
        set({ selectedIds: [], statusMessage: "Coincident applied" });
      }
      return;
    }

    if (tool === ToolEnum.Select) {
      const hit = hitTest(state.entities, world);
      set({
        selectedIds: hit ? [hit] : [],
        statusMessage: hit ? `Selected ${hit}` : "Nothing selected",
      });
      return;
    }

    if (tool === ToolEnum.Dimension) {
      const hit = hitTest(state.entities, world);
      if (!hit) {
        set({ statusMessage: "Select an entity to dimension" });
        return;
      }
      const entity = state.entities.find((e) => e.id === hit);
      if (!entity) return;
      const value = measureEntity(entity);
      if (value == null) {
        set({ statusMessage: "Cannot dimension this entity yet" });
        return;
      }
      const dim: SketchEntity = {
        id: uid("dim"),
        kind: "dimension",
        targetId: hit,
        labelAt: { x: world.x + 12, y: world.y - 12 },
        value,
        unit: "mm",
        sourceTool: ToolEnum.Dimension,
      };
      get().addConstraint(ConstraintEnum.Dimension, [hit, dim.id], {
        value,
      });
      set((s) => ({
        entities: [...s.entities, dim],
        statusMessage: `Dimension ${value.toFixed(2)} mm`,
      }));
      return;
    }

    if (!IMPLEMENTED_SKETCH_TOOLS.has(tool)) {
      set({
        statusMessage: `${tool} is scaffolded — drawing not implemented`,
      });
      return;
    }

    const draft = state.draft;
    if (!draft || draft.tool !== tool) {
      set({
        draft: { tool, points: [world] },
        statusMessage: "Click to place next point",
      });
      return;
    }

    // Second click completes 2-point tools.
    const start = draft.points[0];
    const end = world;
    let entity: SketchEntity | null = null;

    if (tool === ToolEnum.Line) {
      const result = finishLine(start, end, construction);
      entity = result.entity;
    } else if (tool === ToolEnum.CornerRectangle) {
      entity = finishRectangle(
        start,
        end,
        false,
        construction,
        ToolEnum.CornerRectangle,
      );
    } else if (tool === ToolEnum.CenterPointRectangle) {
      entity = finishRectangle(
        start,
        end,
        true,
        construction,
        ToolEnum.CenterPointRectangle,
      );
    } else if (tool === ToolEnum.CenterPointCircle) {
      entity = finishCircle(start, end, construction);
    }

    if (!entity) return;

    const prevEntities = state.entities;
    set((s) => ({
      entities: [...s.entities, entity!],
      draft: null,
      statusMessage: `Created ${entity!.kind}`,
    }));

    // Auto-infer coincident when endpoints land on existing geometry.
    if (entity.kind === "line") {
      maybeCoincidentAt(prevEntities, entity.start, entity.id, get().addConstraint);
      maybeCoincidentAt(prevEntities, entity.end, entity.id, get().addConstraint);
    }
  },

  pointerMove: (_world) => {
    // Draft preview is derived in the view from draft + snappedCursor.
  },
}));

function hitTest(entities: SketchEntity[], world: Vec2, tol = 8): EntityId | null {
  let best: { id: EntityId; d: number } | null = null;

  for (const e of entities) {
    let d = Infinity;
    switch (e.kind) {
      case "point":
        d = Math.hypot(e.position.x - world.x, e.position.y - world.y);
        break;
      case "line": {
        d = distToSegment(world, e.start, e.end);
        break;
      }
      case "rectangle": {
        const corners = [
          { x: e.min.x, y: e.min.y },
          { x: e.max.x, y: e.min.y },
          { x: e.max.x, y: e.max.y },
          { x: e.min.x, y: e.max.y },
        ];
        for (let i = 0; i < 4; i++) {
          d = Math.min(d, distToSegment(world, corners[i], corners[(i + 1) % 4]));
        }
        break;
      }
      case "circle":
        d = Math.abs(Math.hypot(world.x - e.center.x, world.y - e.center.y) - e.radius);
        break;
      case "dimension":
        d = Math.hypot(e.labelAt.x - world.x, e.labelAt.y - world.y);
        break;
      default:
        break;
    }
    if (d <= tol && (!best || d < best.d)) best = { id: e.id, d };
  }
  return best?.id ?? null;
}

function distToSegment(p: Vec2, a: Vec2, b: Vec2): number {
  const vx = b.x - a.x;
  const vy = b.y - a.y;
  const len2 = vx * vx + vy * vy;
  if (len2 === 0) return Math.hypot(p.x - a.x, p.y - a.y);
  let t = ((p.x - a.x) * vx + (p.y - a.y) * vy) / len2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(p.x - (a.x + t * vx), p.y - (a.y + t * vy));
}
