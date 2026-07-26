import { describe, it, expect } from "vitest";
import { sanitizeAdvisorOutput, isOutOfScope } from "@/lib/bathroom/advisor-prompt";

describe("advisor guardrails", () => {
  it("detects and replaces numeric price claims", () => {
    const { text, violations } = sanitizeAdvisorOutput(
      "A typical remodel costs about $15,000 to $30,000.",
    );
    expect(violations).toContain("numeric price claim");
    expect(text).not.toContain("$15,000");
    expect(text).toContain("planning range");
  });

  it("detects dollar-per-square-foot claims", () => {
    const { violations } = sanitizeAdvisorOutput("Tile runs $8 per sq ft.");
    expect(violations).toContain("numeric price claim");
  });

  it("detects dimension claims", () => {
    const { text, violations } = sanitizeAdvisorOutput(
      "Your bathroom is 8 feet x 5 feet based on what you said.",
    );
    expect(violations).toContain("specific dimension claim");
    expect(text).toContain("measurements");
  });

  it("detects permit determinations", () => {
    const { text, violations } = sanitizeAdvisorOutput(
      "You don't need a permit for a simple refresh.",
    );
    expect(violations).toContain("permit determination");
    expect(text).toContain("permit navigator");
  });

  it("passes through clean advice without violations", () => {
    const clean = "Cost depends on bathroom size and scope. Run the planner for a localized Rockville planning range.";
    const { text, violations } = sanitizeAdvisorOutput(clean);
    expect(violations).toHaveLength(0);
    expect(text).toBe(clean);
  });

  it("flags out-of-scope emergency plumbing", () => {
    expect(isOutOfScope("I have an active leak under the sink")).toBe(true);
    expect(isOutOfScope("I think there's black mold behind the shower")).toBe(true);
    expect(isOutOfScope("I smell gas near the water heater")).toBe(true);
  });

  it("does not flag normal bathroom questions", () => {
    expect(isOutOfScope("Should I get a curbless shower?")).toBe(false);
    expect(isOutOfScope("What tile do you recommend?")).toBe(false);
  });
});
