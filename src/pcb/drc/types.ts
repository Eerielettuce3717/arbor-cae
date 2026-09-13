/** Configurable Design Rule Check (DRC) types for PCB manufacturing export. */

export type ManufacturingProfileId = "standardFab" | "additiveInk";

export type DrcSeverity = "error" | "warning";

export type DrcRuleId =
  | "minTraceWidth"
  | "minClearance"
  | "minDrill"
  | "minAnnularRing"
  | "minPinPitch"
  | "traceOnBoard"
  | "viaOnBoard";

export interface DrcRuleLimits {
  /** Minimum copper trace width (mm). */
  minTraceWidthMm: number;
  /** Minimum copper-to-copper clearance (mm). */
  minClearanceMm: number;
  /** Minimum plated drill diameter (mm). */
  minDrillMm: number;
  /** Minimum annular ring = (pad − drill) / 2 (mm). */
  minAnnularRingMm: number;
  /** Minimum pad center-to-center pitch (mm). Null = skip. */
  minPinPitchMm: number | null;
  /** Require geometry to stay inside board outline. */
  enforceBoardBounds: boolean;
}

export interface DrcProfile {
  id: ManufacturingProfileId;
  name: string;
  description: string;
  limits: DrcRuleLimits;
}

export interface DrcViolation {
  id: string;
  rule: DrcRuleId;
  severity: DrcSeverity;
  message: string;
  /** Related geometry ids (trace, via, component, pad). */
  refs: string[];
}

export interface DrcResult {
  profileId: ManufacturingProfileId;
  profileName: string;
  passed: boolean;
  violations: DrcViolation[];
  checkedAt: string;
}
