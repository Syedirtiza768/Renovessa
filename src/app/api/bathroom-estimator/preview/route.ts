import { NextResponse } from "next/server";
import { z } from "zod";
import { bathroomEstimatorEnabled } from "@/lib/feature-flags";
import { DEFAULT_ESTIMATOR_CONFIG } from "@/lib/bathroom/config";
import { generateEstimate, type EstimateInputs } from "@/lib/bathroom/estimator";
import { generateBudgetScenarios } from "@/lib/bathroom/budget-scenarios";
import { scoreConfidence, type ConfidenceInput } from "@/lib/bathroom/confidence";

export const runtime = "nodejs";

const bodySchema = z.object({
  answers: z.record(z.string()),
});

export async function POST(req: Request) {
  if (!bathroomEstimatorEnabled()) {
    return NextResponse.json({ error: "Estimator is not enabled." }, { status: 404 });
  }
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body.", issues: parsed.error.issues }, { status: 400 });
  }

  const a = parsed.data.answers;
  const floorArea =
    a.lengthFt && a.widthFt ? Number(a.lengthFt) * Number(a.widthFt) : 40;
  const homeAgeYears = a.homeAge ? Math.max(0, new Date().getFullYear() - Number(a.homeAge)) : 30;
  const conditions = (a.conditions ?? "").split(",").filter(Boolean);
  const accessibility = (a.accessibilityFeatures ?? "").split(",").filter(Boolean);
  const permitFixturesMoving = a.permit_fixtures_moving === "Yes";
  const permitPlumbingChanging = a.permit_plumbing_changing === "Yes";
  const curblessShower = a.showerTub === "curbless_shower" || accessibility.includes("curbless_shower");
  const tileFullHeightRoom = a.wallFinish === "full_height_room_tile";
  const condoHighFloor = a.propertyType === "condo" || a.propertyType === "coop" || a.propertyType === "apartment";
  const waterDamageReported = conditions.some((c) =>
    ["active_leak", "water_stains", "soft_flooring", "past_leak"].includes(c),
  );

  const confidenceInput: ConfidenceInput = {
    hasExactMeasurements: a.measurementMethod === "guided",
    hasCompleteDiagram: false,
    hasMultiplePhotos: false,
    finishTierSelected: Boolean(a.fixtureTier),
    plumbingChangesKnown: Boolean(a.permit_fixtures_moving),
    conditionQuestionnaireComplete: conditions.length > 0 || a.conditions === "",
    unknownLayout: false,
    possibleHiddenDamage: waterDamageReported,
    majorStructuralOrPlumbingUncertainty: a.permit_structural_framing_affected === "Yes" && a.permit_plumbing_changing === "Unknown",
  };
  const confidence = scoreConfidence(confidenceInput);

  const inputs: EstimateInputs = {
    objective: a.projectObjective ?? "remodel_same_layout",
    bathroomType: a.bathroomType ?? "guest",
    finishTier: a.fixtureTier ?? "standard",
    floorAreaSqft: floorArea,
    plumbingRelocationFt: permitFixturesMoving ? 6 : 0,
    electricalModifications: a.permit_lighting_added_relocated === "Yes" ? 2 : 1,
    tileFullHeightRoom,
    curblessShower,
    condoHighFloor,
    homeAgeYears,
    waterDamageReported,
    inRockville: true,
  };

  const estimate = generateEstimate(inputs, DEFAULT_ESTIMATOR_CONFIG, confidence);
  const scenarios = generateBudgetScenarios(inputs, DEFAULT_ESTIMATOR_CONFIG, confidence);

  return NextResponse.json({
    low: estimate.lowAmount,
    mid: estimate.expectedLowAmount,
    high: estimate.highComplexityAmount,
    confidence: {
      level: confidence.level,
      reasons: confidence.reasons,
      suggestions: confidence.improvements,
    },
    lineItems: estimate.lineItems.map((li) => ({
      category: li.category,
      description: li.description,
      low: li.lowAmount,
      mid: Math.round((li.lowAmount + li.highAmount) / 2),
      high: li.highAmount,
    })),
    costDrivers: estimate.costDrivers,
    assumptions: estimate.assumptions,
    exclusions: estimate.exclusions,
    scenarios: scenarios.map((s) => ({
      id: s.id,
      label: s.label,
      description: s.description,
      total: s.estimate.expectedLowAmount,
      compromises: s.compromises,
      benefits: s.benefits,
      recommendedNextDecision: s.recommendedNextDecision,
    })),
  });
}
