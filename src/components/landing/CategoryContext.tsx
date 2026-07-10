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

type CategoryContextValue = {
  selected: LandingCategoryId[];
  toggle: (id: LandingCategoryId) => void;
  setSelected: (ids: LandingCategoryId[]) => void;
  isSelected: (id: LandingCategoryId) => boolean;
  labels: string[];
  prefill: AdvisorPrefill | null;
  setPrefill: (p: AdvisorPrefill | null) => void;
};

const CategoryContext = createContext<CategoryContextValue | null>(null);

export function CategoryProvider({ children }: { children: ReactNode }) {
  const [selected, setSelected] = useState<LandingCategoryId[]>([]);
  const [prefill, setPrefill] = useState<AdvisorPrefill | null>(null);

  const toggle = useCallback((id: LandingCategoryId) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }, []);

  const isSelected = useCallback((id: LandingCategoryId) => selected.includes(id), [selected]);

  const labels = useMemo(
    () =>
      selected
        .map((id) => LANDING_CATEGORIES.find((c) => c.id === id)?.label)
        .filter(Boolean) as string[],
    [selected],
  );

  const value = useMemo(
    () => ({ selected, toggle, setSelected, isSelected, labels, prefill, setPrefill }),
    [selected, toggle, isSelected, labels, prefill],
  );

  return <CategoryContext.Provider value={value}>{children}</CategoryContext.Provider>;
}

export function useCategories() {
  const ctx = useContext(CategoryContext);
  if (!ctx) throw new Error("useCategories must be used within CategoryProvider");
  return ctx;
}
