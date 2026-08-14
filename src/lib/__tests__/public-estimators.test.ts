import { describe, expect, it } from "vitest";
import { calculateBallpark } from "@/lib/estimate-pricing";
import { getTradeWizard } from "@/lib/estimate-wizard-data";
import { LANDING_CATEGORIES } from "@/lib/landing-data";

describe("public estimator catalog", () => {
  it("contains exactly the requested ten website trades", () => {
    expect(LANDING_CATEGORIES.map((category) => category.id)).toEqual([
      "bathroom",
      "solar",
      "kitchen",
      "roofing",
      "siding",
      "windows",
      "flooring",
      "hvac",
      "electrical",
      "plumbing",
    ]);
  });

  it("has a working Siding scope and planning-range branch", () => {
    const wizard = getTradeWizard("siding");
    expect(wizard?.questions.map((question) => question.id)).toEqual([
      "job_type",
      "sqft",
      "material",
      "stories",
      "remove_old",
      "quality",
    ]);

    const estimate = calculateBallpark("siding", {
      job_type: "replace",
      sqft: "2000",
      material: "fiber_cement",
      stories: "2",
      remove_old: "yes",
      quality: "standard",
    });
    expect(estimate.low).toBeGreaterThan(0);
    expect(estimate.high).toBeGreaterThan(estimate.low);
    expect(estimate.summary).toBe("Full siding replacement");
  });
});
