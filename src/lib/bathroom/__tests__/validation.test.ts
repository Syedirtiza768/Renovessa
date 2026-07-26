import { describe, it, expect } from "vitest";
import { validateLayout, summarizeValidation } from "@/lib/bathroom/validation";
import { buildExistingTemplate, buildProposedFromExisting } from "@/lib/bathroom/layout-templates";

describe("validateLayout (top-left coordinates)", () => {
  it("accepts a standard template without errors or overlap warnings", () => {
    const geo = buildExistingTemplate({ bathroomType: "guest", roomSizeBand: "medium" });
    const issues = validateLayout(geo);
    expect(issues.filter((i) => i.severity === "error")).toHaveLength(0);
    expect(issues.filter((i) => i.rule === "fixture_overlap")).toHaveLength(0);
    expect(issues.filter((i) => i.rule === "fixture_outside_boundary")).toHaveLength(0);
    expect(summarizeValidation(issues).blocking).toBe(false);
  });

  it("accepts powder and small templates", () => {
    for (const band of ["powder", "small", "large"] as const) {
      const type = band === "powder" ? "powder" : "guest";
      const issues = validateLayout(buildExistingTemplate({ bathroomType: type, roomSizeBand: band }));
      expect(issues.filter((i) => i.severity === "error"), band).toHaveLength(0);
      expect(issues.filter((i) => i.rule === "fixture_overlap"), band).toHaveLength(0);
    }
  });

  it("does not warn about fixtures sitting on walls (false narrow circulation)", () => {
    const issues = validateLayout(
      buildExistingTemplate({ bathroomType: "guest", roomSizeBand: "small" }),
    );
    expect(issues.filter((i) => i.rule === "narrow_circulation")).toHaveLength(0);
  });

  it("treats fixture overlap as a soft warning, not blocking", () => {
    const issues = validateLayout({
      walls: [
        { x1: 0, y1: 0, x2: 96, y2: 0 },
        { x1: 96, y1: 0, x2: 96, y2: 60 },
        { x1: 96, y1: 60, x2: 0, y2: 60 },
        { x1: 0, y1: 60, x2: 0, y2: 0 },
      ],
      fixtures: [
        { type: "toilet", x: 10, y: 10, w: 30, d: 20 },
        { type: "vanity", x: 20, y: 15, w: 36, d: 22 },
      ],
      ceilingHeight: 96,
    });
    const overlap = issues.find((i) => i.rule === "fixture_overlap");
    expect(overlap?.severity).toBe("warning");
    expect(summarizeValidation(issues).blocking).toBe(false);
  });

  it("proposed tub-to-shower stays non-blocking", () => {
    const existing = buildExistingTemplate({ bathroomType: "guest", roomSizeBand: "medium" });
    const proposed = buildProposedFromExisting(existing, { projectObjective: "tub_to_shower" });
    const issues = validateLayout(proposed);
    expect(summarizeValidation(issues).blocking).toBe(false);
    expect(issues.filter((i) => i.rule === "fixture_overlap")).toHaveLength(0);
  });
});
