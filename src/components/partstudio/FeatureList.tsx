import { useCallback, useState, type DragEvent } from "react";
import { useFeatureStore } from "../../store/featureStore";
import {
  EVALUATED_FEATURE_TOOLS,
  FEATURE_TOOL_BY_TYPE,
  SCULPT_FEATURE_TOOLS,
  type CadFeature,
  type FeatureStatus,
} from "../../store/featureTypes";

const SYSTEM_NODES = [
  { id: "origin", label: "Origin", icon: "·" },
  { id: "planes", label: "Planes (Front / Top / Right)", icon: "·" },
] as const;

function isEvaluatedTool(type: CadFeature["type"]): boolean {
  return (
    EVALUATED_FEATURE_TOOLS.has(type) || SCULPT_FEATURE_TOOLS.has(type)
  );
}

function statusGlyph(status: FeatureStatus, suppressed: boolean): string {
  if (suppressed) return "⊘";
  switch (status) {
    case "ok":
      return "●";
    case "warning":
      return "▲";
    case "error":
      return "✖";
    case "scaffold":
      return "○";
    case "suppressed":
      return "⊘";
    default:
      return "·";
  }
}

function statusColor(status: FeatureStatus, suppressed: boolean): string {
  if (suppressed) return "text-eng-faint";
  switch (status) {
    case "ok":
      return "text-emerald-400";
    case "warning":
      return "text-amber-400";
    case "error":
      return "text-rose-400";
    case "scaffold":
      return "text-eng-faint";
    default:
      return "text-eng-faint";
  }
}

export interface FeatureListProps {
  onActivateSketch?: (feature: CadFeature) => void;
  onMeshReady?: (mesh: import("../../cad/types").MeshBuffers) => void;
}

