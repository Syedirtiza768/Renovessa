/**
 * Cross-scope consistency guarantees for the estimator (added 2026-08-10).
 *
 * The v1 estimator was scope-invariant: flat allowances dominated the per-sqft
 * baseline, so every objective/type/tier produced nearly identical totals and
 * powder rooms were charged for showers. The share-based model must keep the
 * full objective × type × tier matrix valid, monotonic, and scope-appropriate.
 */
import { describe, it, expect } from "vitest";
import { generateEstimate, type EstimateInputs } from "@/lib/bathroom/estimator";
import { DEFAULT_ESTIMATOR_CONFIG, PROJECT_OBJECTIVES, BATHROOM_TYPES, FIXTURE_QUALITY_TIERS } from "@/lib/bathroom/config";
import { deriveEstimateInputs } from "@/lib/bathroom/estimate-input-derivation";

const base: EstimateInputs = {
  objective: "remodel_same_layout",
  bathroomType: "guest",
  finishTier: "standard",
  floorAreaSqft: 40,
  plumbingRelocationFt: 0,
  electricalModifications: 1,
  tileFullHeightRoom: false,
  curblessShower: false,
  condoHighFloor: false,
  homeAgeYears: 30,
  waterDamageReported: false,
  locationId: "rockville-md",
};

const est = (over: Partial<EstimateInputs>) => generateEstimate({ ...base, ...over });

describe("estimator consistency matrix", () => {
  it("produces valid ordered ranges for every objective × type × tier", () => {
    for (const o of PROJECT_OBJECTIVES) {
      for (const t of BATHROOM_TYPES) {
        for (const tier of FIXTURE_QUALITY_TIERS) {
          const r = est({ objective: o.id, bathroomType: t.id, finishTier: tier.id });
          const label = `${o.id}/${t.id}/${tier.id}`;
          expect(Number.isFinite(r.lowAmount), label).toBe(true);
          expect(r.lowAmount, label).toBeGreaterThan(0);
          expect(r.lowAmount, label).toBeLessThanOrEqual(r.expectedLowAmount);
          expect(r.expectedLowAmount, label).toBeLessThanOrEqual(r.expectedHighAmount);
          expect(r.expectedHighAmount, label).toBeLessThanOrEqual(r.highComplexityAmount);
          for (const li of r.lineItems) {
            expect(li.lowAmount, `${label}:${li.category}`).toBeGreaterThanOrEqual(0);
            expect(li.lowAmount, `${label}:${li.category}`).toBeLessThanOrEqual(li.highAmount);
          }
        }
      }
    }
  });

  it("objective strongly affects price (no scope invariance)", () => {
    const cosmetic = est({ objective: "cosmetic_refresh" });
    const fullGut = est({ objective: "full_gut" });
    // v1 bug: full gut was only ~3% above cosmetic. Require a real spread.
    expect(fullGut.lowAmount).toBeGreaterThan(cosmetic.lowAmount * 2);
  });

  it("orders objectives by scope intensity", () => {
    const order = ["cosmetic_refresh", "replace_fixtures_finishes", "remodel_same_layout", "full_gut"];
    const lows = order.map((o) => est({ objective: o }).lowAmount);
    for (let i = 1; i < lows.length; i++) {
      expect(lows[i], `${order[i - 1]} < ${order[i]}`).toBeGreaterThan(lows[i - 1]);
    }
  });

  it("has explicit rates for repair_damage and unsure (no silent fallback)", () => {
    const repair = est({ objective: "repair_damage" });
    const remodel = est({ objective: "remodel_same_layout" });
    const unsure = est({ objective: "unsure" });
    expect(repair.lowAmount).toBeLessThan(remodel.lowAmount);
    expect(unsure.lowAmount).toBe(remodel.lowAmount);
  });

  it("orders bathroom types by factor", () => {
    const powder = est({ bathroomType: "powder", includeShowerWork: true });
    const guest = est({ bathroomType: "guest" });
    const primary = est({ bathroomType: "primary" });
    expect(powder.lowAmount).toBeLessThan(guest.lowAmount * 0.75);
    expect(primary.lowAmount).toBeGreaterThan(guest.lowAmount);
  });

  it("orders finish tiers", () => {
    const entry = est({ finishTier: "entry" });
    const standard = est({ finishTier: "standard" });
    const premium = est({ finishTier: "premium" });
    const luxury = est({ finishTier: "luxury" });
    expect(entry.lowAmount).toBeLessThan(standard.lowAmount);
    expect(standard.lowAmount).toBeLessThan(premium.lowAmount);
    expect(premium.lowAmount).toBeLessThan(luxury.lowAmount);
  });

  it("scales with floor area", () => {
    const small = est({ floorAreaSqft: 30 });
    const large = est({ floorAreaSqft: 96 });
    expect(large.lowAmount).toBeGreaterThan(small.lowAmount * 1.5);
  });
});

describe("shower-scope awareness (via planner answer derivation)", () => {
  const showerCats = ["shower_or_tub", "glass_enclosure", "waterproofing"];

  it("powder rooms are never charged shower/tub, enclosure, or waterproofing", () => {
    const inputs = deriveEstimateInputs({
      bathroomType: "powder",
      projectObjective: "remodel_same_layout",
      zip: "20850",
      permit_electrical_wiring_changing: "No",
      permit_lighting_added_relocated: "No",
    });
    const r = generateEstimate(inputs);
    const cats = r.lineItems.map((li) => li.category);
    for (const c of showerCats) expect(cats).not.toContain(c);
  });

  it("retained existing tub skips the shower/tub assembly", () => {
    const inputs = deriveEstimateInputs({
      bathroomType: "guest",
      projectObjective: "cosmetic_refresh",
      showerTub: "existing_tub_retained",
      zip: "20850",
    });
    const r = generateEstimate(inputs);
    const cats = r.lineItems.map((li) => li.category);
    for (const c of showerCats) expect(cats).not.toContain(c);
  });

  it("full baths keep shower line items by default", () => {
    const inputs = deriveEstimateInputs({
      bathroomType: "primary",
      projectObjective: "remodel_same_layout",
      zip: "20850",
    });
    const r = generateEstimate(inputs);
    const cats = r.lineItems.map((li) => li.category);
    for (const c of showerCats) expect(cats).toContain(c);
  });

  it("explicit 'No' to electrical questions yields zero modifications", () => {
    const inputs = deriveEstimateInputs({
      bathroomType: "guest",
      zip: "20850",
      permit_electrical_wiring_changing: "No",
      permit_lighting_added_relocated: "No",
    });
    expect(inputs.electricalModifications).toBe(0);
  });
});
