import type { LandingCategoryId } from "@/lib/landing-data";
import { estimateClaimRecord } from "@/lib/estimate-substantiation";

export type EstimateAnswers = Record<string, string>;

export type BallparkEstimate = {
  low: number;
  high: number;
  mid: number;
  confidence: "solid" | "rough" | "wide";
  summary: string;
  drivers: string[];
  disclaimer: string;
  claimId: string;
  modelVersion: string;
  substantiationStatus: "INTERNAL_BASELINE_PENDING_REVIEW" | "APPROVED";
  publicationApproved: boolean;
};

type CalculatedRange = Omit<BallparkEstimate, "claimId" | "modelVersion" | "substantiationStatus" | "publicationApproved">;

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function roundTo(n: number, step: number) {
  return Math.round(n / step) * step;
}

function range(low: number, high: number, drivers: string[], summary: string, confidence: BallparkEstimate["confidence"] = "rough"): CalculatedRange {
  const l = roundTo(low, low >= 5000 ? 500 : 50);
  const h = roundTo(high, high >= 5000 ? 500 : 50);
  return {
    low: l,
    high: h,
    mid: roundTo((l + h) / 2, h >= 5000 ? 250 : 25),
    confidence,
    summary,
    drivers,
    disclaimer:
      "Ballpark for DMV labor + typical materials. Final price depends on site conditions, permits, material choices, and contractor bids. Not a binding quote.",
  };
}

function mul(baseLow: number, baseHigh: number, factor: number) {
  return { low: baseLow * factor, high: baseHigh * factor };
}

