"use client";

import { useState } from "react";
import Link from "next/link";
import {
  FAQ_ITEMS,
  HOW_IT_WORKS_STEPS,
  STATS,
  TRUST_CARDS,
  VERIFICATION_BADGES,
  getVisibleCategories,
} from "@/lib/landing-data";
import { FIRST_JOB_MODE, LANDING_HEADLINE } from "@/lib/first-job-config";
import { useCategories } from "./CategoryContext";

function CategoryIcon({ id }: { id: string }) {
  return (
    <svg width={32} height={32} viewBox="0 0 32 32" fill="none" aria-hidden className="text-ink-70">
      <rect x="4" y="8" width="24" height="18" rx="2" stroke="currentColor" strokeWidth="1.25" />
      <path d="M8 14h16M8 18h10" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
    </svg>
  );
}

export function HowItWorksSection() {
  return (
    <section id="how" className="bg-bone-0 px-4 py-14 sm:px-6 sm:py-16">
      <div className="mx-auto max-w-[1440px]">
        <p className="landing-eyebrow">II. How it works</p>
        <h2 className="landing-h2 mt-3 max-w-2xl">
          From a scoped estimate to real contractor bids.
        </h2>
        <p className="mt-4 max-w-[58ch] text-lg text-ink-70">
          The wizard captures the whole job, shows a DMV ballpark, and turns it into an RFQ
          Renovessa can shop to vetted contractors for you.
        </p>

        <div className="mt-10 grid gap-4 md:grid-cols-2">
          {HOW_IT_WORKS_STEPS.map((step) => (
            <article
              key={step.step}
              className="landing-card border-l-2 border-l-ink-15 p-6"
            >
              <p className="font-mono-landing text-xs text-ink-40">
                Step {step.step} — {step.title}{" "}
                <span className="text-ink-40">↳ {step.timing}</span>
              </p>
              <p className="mt-3 text-sm leading-relaxed text-ink-70">{step.body}</p>
            </article>
          ))}
        </div>

        <aside className="mt-8 border-l-[3px] border-accent bg-accent-100 px-5 py-4">
          <p className="text-sm font-medium text-ink-100">
            You get a planning ballpark up front, then Renovessa runs the RFQ — soliciting bids and
            getting back to you with options, not a flood of unsolicited sales calls.
          </p>
        </aside>
      </div>
    </section>
  );
}

