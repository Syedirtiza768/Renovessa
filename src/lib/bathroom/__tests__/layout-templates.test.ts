import { describe, it, expect } from "vitest";
import {
  buildExistingTemplate,
  buildProposedFromExisting,
  hasBasicsFilled,
  hasScopeFilled,
  hasSizeFilled,
  needsProposedLayout,
  resolveRoomFeet,
} from "@/lib/bathroom/layout-templates";

describe("layout-templates", () => {
  it("resolves room feet from size band", () => {
    expect(resolveRoomFeet({ roomSizeBand: "small" })).toEqual({
      lengthFt: 8,
      widthFt: 5,
      ceilingFt: 8,
    });
  });

  it("builds a powder template without a tub", () => {
    const g = buildExistingTemplate({ bathroomType: "powder", roomSizeBand: "powder" });
    expect(g.fixtures.some((f) => f.type === "toilet")).toBe(true);
    expect(g.fixtures.some((f) => f.type === "tub")).toBe(false);
    expect(g.walls).toHaveLength(4);
  });

  it("builds guest template with tub + vanity + toilet", () => {
    const g = buildExistingTemplate({ bathroomType: "guest", roomSizeBand: "small" });
    expect(g.fixtures.some((f) => f.type === "tub")).toBe(true);
    expect(g.fixtures.some((f) => f.type === "vanity")).toBe(true);
    expect(g.fixtures.some((f) => f.type === "toilet")).toBe(true);
  });

  it("converts tub to shower for tub_to_shower objective", () => {
    const existing = buildExistingTemplate({ bathroomType: "guest", roomSizeBand: "medium" });
    const proposed = buildProposedFromExisting(existing, { projectObjective: "tub_to_shower" });
    expect(proposed.fixtures.some((f) => f.type === "tub")).toBe(false);
    expect(
      proposed.fixtures.some((f) => f.type === "shower" || f.type === "shower_enclosure"),
    ).toBe(true);
  });

  it("flags redesign objectives as needing proposed layout", () => {
    expect(needsProposedLayout({ projectObjective: "cosmetic_refresh" })).toBe(false);
    expect(needsProposedLayout({ projectObjective: "tub_to_shower" })).toBe(true);
  });

  it("detects filled basics/scope/size for quick path", () => {
    expect(hasBasicsFilled({ bathroomType: "primary", propertyType: "condo" })).toBe(true);
    expect(hasSizeFilled({ roomSizeBand: "medium" })).toBe(true);
    expect(hasScopeFilled({ projectObjective: "remodel_same_layout" })).toBe(true);
  });
});
