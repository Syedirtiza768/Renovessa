/**
 * Planner step sequence and branching rules (PRD §7.3, §9.1).
 * Pure data + functions; no React, no DB.
 */

export type PlannerStepId =
  | "location"
  | "bathroom_type"
  | "existing_bathroom"
  | "measurements"
  | "existing_layout"
  | "project_goals"
  | "proposed_layout"
  | "fixtures_finishes"
  | "existing_conditions"
  | "budget_timeline"
  | "estimate"
  | "budget_scenarios"
  | "permit_guidance"
  | "project_brief"
  | "contractor_request";

export interface PlannerStep {
  id: PlannerStepId;
  label: string;
  shortLabel: string;
  optional?: boolean;
  /** Steps skipped when this predicate returns false based on answers so far. */
  branch?: (answers: Record<string, string>) => boolean;
}

export const PLANNER_STEPS: PlannerStep[] = [
  { id: "location", label: "Property and project location", shortLabel: "Location" },
  { id: "bathroom_type", label: "Bathroom type", shortLabel: "Bathroom" },
  { id: "existing_bathroom", label: "Existing bathroom", shortLabel: "Existing" },
  { id: "measurements", label: "Measurements", shortLabel: "Measure" },
  {
    id: "existing_layout",
    label: "Existing layout",
    shortLabel: "Layout",
    branch: (a) => a.measurement_method !== "simple" || a.has_diagram === "yes",
  },
  { id: "project_goals", label: "Project goals", shortLabel: "Goals" },
  {
    id: "proposed_layout",
    label: "Proposed layout",
    shortLabel: "Proposed",
    branch: (a) => ["layout_redesign", "full_gut", "tub_to_shower", "walk_in_shower", "curbless_shower", "accessibility_upgrade", "add_bathroom"].includes(a.project_objective || ""),
  },
  { id: "fixtures_finishes", label: "Fixtures and finishes", shortLabel: "Finishes" },
  { id: "existing_conditions", label: "Existing-condition risks", shortLabel: "Conditions" },
  { id: "budget_timeline", label: "Budget and timeline", shortLabel: "Budget" },
  { id: "estimate", label: "Estimate", shortLabel: "Estimate" },
  { id: "budget_scenarios", label: "Budget scenarios", shortLabel: "Scenarios" },
  { id: "permit_guidance", label: "Permit guidance", shortLabel: "Permits" },
  { id: "project_brief", label: "Project brief", shortLabel: "Brief" },
  { id: "contractor_request", label: "Contractor request", shortLabel: "Contractors" },
];

const STEP_INDEX: Record<PlannerStepId, number> = Object.fromEntries(
  PLANNER_STEPS.map((s, i) => [s.id, i]),
) as Record<PlannerStepId, number>;

/** Returns the ordered list of steps that apply given current answers. */
export function activeSteps(answers: Record<string, string>): PlannerStep[] {
  return PLANNER_STEPS.filter((step) => !step.branch || step.branch(answers));
}

/** Returns the next step after the given one, respecting branching. */
export function nextStep(current: PlannerStepId, answers: Record<string, string>): PlannerStep | null {
  const active = activeSteps(answers);
  const idx = active.findIndex((s) => s.id === current);
  if (idx < 0 || idx + 1 >= active.length) return null;
  return active[idx + 1];
}

/** Returns the previous step before the given one, respecting branching. */
export function previousStep(current: PlannerStepId, answers: Record<string, string>): PlannerStep | null {
  const active = activeSteps(answers);
  const idx = active.findIndex((s) => s.id === current);
  if (idx <= 0) return null;
  return active[idx - 1];
}

/** Completion percentage based on filled answers across active steps. */
export function completionPercentage(answers: Record<string, string>, current: PlannerStepId): number {
  const active = activeSteps(answers);
  const idx = active.findIndex((s) => s.id === current);
  if (idx < 0) return 0;
  return Math.round(((idx + 1) / active.length) * 100);
}

export function stepById(id: PlannerStepId): PlannerStep | undefined {
  return PLANNER_STEPS[STEP_INDEX[id]];
}
