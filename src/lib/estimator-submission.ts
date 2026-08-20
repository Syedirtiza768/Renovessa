import type { LandingCategoryId } from "@/lib/landing-data";
import {
  SHARED_CONTEXT_QUESTIONS,
  getTradeWizard,
  optionLabel,
  type WizardQuestion,
} from "@/lib/estimate-wizard-data";
import type { BallparkEstimate, EstimateAnswers } from "@/lib/estimate-pricing";

export const ESTIMATOR_SNAPSHOT_VERSION = 1;

export type EstimatorFieldSnapshot = {
  id: string;
  label: string;
  type?: string;
  section: string;
  order: number;
  value: string | null;
  displayValue: string | null;
  unit?: string | null;
};

export type EstimatorSnapshot = {
  version: number;
  estimatorId: string;
  estimatorLabel: string;
  source: "standard" | "bathroom" | "solar";
  submittedAt?: string;
  sections: Array<{
    id: string;
    label: string;
    fields: EstimatorFieldSnapshot[];
  }>;
  answers: Record<string, string | null>;
  notes: string | null;
  contact: Record<string, string | number | boolean | null>;
  estimate?: Record<string, unknown> | null;
};

export function humanizeFieldId(id: string): string {
  return id
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function fieldsForQuestions(
  questions: WizardQuestion[],
  answers: EstimateAnswers,
  section: string,
  orderOffset = 0,
): EstimatorFieldSnapshot[] {
  return questions.map((question, index) => {
    const value = answers[question.id] ?? null;
    return {
      id: question.id,
      label: question.label,
      type: question.type,
      section,
      order: orderOffset + index,
      value,
      displayValue: value == null || value === "" ? null : optionLabel(question, value),
      unit: question.suffix ?? null,
    };
  });
}

export function buildStandardEstimatorSnapshot(input: {
  trade: LandingCategoryId;
  tradeLabel: string;
  answers: EstimateAnswers;
  zip: string;
  notes: string;
  contact: Record<string, string | number | boolean | null>;
  estimate: BallparkEstimate;
}): EstimatorSnapshot {
  const tradeQuestions = getTradeWizard(input.trade)?.questions ?? [];
  const scopeFields = fieldsForQuestions(tradeQuestions, input.answers, "Scope");
  const contextFields = fieldsForQuestions(
    SHARED_CONTEXT_QUESTIONS,
    input.answers,
    "Property and timing",
    scopeFields.length,
  );
  const zipField: EstimatorFieldSnapshot = {
    id: "zipCode",
    label: "Project ZIP code",
    type: "text",
    section: "Property and timing",
    order: scopeFields.length + contextFields.length,
    value: input.zip || null,
    displayValue: input.zip || null,
  };

  return {
    version: ESTIMATOR_SNAPSHOT_VERSION,
    estimatorId: input.trade,
    estimatorLabel: input.tradeLabel,
    source: "standard",
    sections: [
      { id: "scope", label: "Scope", fields: scopeFields },
      { id: "context", label: "Property and timing", fields: [zipField, ...contextFields] },
    ],
    answers: { ...input.answers, zipCode: input.zip || null },
    notes: input.notes.trim() || null,
    contact: input.contact,
    estimate: {
      low: input.estimate.low,
      mid: input.estimate.mid,
      high: input.estimate.high,
      confidence: input.estimate.confidence,
      summary: input.estimate.summary,
      drivers: input.estimate.drivers,
      disclaimer: input.estimate.disclaimer,
      claimId: input.estimate.claimId,
      modelVersion: input.estimate.modelVersion,
      substantiationStatus: input.estimate.substantiationStatus,
    },
  };
}

export function buildAnswerMapEstimatorSnapshot(input: {
  estimatorId: string;
  estimatorLabel: string;
  source: "bathroom" | "solar";
  answers: Record<string, unknown>;
  contact: Record<string, string | number | boolean | null>;
  notes?: string | null;
  estimate?: Record<string, unknown> | null;
  sectionLabel?: string;
}): EstimatorSnapshot {
  const fields = Object.entries(input.answers).map(([id, raw], order) => ({
    id,
    label: humanizeFieldId(id),
    section: input.sectionLabel ?? "Estimator responses",
    order,
    value: raw == null ? null : String(raw),
    displayValue: raw == null ? null : String(raw),
  }));
  return {
    version: ESTIMATOR_SNAPSHOT_VERSION,
    estimatorId: input.estimatorId,
    estimatorLabel: input.estimatorLabel,
    source: input.source,
    sections: [{ id: "answers", label: input.sectionLabel ?? "Estimator responses", fields }],
    answers: Object.fromEntries(
      Object.entries(input.answers).map(([key, raw]) => [key, raw == null ? null : String(raw)]),
    ),
    notes: input.notes?.trim() || null,
    contact: input.contact,
    estimate: input.estimate ?? null,
  };
}

export function parseEstimatorSnapshot(value: unknown): EstimatorSnapshot | null {
  if (!value || typeof value !== "object") return null;
  const snapshot = value as Partial<EstimatorSnapshot>;
  if (
    typeof snapshot.estimatorLabel !== "string" ||
    !Array.isArray(snapshot.sections) ||
    typeof snapshot.answers !== "object" ||
    snapshot.answers === null
  ) {
    return null;
  }
  return snapshot as EstimatorSnapshot;
}

/**
 * Older standard RFQs stored the answer map inside qualificationNotes. Keep
 * those records readable while new submissions use estimatorSnapshotJson.
 */
export function snapshotFromLegacyQualificationNotes(
  value: string | null | undefined,
  trade: string,
): EstimatorSnapshot | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as Record<string, unknown>;
    const answers = parsed.answers;
    if (!answers || typeof answers !== "object") return null;
    const estimatorLabel = trade || "Home improvement";
    return {
      version: 0,
      estimatorId: trade.toLowerCase().replace(/\s+/g, "-"),
      estimatorLabel,
      source: "standard",
      sections: [
        {
          id: "legacy",
          label: "Estimator responses",
          fields: Object.entries(answers as Record<string, unknown>).map(([id, raw], order) => ({
            id,
            label: humanizeFieldId(id),
            section: "Estimator responses",
            order,
            value: raw == null ? null : String(raw),
            displayValue: raw == null ? null : String(raw),
          })),
        },
      ],
      answers: Object.fromEntries(
        Object.entries(answers as Record<string, unknown>).map(([key, raw]) => [
          key,
          raw == null ? null : String(raw),
        ]),
      ),
      notes: typeof parsed.notes === "string" ? parsed.notes : null,
      contact: {},
      estimate: {
        low: parsed.ballparkLow,
        mid: parsed.ballparkMid,
        high: parsed.ballparkHigh,
        confidence: parsed.confidence,
        summary: parsed.summary,
        claimId: parsed.claimId,
        modelVersion: parsed.estimateModelVersion,
        substantiationStatus: parsed.substantiationStatus,
      },
    };
  } catch {
    return null;
  }
}
