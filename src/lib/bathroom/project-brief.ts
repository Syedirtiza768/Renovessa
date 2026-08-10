/**
 * Project brief builder (PRD §21). Assembles a structured brief JSON from
 * a bathroom project, its layouts, estimate, and permit assessment.
 * Pure function — no DB access.
 */

import type { EstimateResult } from "./estimator";
import type { PermitAssessmentResult } from "./permits";
import type { ConfidenceResult } from "./confidence";
import type { GeometryCalculations } from "./geometry";

export interface BriefSource {
  project: {
    id: string;
    referenceNumber: string;
    bathroomType?: string;
    projectObjective?: string;
    propertyType?: string;
    ownershipStatus?: string;
    occupancyStatus?: string;
    budgetMinimum?: number;
    budgetMaximum?: number;
    desiredStartDate?: string;
    timelineCategory?: string;
    qualificationGrade?: string;
    notes?: string;
  };
  location: {
    city: string;
    state: string;
    zip?: string;
    locationId: string;
    accessNotes?: string;
  };
  measurements?: {
    method: string;
    ceilingHeight?: number;
    floorAreaSqft?: number;
    confirmed: boolean;
  };
  existingLayout?: {
    name?: string;
    geometry: any;
    calculations?: GeometryCalculations;
  };
  proposedLayout?: {
    name?: string;
    geometry: any;
    calculations?: GeometryCalculations;
  };
  selections: Array<{ category: string; selectionType?: string; qualityTier?: string; brand?: string; model?: string }>;
  conditions: Array<{ type: string; severity?: string; notes?: string }>;
  estimate: EstimateResult;
  permit: PermitAssessmentResult;
  confidence: ConfidenceResult;
  mediaCount: number;
}

export interface ProjectBrief {
  version: number;
  generatedAt: string;
  project: BriefSource["project"];
  location: BriefSource["location"];
  existingBathroom: {
    bathroomType?: string;
    measurements?: BriefSource["measurements"];
    layout?: BriefSource["existingLayout"];
    conditions: BriefSource["conditions"];
    mediaCount: number;
  };
  proposedProject: {
    objective?: string;
    layout?: BriefSource["proposedLayout"];
    selections: BriefSource["selections"];
    scopePriorities: string[];
  };
  planningEstimate: {
    lowAmount: number;
    expectedLowAmount: number;
    expectedHighAmount: number;
    highComplexityAmount: number;
    contingencyAmount: number;
    confidenceLevel: string;
    costDrivers: string[];
    assumptions: string[];
    unknowns: string[];
    exclusions: string[];
    configVersion: string;
    calculationTimestamp: string;
    lineItemCount: number;
  };
  permitGuidance: {
    jurisdiction: string;
    building: string;
    plumbing: string;
    electrical: string;
    mechanical: string;
    hoa: string;
    reviewRequired: boolean;
    assumptions: string[];
    questionsForContractor: string[];
    sourceVersion: string;
  };
  contractorQuestions: string[];
  disclaimers: string[];
  homeownerPriorities: string[];
}

const STANDARD_CONTRACTOR_QUESTIONS = [
  "Is demolition included in your proposal?",
  "Is debris removal included?",
  "Which waterproofing system is proposed?",
  "Are permits included? Who will obtain them?",
  "Are plumbing and electrical subcontractors properly licensed?",
  "Which fixture allowances are included?",
  "Which tile allowances are included?",
  "How are hidden conditions handled once walls are opened?",
  "What is the proposed payment schedule?",
  "What warranty applies to labor and materials?",
  "Who manages inspections?",
  "What is explicitly excluded from your proposal?",
  "What is the expected start date?",
  "What is the expected construction duration?",
];

const STANDARD_DISCLAIMERS = [
  "Conceptual planning diagram only. This is not an architectural, engineering, construction, or permit drawing. All measurements and site conditions must be verified by the selected contractor or qualified design professional.",
  "This planning estimate is not a binding quote or contractor proposal. Final pricing depends on site conditions, material selections, permit requirements, and contractor bids.",
  "Renovessa does not perform construction. Contractors are independent businesses; verify credentials and contract terms before signing.",
  "Do not treat AI-assisted suggestions as confirmed measurements, diagnoses, or compliance determinations.",
];

export function buildProjectBrief(source: BriefSource): ProjectBrief {
  const scopePriorities: string[] = [];
  if (source.project.projectObjective) {
    scopePriorities.push(`Primary objective: ${source.project.projectObjective}`);
  }
  if (source.confidence.level === "LOW") {
    scopePriorities.push("Resolve unknown conditions (hidden damage, structural, plumbing) before final pricing.");
  }
  if (source.permit.reviewRequired) {
    scopePriorities.push("Confirm permit categories with the selected contractor and jurisdiction.");
  }

  const homeownerPriorities: string[] = [];
  if (source.project.budgetMaximum) {
    homeownerPriorities.push(`Budget ceiling: $${source.project.budgetMaximum.toLocaleString()}`);
  }
  if (source.project.desiredStartDate) {
    homeownerPriorities.push(`Desired start: ${source.project.desiredStartDate}`);
  }
  if (source.project.timelineCategory) {
    homeownerPriorities.push(`Timeline: ${source.project.timelineCategory}`);
  }

  return {
    version: 1,
    generatedAt: new Date().toISOString(),
    project: source.project,
    location: source.location,
    existingBathroom: {
      bathroomType: source.project.bathroomType,
      measurements: source.measurements,
      layout: source.existingLayout,
      conditions: source.conditions,
      mediaCount: source.mediaCount,
    },
    proposedProject: {
      objective: source.project.projectObjective,
      layout: source.proposedLayout,
      selections: source.selections,
      scopePriorities,
    },
    planningEstimate: {
      lowAmount: source.estimate.lowAmount,
      expectedLowAmount: source.estimate.expectedLowAmount,
      expectedHighAmount: source.estimate.expectedHighAmount,
      highComplexityAmount: source.estimate.highComplexityAmount,
      contingencyAmount: source.estimate.contingencyAmount,
      confidenceLevel: source.estimate.confidenceLevel,
      costDrivers: source.estimate.costDrivers,
      assumptions: source.estimate.assumptions,
      unknowns: source.estimate.unknowns,
      exclusions: source.estimate.exclusions,
      configVersion: source.estimate.configVersion,
      calculationTimestamp: source.estimate.calculationTimestamp,
      lineItemCount: source.estimate.lineItems.length,
    },
    permitGuidance: {
      jurisdiction: source.permit.jurisdiction,
      building: source.permit.buildingPermitLikelihood,
      plumbing: source.permit.plumbingPermitLikelihood,
      electrical: source.permit.electricalPermitLikelihood,
      mechanical: source.permit.mechanicalPermitLikelihood,
      hoa: source.permit.hoaReviewLikelihood,
      reviewRequired: source.permit.reviewRequired,
      assumptions: source.permit.assumptions,
      questionsForContractor: source.permit.questionsForContractor,
      sourceVersion: source.permit.sourceVersion,
    },
    contractorQuestions: STANDARD_CONTRACTOR_QUESTIONS,
    disclaimers: STANDARD_DISCLAIMERS,
    homeownerPriorities,
  };
}
