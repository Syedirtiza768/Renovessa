import { describe, expect, it } from "vitest";
import {
  DEFAULT_STUDIO_PRICING,
  createManualLineItem,
  createPackageLineItem,
  ensureCustomerPricing,
  recalculatePricing,
} from "../contractor-pricing";
import { proposalApproveSchema, proposalSchema, proposalSendSchema } from "../schemas";

describe("ensureCustomerPricing", () => {
  it("uses priced lines when present", () => {
    const lines = [
      createManualLineItem(DEFAULT_STUDIO_PRICING, {
        description: "Demo",
        unitCost: 1000,
        quantity: 1,
      }),
    ];
    const result = ensureCustomerPricing(lines, 0, DEFAULT_STUDIO_PRICING);
    expect(result.usedPackage).toBe(false);
    expect(result.totals.customerTotal).toBeGreaterThan(0);
  });

  it("creates a package line from fallback total when lines are empty or $0", () => {
    const result = ensureCustomerPricing([], 18500, DEFAULT_STUDIO_PRICING);
    expect(result.usedPackage).toBe(true);
    expect(result.totals.customerTotal).toBe(18500);
    expect(result.lineItems).toHaveLength(1);
    expect(result.lineItems[0].category).toBe("package");
  });

  it("package-only recalculation does not stack overhead on customer total", () => {
    const pkg = createPackageLineItem(20000, DEFAULT_STUDIO_PRICING);
    const priced = recalculatePricing([pkg], DEFAULT_STUDIO_PRICING);
    expect(priced.totals.customerTotal).toBe(20000);
    expect(priced.totals.overheadAmount).toBe(0);
  });
});

describe("proposal approve/send schemas", () => {
  it("accepts approve payload with commercial fields", () => {
    const parsed = proposalApproveSchema.safeParse({
      totalPrice: 18500,
      includedScope: "Scope",
      exclusions: "Exclusions",
      acknowledgeBelowMinimumMargin: true,
      lineItems: [],
      recomputeFromLines: true,
    });
    expect(parsed.success).toBe(true);
  });

  it("accepts send payload with autoApprove", () => {
    const parsed = proposalSendSchema.safeParse({
      totalPrice: 18500,
      includedScope: "Scope",
      exclusions: "Exclusions",
      expiresDays: 30,
      rotateToken: true,
      autoApprove: true,
    });
    expect(parsed.success).toBe(true);
  });

  it("coerces empty estimateId to null", () => {
    const parsed = proposalSchema.safeParse({
      totalPrice: 100,
      includedScope: "a",
      exclusions: "b",
      estimateId: "",
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.estimateId).toBeNull();
  });
});
