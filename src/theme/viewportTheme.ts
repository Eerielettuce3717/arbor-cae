import {
  AmbientLight,
  Color,
  DirectionalLight,
  GridHelper,
  type LineBasicMaterial,
  type Scene,
} from "three";
import type { ResolvedTheme } from "./types";

/**
 * WebGL scene tokens. Tailwind classes never reach the canvas.
 * Dark: mill-control slate. Light: crisp drawing-sheet grey.
 */
export const VIEWPORT_THEME = {
  dark: {
    background: 0x0f172a,
    gridCenter: 0x64748b,
    grid: 0x1e293b,
    ambientIntensity: 0.5,
    keyIntensity: 1.05,
    fillIntensity: 0.32,
  },
  light: {
    background: 0xf0f2f5,
    gridCenter: 0x94a3b8,
    grid: 0xd4dbe3,
    ambientIntensity: 0.88,
    keyIntensity: 0.62,
    fillIntensity: 0.28,
  },
} as const;

export interface ViewportLights {
  ambient: AmbientLight;
  key: DirectionalLight;
  fill?: DirectionalLight;
}

export function applyViewportSceneTheme(
  scene: Scene,
  resolved: ResolvedTheme,
  lights?: ViewportLights,
  grid?: GridHelper | null,
) {
  const t = VIEWPORT_THEME[resolved];
  scene.background = new Color(t.background);
  if (lights) {
    lights.ambient.intensity = t.ambientIntensity;
    lights.key.intensity = t.keyIntensity;
    if (lights.fill) lights.fill.intensity = t.fillIntensity;
  }
  if (grid) {
    const mats = grid.material as LineBasicMaterial | LineBasicMaterial[];
    if (Array.isArray(mats)) {
      mats[0]?.color.setHex(t.gridCenter);
      mats[1]?.color.setHex(t.grid);
    } else {
      mats.color.setHex(t.grid);
    }
  }
}

export function createThemedGrid(
  resolved: ResolvedTheme,
  size = 16,
  divisions = 32,
): GridHelper {
  const t = VIEWPORT_THEME[resolved];
  const grid = new GridHelper(size, divisions, t.gridCenter, t.grid);
  grid.name = "groundGrid";
  return grid;
}
