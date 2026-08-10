/**
 * Temporary audit: run the estimator across the full objective × type × tier
 * matrix and print totals + scope anomalies. Run with:
 *   npx vitest run --config /dev/null  (not used) — instead: npx tsx scripts/matrix-audit.ts
 */
import { generateEstimate, type EstimateInputs } from "../src/lib/bathroom/estimator";
import { DEFAULT_ESTIMATOR_CONFIG, PROJECT_OBJECTIVES, BATHROOM_TYPES } from "../src/lib/bathroom/config";

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

const fmt = (n: number) => `$${n.toLocaleString()}`;

console.log("objective".padEnd(26), "powder".padEnd(20), "guest".padEnd(20), "shower items in powder?");
for (const o of PROJECT_OBJECTIVES) {
  const cells: string[] = [];
  let powderShower = "";
  for (const t of ["powder", "guest"] as const) {
    const r = generateEstimate({ ...base, objective: o.id, bathroomType: t, includeShowerWork: t !== "powder" });
    cells.push(`${fmt(r.lowAmount)}-${fmt(r.highComplexityAmount)}`);
    if (t === "powder") {
      const cats = r.lineItems.map((li) => li.category);
      powderShower = ["shower_or_tub", "glass_enclosure", "waterproofing"].filter((c) => cats.includes(c)).join(",") || "none";
    }
  }
  console.log(o.id.padEnd(26), cells[0].padEnd(20), cells[1].padEnd(20), powderShower);
}

// Sanity: every combo ordered low <= expectedLow <= expectedHigh <= high, no NaN
let bad = 0;
for (const o of PROJECT_OBJECTIVES) {
  for (const t of BATHROOM_TYPES) {
    for (const tier of ["entry", "standard", "premium", "luxury"]) {
      const r = generateEstimate({ ...base, objective: o.id, bathroomType: t.id, finishTier: tier });
      const ok = r.lowAmount > 0 && r.lowAmount <= r.expectedLowAmount && r.expectedLowAmount <= r.expectedHighAmount && r.expectedHighAmount <= r.highComplexityAmount && !Number.isNaN(r.lowAmount);
      if (!ok) { bad++; console.log("BAD:", o.id, t.id, tier, r.lowAmount, r.expectedLowAmount, r.expectedHighAmount, r.highComplexityAmount); }
    }
  }
}
console.log(bad === 0 ? "MATRIX OK: all combos ordered and positive" : `MATRIX BAD: ${bad} combos broken`);
