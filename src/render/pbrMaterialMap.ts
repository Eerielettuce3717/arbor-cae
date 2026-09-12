/**
 * Property mapping from Render Studio library / advanced options into a
 * WebGL PBR material parameter bag. No raytracer — this is the bridge a
 * future MeshPhysicalMaterial binder will consume.
 */

import {
  DEFAULT_PBR,
  type AppearanceFunction,
  type AppearanceModifier,
  type AxFAppearanceOptions,
  type EnvironmentPreset,
  type LightEmissionAppearance,
  type PbrMaterialParams,
  type VolumeAppearanceOptions,
} from "../store/renderTypes";

export interface AppearanceComposeInput {
  base?: AppearanceFunction | null;
  modifiers?: AppearanceModifier[];
  emission?: LightEmissionAppearance | null;
  environment?: EnvironmentPreset | null;
  axf?: AxFAppearanceOptions | null;
  volume?: VolumeAppearanceOptions | null;
}

/** Compose library + advanced options into a single PBR params object. */
export function mapAppearanceToPbr(
  input: AppearanceComposeInput,
): PbrMaterialParams {
  const pbr: PbrMaterialParams = { ...DEFAULT_PBR };

  if (input.base) {
    pbr.color = input.base.baseColor;
    pbr.metalness = input.base.metalness;
    pbr.roughness = input.base.roughness;
    pbr.opacity = input.base.opacity;
    if (input.base.kind === "glass") {
      pbr.transmission = Math.max(pbr.transmission, 0.9);
      pbr.ior = 1.52;
    }
  }

  for (const mod of input.modifiers ?? []) {
    if (!mod.enabled) continue;
    switch (mod.kind) {
      case "clearcoat":
        pbr.clearcoat = mod.strength;
        pbr.clearcoatRoughness = mod.secondary;
        break;
      case "anisotropy":
        pbr.anisotropy = mod.strength;
        pbr.anisotropyRotation = mod.secondary;
        break;
      case "sheen":
        pbr.sheen = mod.strength;
        pbr.sheenRoughness = mod.secondary;
        break;
      case "transmission":
        pbr.transmission = mod.strength;
        pbr.ior = mod.secondary || pbr.ior;
        break;
      case "bump":
        pbr.bumpMapId = `bump://${mod.id}`;
        break;
      case "normal":
        pbr.normalMapId = `normal://${mod.id}`;
        break;
      default:
        break;
    }
  }

  if (input.emission) {
    pbr.emissive = input.emission.emissiveColor;
    pbr.emissiveIntensity = input.emission.intensity;
  }

  if (input.environment) {
    pbr.envMapIntensity = input.environment.intensity;
  }

  if (input.axf) {
    pbr.axfId = input.axf.id;
  }

  if (input.volume) {
    pbr.volumeId = input.volume.id;
    pbr.thickness = Math.max(pbr.thickness, input.volume.density * 4);
  }

  return pbr;
}

/**
 * Flatten PBR params into a plain record suitable for logging / IPC to a
 * WebGL renderer worker. Keys mirror Three.js MeshPhysicalMaterial fields.
 */
export function pbrToRendererUniforms(
  pbr: PbrMaterialParams,
): Record<string, string | number | boolean | null> {
  return {
    color: pbr.color,
    metalness: pbr.metalness,
    roughness: pbr.roughness,
    opacity: pbr.opacity,
    transparent: pbr.opacity < 1 || pbr.transmission > 0,
    emissive: pbr.emissive,
    emissiveIntensity: pbr.emissiveIntensity,
    clearcoat: pbr.clearcoat,
    clearcoatRoughness: pbr.clearcoatRoughness,
    transmission: pbr.transmission,
    ior: pbr.ior,
    thickness: pbr.thickness,
    sheen: pbr.sheen,
    sheenRoughness: pbr.sheenRoughness,
    sheenColor: pbr.sheenColor,
    anisotropy: pbr.anisotropy,
    anisotropyRotation: pbr.anisotropyRotation,
    envMapIntensity: pbr.envMapIntensity,
    normalMapId: pbr.normalMapId,
    bumpMapId: pbr.bumpMapId,
    axfId: pbr.axfId,
    volumeId: pbr.volumeId,
  };
}

export { DEFAULT_PBR };
