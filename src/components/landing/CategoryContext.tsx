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
  /** Mobile fullscreen sheet visibility (desktop always shows in-page card). */
  wizardSheetOpen: boolean;
  openWizardSheet: () => void;
  closeWizardSheet: () => void;
  /** Open sheet on mobile; scroll to #estimate on desktop. */
  openEstimate: () => void;
};

const CategoryContext = createContext<CategoryContextValue | null>(null);

function isMobileViewport() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(max-width: 767px)").matches;
}

export function CategoryProvider({ children }: { children: ReactNode }) {
  const [selected, setSelected] = useState<LandingCategoryId[]>([]);
  const [prefill, setPrefill] = useState<AdvisorPrefill | null>(null);
  const [wizardEntry, setWizardEntry] = useState<WizardEntry | null>(null);
  const [wizardSheetOpen, setWizardSheetOpen] = useState(false);

  const toggle = useCallback((id: LandingCategoryId) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }, []);

  const isSelected = useCallback((id: LandingCategoryId) => selected.includes(id), [selected]);

  const openWizardSheet = useCallback(() => setWizardSheetOpen(true), []);
  const closeWizardSheet = useCallback(() => setWizardSheetOpen(false), []);

  const openEstimate = useCallback(() => {
    if (isMobileViewport()) {
      setWizardSheetOpen(true);
      return;
    }
    document.getElementById("estimate")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const startWizardWithTrade = useCallback((id: LandingCategoryId) => {
    setSelected([id]);
    setWizardEntry((prev) => ({ trade: id, token: (prev?.token ?? 0) + 1 }));
    if (isMobileViewport()) {
      setWizardSheetOpen(true);
    } else {
      requestAnimationFrame(() => {
        document.getElementById("estimate")?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }
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
      wizardSheetOpen,
      openWizardSheet,
      closeWizardSheet,
      openEstimate,
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
      wizardSheetOpen,
      openWizardSheet,
      closeWizardSheet,
      openEstimate,
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

/** @deprecated Prefer openEstimate from context — kept for any stray imports. */
export function scrollToEstimateWizard() {
  if (typeof document === "undefined") return;
  if (typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches) {
    window.dispatchEvent(new CustomEvent("renovessa:open-estimate"));
    return;
  }
  document.getElementById("estimate")?.scrollIntoView({ behavior: "smooth", block: "start" });
}
