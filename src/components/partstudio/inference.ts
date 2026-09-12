import {
  midpoint,
  rectangleCenter,
  rectangleCorners,
  snapLineAxis,
} from "./geometry";
import type {
  InferenceSnap,
  SketchEntity,
  SketchLineEntity,
  SketchRectangleEntity,
  SketchCircleEntity,
  Vec2,
} from "./types";

export interface InferenceOptions {
  /** Pixel/world snap radius. */
  threshold: number;
  /** Prefer axis alignment relative to this origin (active draft start). */
  alignOrigin?: Vec2 | null;
  gridSize?: number;
  enableGrid?: boolean;
}

function collectAnchorPoints(entities: SketchEntity[]): {
  position: Vec2;
  kind: InferenceSnap["kind"];
  sourceId: string;
  label: string;
}[] {
  const out: {
    position: Vec2;
    kind: InferenceSnap["kind"];
    sourceId: string;
    label: string;
  }[] = [];

  for (const e of entities) {
    switch (e.kind) {
      case "point":
        out.push({
          position: e.position,
          kind: "endpoint",
          sourceId: e.id,
          label: "Point",
        });
        break;
      case "line": {
        const line = e as SketchLineEntity;
        out.push(
          {
            position: line.start,
            kind: "endpoint",
            sourceId: e.id,
            label: "Endpoint",
          },
          {
            position: line.end,
            kind: "endpoint",
            sourceId: e.id,
            label: "Endpoint",
          },
          {
            position: midpoint(line.start, line.end),
            kind: "midpoint",
            sourceId: e.id,
            label: "Midpoint",
          },
        );
        break;
      }
      case "rectangle": {
        const rect = e as SketchRectangleEntity;
        for (const c of rectangleCorners(rect)) {
          out.push({
            position: c,
            kind: "endpoint",
            sourceId: e.id,
            label: "Corner",
          });
        }
        out.push({
          position: rectangleCenter(rect),
          kind: "center",
          sourceId: e.id,
          label: "Center",
        });
        break;
      }
      case "circle": {
        const circle = e as SketchCircleEntity;
        out.push({
          position: circle.center,
          kind: "center",
          sourceId: e.id,
          label: "Center",
        });
        break;
      }
      default:
        break;
    }
  }
  return out;
}

/**
 * Automatic inferencing: endpoint / midpoint / center snaps, optional grid,
 * and horizontal / vertical alignment guides relative to the draft origin.
 */
export function resolveInference(
  cursor: Vec2,
  entities: SketchEntity[],
  options: InferenceOptions,
): { snapped: Vec2; snaps: InferenceSnap[] } {
  const { threshold, alignOrigin, gridSize = 10, enableGrid = false } = options;
  const snaps: InferenceSnap[] = [];
  let snapped = { ...cursor };
  let bestDist = threshold;

  for (const anchor of collectAnchorPoints(entities)) {
    const d = Math.hypot(cursor.x - anchor.position.x, cursor.y - anchor.position.y);
    if (d <= bestDist) {
      bestDist = d;
      snapped = { ...anchor.position };
      snaps.length = 0;
      snaps.push({
        kind: anchor.kind === "endpoint" ? "coincident" : anchor.kind,
        position: anchor.position,
        sourceId: anchor.sourceId,
        label: anchor.label,
      });
    }
  }

  if (enableGrid) {
    const gx = Math.round(cursor.x / gridSize) * gridSize;
    const gy = Math.round(cursor.y / gridSize) * gridSize;
    const gd = Math.hypot(cursor.x - gx, cursor.y - gy);
    if (gd <= threshold && gd < bestDist) {
      snapped = { x: gx, y: gy };
      snaps.length = 0;
      snaps.push({
        kind: "grid",
        position: snapped,
        label: "Grid",
      });
    }
  }

  if (alignOrigin) {
    const axis = snapLineAxis(alignOrigin, snapped, threshold);
    const moved =
      axis.x !== snapped.x || axis.y !== snapped.y
        ? axis
        : snapLineAxis(alignOrigin, cursor, threshold);

    if (moved.y === alignOrigin.y && Math.abs(cursor.y - alignOrigin.y) <= threshold) {
      snapped = { x: snapped.x, y: alignOrigin.y };
      if (!snaps.some((s) => s.kind === "horizontal")) {
        snaps.push({
          kind: "horizontal",
          position: snapped,
          guideFrom: alignOrigin,
          label: "Horizontal",
        });
      }
    } else if (
      moved.x === alignOrigin.x &&
      Math.abs(cursor.x - alignOrigin.x) <= threshold
    ) {
      snapped = { x: alignOrigin.x, y: snapped.y };
      if (!snaps.some((s) => s.kind === "vertical")) {
        snaps.push({
          kind: "vertical",
          position: snapped,
          guideFrom: alignOrigin,
          label: "Vertical",
        });
      }
    }
  }

  return { snapped, snaps };
}
