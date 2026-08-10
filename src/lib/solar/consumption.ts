/**
 * Electricity consumption model (§20, E6).
 *
 * Strict preference order. Each rung records a different provenance and
 * confidence, and the last rung is *no answer* — we never substitute a
 * national average for a homeowner who told us nothing.
 *
 * The dollars-to-kWh path only runs with a homeowner-confirmed blended rate,
 * and always says so. "$220/month" is never silently turned into an exact
 * annual kWh figure.
 */

import type { ConsumptionInput, ConsumptionResult, ConsumptionBasis } from "./types";
import { fromHomeowner, fromCalculation, type Tracked } from "./provenance";
import { CONSUMPTION_MODEL_VERSION } from "./versions";

/** A month value only counts when it is a real, positive number. */
function observedMonths(monthly?: Array<number | null>): { values: number[]; count: number } {
  const values = (monthly ?? []).filter((v): v is number => typeof v === "number" && Number.isFinite(v) && v > 0);
  return { values, count: values.length };
}

export function deriveConsumption(input: ConsumptionInput): ConsumptionResult {
  const assumptions: string[] = [];
  const anomalies: string[] = [];
  const { values: months, count } = observedMonths(input.monthlyKwh);

  // Anomaly detection (§32G): contradictory inputs are surfaced for the
  // homeowner to reconcile rather than silently resolved by precedence.
  if (count >= 6 && input.annualKwh) {
    const impliedAnnual = (months.reduce((a, b) => a + b, 0) / count) * 12;
    const drift = Math.abs(impliedAnnual - input.annualKwh) / input.annualKwh;
    if (drift > 0.25) {
      anomalies.push(
        `The monthly figures you entered imply about ${Math.round(impliedAnnual).toLocaleString()} kWh a year, but you also entered ${input.annualKwh.toLocaleString()} kWh. Which should we use?`,
      );
    }
  }

  // 1. Twelve months of actual readings — the best input there is.
  if (count === 12) {
    const annual = months.reduce((a, b) => a + b, 0);
    return {
      annualKwh: fromHomeowner(annual, {
        unit: "kWh/year",
        explanation: "The sum of the twelve monthly readings you entered.",
        confidence: "HIGH",
      }),
      monthlyKwh: fromHomeowner(months, {
        unit: "kWh",
        explanation: "The twelve monthly readings you entered.",
        confidence: "HIGH",
      }),
      basis: "TWELVE_MONTHS_ACTUAL",
      assumptions,
      anomalies,
      calculationVersion: CONSUMPTION_MODEL_VERSION,
    };
  }

  // 2. A utility-stated annual total.
  if (input.utilityProvidedAnnualKwh && input.utilityProvidedAnnualKwh > 0) {
    return {
      annualKwh: fromHomeowner(input.utilityProvidedAnnualKwh, {
        unit: "kWh/year",
        explanation: "The annual total shown on your utility statement.",
        confidence: "HIGH",
        sourceName: "Utility statement",
      }),
      monthlyKwh: null,
      basis: "UTILITY_ANNUAL",
      assumptions,
      anomalies,
      calculationVersion: CONSUMPTION_MODEL_VERSION,
    };
  }

  // 3. Partial months, extrapolated — labelled as an extrapolation.
  if (count >= 1 && count < 12) {
    const observedTotal = months.reduce((a, b) => a + b, 0);
    const annual = observedTotal * (12 / count);
    assumptions.push(
      `Your ${count} month${count === 1 ? "" : "s"} of readings were scaled to a full year. Electricity use varies by season, so a full twelve months would materially improve this figure.`,
    );
    return {
      annualKwh: fromCalculation(annual, {
        unit: "kWh/year",
        calculationVersion: CONSUMPTION_MODEL_VERSION,
        explanation: `${observedTotal.toLocaleString()} kWh across ${count} month${count === 1 ? "" : "s"}, scaled to twelve months.`,
        derivedFrom: ["the monthly readings you entered"],
        confidence: "MEDIUM",
      }),
      monthlyKwh: null,
      basis: "PARTIAL_MONTHS_EXTRAPOLATED",
      assumptions,
      anomalies,
      calculationVersion: CONSUMPTION_MODEL_VERSION,
    };
  }

  // 4. A homeowner-entered annual figure.
  if (input.annualKwh && input.annualKwh > 0) {
    return {
      annualKwh: fromHomeowner(input.annualKwh, {
        unit: "kWh/year",
        explanation: "The annual electricity use you entered.",
        confidence: "MEDIUM",
      }),
      monthlyKwh: null,
      basis: "HOMEOWNER_ANNUAL",
      assumptions,
      anomalies,
      calculationVersion: CONSUMPTION_MODEL_VERSION,
    };
  }

  // 5. A single typical month × 12.
  if (count === 0 && input.monthlyKwh?.length === 1 && typeof input.monthlyKwh[0] === "number") {
    const m = input.monthlyKwh[0]!;
    assumptions.push("A single month was treated as typical for the whole year.");
    return {
      annualKwh: fromCalculation(m * 12, {
        unit: "kWh/year",
        calculationVersion: CONSUMPTION_MODEL_VERSION,
        explanation: `${m.toLocaleString()} kWh × 12 months.`,
        confidence: "LOW",
      }),
      monthlyKwh: null,
      basis: "HOMEOWNER_MONTHLY",
      assumptions,
      anomalies,
      calculationVersion: CONSUMPTION_MODEL_VERSION,
    };
  }

  // 6. Bill dollars — only with a confirmed blended rate, always labelled.
  if (input.averageMonthlyBillDollars && input.averageMonthlyBillDollars > 0) {
    const rate = input.blendedRateDollarsPerKwh;
    if (!rate || rate <= 0) {
      // Refuse rather than invent a rate. The planner asks for one.
      return {
        annualKwh: null,
        monthlyKwh: null,
        basis: "UNKNOWN",
        assumptions: [
          ...assumptions,
          "We can't convert a dollar amount into kilowatt-hours without your electricity rate, so no usage figure has been estimated.",
        ],
        anomalies,
        calculationVersion: CONSUMPTION_MODEL_VERSION,
      };
    }
    const fixed = input.fixedMonthlyChargeDollars ?? 0;
    const energyDollarsPerMonth = Math.max(0, input.averageMonthlyBillDollars - fixed);
    const annual = (energyDollarsPerMonth * 12) / rate;
    assumptions.push(
      `Your usage was approximated from your bill using a blended rate of $${rate.toFixed(3)}/kWh${fixed > 0 ? ` after subtracting $${fixed.toFixed(2)}/month in fixed charges` : ""}. This is an approximation, not a meter reading.`,
    );
    return {
      annualKwh: fromCalculation(annual, {
        unit: "kWh/year",
        calculationVersion: CONSUMPTION_MODEL_VERSION,
        explanation: `($${input.averageMonthlyBillDollars.toFixed(2)} − $${fixed.toFixed(2)} fixed) × 12 ÷ $${rate.toFixed(3)}/kWh. Approximate — entering actual kWh would be much more accurate.`,
        derivedFrom: ["your average monthly bill", "your blended electricity rate"],
        confidence: "LOW",
      }),
      monthlyKwh: null,
      basis: "BILL_DOLLARS_APPROXIMATED",
      assumptions,
      anomalies,
      calculationVersion: CONSUMPTION_MODEL_VERSION,
    };
  }

  // 7. Nothing usable. No figure at all — and that is the honest answer.
  return {
    annualKwh: null,
    monthlyKwh: null,
    basis: "UNKNOWN",
    assumptions: [
      ...assumptions,
      "We don't have your electricity use, so no usage figure or offset percentage is shown.",
    ],
    anomalies,
    calculationVersion: CONSUMPTION_MODEL_VERSION,
  };
}

