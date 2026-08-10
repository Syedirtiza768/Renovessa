import type { EstimateInputs } from "./estimator";
import { normalizeAnswers, getCanonical, resolveLocationId } from "./answer-normalization";

/**
 * Derive EstimateInputs from raw planner answers (Record<string, string>).
 * Shared between the preview endpoint and the EstimateStep persistence flow.
 */
export function deriveEstimateInputs(a: Record<string, string>): EstimateInputs {
  const answers = normalizeAnswers(a);

  const lengthFt = Number(getCanonical(answers, "lengthFt") || "0");
  const widthFt = Number(getCanonical(answers, "widthFt") || "0");
  const floorArea = lengthFt && widthFt ? lengthFt * widthFt : 40;

  const homeAgeYears = answers.homeAge
    ? Math.max(0, new Date().getFullYear() - Number(answers.homeAge))
    : 30;

  const conditions = (answers.conditions ?? "").split(",").filter(Boolean);
  const accessibility = (answers.accessibilityFeatures ?? "").split(",").filter(Boolean);
  const permitFixturesMoving = answers.permit_fixtures_moving === "Yes";
  const curblessShower =
    answers.showerTub === "curbless_shower" || accessibility.includes("curbless_shower");
  const tileFullHeightRoom = answers.wallFinish === "full_height_room_tile";
  const condoHighFloor =
    answers.propertyType === "condo" ||
    answers.propertyType === "coop" ||
    answers.propertyType === "apartment";
  const waterDamageReported = conditions.some((c) =>
    ["active_leak", "water_stains", "soft_flooring", "past_leak"].includes(c),
  );

  const locationId = resolveLocationId(answers);

  return {
    objective: answers.projectObjective ?? "remodel_same_layout",
    bathroomType: answers.bathroomType ?? "guest",
    finishTier: answers.fixtureTier ?? "standard",
    floorAreaSqft: floorArea,
    plumbingRelocationFt: permitFixturesMoving ? 6 : 0,
    electricalModifications: answers.permit_lighting_added_relocated === "Yes" ? 2 : 1,
    tileFullHeightRoom,
    curblessShower,
    condoHighFloor,
    homeAgeYears,
    waterDamageReported,
    locationId,
  };
}
