import { describe, it, expect } from "vitest";
import { scoreConfidence, deriveConfidenceInput } from "@/lib/bathroom/confidence";

describe("confidence", () => {
  it("returns LOW when major structural uncertainty exists", () => {
    const result = scoreConfidence({
      hasExactMeasurements: true,
      hasCompleteDiagram: true,
      hasMultiplePhotos: true,
      finishTierSelected: true,
      plumbingChangesKnown: true,
      conditionQuestionnaireComplete: true,
      unknownLayout: false,
      possibleHiddenDamage: false,
      majorStructuralOrPlumbingUncertainty: true,
    });
    expect(result.level).toBe("LOW");
    expect(result.reasons).toContain("Major structural or plumbing uncertainty present");
  });

  it("returns LOW when layout is unknown", () => {
    const result = scoreConfidence({
      hasExactMeasurements: true,
      hasCompleteDiagram: true,
      hasMultiplePhotos: true,
      finishTierSelected: true,
      plumbingChangesKnown: true,
      conditionQuestionnaireComplete: true,
      unknownLayout: true,
      possibleHiddenDamage: false,
      majorStructuralOrPlumbingUncertainty: false,
    });
    expect(result.level).toBe("LOW");
  });

  it("returns LOW when possible hidden damage is reported", () => {
    const result = scoreConfidence({
      hasExactMeasurements: true,
      hasCompleteDiagram: true,
      hasMultiplePhotos: true,
      finishTierSelected: true,
      plumbingChangesKnown: true,
      conditionQuestionnaireComplete: true,
      unknownLayout: false,
      possibleHiddenDamage: true,
      majorStructuralOrPlumbingUncertainty: false,
    });
    expect(result.level).toBe("LOW");
    expect(result.improvements).toContain("Request a professional inspection before final pricing");
  });

  it("returns HIGH when at least 5 signals are true", () => {
    const result = scoreConfidence({
      hasExactMeasurements: true,
      hasCompleteDiagram: true,
      hasMultiplePhotos: true,
      finishTierSelected: true,
      plumbingChangesKnown: true,
      conditionQuestionnaireComplete: false,
      unknownLayout: false,
      possibleHiddenDamage: false,
      majorStructuralOrPlumbingUncertainty: false,
    });
    expect(result.level).toBe("HIGH");
  });

  it("returns MEDIUM when fewer than 5 signals are true", () => {
    const result = scoreConfidence({
      hasExactMeasurements: true,
      hasCompleteDiagram: false,
      hasMultiplePhotos: false,
      finishTierSelected: true,
      plumbingChangesKnown: true,
      conditionQuestionnaireComplete: false,
      unknownLayout: false,
      possibleHiddenDamage: false,
      majorStructuralOrPlumbingUncertainty: false,
    });
    expect(result.level).toBe("MEDIUM");
    expect(result.improvements.length).toBeGreaterThan(0);
  });

  it("derives confidence input from answers", () => {
    const input = deriveConfidenceInput({
      measurement_method: "guided",
      finish_tier: "standard",
      plumbing_changes: "known",
      condition_questionnaire: "complete",
      layout_known: "yes",
    });
    expect(input.hasExactMeasurements).toBe(true);
    expect(input.finishTierSelected).toBe(true);
    expect(input.plumbingChangesKnown).toBe(true);
    expect(input.conditionQuestionnaireComplete).toBe(true);
    expect(input.unknownLayout).toBe(false);
  });
});