export function FeatureList({ onActivateSketch, onMeshReady }: FeatureListProps) {
  const features = useFeatureStore((s) => s.features);
  const selectedFeatureId = useFeatureStore((s) => s.selectedFeatureId);
  const regenerating = useFeatureStore((s) => s.regenerating);
  const selectFeature = useFeatureStore((s) => s.selectFeature);
  const openEditor = useFeatureStore((s) => s.openEditor);
  const reorderFeatures = useFeatureStore((s) => s.reorderFeatures);
  const suppressFeature = useFeatureStore((s) => s.suppressFeature);
  const evaluateFeature = useFeatureStore((s) => s.evaluateFeature);
  const regenerateTree = useFeatureStore((s) => s.regenerateTree);
  const addFeature = useFeatureStore((s) => s.addFeature);

  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);

  const onDragStart = useCallback((index: number) => (e: DragEvent) => {
    setDragIndex(index);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", String(index));
  }, []);

  const onDragOver = useCallback(
    (index: number) => (e: DragEvent) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      if (overIndex !== index) setOverIndex(index);
    },
    [overIndex],
  );

  const onDrop = useCallback(
    (index: number) => (e: DragEvent) => {
      e.preventDefault();
      const from = Number(e.dataTransfer.getData("text/plain"));
      if (!Number.isNaN(from) && from !== index) {
        reorderFeatures(from, index);
      }
      setDragIndex(null);
      setOverIndex(null);
    },
    [reorderFeatures],
  );

  const onDragEnd = useCallback(() => {
    setDragIndex(null);
    setOverIndex(null);
  }, []);

  const onSelect = useCallback(
    (feature: CadFeature) => {
      selectFeature(feature.id);
      if (feature.type === "sketch") {
        onActivateSketch?.(feature);
      }
    },
    [onActivateSketch, selectFeature],
  );

  const onDoubleClick = useCallback(
    (feature: CadFeature) => {
      selectFeature(feature.id);
      openEditor(feature.id);
    },
    [openEditor, selectFeature],
  );

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center gap-1 border-b border-eng-border px-1 py-1">
        <button
          type="button"
          title="Regenerate feature tree"
          disabled={regenerating}
          onClick={() => {
            void regenerateTree().then(() => {
              const mesh = useFeatureStore.getState().lastMesh;
              if (mesh) onMeshReady?.(mesh);
            });
          }}
          className="rounded px-1.5 py-0.5 text-[10px] text-eng-muted hover:bg-eng-hover hover:text-eng-text disabled:opacity-40"
        >
          {regenerating ? "…" : "↻ Regen"}
        </button>
        <button
          type="button"
          title="Add Extrude"
          onClick={() => addFeature("extrude")}
          className="rounded px-1.5 py-0.5 text-[10px] text-eng-muted hover:bg-eng-hover hover:text-eng-text"
        >
          + Extrude
        </button>
        <button
          type="button"
          title="Add Fillet"
          onClick={() => addFeature("fillet")}
          className="rounded px-1.5 py-0.5 text-[10px] text-eng-muted hover:bg-eng-hover hover:text-eng-text"
        >
          + Fillet
        </button>
        <button
          type="button"
          title="Add Boolean"
          onClick={() => addFeature("boolean")}
          className="rounded px-1.5 py-0.5 text-[10px] text-eng-muted hover:bg-eng-hover hover:text-eng-text"
        >
          + Boolean
        </button>
        <button
          type="button"
          title="Add Sculpt (Form Workspace)"
          onClick={() => addFeature("sculpt")}
          className="rounded px-1.5 py-0.5 text-[10px] text-eng-muted hover:bg-eng-hover hover:text-sky-300"
        >
          + Sculpt
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-1">
        {SYSTEM_NODES.map((node) => (
          <div
            key={node.id}
            className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs text-eng-faint"
          >
            <span className="w-3 text-center text-[10px]">{node.icon}</span>
            {node.label}
          </div>
        ))}

        <div className="my-1 border-t border-eng-border/60" />

        {features.map((feature, index) => {
          const def = FEATURE_TOOL_BY_TYPE[feature.type];
          const selected = selectedFeatureId === feature.id;
          const isDragging = dragIndex === index;
          const isOver = overIndex === index && dragIndex !== index;

          return (
            <div
              key={feature.id}
              draggable
              onDragStart={onDragStart(index)}
              onDragOver={onDragOver(index)}
              onDrop={onDrop(index)}
              onDragEnd={onDragEnd}
              className={`group flex w-full items-center gap-1 rounded border border-transparent text-left text-xs ${
                selected
                  ? "bg-eng-active text-sky-300"
                  : "text-eng-muted hover:bg-eng-hover hover:text-eng-text"
              } ${isDragging ? "opacity-40" : ""} ${
                isOver ? "border-sky-600 border-dashed" : ""
              }`}
            >
              <button
                type="button"
                aria-label="Drag to reorder"
                className="cursor-grab px-1 text-[10px] text-eng-faint active:cursor-grabbing"
                tabIndex={-1}
              >
                ⠿
              </button>
              <button
                type="button"
                onClick={() => onSelect(feature)}
                onDoubleClick={() => onDoubleClick(feature)}
                className="flex min-w-0 flex-1 items-center gap-2 py-1.5 pr-1"
              >
                <span
                  className={`w-3 text-center text-[9px] ${statusColor(
                    feature.status,
                    feature.suppressed,
                  )}`}
                  title={feature.suppressed ? "Suppressed" : feature.status}
                >
                  {statusGlyph(feature.status, feature.suppressed)}
                </span>
                <span className="w-3 text-center text-[10px] text-eng-faint">
                  {def?.icon ?? "▣"}
                </span>
                <span
                  className={`min-w-0 truncate ${
                    feature.suppressed ? "line-through opacity-60" : ""
                  }`}
                >
                  {feature.name}
                </span>
                {!isEvaluatedTool(feature.type) &&
                  feature.type !== "sketch" && (
                    <span className="ml-auto shrink-0 text-[9px] uppercase tracking-wide text-eng-faint">
                      UI
                    </span>
                  )}
              </button>
              <button
                type="button"
                title={feature.suppressed ? "Unsuppress" : "Suppress"}
                onClick={() => suppressFeature(feature.id, !feature.suppressed)}
                className="rounded px-1 py-0.5 text-[10px] text-eng-faint opacity-0 hover:bg-eng-active hover:text-eng-text group-hover:opacity-100"
              >
                {feature.suppressed ? "☑" : "☐"}
              </button>
              <button
                type="button"
                title="Edit feature"
                onClick={() => openEditor(feature.id)}
                className="rounded px-1 py-0.5 text-[10px] text-eng-faint opacity-0 hover:bg-eng-active hover:text-eng-text group-hover:opacity-100"
              >
                ✎
              </button>
              {isEvaluatedTool(feature.type) && (
                <button
                  type="button"
                  title="Evaluate"
                  disabled={regenerating || feature.suppressed}
                  onClick={() => {
                    void evaluateFeature(feature.id).then((mesh) => {
                      if (mesh) onMeshReady?.(mesh);
                    });
                  }}
                  className="rounded px-1 py-0.5 text-[10px] text-eng-faint opacity-0 hover:bg-eng-active hover:text-sky-300 group-hover:opacity-100 disabled:opacity-30"
                >
                  ▶
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default FeatureList;
