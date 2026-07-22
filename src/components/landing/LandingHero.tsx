"use client";

import Link from "next/link";
import { HERO_SERVICE_TAGS } from "@/lib/landing-data";
import { useCategories } from "./CategoryContext";

export function LandingHero() {
  const { openEstimate } = useCategories();

  return (
    <section className="bg-bone-0 px-4 py-12 sm:px-6 sm:py-16 lg:py-20">
      <div className="mx-auto grid max-w-[1440px] gap-10 lg:grid-cols-[minmax(0,1.85fr)_minmax(0,1fr)] lg:gap-12">
        <div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-medium text-ink-40">
            <span className="flex items-center gap-2">
              <span className="landing-pulse" aria-hidden />
              Home-improvement estimates and bids
            </span>
            <span className="hidden sm:inline" aria-hidden>|</span>
            <span>Washington, DC · Maryland · Northern Virginia</span>
          </div>

          <h1 className="landing-h1 mt-6 max-w-[19ch]">
            Estimate your DMV home-improvement project before requesting bids.
          </h1>
          <p className="mt-5 max-w-[58ch] text-lg leading-relaxed text-ink-70">
            Answer trade-specific questions, see a local planning range, and turn the scope into one
            request for quote. Renovessa coordinates relevant contractor responses so you can compare
            options without an uncontrolled sales-call blast.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <button type="button" onClick={openEstimate} className="landing-btn-primary-lg">
              Estimate my project →
            </button>
            <Link href="/cost-guides" className="landing-btn-ghost">
              See DMV cost guides
            </Link>
          </div>

          <p className="mt-4 text-xs font-medium text-ink-40">
            Free planning range · No obligation · Availability varies by trade and ZIP
          </p>

          <div className="mt-6 flex flex-wrap gap-2" aria-label="Estimator project types">
            {HERO_SERVICE_TAGS.map((tag) => (
              <span key={tag} className="rounded-full border border-ink-15 bg-white px-2.5 py-1 text-xs font-medium text-ink-70">
                {tag}
              </span>
            ))}
          </div>
        </div>

        <aside className="hidden lg:block" aria-label="Start your estimate">
          <div className="landing-card p-6 shadow-[0_8px_24px_rgba(26,26,26,0.06)]">
            <p className="font-mono-landing text-xs uppercase tracking-wide text-ink-40">Estimate wizard</p>
            <p className="mt-3 text-lg font-semibold text-ink-100">Scope the job. See a ballpark. Request bids.</p>
            <p className="mt-2 text-sm leading-relaxed text-ink-70">
              The range is for planning, not a contractor quote or guarantee. Final pricing can change
              with site conditions, materials, permits, and contractor availability.
            </p>
            <button type="button" onClick={openEstimate} className="landing-btn-primary mt-5 inline-flex">
              Start estimate →
            </button>
            <Link href="/methodology/estimate-methodology" className="mt-4 block text-xs font-medium text-ink-70 underline underline-offset-4 hover:text-ink-100">
              Read the estimate methodology
            </Link>
          </div>
        </aside>
      </div>
    </section>
  );
}
