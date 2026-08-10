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

  // Single-fixture swaps: explicit fixtureType wins; otherwise infer from the
  // vanity selection (a vanity cabinet swap vs. a basin/pedestal swap).
  const fixtureType =
    answers.fixtureType ||
    (["stock_vanity", "semi_custom_vanity", "custom_vanity", "floating_vanity"].includes(answers.vanity ?? "")
      ? "vanity_cabinet"
      : "sink_basin");

  // Powder rooms have no shower/tub by definition; a retained tub means no
  // shower/tub assembly, enclosure, or waterproofing is purchased.
  const includeShowerWork =
    (answers.bathroomType ?? "guest") !== "powder" &&
    answers.showerTub !== "existing_tub_retained";

  // Electrical: charge modifications only when the homeowner reports changes;
  // an explicit "No" to both means zero, an unanswered question stays at 1.
  const elecChanged =
    answers.permit_electrical_wiring_changing === "Yes" ||
    answers.permit_lighting_added_relocated === "Yes";
  const elecExplicitNo =
    answers.permit_electrical_wiring_changing === "No" &&
    answers.permit_lighting_added_relocated === "No";
  const electricalModifications = elecChanged ? 2 : elecExplicitNo ? 0 : 1;

  return {
    objective: answers.projectObjective ?? "remodel_same_layout",
    bathroomType: answers.bathroomType ?? "guest",
    finishTier: answers.fixtureTier ?? "standard",
    floorAreaSqft: floorArea,
    plumbingRelocationFt: permitFixturesMoving ? 6 : 0,
    electricalModifications,
    tileFullHeightRoom,
    curblessShower,
    condoHighFloor,
    homeAgeYears,
    waterDamageReported,
    locationId,
    fixtureType,
    includeShowerWork,
  };
}
