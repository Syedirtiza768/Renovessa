import type { LandingCategoryId } from "@/lib/landing-data";

export const ESTIMATE_MODEL_VERSION = "dmv-estimator-2026-07-23-v1";

export function isEstimateModelApprovedForPublication() {
  return process.env.NEXT_PUBLIC_APPROVED_ESTIMATE_MODEL_VERSION === ESTIMATE_MODEL_VERSION;
}

export type EstimateClaimRecord = {
  id: string;
  modelVersion: string;
  status: "INTERNAL_BASELINE_PENDING_REVIEW" | "APPROVED";
  evidenceFile: string;
  reviewDue: string;
};

const EVIDENCE_FILE = "docs/compliance/substantiation/ESTIMATE_RANGE_REGISTER.md";

function variant(trade: LandingCategoryId, answers: Record<string, string>) {
  switch (trade) {
    case "hvac": return answers.job_type || "repair";
    case "roofing": return ["repair", "leak"].includes(answers.job_type || "repair") ? "repair" : answers.job_type || "repair";
    case "kitchen": return answers.scope || "refresh";
    case "bathroom": return answers.scope || "update";
    case "basement": return "finish";
    case "plumbing": return answers.job_type === "water_heater"
      ? `water_heater_${answers.heater_type === "tankless" ? "tankless" : "tank"}`
      : answers.job_type || "repair";
    case "electrical": return answers.job_type || "outlet";
    case "windows": return "replacement";
    case "deck": return "build";
    case "flooring": return answers.material || "lvp";
    case "painting": return answers.scope || "interior";
    case "handyman": return answers.job_size || "medium";
    default: return "general";
  }
}

export function estimateClaimId(trade: LandingCategoryId, answers: Record<string, string>) {
  return `COST-${trade.toUpperCase()}-${variant(trade, answers).toUpperCase().replace(/[^A-Z0-9]+/g, "-")}`;
}

export function estimateClaimRecord(
  trade: LandingCategoryId,
  answers: Record<string, string>,
): EstimateClaimRecord {
  const approved = isEstimateModelApprovedForPublication();
  return {
    id: estimateClaimId(trade, answers),
    modelVersion: ESTIMATE_MODEL_VERSION,
    status: approved ? "APPROVED" : "INTERNAL_BASELINE_PENDING_REVIEW",
    evidenceFile: EVIDENCE_FILE,
    reviewDue: "2026-08-23",
  };
}
