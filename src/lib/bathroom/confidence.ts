/**
 * Confidence scoring (PRD §17.6).
 * Pure function: input completeness -> High/Medium/Low.
 */

import { getCanonical } from "./answer-normalization";

export type ConfidenceInput = {
  hasExactMeasurements: boolean;
  hasCompleteDiagram: boolean;
  hasMultiplePhotos: boolean;
  finishTierSelected: boolean;
  plumbingChangesKnown: boolean;
  conditionQuestionnaireComplete: boolean;
  unknownLayout: boolean;
  possibleHiddenDamage: boolean;
  majorStructuralOrPlumbingUncertainty: boolean;
};

export type ConfidenceResult = {
  level: "HIGH" | "MEDIUM" | "LOW";
  reasons: string[];
  improvements: string[];
};

export function scoreConfidence(input: ConfidenceInput): ConfidenceResult {
  const reasons: string[] = [];
  const improvements: string[] = [];

  // Hard LOW conditions
  if (input.majorStructuralOrPlumbingUncertainty) {
    reasons.push("Major structural or plumbing uncertainty present");
  }
  if (input.unknownLayout) {
    reasons.push("Layout is unknown");
  }
  if (input.possibleHiddenDamage) {
    reasons.push("Possible hidden damage reported");
    improvements.push("Request a professional inspection before final pricing");
  }

  if (input.majorStructuralOrPlumbingUncertainty || input.unknownLayout || input.possibleHiddenDamage) {
    return { level: "LOW", reasons, improvements };
  }

  // HIGH conditions
  const highSignals = [
    input.hasExactMeasurements,
    input.hasCompleteDiagram,
    input.hasMultiplePhotos,
    input.finishTierSelected,
    input.plumbingChangesKnown,
    input.conditionQuestionnaireComplete,
  ];
  const highCount = highSignals.filter(Boolean).length;

  if (highCount >= 5) {
    if (!input.hasExactMeasurements) improvements.push("Provide exact wall measurements to maximize confidence");
    if (!input.hasCompleteDiagram) improvements.push("Complete the diagram to maximize confidence");
    if (!input.hasMultiplePhotos) improvements.push("Upload additional photos to maximize confidence");
    return {
      level: "HIGH",
      reasons: ["Complete measurements, diagram, photos, and selections"],
      improvements,
    };
  }

  // MEDIUM
  if (!input.hasExactMeasurements) improvements.push("Provide exact measurements instead of estimates");
  if (!input.hasCompleteDiagram) improvements.push("Complete the proposed layout diagram");
  if (!input.hasMultiplePhotos) improvements.push("Upload photos of each wall and the ceiling above the shower");
  if (!input.finishTierSelected) improvements.push("Select a finish tier");
  if (!input.plumbingChangesKnown) improvements.push("Confirm whether plumbing will be relocated");
  if (!input.conditionQuestionnaireComplete) improvements.push("Complete the existing-condition questionnaire");

  return {
    level: "MEDIUM",
    reasons: ["Some inputs are approximate or incomplete"],
    improvements,
  };
}

/** Derive confidence inputs from a bathroom project's structured answers. */
export function deriveConfidenceInput(answers: Record<string, string>): ConfidenceInput {
  const measurementMethod = getCanonical(answers, "measurementMethod") ?? "";
  const measurementConfirmed = getCanonical(answers, "measurement_confirmed") ?? "";
  return {
    hasExactMeasurements: measurementMethod === "guided" || measurementConfirmed === "true",
    hasCompleteDiagram: answers.has_diagram === "yes",
    hasMultiplePhotos: Number(answers.photo_count || "0") >= 3,
    finishTierSelected: Boolean(answers.finish_tier || answers.fixtureTier),
    plumbingChangesKnown: answers.plumbing_changes === "known" || answers.plumbing_relocation === "none",
    conditionQuestionnaireComplete: answers.condition_questionnaire === "complete",
    unknownLayout: answers.layout_known === "no",
    possibleHiddenDamage: ["active_leak", "water_stains", "soft_flooring", "past_leak"].some(
      (k) => answers[`condition_${k}`] === "yes",
    ),
    majorStructuralOrPlumbingUncertainty: answers.structural_concern === "yes" || answers.plumbing_relocation === "unknown",
  };
}
