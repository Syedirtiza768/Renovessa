"use client";

import { useState } from "react";
import type { BathroomFlags } from "./RockvilleBathroomPage";
import { normalizeAnswers } from "@/lib/bathroom/answer-normalization";

export type PlannerAnswers = Record<string, string>;

export type PlannerState = {
  projectId: string | null;
  referenceNumber: string | null;
  /** Stable per-browser id used to de-duplicate server-side draft creation. */
  clientId: string | null;
  mode: "quick" | "detailed";
  currentStep: string;
  answers: PlannerAnswers;
  saving: boolean;
  lastSavedAt: number | null;
  saveFailed: boolean;
  error: string | null;
};

export const DRAFT_KEY = "renovessa_bathroom_planner_draft_v2";

export function usePersistentDraft() {
  const [hydrated, setHydrated] = useState(false);
  return { hydrated, setHydrated };
}

export function loadDraft(): Partial<PlannerState> | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(DRAFT_KEY);
    if (!raw) {
      // Try legacy v1 key for migration
      const legacy = window.localStorage.getItem("renovessa_bathroom_planner_draft_v1");
      if (legacy) {
        const parsed = JSON.parse(legacy);
        return {
          ...parsed,
          answers: parsed.answers ? normalizeAnswers(parsed.answers) : {},
        };
      }
      return null;
    }
    const parsed = JSON.parse(raw);
    return {
      ...parsed,
      answers: parsed.answers ? normalizeAnswers(parsed.answers) : {},
    };
  } catch {
    return null;
  }
}

export function saveDraft(state: Partial<PlannerState>) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(DRAFT_KEY, JSON.stringify({ ...state, savedAt: Date.now() }));
  } catch {
    // ignore quota errors
  }
}

export function clearDraft() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(DRAFT_KEY);
    window.localStorage.removeItem("renovessa_bathroom_planner_draft_v1");
  } catch {
    // ignore
  }
}

export type StepProps = {
  answers: PlannerAnswers;
  setAnswer: (key: string, value: string) => void;
  flags: BathroomFlags;
  projectId: string | null;
  referenceNumber: string | null;
};
