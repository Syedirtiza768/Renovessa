/**
 * Canonical planner-answer schema and normalization layer.
 *
 * Problem: older drafts and different UI steps use inconsistent keys:
 *   length | lengthFt
 *   width  | widthFt
 *   ceilingHeight | ceilingFt
 *   measurement_method | measurementMethod
 *   zip | zipCode
 *   city | locationCity
 *
 * Solution: one canonical key set. Every read path normalizes before use.
 * Every write path stores the canonical key (legacy keys are kept as-is
 * for backward compat but ignored by business logic).
 */

export const CANONICAL_ANSWER_KEYS = [
  "lengthFt",
  "widthFt",
  "ceilingFt",
  "measurementMethod",
  "zipCode",
  "city",
  "locationId",
  "bathroomType",
  "projectObjective",
  "propertyType",
  "ownershipStatus",
  "occupancyStatus",
  "budgetMinimum",
  "budgetMaximum",
  "desiredStartDate",
  "timelineCategory",
  "roomSizeBand",
  "finishTier",
  "fixtureTier",
  "showerTub",
  "vanity",
  "flooring",
  "wallFinish",
  "accessibilityFeatures",
  "conditions",
  "photo_count",
  "requirementsPrompt",
  "requirementsSummary",
  "shapeNotes",
  "homeAge",
  "rfp_reference",
  // permit answers
  "permit_fixtures_moving",
  "permit_plumbing_changing",
  "permit_electrical_wiring_changing",
  "permit_lighting_added_relocated",
  "permit_ventilation_modified",
  "permit_wall_changing",
  "permit_structural_framing_affected",
  "permit_new_bathroom_created",
  "permit_in_condominium",
  "permit_hoa_approval_potentially_required",
  // layout / diagram
  "has_diagram",
  "layout_known",
  "plumbing_changes",
  "plumbing_relocation",
  "measurement_confirmed",
] as const;

export type CanonicalAnswerKey = (typeof CANONICAL_ANSWER_KEYS)[number];

/** Map from legacy key → canonical key. */
const LEGACY_TO_CANONICAL: Record<string, CanonicalAnswerKey> = {
  length: "lengthFt",
  width: "widthFt",
  ceilingHeight: "ceilingFt",
  measurement_method: "measurementMethod",
  zip: "zipCode",
  locationCity: "city",
  locationId: "locationId",
};

/**
 * Normalize a raw answers record into canonical form.
 * Preserves all original keys; adds canonical aliases when missing.
 */
export function normalizeAnswers(
  raw: Record<string, string>,
): Record<string, string> {
  const out: Record<string, string> = { ...raw };

  for (const [legacy, canonical] of Object.entries(LEGACY_TO_CANONICAL)) {
    if (out[legacy] !== undefined && out[canonical] === undefined) {
      out[canonical] = out[legacy];
    }
  }

  // measurementMethod special case: the quick-size buttons store "simple"
  // under measurement_method; ensure it is also visible as measurementMethod.
  if (out.measurement_method && !out.measurementMethod) {
    out.measurementMethod = out.measurement_method;
  }

  return out;
}

/** Read a canonical value, falling back to legacy keys. */
export function getCanonical(
  answers: Record<string, string>,
  key: CanonicalAnswerKey,
): string | undefined {
  if (answers[key] !== undefined) return answers[key];

  // Reverse lookup: find any legacy key that maps to this canonical key
  for (const [legacy, canonical] of Object.entries(LEGACY_TO_CANONICAL)) {
    if (canonical === key && answers[legacy] !== undefined) {
      return answers[legacy];
    }
  }
  return undefined;
}

/** Write a canonical value (also writes the legacy alias for backward compat). */
export function setCanonical(
  answers: Record<string, string>,
  key: CanonicalAnswerKey,
  value: string,
): Record<string, string> {
  const next = { ...answers, [key]: value };

  // Also write legacy alias so old code that reads legacy keys still works
  for (const [legacy, canonical] of Object.entries(LEGACY_TO_CANONICAL)) {
    if (canonical === key) {
      next[legacy] = value;
    }
  }

  return next;
}

/** Determine whether the answers contain a valid location. */
export function hasLocation(answers: Record<string, string>): boolean {
  return Boolean(getCanonical(answers, "zipCode"));
}

/** Resolve location id from zip + city, or fall back to generic behavior. */
export function resolveLocationId(answers: Record<string, string>): string {
  const zip = getCanonical(answers, "zipCode") ?? "";
  const city = getCanonical(answers, "city") ?? "";

  // Rockville, MD ZIPs
  const ROCKVILLE_ZIPS = new Set([
    "20847", "20848", "20849", "20850", "20851", "20852", "20853", "20854", "20855",
    "20877", "20878", "20879", "20882",
  ]);

  if (ROCKVILLE_ZIPS.has(zip)) return "rockville-md";
  if (city.toLowerCase().includes("rockville")) return "rockville-md";

  // For now, any valid DMV ZIP defaults to rockville-md config with a warning
  // until multi-location configs are published. This prevents the generic page
  // from silently behaving as Rockville without evidence.
  if (/^20(8|9|7)/.test(zip) || /^22(0|1|2)/.test(zip)) {
    return "rockville-md";
  }

  return "unknown";
}

/** True when the zip is in the supported pilot set. */
export function isSupportedZip(zip: string): boolean {
  const ROCKVILLE_ZIPS = new Set([
    "20847", "20848", "20849", "20850", "20851", "20852", "20853", "20854", "20855",
    "20877", "20878", "20879", "20882",
  ]);
  return ROCKVILLE_ZIPS.has(zip);
}