export function StatsStrip() {
  if (STATS.length === 0) return null;

  return (
    <section className="bg-bone-1 px-4 py-14 sm:px-6 sm:py-[72px]" aria-label="Key metrics">
      <div className="mx-auto grid max-w-[1440px] gap-10 sm:grid-cols-2 lg:grid-cols-4">
        {STATS.map((stat) => (
          <div key={stat.value}>
            <p className="font-mono-landing text-3xl font-medium text-ink-100 sm:text-4xl">
              {stat.value}
              {stat.unit && (
                <span className="ml-1 text-base text-ink-40">{stat.unit}</span>
              )}
            </p>
            <p className="mt-2 text-sm text-ink-70">{stat.label}</p>
            <p className="mt-1 font-mono-landing text-[11px] text-ink-40">↳ {stat.source}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export function CategoriesSection() {
  const { toggle, isSelected } = useCategories();
  const categories = getVisibleCategories();

  return (
    <section id="services" className="bg-bone-0 px-4 py-14 sm:px-6 sm:py-16">
      <div className="mx-auto max-w-[1440px]">
        <p className="landing-eyebrow">III. What we schedule appointments for</p>
        {FIRST_JOB_MODE ? (
          <h2 className="landing-h2 mt-3 max-w-3xl">
            {LANDING_HEADLINE || `Currently scheduling ${categories.length > 0 ? categories[0].label : "home improvement"} appointments.`}
          </h2>
        ) : (
          <h2 className="landing-h2 mt-3 max-w-3xl">
            Twelve categories of home improvement — from a single repair to a full remodel.
          </h2>
        )}

        <div className={`mt-10 grid gap-4 ${FIRST_JOB_MODE ? "sm:grid-cols-1 max-w-md" : "sm:grid-cols-2 lg:grid-cols-4"}`}>
          {categories.map((cat) => {
            const active = isSelected(cat.id);
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => toggle(cat.id)}
                className={`relative rounded-lg border p-5 text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
                  active
                    ? "border-2 border-accent bg-accent-100"
                    : "border-ink-15 bg-white hover:border-ink-40"
                }`}
                aria-pressed={active}
              >
                {active && (
                  <span
                    className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-accent text-xs text-bone-0"
                    aria-hidden
                  >
                    ✓
                  </span>
                )}
                <span className="font-mono-landing text-xs text-ink-40">{cat.ref}</span>
                <div className="mt-3">
                  <CategoryIcon id={cat.id} />
                </div>
                <h3 className="mt-3 text-base font-semibold text-ink-100">{cat.label}</h3>
                <p className="mt-1.5 text-sm text-ink-70">{cat.description}</p>
              </button>
            );
          })}
        </div>

        <p className="mt-8 text-sm italic text-ink-70">
          Renovessa verifies contractor licenses and insurance before granting access to the network.
          You should always confirm credentials directly before work begins.
        </p>
      </div>
    </section>
  );
}

export function WhySection() {
  return (
    <section id="why" className="bg-bone-1 px-4 py-14 sm:px-6 sm:py-16">
      <div className="mx-auto max-w-[1440px]">
        <p className="landing-eyebrow">IV. Why homeowners use Renovessa</p>
        <h2 className="landing-h2 mt-3">Less chaos. One vetted contractor. A confirmed appointment.</h2>

        <div className="mt-10 grid gap-6 lg:grid-cols-3">
          {TRUST_CARDS.map((card) => (
            <article key={card.title} className="landing-card p-6">
              <h3 className="text-lg font-semibold text-ink-100">{card.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-ink-70">{card.body}</p>
            </article>
          ))}
        </div>

        <ul className="mt-10 flex flex-wrap justify-center gap-4 sm:gap-8">
          {VERIFICATION_BADGES.map((badge) => (
            <li key={badge} className="flex items-center gap-2 text-sm font-medium text-ink-70">
              <span className="text-success-landing" aria-hidden>
                ✓
              </span>
              {badge}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export function FAQSection() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section id="faq" className="bg-bone-0 px-4 py-14 sm:px-6 sm:py-16">
      <div className="mx-auto max-w-3xl">
        <p className="landing-eyebrow">VI. Frequently asked</p>
        <h2 className="landing-h2 mt-3">Things homeowners ask before submitting.</h2>

        <div className="mt-8 divide-y divide-ink-15 border border-ink-15 rounded-lg bg-white">
          {FAQ_ITEMS.map((item, i) => {
            const expanded = open === i;
            return (
              <div key={item.q}>
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left text-sm font-semibold text-ink-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-accent"
                  aria-expanded={expanded}
                  onClick={() => setOpen(expanded ? null : i)}
                >
                  {item.q}
                  <span className="text-ink-40" aria-hidden>
                    {expanded ? "−" : "+"}
                  </span>
                </button>
                <div
                  className={`overflow-hidden transition-all duration-180 ${
                    expanded ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
                  }`}
                >
                  <p className="px-5 pb-4 text-sm leading-relaxed text-ink-70">{item.a}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export function FinalCTASection() {
  return (
    <section className="bg-ink-100 px-4 py-16 sm:px-6 sm:py-20">
      <div className="mx-auto max-w-3xl text-center">
        <h2 className="font-serif-landing text-4xl text-bone-0 sm:text-5xl">
          Ready for a real ballpark?
        </h2>
        <p className="mt-4 text-lg text-bone-1">
          Run the estimate wizard, see a DMV planning range, and submit an RFQ. Renovessa collects
          contractor bids and gets back to you.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <a href="#estimate" className="landing-btn-primary-lg">
            Get my free estimate →
          </a>
          <a
            href="#how"
            className="inline-flex items-center justify-center rounded-lg border border-bone-2 px-6 py-3.5 text-base font-semibold text-bone-0 transition hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            How it works
          </a>
        </div>
        <p className="mt-8 text-sm text-bone-2">
          Are you a contractor?{" "}
          <Link href="/for-contractors" className="underline underline-offset-2 hover:text-bone-0">
            Learn about joining Renovessa →
          </Link>
        </p>
      </div>
    </section>
  );
}
