/**
 * Production modelling and reconciliation (§16, §17, E3–E5).
 *
 * Two independent paths:
 *   Model A — the geospatial provider's own per-panel energy figures (DC).
 *   Model B — PVWatts v8, run per roof segment and aggregated (AC).
 *
 * They are converted to a common basis before comparison, and the larger is
 * never simply chosen. Disagreement widens the range and lowers confidence.
 */

import type {
  CandidatePanel,
  ProductionModelOutput,
  ReconciledProduction,
  ModelAgreement,
  ProductionModelId,
} from "./types";
import { fromCalculation, fromApi, type Tracked } from "./provenance";
import { PRODUCTION_MODEL_VERSION } from "./versions";

/**
 * Difference thresholds. Product rules, not scientific truth — admin
 * configurable via the estimator configuration (§17).
 */
export interface AgreementThresholds {
  /** Below this, models agree closely. */
  highPercent: number;
  /** Below this, normal modelling variance. */
  normalPercent: number;
  /** Below this, moderate uncertainty. Above it, investigate. */
  moderatePercent: number;
}

export const DEFAULT_AGREEMENT_THRESHOLDS: AgreementThresholds = {
  highPercent: 5,
  normalPercent: 10,
  moderatePercent: 15,
};

/**
 * Model A: sum the provider's per-panel DC energies for the selected panels,
 * then derate to AC so it is comparable with PVWatts.
 */
export function providerProductionModel(
  selectedPanels: CandidatePanel[],
  opts: { dcToAcDerate: number; providerLabel: string },
): ProductionModelOutput {
  const annualDc = selectedPanels.reduce((sum, p) => sum + p.yearlyEnergyDcKwh, 0);
  const annualAc = annualDc * opts.dcToAcDerate;
  return {
    modelId: "GOOGLE_SOLAR",
    annualAcKwh: annualAc,
    monthlyAcKwh: [],
    notes: [
      `${opts.providerLabel} modelled ${annualDc.toFixed(0)} kWh DC across ${selectedPanels.length} panel positions.`,
      `Converted to ${annualAc.toFixed(0)} kWh AC using an assumed ${(opts.dcToAcDerate * 100).toFixed(0)}% DC-to-AC ratio.`,
    ],
  };
}

export interface ReconcileInput {
  models: ProductionModelOutput[];
  failures: Array<{ modelId: ProductionModelId; message: string }>;
  thresholds?: AgreementThresholds;
  /** Extra assumptions to attach, e.g. the derate note. */
  assumptions?: string[];
}

/** Relative difference against the mean, so neither model is privileged. */
export function differencePercent(a: number, b: number): number {
  const mean = (a + b) / 2;
  if (mean === 0) return 0;
  return (Math.abs(a - b) / mean) * 100;
}

export function classifyAgreement(diffPercent: number, t: AgreementThresholds): ModelAgreement {
  if (diffPercent < t.highPercent) return "HIGH";
  if (diffPercent < t.normalPercent) return "NORMAL";
  if (diffPercent < t.moderatePercent) return "MODERATE";
  return "INVESTIGATE";
}

/**
 * Combine the models into a single displayable production figure.
 *
 * With zero models we return nulls — production is withheld entirely rather
 * than estimated from nothing (§37).
 */