/** DMV-oriented ballpark engine driven by wizard answers. */
function calculateRange(trade: LandingCategoryId, answers: EstimateAnswers): CalculatedRange {
  const drivers: string[] = [];
  const quality = answers.finish_level || answers.quality || "standard";
  const urgency = answers.urgency || "";

  let qualityFactor = 1;
  if (quality === "budget" || quality === "basic") qualityFactor = 0.82;
  if (quality === "premium" || quality === "high-end") qualityFactor = 1.35;
  if (quality === "luxury") qualityFactor = 1.7;

  let urgencyFactor = 1;
  if (urgency === "As soon as possible" || urgency === "emergency") {
    urgencyFactor = 1.12;
    drivers.push("Urgent timing can raise labor availability premiums");
  }

  switch (trade) {
    case "hvac": {
      const job = answers.job_type || "repair";
      const size = answers.home_size || "medium";
      const age = answers.system_age || "unknown";
      const sizeFactor = size === "small" ? 0.85 : size === "large" ? 1.25 : size === "xlarge" ? 1.45 : 1;
      if (age === "15+") drivers.push("Older equipment often needs parts that are harder to source");

      if (job === "repair") {
        const { low, high } = mul(175, 750, sizeFactor * urgencyFactor);
        drivers.push("Diagnostic + common repair parts");
        return range(low, high, drivers, "Typical HVAC repair / service call in the DMV", "solid");
      }
      if (job === "tuneup") {
        return range(120, 280, drivers, "Seasonal tune-up / maintenance visit", "solid");
      }
      if (job === "ac_replace") {
        const { low, high } = mul(4500, 11000, sizeFactor * qualityFactor * urgencyFactor);
        drivers.push("SEER rating and tonnage drive most of the spread");
        return range(low, high, drivers, "Central AC replacement (condenser + coil, typical)", "rough");
      }
      if (job === "furnace_replace") {
        const { low, high } = mul(3500, 8500, sizeFactor * qualityFactor);
        return range(low, high, drivers, "Furnace replacement, typical DMV install", "rough");
      }
      // full system
      const { low, high } = mul(8000, 17500, sizeFactor * qualityFactor * urgencyFactor);
      drivers.push("Full system = furnace/air handler + condenser + labor");
      return range(low, high, drivers, "Full HVAC system replacement", "rough");
    }

    case "roofing": {
      const job = answers.job_type || "repair";
      const squares = Number(answers.roof_squares || "20");
      const pitch = answers.pitch || "moderate";
      const material = answers.material || "asphalt";
      const stories = answers.stories || "1";

      let matFactor = 1;
      if (material === "architectural") matFactor = 1.1;
      if (material === "metal") matFactor = 1.85;
      if (material === "slate") matFactor = 2.6;
      if (material === "cedar") matFactor = 1.9;

      let pitchFactor = pitch === "steep" ? 1.25 : pitch === "low" ? 0.95 : 1;
      let storyFactor = stories === "2" ? 1.1 : stories === "3+" ? 1.2 : 1;

      if (job === "repair" || job === "leak") {
        const { low, high } = mul(350, 2200, urgencyFactor * pitchFactor);
        drivers.push("Leak repairs vary widely once decking is opened");
        return range(low, high, drivers, "Roof repair / leak fix", "wide");
      }
      if (job === "gutters") {
        return range(800, 3500, drivers, "Gutter replacement (typical single-family)", "rough");
      }
      // full replace — ~$350–$550/sq asphalt DMV baseline before factors
      const perSqLow = 375 * matFactor * pitchFactor * storyFactor * qualityFactor;
      const perSqHigh = 575 * matFactor * pitchFactor * storyFactor * qualityFactor;
      const sq = clamp(squares, 8, 60);
      drivers.push(`~${sq} squares estimated`);
      drivers.push(`${material} material tier`);
      return range(perSqLow * sq, perSqHigh * sq, drivers, "Full roof replacement ballpark", "rough");
    }

    case "kitchen": {
      const scope = answers.scope || "refresh";
      const size = answers.kitchen_size || "medium";
      const sizeFactor = size === "galley" ? 0.75 : size === "large" ? 1.3 : size === "open" ? 1.2 : 1;
      if (scope === "refresh") {
        const { low, high } = mul(6000, 18000, sizeFactor * qualityFactor);
        drivers.push("Cabinets refinished/refaced, counters, hardware");
        return range(low, high, drivers, "Kitchen refresh (no full gut)", "rough");
      }
      if (scope === "mid") {
        const { low, high } = mul(25000, 65000, sizeFactor * qualityFactor);
        drivers.push("New cabinets + counters + appliances allowance");
        return range(low, high, drivers, "Mid-range kitchen remodel", "rough");
      }
      const { low, high } = mul(55000, 130000, sizeFactor * qualityFactor);
      drivers.push("Full gut, layout changes, and premium finishes widen the range");
      return range(low, high, drivers, "Full kitchen renovation", "wide");
    }

    case "bathroom": {
      const scope = answers.scope || "update";
      const baths = answers.bath_type || "full";
      const bathFactor = baths === "half" ? 0.55 : baths === "master" ? 1.35 : 1;
      if (scope === "update") {
        const { low, high } = mul(5000, 14000, bathFactor * qualityFactor);
        return range(low, high, drivers, "Bathroom update (vanity, fixtures, paint/tile touch-ups)", "rough");
      }
      if (scope === "shower") {
        const { low, high } = mul(8000, 22000, bathFactor * qualityFactor);
        drivers.push("Walk-in shower conversions vary with waterproofing");
        return range(low, high, drivers, "Shower / tub remodel focus", "rough");
      }
      const { low, high } = mul(15000, 45000, bathFactor * qualityFactor);
      return range(low, high, drivers, "Full bathroom remodel", "rough");
    }

    case "basement": {
      const sqft = Number(answers.sqft || "600");
      const finish = answers.finish_level || "standard";
      const bath = answers.add_bath === "yes";
      let per = finish === "basic" ? 45 : finish === "premium" ? 95 : 70;
      const s = clamp(sqft, 200, 2500);
      let low = s * per * 0.85;
      let high = s * per * 1.25;
      if (bath) {
        low += 8000;
        high += 22000;
        drivers.push("Adding a bathroom is a major cost driver");
      }
      drivers.push(`~${s} sq ft finishing`);
      return range(low, high, drivers, "Basement finishing ballpark", "rough");
    }

    case "plumbing": {
      const job = answers.job_type || "repair";
      if (job === "clog") return range(150, 450, drivers, "Drain clog / snake / camera (typical)", "solid");
      if (job === "fixture") return range(250, 1200, drivers, "Fixture repair or replacement install", "solid");
      if (job === "water_heater") {
        const tankless = answers.heater_type === "tankless";
        return range(tankless ? 2800 : 1200, tankless ? 5500 : 2800, drivers, "Water heater replacement", "solid");
      }
      if (job === "repiping") {
        const size = answers.home_size || "medium";
        const f = size === "small" ? 0.8 : size === "large" ? 1.35 : 1;
        return range(6000 * f, 18000 * f, drivers, "Partial-to-full repiping (highly site-dependent)", "wide");
      }
      return range(200, 900, drivers, "General plumbing service call", "rough");
    }

    case "electrical": {
      const job = answers.job_type || "outlet";
      if (job === "outlet") return range(150, 600, drivers, "Outlet / switch / lighting circuit work", "solid");
      if (job === "panel") return range(2000, 5500, drivers, "Panel upgrade / replacement", "rough");
      if (job === "ev") return range(800, 2500, drivers, "EV charger circuit install (typical)", "solid");
      if (job === "rewire") {
        const size = answers.home_size || "medium";
        const f = size === "small" ? 0.8 : size === "large" ? 1.4 : 1;
        return range(8000 * f, 25000 * f, drivers, "Partial rewire / major electrical upgrade", "wide");
      }
      return range(200, 800, drivers, "General electrical service", "rough");
    }

    case "windows": {
      const count = Number(answers.window_count || "8");
      const type = answers.window_type || "double";
      const includeDoors = answers.include_doors === "yes";
      let unitLow = type === "basic" ? 450 : type === "premium" ? 900 : 650;
      let unitHigh = type === "basic" ? 750 : type === "premium" ? 1400 : 1000;
      const n = clamp(count, 1, 40);
      let low = unitLow * n * qualityFactor;
      let high = unitHigh * n * qualityFactor;
      if (includeDoors) {
        low += 2500;
        high += 7000;
        drivers.push("Entry/patio door allowance included");
      }
      drivers.push(`${n} windows`);
      return range(low, high, drivers, "Window (and optional door) replacement", "rough");
    }

    case "deck": {
      const sqft = Number(answers.sqft || "300");
      const material = answers.material || "pressure_treated";
      let per = material === "composite" ? 55 : material === "cedar" ? 45 : 30;
      if (material === "composite") drivers.push("Composite boards cost more upfront, less maintenance");
      const s = clamp(sqft, 80, 1200);
      const railing = answers.railing === "yes" ? 1.15 : 1;
      return range(s * per * 0.9 * railing, s * per * 1.3 * railing * qualityFactor, drivers, "Deck build / major rebuild", "rough");
    }

    case "flooring": {
      const sqft = Number(answers.sqft || "800");
      const material = answers.material || "lvp";
      const perMap: Record<string, [number, number]> = {
        carpet: [4, 9],
        lvp: [6, 12],
        hardwood: [10, 18],
        tile: [12, 25],
        refinish: [3, 7],
      };
      const [pLow, pHigh] = perMap[material] || perMap.lvp;
      const s = clamp(sqft, 50, 4000);
      const removal = answers.remove_old === "yes" ? 1.5 : 0;
      drivers.push(`${s} sq ft · ${material}`);
      return range(s * (pLow + removal), s * (pHigh + removal) * qualityFactor, drivers, "Flooring project ballpark (materials + install)", "rough");
    }

    case "painting": {
      const scope = answers.scope || "interior";
      const sqft = Number(answers.sqft || "1500");
      const s = clamp(sqft, 200, 6000);
      if (scope === "cabinets") return range(2500, 8000, drivers, "Cabinet painting / refinishing", "rough");
      if (scope === "exterior") {
        return range(s * 1.5, s * 4 * qualityFactor, drivers, "Exterior painting", "rough");
      }
      // interior — rooms approximated via sqft
      return range(s * 1.8, s * 4.5 * qualityFactor, drivers, "Interior painting", "rough");
    }

    case "handyman":
    default: {
      const size = answers.job_size || "medium";
      if (size === "small") return range(150, 600, drivers, "Small handyman / repair visit", "solid");
      if (size === "large") return range(1500, 6000, drivers, "Larger multi-item repair package", "wide");
      return range(400, 2000, drivers, "General repairs package", "rough");
    }
  }
}

