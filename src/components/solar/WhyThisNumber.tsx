"use client";

/**
 * "Why this number?" (§35).
 *
 * Every significant result carries one. It renders the provenance that
 * travelled with the value — source, confidence, retrieval/effective dates and
 * what it was derived from — so the system is inspectable rather than
 * mysterious. The text is not generated; it comes from the engines.
 */

import { useId, useState } from "react";
import type { Tracked } from "@/lib/solar/provenance";
import { explain } from "@/lib/solar/provenance";
import { formatIsoDate } from "@/lib/solar/formatters";

export function WhyThisNumber({ tracked, label }: { tracked: Tracked<unknown>; label: string }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const detail = explain(tracked);

  return (
    <span className="inline-flex flex-col">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={id}
        className="self-start text-xs font-medium text-accent underline decoration-dotted underline-offset-2 hover:text-ink-100"
      >
        Why this number?
        <span className="sr-only"> for {label}</span>
      </button>
      {open && (
        <span
          id={id}
          className="mt-2 block rounded-lg border border-ink-15 bg-bone-1 p-3 text-xs leading-relaxed text-ink-70"
        >
          <span className="block">{detail.explanation}</span>
          <span className="mt-2 block text-ink-40">
            {detail.sourceLabel}
            {detail.isAssumption && " · this is an assumption, not a measurement"}
            {detail.retrievedAt && ` · retrieved ${formatIsoDate(detail.retrievedAt)}`}
            {detail.effectiveAt && ` · effective ${formatIsoDate(detail.effectiveAt)}`}
            {` · confidence ${detail.confidence.toLowerCase()}`}
          </span>
          {detail.derivedFrom?.length ? (
            <span className="mt-1 block text-ink-40">Based on: {detail.derivedFrom.join(", ")}.</span>
          ) : null}
        </span>
      )}
    </span>
  );
}

/**
 * A headline metric with its unit, plain-language subtitle and provenance.
 * Used for the results metric strip so every number is self-explaining.
 */
export function Metric({
  label,
  value,
  sub,
  tracked,
  emphasis = false,
}: {
  label: string;
  value: string;
  sub?: string;
  tracked?: Tracked<unknown> | null;
  emphasis?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1 border-l border-ink-15 pl-4 first:border-l-0 first:pl-0">
      <span className="landing-eyebrow">{label}</span>
      <span
        className={
          emphasis
            ? "font-serif-landing text-3xl leading-none text-ink-100 sm:text-4xl"
            : "text-2xl font-semibold leading-none text-ink-100"
        }
        style={emphasis ? { fontFamily: "var(--font-serif)" } : undefined}
      >
        {value}
      </span>
      {sub && <span className="text-xs leading-snug text-ink-40">{sub}</span>}
      {tracked && <WhyThisNumber tracked={tracked} label={label} />}
    </div>
  );
}

/** Renders a value that is genuinely unavailable, with the reason. */
export function WithheldMetric({ label, reason }: { label: string; reason: string }) {
  return (
    <div className="flex flex-col gap-1 border-l border-ink-15 pl-4 first:border-l-0 first:pl-0">
      <span className="landing-eyebrow">{label}</span>
      <span className="text-lg font-medium leading-tight text-ink-40">Not available</span>
      <span className="text-xs leading-snug text-ink-40">{reason}</span>
    </div>
  );
}
