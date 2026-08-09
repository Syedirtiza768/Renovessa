"use client";

import { useState } from "react";
import type { BathroomFlags } from "./RockvilleBathroomPage";

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

export const DRAFT_KEY = "renovessa_bathroom_planner_draft_v1";

export function usePersistentDraft() {
  const [hydrated, setHydrated] = useState(false);
  return { hydrated, setHydrated };
}

export function loadDraft(): Partial<PlannerState> | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
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
