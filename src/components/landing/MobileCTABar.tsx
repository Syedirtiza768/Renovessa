"use client";

import { useEffect, useState } from "react";
import { useOptionalCategories } from "./CategoryContext";

export function MobileCTABar() {
  const [hiddenByScroll, setHiddenByScroll] = useState(false);
  const categoryCtx = useOptionalCategories();
  const wizardOpen = categoryCtx?.wizardSheetOpen ?? false;

  useEffect(() => {
    const target = document.getElementById("estimate");
    if (!target) return;

    const observer = new IntersectionObserver(
      ([entry]) => setHiddenByScroll(entry.isIntersecting),
      { threshold: 0.15, rootMargin: "0px 0px -60px 0px" },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, []);

  if (wizardOpen || hiddenByScroll) return null;

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-40 border-t border-ink-15 bg-bone-0/98 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-md md:hidden"
      role="region"
      aria-label="Quick estimate"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[13px] font-semibold text-ink-100">Get a free estimate</p>
          <p className="text-[11px] font-medium text-ink-40">DMV ballpark · RFQ · contractor bids</p>
        </div>
        <button
          type="button"
          onClick={() => categoryCtx?.openEstimate()}
          className="landing-btn-primary shrink-0 px-4 py-2.5 text-sm"
        >
          Start →
        </button>
      </div>
    </div>
  );
}
