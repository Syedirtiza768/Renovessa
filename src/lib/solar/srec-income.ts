/**
 * SREC income projection (§24 honesty rules apply).
 *
 * SRECs are production income: 1 credit per 1,000 kWh generated, sold on a
 * market whose price is set by supply, demand, and the state's compliance
 * schedule. This module projects an income *range* from the reconciled
 * production estimate and the config's per-state price brackets.
 *
 * Hard rules:
 * - Never netted against installed cost (that is applyIncentives' job, and
 *   SREC rows are valueType OTHER precisely so they cannot be).
 * - Prices are held flat — no price forecast is claimed.
 * - Every number carries LOW/MEDIUM confidence provenance and the projection
 *   is absent (null) for states without an SREC market or when production
 *   could not be modelled.
 */

import { fromCalculation } from "./provenance";
import type { SrecIncomeProjection } from "./types";
import type { SolarPricingConfig } from "./pricing-config";
import { SREC_ENGINE_VERSION } from "./versions";

export interface SrecProjectionInput {
  /** Reconciled year-1 AC production; null when no model succeeded. */
  annualAcKwh: number | null;
  stateCode: string | null | undefined;
  config: SolarPricingConfig;
}

/** Sum of a geometric series: year1 * (1 - r^years) / (1 - r), r = 1 - degradation. */
function degradedTotal(year1: number, years: number, annualDegradationPercent: number): number {
  const r = 1 - annualDegradationPercent / 100;
  if (r >= 1 || years <= 1) return year1 * Math.max(years, 0);
  return (year1 * (1 - Math.pow(r, years))) / (1 - r);
}

export function projectSrecIncome(input: SrecProjectionInput): SrecIncomeProjection | null {
  const { config } = input;
  const state = input.stateCode?.trim().toUpperCase();
  if (!state || input.annualAcKwh === null || input.annualAcKwh <= 0) return null;

  const bracket = config.srec.prices[state];
  if (!bracket) return null;

  const years = config.srec.yearsProjected;
  const degradation = config.economics.annualDegradationPercent;
  const srecsYear1 = input.annualAcKwh / 1000;
  const srecsTotal = degradedTotal(srecsYear1, years, degradation);

  const provenance = {
    calculationVersion: SREC_ENGINE_VERSION,
    derivedFrom: ["reconciled production estimate", `SREC price bracket for ${state} (market reporting)`],
    confidence: "LOW" as const,
    sourceName: "Renovessa SREC projection (market-priced, not guaranteed)",
  };

  const certifiedActive =
    bracket.certifiedFactor && bracket.certifiedUntil && new Date() < new Date(bracket.certifiedUntil);

  return {
    stateCode: state,
    srecsPerYear: fromCalculation(round1(srecsYear1), {
      ...provenance,
      unit: "SREC/year",
      explanation: `Year-1 production of ${Math.round(input.annualAcKwh).toLocaleString()} kWh ÷ 1,000 kWh per SREC.`,
    }),
    annualIncomeLowDollars: fromCalculation(Math.round(srecsYear1 * bracket.low), {
      ...provenance,
      unit: "USD",
      explanation: `${round1(srecsYear1)} SRECs × $${bracket.low} (low end of the current ${state} market bracket).`,
    }),
    annualIncomeHighDollars: fromCalculation(Math.round(srecsYear1 * bracket.high), {
      ...provenance,
      unit: "USD",
      explanation: `${round1(srecsYear1)} SRECs × $${bracket.high} (high end of the current ${state} market bracket).`,
    }),
    projectedYears: years,
    totalIncomeLowDollars: fromCalculation(Math.round(srecsTotal * bracket.low), {
      ...provenance,
      unit: "USD",
      explanation: `${years}-year total at $${bracket.low}/SREC with ${degradation}% annual production degradation; prices held flat.`,
    }),
    totalIncomeHighDollars: fromCalculation(Math.round(srecsTotal * bracket.high), {
      ...provenance,
      unit: "USD",
      explanation: `${years}-year total at $${bracket.high}/SREC with ${degradation}% annual production degradation; prices held flat.`,
    }),
    certifiedMultiplierNote: certifiedActive ? bracket.certifiedNote : undefined,
    assumptions: [
      `SREC prices are market-driven and not guaranteed; the $${bracket.low}–$${bracket.high} bracket reflects recent ${state} market reporting, not a forecast.`,
      "Income continues only while the system produces and remains registered (typically 15 years of eligibility).",
      "With a lease or PPA, SREC ownership depends on the contract — confirm who keeps the credits before signing.",
      "Registration (state certification + PJM GATS) is required before credits are issued; first payment typically takes 3–6 months.",
    ],
  };
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
