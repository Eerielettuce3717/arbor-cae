import type { DrcProfile, ManufacturingProfileId } from "./types";

/**
 * Standard Fab — typical 2-layer PCB house limits (≈6 mil / 0.15 mm class).
 */
export const STANDARD_FAB_PROFILE: DrcProfile = {
  id: "standardFab",
  name: "Standard Fab",
  description:
    "Conventional etched FR-4 fab: 0.15 mm traces/clearance, 0.3 mm drills, 0.1 mm annular ring.",
  limits: {
    minTraceWidthMm: 0.15,
    minClearanceMm: 0.15,
    minDrillMm: 0.3,
    minAnnularRingMm: 0.1,
    minPinPitchMm: 0.4,
    enforceBoardBounds: true,
  },
};

/**
 * Additive / Conductive Ink — print-process constraints.
 * Verifies no trace thinner than 0.2 mm and no pin pitch smaller than 0.4 mm.
 */
export const ADDITIVE_INK_PROFILE: DrcProfile = {
  id: "additiveInk",
  name: "Additive / Conductive Ink",
  description:
    "Printed conductive-ink process: ≥0.2 mm traces, ≥0.4 mm pin pitch, relaxed drills.",
  limits: {
    minTraceWidthMm: 0.2,
    minClearanceMm: 0.2,
    minDrillMm: 0.4,
    minAnnularRingMm: 0.15,
    minPinPitchMm: 0.4,
    enforceBoardBounds: true,
  },
};

export const DRC_PROFILES: Record<ManufacturingProfileId, DrcProfile> = {
  standardFab: STANDARD_FAB_PROFILE,
  additiveInk: ADDITIVE_INK_PROFILE,
};

export function getDrcProfile(id: ManufacturingProfileId): DrcProfile {
  return DRC_PROFILES[id];
}

export const MANUFACTURING_PROFILE_OPTIONS: {
  id: ManufacturingProfileId;
  label: string;
}[] = [
  { id: "standardFab", label: "Standard Fab" },
  { id: "additiveInk", label: "Additive / Conductive Ink" },
];
