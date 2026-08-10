/**
 * Interpret a freeform requirements prompt into structured planner answers.
 * AI never sets prices, dimensions, or permit determinations.
 */

import { z } from "zod";
import {
  BATHROOM_TYPES,
  PROJECT_OBJECTIVES,
  PROPERTY_TYPES,
  OWNERSHIP_STATUS,
  OCCUPANCY_STATUS,
  SHOWER_TUB_CHOICES,
  VANITY_CHOICES,
  FLOORING_CHOICES,
  WALL_FINISH_CHOICES,
  FIXTURE_QUALITY_TIERS,
  FIXTURE_REPLACEMENT_TYPES,
  ACCESSIBILITY_FEATURES,
  CONDITION_CONCERNS,
} from "./config";

const ids = (list: readonly { id: string }[] | readonly string[]) =>
  list.map((x) => (typeof x === "string" ? x : x.id));

export const interpretedAnswersSchema = z.object({
  bathroomType: z.string().optional(),
  projectObjective: z.string().optional(),
  propertyType: z.string().optional(),
  ownershipStatus: z.string().optional(),
  occupancyStatus: z.string().optional(),
  showerTub: z.string().optional(),
  vanity: z.string().optional(),
  flooring: z.string().optional(),
  wallFinish: z.string().optional(),
  fixtureTier: z.string().optional(),
  fixtureType: z.string().optional(),
  accessibilityFeatures: z.array(z.string()).optional(),
  conditions: z.array(z.string()).optional(),
  shapeNotes: z.string().optional(),
  requirementsSummary: z.string().optional(),
  followUpQuestions: z.array(z.string()).optional(),
  confidenceNote: z.string().optional(),
});

export type InterpretedAnswers = z.infer<typeof interpretedAnswersSchema>;

export function buildRequirementsInterpretPrompt(): string {
  return `You extract structured bathroom remodel planning answers from a homeowner's freeform description for Rockville, MD.

Return ONLY valid JSON matching this shape (omit unknown fields):
{
  "bathroomType": one of [${ids(BATHROOM_TYPES).join(", ")}],
  "projectObjective": one of [${ids(PROJECT_OBJECTIVES).join(", ")}],
  "propertyType": one of [${ids(PROPERTY_TYPES).join(", ")}],
  "ownershipStatus": one of [${ids(OWNERSHIP_STATUS).join(", ")}],
  "occupancyStatus": one of [${ids(OCCUPANCY_STATUS).join(", ")}],
  "showerTub": one of [${SHOWER_TUB_CHOICES.join(", ")}],
  "vanity": one of [${VANITY_CHOICES.join(", ")}],
  "flooring": one of [${FLOORING_CHOICES.join(", ")}],
  "wallFinish": one of [${WALL_FINISH_CHOICES.join(", ")}],
  "fixtureTier": one of [${ids(FIXTURE_QUALITY_TIERS).join(", ")}],
  "fixtureType": one of [${ids(FIXTURE_REPLACEMENT_TYPES).join(", ")}] — set only when a single fixture is being replaced (then also set "projectObjective": "fixture_replacement"),
  "accessibilityFeatures": array of [${ACCESSIBILITY_FEATURES.join(", ")}],
  "conditions": array of [${ids(CONDITION_CONCERNS).join(", ")}],
  "shapeNotes": short string of layout notes only if stated,
  "requirementsSummary": 1-2 sentence plain-language summary of what they want,
  "followUpQuestions": up to 3 short questions to clarify missing scope,
  "confidenceNote": one sentence on how complete the description is
}

HARD RULES:
- Never invent numeric prices, cost ranges, square footage, or exact dimensions.
- Never diagnose mold, asbestos, lead, or structural failure — if they mention concerns, map them to conditions flags only.
- Never decide whether a permit is required.
- Only use the allowed enum ids listed above.
- If something is unclear, omit the field and add a followUpQuestion.
- Do not wrap the JSON in markdown fences.`;
}

export function sanitizeInterpretedAnswers(raw: unknown): InterpretedAnswers {
  const parsed = interpretedAnswersSchema.safeParse(raw);
  if (!parsed.success) return {};

  const a = parsed.data;
  const allow = (val: string | undefined, allowed: string[]) =>
    val && allowed.includes(val) ? val : undefined;
  const allowMany = (vals: string[] | undefined, allowed: string[]) =>
    (vals ?? []).filter((v) => allowed.includes(v));

  return {
    bathroomType: allow(a.bathroomType, ids(BATHROOM_TYPES)),
    projectObjective: allow(a.projectObjective, ids(PROJECT_OBJECTIVES)),
    propertyType: allow(a.propertyType, ids(PROPERTY_TYPES)),
    ownershipStatus: allow(a.ownershipStatus, ids(OWNERSHIP_STATUS)),
    occupancyStatus: allow(a.occupancyStatus, ids(OCCUPANCY_STATUS)),
    showerTub: allow(a.showerTub, [...SHOWER_TUB_CHOICES]),
    vanity: allow(a.vanity, [...VANITY_CHOICES]),
    flooring: allow(a.flooring, [...FLOORING_CHOICES]),
    wallFinish: allow(a.wallFinish, [...WALL_FINISH_CHOICES]),
    fixtureTier: allow(a.fixtureTier, ids(FIXTURE_QUALITY_TIERS)),
    fixtureType: allow(a.fixtureType, ids(FIXTURE_REPLACEMENT_TYPES)),
    accessibilityFeatures: allowMany(a.accessibilityFeatures, [...ACCESSIBILITY_FEATURES]),
    conditions: allowMany(a.conditions, ids(CONDITION_CONCERNS)),
    shapeNotes: a.shapeNotes?.slice(0, 500),
    requirementsSummary: a.requirementsSummary?.slice(0, 600),
    followUpQuestions: (a.followUpQuestions ?? []).slice(0, 3).map((q) => q.slice(0, 200)),
    confidenceNote: a.confidenceNote?.slice(0, 300),
  };
}

/** Convert interpreted answers into planner answer keys (comma-joined multi-selects). */
export function interpretedToPlannerAnswers(interpreted: InterpretedAnswers): Record<string, string> {
  const out: Record<string, string> = {};
  const map: Array<[keyof InterpretedAnswers, string]> = [
    ["bathroomType", "bathroomType"],
    ["projectObjective", "projectObjective"],
    ["propertyType", "propertyType"],
    ["ownershipStatus", "ownershipStatus"],
    ["occupancyStatus", "occupancyStatus"],
    ["showerTub", "showerTub"],
    ["vanity", "vanity"],
    ["flooring", "flooring"],
    ["wallFinish", "wallFinish"],
    ["fixtureTier", "fixtureTier"],
    ["fixtureType", "fixtureType"],
    ["shapeNotes", "shapeNotes"],
    ["requirementsSummary", "requirementsSummary"],
  ];
  for (const [from, to] of map) {
    const v = interpreted[from];
    if (typeof v === "string" && v) out[to] = v;
  }
  if (interpreted.accessibilityFeatures?.length) {
    out.accessibilityFeatures = interpreted.accessibilityFeatures.join(",");
  }
  if (interpreted.conditions?.length) {
    out.conditions = interpreted.conditions.join(",");
  }
  if (interpreted.requirementsSummary) {
    out.requirementsPromptApplied = "true";
  }
  return out;
}