export function calculateBallpark(trade: LandingCategoryId, answers: EstimateAnswers): BallparkEstimate {
  const estimate = calculateRange(trade, answers);
  const claim = estimateClaimRecord(trade, answers);
  return {
    ...estimate,
    claimId: claim.id,
    modelVersion: claim.modelVersion,
    substantiationStatus: claim.status,
    publicationApproved: claim.status === "APPROVED",
  };
}

export function formatMoney(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

export function estimateToBudgetRange(est: BallparkEstimate): string {
  const mid = est.mid;
  if (mid < 1000) return "Under $1,000";
  if (mid < 5000) return "$1,000-$5,000";
  if (mid < 15000) return "$5,000-$15,000";
  if (mid < 50000) return "$15,000-$50,000";
  return "$50,000+";
}

export function buildRfqDescription(
  tradeLabel: string,
  answers: EstimateAnswers,
  estimate: BallparkEstimate,
  questionLabels: Record<string, string>,
  extraNotes: string
): string {
  const lines: string[] = [
    `RFQ via Renovessa Estimate Wizard — ${tradeLabel}`,
    "",
    "Scope answers:",
  ];
  for (const [key, value] of Object.entries(answers)) {
    if (!value) continue;
    const label = questionLabels[key] || key;
    lines.push(`- ${label}: ${value}`);
  }
  lines.push("");
  lines.push(
    `Homeowner ballpark shown: ${formatMoney(estimate.low)} – ${formatMoney(estimate.high)} (mid ~${formatMoney(estimate.mid)}, ${estimate.confidence} confidence)`
  );
  lines.push(`Estimate summary: ${estimate.summary}`);
  lines.push(`Estimate evidence record: ${estimate.claimId} (${estimate.modelVersion}; ${estimate.substantiationStatus})`);
  if (estimate.drivers.length) {
    lines.push(`Cost drivers noted: ${estimate.drivers.join("; ")}`);
  }
  if (extraNotes.trim()) {
    lines.push("");
    lines.push("Homeowner notes:");
    lines.push(extraNotes.trim());
  }
  lines.push("");
  lines.push(
    "Homeowner requests contractor bids through Renovessa. Please qualify and solicit bids, then return options to the homeowner."
  );
  return lines.join("\n");
}
