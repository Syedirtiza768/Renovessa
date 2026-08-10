import { describe, it, expect } from "vitest";
import { projectSrecIncome } from "@/lib/solar/srec-income";
import { DEFAULT_SOLAR_PRICING_CONFIG } from "@/lib/solar/pricing-config";

const cfg = DEFAULT_SOLAR_PRICING_CONFIG;

describe("projectSrecIncome", () => {
  it("projects MD income from reconciled production", () => {
    const r = projectSrecIncome({ annualAcKwh: 12000, stateCode: "MD", config: cfg });
    expect(r).not.toBeNull();
    expect(r!.srecsPerYear.value).toBe(12);
    expect(r!.annualIncomeLowDollars.value).toBe(12 * 50);
    expect(r!.annualIncomeHighDollars.value).toBe(12 * 90);
    // 10-year totals with 0.5%/yr degradation, flat prices
    const factor = (1 - Math.pow(0.995, 10)) / 0.005;
    expect(r!.totalIncomeLowDollars.value).toBe(Math.round(12 * factor * 50));
    expect(r!.totalIncomeHighDollars.value).toBe(Math.round(12 * factor * 90));
    expect(r!.totalIncomeLowDollars.value).toBeLessThan(12 * 10 * 50); // degradation bites
  });

  it("shows the MD Certified SREC upside note while the window is open", () => {
    const r = projectSrecIncome({ annualAcKwh: 12000, stateCode: "md", config: cfg });
    expect(r!.certifiedMultiplierNote).toContain("Certified SREC");
  });

  it("projects DC income at the DC bracket with no certified note", () => {
    const r = projectSrecIncome({ annualAcKwh: 10000, stateCode: "DC", config: cfg });
    expect(r).not.toBeNull();
    expect(r!.annualIncomeLowDollars.value).toBe(10 * 300);
    expect(r!.annualIncomeHighDollars.value).toBe(10 * 425);
    expect(r!.certifiedMultiplierNote).toBeUndefined();
  });

  it("returns null for states without an SREC market", () => {
    expect(projectSrecIncome({ annualAcKwh: 12000, stateCode: "VA", config: cfg })).toBeNull();
  });

  it("returns null without production or state", () => {
    expect(projectSrecIncome({ annualAcKwh: null, stateCode: "MD", config: cfg })).toBeNull();
    expect(projectSrecIncome({ annualAcKwh: 12000, stateCode: null, config: cfg })).toBeNull();
    expect(projectSrecIncome({ annualAcKwh: 0, stateCode: "MD", config: cfg })).toBeNull();
  });

  it("labels every number as low-confidence market-priced provenance", () => {
    const r = projectSrecIncome({ annualAcKwh: 12000, stateCode: "MD", config: cfg })!;
    for (const t of [r.srecsPerYear, r.annualIncomeLowDollars, r.totalIncomeHighDollars]) {
      expect(t.provenance.confidence).toBe("LOW");
      expect(t.provenance.sourceName).toContain("not guaranteed");
    }
    expect(r.assumptions.some((a) => a.includes("not guaranteed"))).toBe(true);
    expect(r.assumptions.some((a) => a.includes("lease or PPA"))).toBe(true);
  });
});