/** Human label for the basis, used in the UI and the contractor brief. */
export function consumptionBasisLabel(basis: ConsumptionBasis): string {
  switch (basis) {
    case "TWELVE_MONTHS_ACTUAL":
      return "12 months of actual readings";
    case "UTILITY_ANNUAL":
      return "Utility-provided annual total";
    case "PARTIAL_MONTHS_EXTRAPOLATED":
      return "Partial readings, extrapolated to a year";
    case "HOMEOWNER_ANNUAL":
      return "Homeowner-entered annual total";
    case "HOMEOWNER_MONTHLY":
      return "Single month, treated as typical";
    case "BILL_DOLLARS_APPROXIMATED":
      return "Approximated from bill dollars";
    case "UNKNOWN":
      return "Not provided";
  }
}

/** How much better could this get? Drives the "improve your estimate" prompts. */
export function consumptionImprovement(basis: ConsumptionBasis): string | null {
  switch (basis) {
    case "TWELVE_MONTHS_ACTUAL":
    case "UTILITY_ANNUAL":
      return null;
    case "PARTIAL_MONTHS_EXTRAPOLATED":
      return "Add the remaining months of usage for a materially better estimate.";
    case "HOMEOWNER_ANNUAL":
    case "HOMEOWNER_MONTHLY":
      return "Enter 12 months of actual kWh from your bills to improve the usage estimate.";
    case "BILL_DOLLARS_APPROXIMATED":
      return "Enter actual kWh instead of dollars — it removes the rate assumption entirely.";
    case "UNKNOWN":
      return "Add your electricity usage to see how much of it this system could cover.";
  }
}

/** A tracked monthly consumption curve, when the homeowner gave twelve months. */
export function monthlyConsumptionOrNull(result: ConsumptionResult): Tracked<number[]> | null {
  return result.monthlyKwh;
}
