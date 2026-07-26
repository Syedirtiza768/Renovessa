/**
 * Contractor commercial pricing layer (Proposal Studio).
 * Seeds from Renovessa baseline estimate line items, then applies contractor
 * markup / overhead / contingency. AI never sets final dollars.
 */

import type { LineItem } from "./estimator";

export type StudioPricingSettings = {
  /** Markup on direct cost as percent (e.g. 25 = 25%). */
  markupPercent: number;
  /** Overhead as percent of direct cost. */
  overheadPercent: number;
  /** Contingency as percent of direct cost. */
  contingencyPercent: number;
  /** Minimum acceptable gross margin % of customer price. */
  minimumGrossMarginPercent: number;
  /** Optional default labor rate ($/hr) for display / future labor hours. */
  defaultLaborRate: number;
};

export const DEFAULT_STUDIO_PRICING: StudioPricingSettings = {
  markupPercent: 25,
  overheadPercent: 10,
  contingencyPercent: 5,
  minimumGrossMarginPercent: 15,
  defaultLaborRate: 85,
};

export type CostSource = "renovessa_baseline" | "contractor_override" | "manual";

export type ContractorPricedLineItem = {
  key: string;
  category: string;
  description: string;
  quantity: number;
  unit: string;
  /** Direct unit cost (contractor cost basis). */
  unitCost: number;
  wastePercent: number;
  laborHours: number;
  laborRate: number;
  otherDirectCost: number;
  /** Markup % for this line (defaults to company markup). */
  markupPercent: number;
  /** Computed or manually overridden customer price for the line. */
  customerPrice: number;
  /** When true, customerPrice was manually set and not auto-recomputed. */
  customerPriceLocked: boolean;
  included: boolean;
  costSource: CostSource;
  calculationReference?: string;
  sortOrder: number;
};

export type PricingTotals = {
  directCostTotal: number;
  overheadAmount: number;
  contingencyAmount: number;
  costBeforeProfit: number;
  profitAmount: number;
  customerTotal: number;
  markupPercent: number;
  grossMarginPercent: number;
  belowMinimumMargin: boolean;
  minimumGrossMarginPercent: number;
};

export type PricedEstimate = {
  lineItems: ContractorPricedLineItem[];
  totals: PricingTotals;
  settings: StudioPricingSettings;
};

export function normalizeStudioPricing(raw: unknown): StudioPricingSettings {
  const obj = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const num = (v: unknown, fallback: number) => {
    const n = typeof v === "number" ? v : Number(v);
    return Number.isFinite(n) ? n : fallback;
  };
  return {
    markupPercent: clamp(num(obj.markupPercent, DEFAULT_STUDIO_PRICING.markupPercent), 0, 200),
    overheadPercent: clamp(num(obj.overheadPercent, DEFAULT_STUDIO_PRICING.overheadPercent), 0, 100),
    contingencyPercent: clamp(
      num(obj.contingencyPercent, DEFAULT_STUDIO_PRICING.contingencyPercent),
      0,
      100,
    ),
    minimumGrossMarginPercent: clamp(
      num(obj.minimumGrossMarginPercent, DEFAULT_STUDIO_PRICING.minimumGrossMarginPercent),
      0,
      90,
    ),
    defaultLaborRate: clamp(num(obj.defaultLaborRate, DEFAULT_STUDIO_PRICING.defaultLaborRate), 0, 500),
  };
}

/** Seed contractor-priced lines from deterministic estimate line items. */
export function seedContractorLineItems(
  estimateLines: LineItem[],
  settings: StudioPricingSettings = DEFAULT_STUDIO_PRICING,
): ContractorPricedLineItem[] {
  // Skip estimator overhead/contingency — studio applies contractor's own.
  const skip = new Set(["general_contractor_overhead", "contingency"]);
  return estimateLines
    .filter((li) => !skip.has(li.category))
    .map((li, idx) => {
      const mid = Math.round((li.lowAmount + li.highAmount) / 2);
      const qty = li.quantity > 0 ? li.quantity : 1;
      const unitCost = qty > 0 ? round2(mid / qty) : mid;
      const direct = lineDirectCost({
        quantity: qty,
        unitCost,
        wastePercent: 0,
        laborHours: 0,
        laborRate: settings.defaultLaborRate,
        otherDirectCost: 0,
      });
      const customerPrice = applyMarkup(direct, settings.markupPercent);
      return {
        key: `${li.category}-${idx}`,
        category: li.category,
        description: li.description,
        quantity: qty,
        unit: li.unit,
        unitCost,
        wastePercent: 0,
        laborHours: 0,
        laborRate: settings.defaultLaborRate,
        otherDirectCost: 0,
        markupPercent: settings.markupPercent,
        customerPrice,
        customerPriceLocked: false,
        included: true,
        costSource: "renovessa_baseline" as const,
        calculationReference: li.calculationReference,
        sortOrder: li.sortOrder ?? idx,
      };
    });
}

