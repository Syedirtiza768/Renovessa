/**
 * Shared commercial persist + approval helpers for Proposal Studio.
 */

import { prisma } from "@/lib/db";
import {
  normalizeStudioPricing,
  ensureCustomerPricing,
  type ContractorPricedLineItem,
  type StudioPricingSettings,
} from "@/lib/bathroom/contractor-pricing";
import type { proposalSchema } from "@/lib/bathroom/schemas";
import type { z } from "zod";

type PartialProposalInput = Partial<z.infer<typeof proposalSchema>>;

export async function resolveValidEstimateId(
  projectId: string,
  estimateId: string | null | undefined,
): Promise<string | null> {
  if (!estimateId) return null;
  const found = await prisma.bathroomEstimate.findFirst({
    where: { id: estimateId, projectId },
    select: { id: true },
  });
  return found?.id ?? null;
}

export function buildCommercialFields(data: PartialProposalInput, profilePricing: unknown) {
  const settings = normalizeStudioPricing({
    ...normalizeStudioPricing(profilePricing),
    ...(data.pricingSettings || {}),
  });

  const incomingLines = data.lineItems as ContractorPricedLineItem[] | undefined;
  const wantsRecompute = Boolean(data.recomputeFromLines || incomingLines?.length);

  if (wantsRecompute || (data.totalPrice != null && data.totalPrice > 0 && !incomingLines?.length)) {
    const ensured = ensureCustomerPricing(incomingLines || [], data.totalPrice ?? 0, settings);
    return {
      totalPrice: ensured.totals.customerTotal,
      directCostTotal: ensured.totals.directCostTotal,
      overheadAmount: ensured.totals.overheadAmount,
      contingencyAmount: ensured.totals.contingencyAmount,
      profitAmount: ensured.totals.profitAmount,
      grossMarginPercent: ensured.totals.grossMarginPercent,
      markupPercent: ensured.totals.markupPercent,
      lineItemsJson: ensured.lineItems.length ? ensured.lineItems : incomingLines,
      pricingSnapshotJson: settings,
      settings,
      totals: ensured.totals,
    };
  }

  return {
    totalPrice: data.totalPrice,
    directCostTotal: null as number | null,
    overheadAmount: null as number | null,
    contingencyAmount: null as number | null,
    profitAmount: null as number | null,
    grossMarginPercent: null as number | null,
    markupPercent: settings.markupPercent,
    lineItemsJson: incomingLines,
    pricingSnapshotJson: settings,
    settings,
    totals: null as ReturnType<typeof ensureCustomerPricing>["totals"] | null,
  };
}

export function evaluateMarginGate(input: {
  lineItemsJson: unknown;
  totalPrice: number;
  directCostTotal: number | null;
  overheadAmount: number | null;
  contingencyAmount: number | null;
  grossMarginPercent: number | null;
  settings: StudioPricingSettings;
}): { margin: number | null; belowMin: boolean } {
  const { settings } = input;
  if (input.lineItemsJson && Array.isArray(input.lineItemsJson) && input.lineItemsJson.length) {
    const ensured = ensureCustomerPricing(
      input.lineItemsJson as ContractorPricedLineItem[],
      input.totalPrice,
      settings,
    );
    return {
      margin: ensured.totals.grossMarginPercent,
      belowMin: ensured.totals.belowMinimumMargin,
    };
  }

  if (input.directCostTotal != null && input.totalPrice > 0) {
    const cost =
      (input.directCostTotal || 0) + (input.overheadAmount || 0) + (input.contingencyAmount || 0);
    const margin = ((input.totalPrice - cost) / input.totalPrice) * 100;
    return {
      margin,
      belowMin: margin < settings.minimumGrossMarginPercent,
    };
  }

  return {
    margin: input.grossMarginPercent,
    belowMin: false,
  };
}
