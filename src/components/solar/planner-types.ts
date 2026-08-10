/**
 * Solar planner client state + localStorage draft.
 *
 * Follows the bathroom planner's proven draft pattern: a client-generated UUID
 * makes server creation idempotent, and the draft survives a refresh, a crash
 * or a closed tab without any account (§39).
 */

import type { RoofAnalysis, NormalizedAddress, SolarPlanResult, LayoutStrategy } from "@/lib/solar/types";

/** What `POST /api/solar-projects/[id]/plan` returns — the plan plus its layout. */
export type PlanPayload = SolarPlanResult & {
  selectedPanelIds: string[];
  layoutNotes: string[];
};

const DRAFT_KEY = "renovessa.solar.draft.v1";

export type SolarAnswers = Record<string, string>;

export interface SolarPlannerDraft {
  projectId: string | null;
  referenceNumber: string | null;
  clientId: string | null;
  mode: "quick" | "detailed";
  currentStep: string;
  answers: SolarAnswers;
  address: NormalizedAddress | null;
  buildingConfirmed: boolean;
  strategy: LayoutStrategy;
  panelCount: number | null;
  targetOffsetFraction: number | null;
  excludedSegments: number[];
  explicitPanelIds: string[] | null;
}

export interface SolarPlannerState extends SolarPlannerDraft {
  analysis: RoofAnalysis | null;
  plan: PlanPayload | null;
  /** Typed failure from the last roof-analysis attempt, with its recovery path. */
  roofFailure: { reason: string; message: string; recovery: string; retryable: boolean } | null;
  saving: boolean;
  saveFailed: boolean;
  computing: boolean;
  lastSavedAt: number | null;
  error: string | null;
}

export const INITIAL_SOLAR_STATE: SolarPlannerState = {
  projectId: null,
  referenceNumber: null,
  clientId: null,
  mode: "quick",
  currentStep: "address",
  answers: {},
  address: null,
  buildingConfirmed: false,
  strategy: "MAXIMIZE_PRODUCTION",
  panelCount: null,
  targetOffsetFraction: null,
  excludedSegments: [],
  explicitPanelIds: null,
  analysis: null,
  plan: null,
  roofFailure: null,
  saving: false,
  saveFailed: false,
  computing: false,
  lastSavedAt: null,
  error: null,
};

export function loadSolarDraft(): Partial<SolarPlannerDraft> | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Partial<SolarPlannerDraft>;
  } catch {
    // A corrupt draft must not brick the planner — start clean instead.
    return null;
  }
}

export function saveSolarDraft(draft: SolarPlannerDraft): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  } catch {
    // Quota or private-mode failures are non-fatal: the server draft still exists.
  }
}

export function clearSolarDraft(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(DRAFT_KEY);
  } catch {
    /* ignore */
  }
}

export function newClientId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/** Consumption inputs read out of the free-form answers map. */
export function consumptionFromAnswers(answers: SolarAnswers) {
  const num = (key: string): number | undefined => {
    const raw = answers[key];
    if (!raw) return undefined;
    const n = Number(raw.replace(/[^0-9.]/g, ""));
    return Number.isFinite(n) && n > 0 ? n : undefined;
  };

  const monthly: Array<number | null> = [];
  for (let i = 0; i < 12; i++) {
    const v = num(`usage_month_${i}`);
    monthly.push(v ?? null);
  }
  const anyMonthly = monthly.some((m) => m !== null);

  return {
    monthlyKwh: anyMonthly ? monthly : undefined,
    annualKwh: num("usage_annual_kwh"),
    averageMonthlyBillDollars: num("usage_monthly_bill"),
    blendedRateDollarsPerKwh: num("usage_blended_rate"),
    fixedMonthlyChargeDollars: num("usage_fixed_charge"),
  };
}

/** Cost-adder answers, read only when explicitly "yes". Unknown never means yes. */
export function costAnswersFrom(answers: SolarAnswers) {
  return {
    mainPanelUpgradeExpected: answers.main_panel_upgrade === "yes",
    serviceUpgradeExpected: answers.service_upgrade === "yes",
    arrayOnDetachedStructure: answers.detached_structure === "yes",
    reroofPlanned: answers.reroof_planned === "yes",
  };
}