export function reconcileProduction(input: ReconcileInput): ReconciledProduction {
  const thresholds = input.thresholds ?? DEFAULT_AGREEMENT_THRESHOLDS;
  const assumptions = [...(input.assumptions ?? [])];
  const usable = input.models.filter((m) => Number.isFinite(m.annualAcKwh) && m.annualAcKwh > 0);

  if (usable.length === 0) {
    return {
      annualAcKwh: null,
      rangeLowKwh: null,
      rangeHighKwh: null,
      monthlyAcKwh: null,
      agreement: "NONE",
      differencePercent: null,
      models: input.models,
      failures: input.failures,
      assumptions,
      calculationVersion: PRODUCTION_MODEL_VERSION,
    };
  }

  const monthly = pickMonthly(usable);

  if (usable.length === 1) {
    const only = usable[0];
    // A single model gets a deliberately wide band: we have no second opinion.
    const band = 0.15;
    return {
      annualAcKwh: track(only.annualAcKwh, {
        explanation: `Modelled by ${modelLabel(only.modelId)} using your roof's geometry and orientation. Only one production model was available, so the range is wider than usual.`,
        derivedFrom: [modelLabel(only.modelId)],
        confidence: "MEDIUM",
      }),
      rangeLowKwh: track(only.annualAcKwh * (1 - band), {
        explanation: "Lower bound: 15% below the single available model, reflecting the lack of a cross-check.",
        confidence: "MEDIUM",
      }),
      rangeHighKwh: track(only.annualAcKwh * (1 + band), {
        explanation: "Upper bound: 15% above the single available model, reflecting the lack of a cross-check.",
        confidence: "MEDIUM",
      }),
      monthlyAcKwh: monthly,
      agreement: "SINGLE_MODEL",
      differencePercent: null,
      models: input.models,
      failures: input.failures,
      assumptions: [
        ...assumptions,
        "Only one production model was available, so the estimated range is wider than it would be with two.",
      ],
      calculationVersion: PRODUCTION_MODEL_VERSION,
    };
  }

  // Two or more: compare the extremes rather than only the first pair, so a
  // future third model still widens the band correctly.
  const values = usable.map((m) => m.annualAcKwh);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const diff = differencePercent(min, max);
  const agreement = classifyAgreement(diff, thresholds);
  const mean = values.reduce((a, b) => a + b, 0) / values.length;

  let low: number;
  let high: number;
  let confidence: "HIGH" | "MEDIUM" | "LOW";

  switch (agreement) {
    case "HIGH":
      low = mean * 0.95;
      high = mean * 1.05;
      confidence = "HIGH";
      break;
    case "NORMAL":
      low = min;
      high = max;
      confidence = "HIGH";
      break;
    case "MODERATE":
      low = min;
      high = max;
      confidence = "MEDIUM";
      break;
    case "INVESTIGATE":
    default:
      // Widen beyond the models' own spread: they disagree enough that neither
      // endpoint should be treated as a bound.
      low = min * 0.9;
      high = max * 1.1;
      confidence = "LOW";
      break;
  }

  if (agreement === "MODERATE" || agreement === "INVESTIGATE") {
    assumptions.push(
      `The two production models differ by ${diff.toFixed(1)}%, so the estimate is shown as a wider range and its confidence is reduced.`,
    );
  }

  const names = usable.map((m) => modelLabel(m.modelId)).join(" and ");

  return {
    annualAcKwh: track(mean, {
      explanation: `The midpoint of ${names}, which independently modelled your selected roof faces.`,
      derivedFrom: usable.map((m) => modelLabel(m.modelId)),
      confidence,
    }),
    rangeLowKwh: track(low, {
      explanation:
        agreement === "INVESTIGATE"
          ? "Lower bound, widened because the two models disagree by more than the review threshold."
          : "Lower bound across the production models used.",
      confidence,
    }),
    rangeHighKwh: track(high, {
      explanation:
        agreement === "INVESTIGATE"
          ? "Upper bound, widened because the two models disagree by more than the review threshold."
          : "Upper bound across the production models used.",
      confidence,
    }),
    monthlyAcKwh: monthly,
    agreement,
    differencePercent: diff,
    models: input.models,
    failures: input.failures,
    assumptions,
    calculationVersion: PRODUCTION_MODEL_VERSION,
  };
}

/**
 * Monthly shape comes from whichever model actually produced one (PVWatts).
 * We never synthesise a monthly curve from an annual total.
 */
function pickMonthly(models: ProductionModelOutput[]): Tracked<number[]> | null {
  const withMonthly = models.find((m) => m.monthlyAcKwh.length === 12);
  if (!withMonthly) return null;
  return fromApi(withMonthly.monthlyAcKwh, {
    unit: "kWh",
    sourceName: modelLabel(withMonthly.modelId),
    explanation: `Month-by-month output modelled by ${modelLabel(withMonthly.modelId)} from typical weather-year data for your location.`,
    confidence: "MEDIUM",
  });
}

function track(
  value: number,
  opts: { explanation: string; derivedFrom?: string[]; confidence: "HIGH" | "MEDIUM" | "LOW" },
): Tracked<number> {
  return fromCalculation(value, {
    unit: "kWh/year",
    calculationVersion: PRODUCTION_MODEL_VERSION,
    explanation: opts.explanation,
    derivedFrom: opts.derivedFrom,
    confidence: opts.confidence,
  });
}

export function modelLabel(id: ProductionModelId): string {
  switch (id) {
    case "GOOGLE_SOLAR":
      return "Google Solar";
    case "PVWATTS_V8":
      return "NREL PVWatts v8";
  }
}

/**
 * E7. Solar offset. Returns null when consumption is unknown — an offset
 * percentage against a guessed denominator would be meaningless.
 */
export function computeOffsetPercent(
  annualProductionAcKwh: number | null,
  annualConsumptionKwh: number | null,
): Tracked<number> | null {
  if (annualProductionAcKwh === null || annualConsumptionKwh === null || annualConsumptionKwh <= 0) return null;
  const raw = (annualProductionAcKwh / annualConsumptionKwh) * 100;
  const capped = Math.min(100, raw);
  return fromCalculation(capped, {
    unit: "%",
    calculationVersion: PRODUCTION_MODEL_VERSION,
    explanation:
      raw > 100
        ? `This system could generate more than your estimated annual use (${raw.toFixed(0)}% of it). Offset is shown capped at 100% because surplus energy is compensated by your utility, not by your own consumption.`
        : `Estimated annual production divided by your estimated annual electricity use.`,
    derivedFrom: ["estimated annual production", "estimated annual consumption"],
    confidence: "MEDIUM",
  });
}
