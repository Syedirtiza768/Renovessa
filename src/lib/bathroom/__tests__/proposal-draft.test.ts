import { describe, it, expect } from "vitest";
import { draftProposalFromPrompt } from "@/lib/bathroom/proposal-draft";
import {
  seedContractorLineItems,
  recalculatePricing,
  DEFAULT_STUDIO_PRICING,
  grossMarginPercent,
  applyMarkup,
  applyLineOverrides,
  createManualLineItem,
} from "@/lib/bathroom/contractor-pricing";
import type { LineItem } from "@/lib/bathroom/estimator";

describe("draftProposalFromPrompt", () => {
  it("drafts scope language without inventing a price from prompt dollars", () => {
    const draft = draftProposalFromPrompt({
      prompt: "Tub to shower conversion in Rockville condo, mid-range tile, budget around $22k",
      companyName: "Acme Bath Co",
      clientName: "Jordan Lee",
      bathroomType: "primary",
      projectObjective: "tub_to_shower",
      estimateMid: 20000,
    });
    expect(draft.suggestedTotalPrice).toBe(20000);
    expect(draft.includedScope.toLowerCase()).toContain("tub");
    expect(draft.exclusions.length).toBeGreaterThan(20);
    expect(draft.note.toLowerCase()).toContain("estimate");
  });

  it("returns null suggested price when no estimate mid is provided", () => {
    const draft = draftProposalFromPrompt({
      prompt: "Full bathroom remodel with vanity and tile for about $30,000",
      companyName: "Acme Bath Co",
    });
    expect(draft.suggestedTotalPrice).toBeNull();
  });
});

describe("contractor-pricing", () => {
  const sampleLines: LineItem[] = [
    {
      category: "demolition",
      description: "Demo",
      quantity: 40,
      unit: "sqft",
      unitRate: 4,
      lowAmount: 120,
      highAmount: 240,
      multiplier: 1,
      calculationReference: "test",
      sortOrder: 0,
    },
    {
      category: "general_contractor_overhead",
      description: "Overhead",
      quantity: 1,
      unit: "project",
      unitRate: 100,
      lowAmount: 100,
      highAmount: 100,
      multiplier: 1,
      calculationReference: "skip",
      sortOrder: 99,
    },
  ];

  it("seeds lines from baseline mid and skips estimator overhead", () => {
    const seeded = seedContractorLineItems(sampleLines, DEFAULT_STUDIO_PRICING);
    expect(seeded).toHaveLength(1);
    expect(seeded[0].unitCost).toBe(4.5); // mid 180 / 40
    expect(seeded[0].costSource).toBe("renovessa_baseline");
  });

  it("distinguishes markup from gross margin", () => {
    expect(applyMarkup(1000, 25)).toBe(1250);
    expect(grossMarginPercent(1250, 1000)).toBe(20);
  });

  it("recalculates totals with overhead and contingency", () => {
    const seeded = seedContractorLineItems(sampleLines, DEFAULT_STUDIO_PRICING);
    const priced = recalculatePricing(seeded, DEFAULT_STUDIO_PRICING);
    expect(priced.totals.directCostTotal).toBeGreaterThan(0);
    expect(priced.totals.customerTotal).toBeGreaterThan(priced.totals.costBeforeProfit);
    expect(priced.totals.grossMarginPercent).toBeGreaterThan(0);
  });

  it("respects contractor unit-cost overrides", () => {
    const seeded = seedContractorLineItems(sampleLines, DEFAULT_STUDIO_PRICING);
    const overridden = applyLineOverrides(seeded, [
      { key: seeded[0].key, unitCost: 10, customerPriceLocked: false },
    ]);
    const priced = recalculatePricing(overridden, DEFAULT_STUDIO_PRICING);
    expect(priced.lineItems[0].costSource).toBe("contractor_override");
    expect(priced.lineItems[0].customerPrice).toBe(applyMarkup(40 * 10, 25));
  });

  it("creates a manual line item with markup applied", () => {
    const line = createManualLineItem(DEFAULT_STUDIO_PRICING, {
      description: "Custom vanity",
      quantity: 1,
      unitCost: 1000,
    });
    expect(line.costSource).toBe("manual");
    expect(line.customerPrice).toBe(1250);
  });
});