export function lineDirectCost(li: {
  quantity: number;
  unitCost: number;
  wastePercent: number;
  laborHours: number;
  laborRate: number;
  otherDirectCost: number;
}): number {
  const material = li.quantity * li.unitCost * (1 + li.wastePercent / 100);
  const labor = li.laborHours * li.laborRate;
  return Math.round(material + labor + li.otherDirectCost);
}

export function applyMarkup(directCost: number, markupPercent: number): number {
  return Math.round(directCost * (1 + markupPercent / 100));
}

/** Gross margin % of customer price. Markup % is on cost — they are not interchangeable. */
export function grossMarginPercent(customerPrice: number, directCost: number): number {
  if (customerPrice <= 0) return 0;
  return round2(((customerPrice - directCost) / customerPrice) * 100);
}

export function markupFromMargin(grossMarginPercentValue: number): number {
  const m = grossMarginPercentValue / 100;
  if (m >= 1) return 0;
  return round2((m / (1 - m)) * 100);
}

export function recomputeLineItem(
  li: ContractorPricedLineItem,
  defaults?: Partial<StudioPricingSettings>,
): ContractorPricedLineItem {
  const markup = li.markupPercent ?? defaults?.markupPercent ?? DEFAULT_STUDIO_PRICING.markupPercent;
  const direct = lineDirectCost(li);
  if (li.customerPriceLocked) {
    return { ...li, markupPercent: markup };
  }
  return {
    ...li,
    markupPercent: markup,
    customerPrice: applyMarkup(direct, markup),
  };
}

export function recalculatePricing(
  lineItems: ContractorPricedLineItem[],
  settings: StudioPricingSettings,
): PricedEstimate {
  const recomputed = lineItems.map((li) =>
    li.included ? recomputeLineItem(li, settings) : { ...li, customerPrice: li.customerPriceLocked ? li.customerPrice : 0 },
  );

  const included = recomputed.filter((li) => li.included);
  const directCostTotal = included.reduce((s, li) => s + lineDirectCost(li), 0);
  const overheadAmount = Math.round(directCostTotal * (settings.overheadPercent / 100));
  const contingencyAmount = Math.round(directCostTotal * (settings.contingencyPercent / 100));
  const costBeforeProfit = directCostTotal + overheadAmount + contingencyAmount;

  // Customer total = sum of line customer prices + overhead/contingency marked up
  const linesCustomer = included.reduce((s, li) => s + li.customerPrice, 0);
  const overheadCustomer = applyMarkup(overheadAmount, settings.markupPercent);
  const contingencyCustomer = applyMarkup(contingencyAmount, settings.markupPercent);
  const customerTotal = linesCustomer + overheadCustomer + contingencyCustomer;

  const profitAmount = customerTotal - costBeforeProfit;
  const margin = grossMarginPercent(customerTotal, costBeforeProfit);

  return {
    lineItems: recomputed,
    settings,
    totals: {
      directCostTotal,
      overheadAmount,
      contingencyAmount,
      costBeforeProfit,
      profitAmount,
      customerTotal,
      markupPercent: settings.markupPercent,
      grossMarginPercent: margin,
      belowMinimumMargin: margin < settings.minimumGrossMarginPercent && customerTotal > 0,
      minimumGrossMarginPercent: settings.minimumGrossMarginPercent,
    },
  };
}

export function applyLineOverrides(
  current: ContractorPricedLineItem[],
  overrides: Array<Partial<ContractorPricedLineItem> & { key: string }>,
): ContractorPricedLineItem[] {
  const byKey = new Map(overrides.map((o) => [o.key, o]));
  return current.map((li) => {
    const o = byKey.get(li.key);
    if (!o) return li;
    const next: ContractorPricedLineItem = {
      ...li,
      ...o,
      key: li.key,
      category: o.category ?? li.category,
      description: o.description ?? li.description,
    };
    if (o.customerPrice !== undefined && o.customerPrice !== li.customerPrice) {
      next.customerPriceLocked = o.customerPriceLocked ?? true;
      next.costSource = o.costSource ?? "contractor_override";
    }
    if (
      o.unitCost !== undefined ||
      o.quantity !== undefined ||
      o.wastePercent !== undefined ||
      o.laborHours !== undefined ||
      o.laborRate !== undefined ||
      o.otherDirectCost !== undefined ||
      o.markupPercent !== undefined
    ) {
      if (o.customerPrice === undefined) {
        next.customerPriceLocked = false;
      }
      if (o.unitCost !== undefined || o.quantity !== undefined) {
        next.costSource = o.costSource ?? "contractor_override";
      }
    }
    return next;
  });
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}
