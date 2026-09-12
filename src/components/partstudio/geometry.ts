import type {
  SketchCircleEntity,
  SketchLineEntity,
  SketchRectangleEntity,
  Vec2,
} from "./types";

export function dist(a: Vec2, b: Vec2): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.hypot(dx, dy);
}

export function midpoint(a: Vec2, b: Vec2): Vec2 {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

export function almostEqual(a: number, b: number, eps = 1e-6): boolean {
  return Math.abs(a - b) <= eps;
}

/** Build an axis-aligned rectangle from two opposite corners. */
export function rectangleFromCorners(
  a: Vec2,
  b: Vec2,
): Pick<SketchRectangleEntity, "min" | "max"> {
  return {
    min: { x: Math.min(a.x, b.x), y: Math.min(a.y, b.y) },
    max: { x: Math.max(a.x, b.x), y: Math.max(a.y, b.y) },
  };
}

/** Build an axis-aligned rectangle from center + corner. */
export function rectangleFromCenter(
  center: Vec2,
  corner: Vec2,
): Pick<SketchRectangleEntity, "min" | "max"> {
  const hx = Math.abs(corner.x - center.x);
  const hy = Math.abs(corner.y - center.y);
  return {
    min: { x: center.x - hx, y: center.y - hy },
    max: { x: center.x + hx, y: center.y + hy },
  };
}

export function circleFromCenterRadius(
  center: Vec2,
  edge: Vec2,
): Pick<SketchCircleEntity, "center" | "radius"> {
  return { center: { ...center }, radius: dist(center, edge) };
}

export function lineLength(line: SketchLineEntity): number {
  return dist(line.start, line.end);
}

export function rectangleWidth(rect: SketchRectangleEntity): number {
  return rect.max.x - rect.min.x;
}

export function rectangleHeight(rect: SketchRectangleEntity): number {
  return rect.max.y - rect.min.y;
}

export function rectangleCenter(rect: SketchRectangleEntity): Vec2 {
  return midpoint(rect.min, rect.max);
}

export function rectangleCorners(rect: SketchRectangleEntity): Vec2[] {
  const { min, max } = rect;
  return [
    { x: min.x, y: min.y },
    { x: max.x, y: min.y },
    { x: max.x, y: max.y },
    { x: min.x, y: max.y },
  ];
}

/** Measure a dimension value for supported entity kinds. */
export function measureEntity(
  entity:
    | SketchLineEntity
    | SketchRectangleEntity
    | SketchCircleEntity
    | { kind: string },
): number | null {
  switch (entity.kind) {
    case "line":
      return lineLength(entity as SketchLineEntity);
    case "circle":
      return (entity as SketchCircleEntity).radius * 2;
    case "rectangle": {
      const r = entity as SketchRectangleEntity;
      return Math.max(rectangleWidth(r), rectangleHeight(r));
    }
    default:
      return null;
  }
}

/**
 * Apply a coincident constraint: move `moving` onto `anchor`.
 * Returns the snapped point (caller updates entity geometry).
 */
export function applyCoincident(anchor: Vec2, _moving: Vec2): Vec2 {
  return { x: anchor.x, y: anchor.y };
}

/** Force a line nearly horizontal/vertical to exact axis alignment. */
export function snapLineAxis(start: Vec2, end: Vec2, threshold: number): Vec2 {
  const dx = Math.abs(end.x - start.x);
  const dy = Math.abs(end.y - start.y);
  if (dy <= threshold && dy <= dx) {
    return { x: end.x, y: start.y };
  }
  if (dx <= threshold && dx < dy) {
    return { x: start.x, y: end.y };
  }
  return end;
}
