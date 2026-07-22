"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { LandingCategoryId } from "@/lib/landing-data";
import { LANDING_CATEGORIES } from "@/lib/landing-data";

export type AdvisorPrefill = {
  description?: string;
  urgency?: string;
  budget?: string;
};

export type WizardEntry = {
  trade: LandingCategoryId;
  /** Bumps on every click so the wizard re-applies even for the same trade. */
  token: number;
};

type CategoryContextValue = {
  selected: LandingCategoryId[];
  toggle: (id: LandingCategoryId) => void;
  setSelected: (ids: LandingCategoryId[]) => void;
  isSelected: (id: LandingCategoryId) => boolean;
  labels: string[];
  prefill: AdvisorPrefill | null;
  setPrefill: (p: AdvisorPrefill | null) => void;
  wizardEntry: WizardEntry | null;
  /** Highlight trade and signal EstimateWizard to open on that trade's scope step. */
  startWizardWithTrade: (id: LandingCategoryId) => void;
  clearWizardEntry: () => void;
};

const CategoryContext = createContext<CategoryContextValue | null>(null);

export function CategoryProvider({ children }: { children: ReactNode }) {
  const [selected, setSelected] = useState<LandingCategoryId[]>([]);
  const [prefill, setPrefill] = useState<AdvisorPrefill | null>(null);
  const [wizardEntry, setWizardEntry] = useState<WizardEntry | null>(null);

  const toggle = useCallback((id: LandingCategoryId) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }, []);

  const isSelected = useCallback((id: LandingCategoryId) => selected.includes(id), [selected]);

  const startWizardWithTrade = useCallback((id: LandingCategoryId) => {
    setSelected([id]);
    setWizardEntry((prev) => ({ trade: id, token: (prev?.token ?? 0) + 1 }));
  }, []);

  const clearWizardEntry = useCallback(() => {
    setWizardEntry(null);
  }, []);

  const labels = useMemo(
    () =>
      selected
        .map((id) => LANDING_CATEGORIES.find((c) => c.id === id)?.label)
        .filter(Boolean) as string[],
    [selected],
  );

  const value = useMemo(
    () => ({
      selected,
      toggle,
      setSelected,
      isSelected,
      labels,
      prefill,
      setPrefill,
      wizardEntry,
      startWizardWithTrade,
      clearWizardEntry,
    }),
    [
      selected,
      toggle,
      isSelected,
      labels,
      prefill,
      wizardEntry,
      startWizardWithTrade,
      clearWizardEntry,
    ],
  );

  return <CategoryContext.Provider value={value}>{children}</CategoryContext.Provider>;
}

export function useCategories() {
  const ctx = useContext(CategoryContext);
  if (!ctx) throw new Error("useCategories must be used within CategoryProvider");
  return ctx;
}

/** Safe for EstimateWizard when used outside CategoryProvider (portal / for-homeowners). */
export function useOptionalCategories() {
  return useContext(CategoryContext);
}

export function scrollToEstimateWizard() {
  if (typeof document === "undefined") return;
  document.getElementById("estimate")?.scrollIntoView({ behavior: "smooth", block: "start" });
}
