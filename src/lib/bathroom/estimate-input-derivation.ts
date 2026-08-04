import type { EstimateInputs } from "./estimator";

/**
 * Derive EstimateInputs from raw planner answers (Record<string, string>).
 * Shared between the preview endpoint and the EstimateStep persistence flow.
 */
export function deriveEstimateInputs(a: Record<string, string>): EstimateInputs {
  const floorArea =
    a.lengthFt && a.widthFt ? Number(a.lengthFt) * Number(a.widthFt) : 40;
  const homeAgeYears = a.homeAge
    ? Math.max(0, new Date().getFullYear() - Number(a.homeAge))
    : 30;
  const conditions = (a.conditions ?? "").split(",").filter(Boolean);
  const accessibility = (a.accessibilityFeatures ?? "").split(",").filter(Boolean);
  const permitFixturesMoving = a.permit_fixtures_moving === "Yes";
  const curblessShower =
    a.showerTub === "curbless_shower" || accessibility.includes("curbless_shower");
  const tileFullHeightRoom = a.wallFinish === "full_height_room_tile";
  const condoHighFloor =
    a.propertyType === "condo" ||
    a.propertyType === "coop" ||
    a.propertyType === "apartment";
  const waterDamageReported = conditions.some((c) =>
    ["active_leak", "water_stains", "soft_flooring", "past_leak"].includes(c),
  );

  return {
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
}
