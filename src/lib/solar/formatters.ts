/**
 * Presentation formatting (§62, §65).
 *
 * The ONLY place rounding for display happens. Engines pass full-precision
 * numbers to each other; a rounded value is never fed back into a subsequent
 * calculation. Everything here takes a number and returns a string, which
 * makes that boundary impossible to cross by accident.
 *
 * Also holds the plain-language glossary that translates solar jargon.
 */

import type { ConfidenceLevelName } from "./types";

export function formatKwh(value: number): string {
  return `${Math.round(value).toLocaleString("en-US")} kWh`;
}

export function formatKwhPerYear(value: number): string {
  return `${Math.round(value).toLocaleString("en-US")} kWh/year`;
}

export function formatKw(value: number): string {
  return `${value.toFixed(1)} kW`;
}

export function formatPercent(value: number, dp = 0): string {
  return `${value.toFixed(dp)}%`;
}

export function formatUsd(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatUsdRange(low: number, high: number): string {
  return `${formatUsd(low)}–${formatUsd(high)}`;
}

export function formatDollarsPerWatt(value: number): string {
  return `$${value.toFixed(2)}/W`;
}

export function formatKwhRange(low: number, high: number): string {
  return `${Math.round(low).toLocaleString("en-US")}–${Math.round(high).toLocaleString("en-US")} kWh`;
}

export function formatSquareFeet(value: number): string {
  return `${Math.round(value).toLocaleString("en-US")} sq ft`;
}

export function formatDegrees(value: number): string {
  return `${Math.round(value)}°`;
}

/** "August 2024" from an ISO date, for imagery dates. */
export function formatMonthYear(iso?: string): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric", timeZone: "UTC" }).format(d);
}

export function formatIsoDate(iso?: string): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeZone: "UTC" }).format(d);
}

export const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function confidenceBadgeClass(level: ConfidenceLevelName): string {
  switch (level) {
    case "HIGH":
      return "bg-success-50 text-success-landing";
    case "MEDIUM":
      return "bg-accent-100 text-accent";
    case "PRELIMINARY":
      return "bg-ink-5 text-ink-70";
  }
}

/**
 * Plain-language translations of the technical terms (§65). Every metric on
 * the results page renders its label from here, so a homeowner never meets an
 * unexplained unit.
 */
export const GLOSSARY: Record<string, { term: string; plain: string }> = {
  dcSystemSize: {
    term: "kW DC",
    plain: "Your system's rated solar-panel capacity — how much it can produce under standard test conditions.",
  },
  annualProduction: {
    term: "kWh/year",
    plain: "The electricity the system could generate in its first year, in the same units your bill uses.",
  },
  offset: {
    term: "% offset",
    plain: "The share of your current annual electricity use this system could cover.",
  },
  panelCount: {
    term: "panels",
    plain: "How many solar modules would fit in the layout you've selected.",
  },
  dollarsPerWatt: {
    term: "$/W",
    plain: "Installed cost divided by system capacity — the usual way installers compare prices.",
  },
  azimuth: {
    term: "azimuth",
    plain: "The compass direction a roof face slopes toward. South-facing roofs generally produce the most.",
  },
  pitch: {
    term: "pitch",
    plain: "How steeply a roof face slopes.",
  },
  degradation: {
    term: "degradation",
    plain: "The small yearly decline in panel output as the equipment ages.",
  },
};
