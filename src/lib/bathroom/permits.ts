/**
 * Permit navigator (PRD §20). Rule-based assessment from project answers.
 * Never makes a legal determination — uses cautious wording.
 */

import { PERMIT_QUESTIONS } from "./config";
import type { PermitLikelihood } from "@prisma/client";

export interface PermitAnswers {
  fixtures_moving?: boolean;
  plumbing_changing?: boolean;
  electrical_wiring_changing?: boolean;
  lighting_added_relocated?: boolean;
  ventilation_modified?: boolean;
  wall_changing?: boolean;
  structural_framing_affected?: boolean;
  new_bathroom_created?: boolean;
  in_condominium?: boolean;
  hoa_approval_potentially_required?: boolean;
}

export interface PermitAssessmentResult {
  jurisdiction: string;
  buildingPermitLikelihood: PermitLikelihood;
  plumbingPermitLikelihood: PermitLikelihood;
  electricalPermitLikelihood: PermitLikelihood;
  mechanicalPermitLikelihood: PermitLikelihood;
  hoaReviewLikelihood: PermitLikelihood;
  reviewRequired: boolean;
  assumptions: string[];
  questionsForContractor: string[];
  sourceVersion: string;
}

const LIKELY: PermitLikelihood = "LIKELY_REQUIRED";
const MAYBE: PermitLikelihood = "MAY_BE_REQUIRED";
const CONTRACTOR: PermitLikelihood = "CONTRACTOR_VERIFICATION_NEEDED";
const JURISDICTION: PermitLikelihood = "JURISDICTION_REVIEW_NEEDED";
const UNLIKELY: PermitLikelihood = "UNLIKELY";

export function assessPermits(answers: PermitAnswers, jurisdiction = "Rockville, MD / Montgomery County"): PermitAssessmentResult {
  const a = answers;
  const assumptions: string[] = [];
  const questionsForContractor: string[] = [];

  // Building permit
  let building: PermitLikelihood = UNLIKELY;
  if (a.new_bathroom_created) {
    building = LIKELY;
    assumptions.push("New bathroom creation typically requires a building permit.");
  } else if (a.structural_framing_affected) {
    building = LIKELY;
    assumptions.push("Structural framing work typically requires a building permit and may require engineering.");
  } else if (a.wall_changing) {
    building = MAYBE;
    assumptions.push("Wall changes may require a building permit depending on whether the wall is load-bearing.");
    questionsForContractor.push("Is the wall being changed load-bearing?");
  }

  // Plumbing permit
  let plumbing: PermitLikelihood = UNLIKELY;
  if (a.plumbing_changing || a.fixtures_moving) {
    plumbing = LIKELY;
    assumptions.push("Plumbing changes and fixture relocation typically require a plumbing permit.");
  } else if (a.new_bathroom_created) {
    plumbing = LIKELY;
  }

  // Electrical permit
  let electrical: PermitLikelihood = UNLIKELY;
  if (a.electrical_wiring_changing) {
    electrical = LIKELY;
    assumptions.push("Electrical wiring changes typically require an electrical permit and inspection.");
  } else if (a.lighting_added_relocated) {
    electrical = MAYBE;
    assumptions.push("Lighting additions or relocations may require an electrical permit depending on circuit work.");
    questionsForContractor.push("Will new lighting require new circuits or just fixture swaps?");
  }

  // Mechanical permit (ventilation)
  let mechanical: PermitLikelihood = UNLIKELY;
  if (a.ventilation_modified) {
    mechanical = MAYBE;
    assumptions.push("Ventilation modifications may require a mechanical permit depending on ductwork.");
  }

  // HOA review
  let hoa: PermitLikelihood = UNLIKELY;
  if (a.hoa_approval_potentially_required) {
    hoa = MAYBE;
    assumptions.push("HOA approval may be required before construction; review the association's architectural guidelines.");
  } else if (a.in_condominium) {
    hoa = MAYBE;
    assumptions.push("Condominium projects commonly require HOA/condo board approval before construction.");
  }

  const reviewRequired =
    building === MAYBE ||
    building === JURISDICTION ||
    electrical === MAYBE ||
    mechanical === MAYBE ||
    hoa === MAYBE;

  if (reviewRequired) {
    assumptions.push("Some categories require contractor verification or jurisdiction review before a final determination.");
  }

  questionsForContractor.push("Which permits will you obtain, and which (if any) are the homeowner's responsibility?");
  questionsForContractor.push("Will inspections be scheduled and managed by you or the homeowner?");

  return {
    jurisdiction,
    buildingPermitLikelihood: building,
    plumbingPermitLikelihood: plumbing,
    electricalPermitLikelihood: electrical,
    mechanicalPermitLikelihood: mechanical,
    hoaReviewLikelihood: hoa,
    reviewRequired,
    assumptions,
    questionsForContractor,
    sourceVersion: "rockville-permit-rules-2026-07-26-v1",
  };
}

export function permitLikelihoodLabel(l: PermitLikelihood): string {
  switch (l) {
    case "LIKELY_REQUIRED": return "Likely required";
    case "MAY_BE_REQUIRED": return "May be required";
    case "CONTRACTOR_VERIFICATION_NEEDED": return "Contractor verification needed";
    case "JURISDICTION_REVIEW_NEEDED": return "Jurisdiction review needed";
    case "UNLIKELY": return "Unlikely";
  }
}

export { PERMIT_QUESTIONS };
