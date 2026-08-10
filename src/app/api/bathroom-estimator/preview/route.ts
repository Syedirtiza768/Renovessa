import { NextResponse } from "next/server";
import { z } from "zod";
import { bathroomEstimatorEnabled } from "@/lib/feature-flags";
import { DEFAULT_ESTIMATOR_CONFIG } from "@/lib/bathroom/config";
import { generateEstimate } from "@/lib/bathroom/estimator";
import { generateBudgetScenarios } from "@/lib/bathroom/budget-scenarios";
import { scoreConfidence, type ConfidenceInput } from "@/lib/bathroom/confidence";
import { deriveEstimateInputs } from "@/lib/bathroom/estimate-input-derivation";
import { normalizeAnswers, resolveLocationId, hasLocation } from "@/lib/bathroom/answer-normalization";

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

  const a = normalizeAnswers(parsed.data.answers);
  const conditions = (a.conditions ?? "").split(",").filter(Boolean);
  const accessibility = (a.accessibilityFeatures ?? "").split(",").filter(Boolean);
  const waterDamageReported = conditions.some((c) =>
    ["active_leak", "water_stains", "soft_flooring", "past_leak"].includes(c),
  );

  // If no location is provided, do not show a localized estimate.
  if (!hasLocation(a)) {
    return NextResponse.json({
      low: 0,
      mid: 0,
      high: 0,
      confidence: {
        level: "LOW",
        reasons: ["Location is required for a localized planning range"],
        suggestions: ["Enter your ZIP code to see a localized estimate"],
      },
      lineItems: [],
      costDrivers: [],
      assumptions: ["Add your project location to receive a planning range."],
      exclusions: [],
      scenarios: [],
      locationMissing: true,
    });
  }

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

  const inputs = deriveEstimateInputs(a);
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
    unknowns: estimate.unknowns,
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
    locationId: resolveLocationId(a),
  });
}
