"use client";

/**
 * Step 3 — Electricity usage, and Step 4 — Goal.
 *
 * The input hierarchy from §20 is expressed in the UI, not just the engine:
 * actual kWh is the primary affordance, dollars are last and demand a rate,
 * and "I don't know" is a real, non-punitive option that simply withholds the
 * offset figure rather than inventing usage.
 */

import { useState } from "react";
import { MONTH_LABELS } from "@/lib/solar/formatters";
import type { SolarAnswers } from "../planner-types";

type UsageMode = "monthly12" | "annual" | "bill" | "unknown";

export function EnergyStep({
  answers,
  setAnswer,
}: {
  answers: SolarAnswers;
  setAnswer: (key: string, value: string) => void;
}) {
  const [mode, setMode] = useState<UsageMode>(() => {
    if (answers.usage_month_0) return "monthly12";
    if (answers.usage_annual_kwh) return "annual";
    if (answers.usage_monthly_bill) return "bill";
    return "annual";
  });

  return (
    <div>
      <h2 className="text-xl font-semibold text-ink-100">How much electricity do you use?</h2>
      <p className="mt-2 text-sm leading-relaxed text-ink-70">
        This is what turns &ldquo;how much could this roof make&rdquo; into &ldquo;how much of your bill could it
        cover&rdquo;. Actual kilowatt-hours from your bills give by far the best answer.
      </p>

      <div className="mt-5 flex flex-wrap gap-2" role="group" aria-label="How to enter your electricity use">
        {(
          [
            { id: "monthly12", label: "12 months of kWh", hint: "Best" },
            { id: "annual", label: "Annual kWh", hint: "Good" },
            { id: "bill", label: "Average monthly bill", hint: "Approximate" },
            { id: "unknown", label: "I don't know", hint: "" },
          ] as Array<{ id: UsageMode; label: string; hint: string }>
        ).map((o) => (
          <button
            key={o.id}
            type="button"
            onClick={() => setMode(o.id)}
            aria-pressed={mode === o.id}
            className={`rounded-full border px-4 py-2 text-sm transition ${
              mode === o.id ? "border-accent bg-accent text-bone-0" : "border-ink-15 text-ink-70 hover:border-ink-40"
            }`}
          >
            {o.label}
            {o.hint && (
              <span className={`ml-2 text-xs ${mode === o.id ? "text-bone-1" : "text-ink-40"}`}>{o.hint}</span>
            )}
          </button>
        ))}
      </div>

      {mode === "monthly12" && (
        <fieldset className="mt-6">
          <legend className="landing-label">Monthly usage in kWh (from your bills)</legend>
          <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
            {MONTH_LABELS.map((m, i) => (
              <div key={m}>
                <label className="mb-1 block text-xs text-ink-40" htmlFor={`usage-m-${i}`}>
                  {m}
                </label>
                <input
                  id={`usage-m-${i}`}
                  inputMode="numeric"
                  className="landing-input"
                  value={answers[`usage_month_${i}`] ?? ""}
                  onChange={(e) => setAnswer(`usage_month_${i}`, e.target.value)}
                />
              </div>
            ))}
          </div>
          <p className="mt-2 text-xs text-ink-40">
            Partial months are fine — we&rsquo;ll scale them to a year and tell you we did.
          </p>
        </fieldset>
      )}

      {mode === "annual" && (
        <div className="mt-6 max-w-sm">
          <label className="landing-label" htmlFor="usage-annual">
            Annual electricity use (kWh)
          </label>
          <input
            id="usage-annual"
            inputMode="numeric"
            className="landing-input"
            placeholder="13000"
            value={answers.usage_annual_kwh ?? ""}
            onChange={(e) => setAnswer("usage_annual_kwh", e.target.value)}
          />
          <p className="mt-2 text-xs text-ink-40">
            Most US utility bills show a 12-month usage graph or total. That figure is what we want here.
          </p>
        </div>
      )}

      {mode === "bill" && (
        <div className="mt-6 grid max-w-2xl gap-4 sm:grid-cols-2">
          <div>
            <label className="landing-label" htmlFor="usage-bill">
              Average monthly bill ($)
            </label>
            <input
              id="usage-bill"
              inputMode="decimal"
              className="landing-input"
              placeholder="220"
              value={answers.usage_monthly_bill ?? ""}
              onChange={(e) => setAnswer("usage_monthly_bill", e.target.value)}
            />
          </div>
          <div>
            <label className="landing-label" htmlFor="usage-rate">
              Your electricity rate ($/kWh)
            </label>
            <input
              id="usage-rate"
              inputMode="decimal"
              className="landing-input"
              placeholder="0.16"
              value={answers.usage_blended_rate ?? ""}
              onChange={(e) => setAnswer("usage_blended_rate", e.target.value)}
            />
          </div>
          <p className="text-xs leading-relaxed text-ink-40 sm:col-span-2">
            We need the rate because dollars alone can&rsquo;t be converted into kilowatt-hours. We&rsquo;ll show you
            the blended rate we used, and the usage figure will be labelled as an approximation.
          </p>
        </div>
      )}

      {mode === "unknown" && (
        <div className="mt-6 rounded-lg border border-ink-15 bg-bone-1 p-4 text-sm leading-relaxed text-ink-70">
          That&rsquo;s fine. We&rsquo;ll still show your roof, system size and estimated production — we just
          won&rsquo;t show what share of your bill it covers, because we&rsquo;d be guessing. You can add your usage
          later and the estimate will update.
        </div>
      )}
    </div>
  );
}

export const SOLAR_GOALS = [
  { id: "reduce_costs", label: "Reduce my electricity costs" },
  { id: "offset_100", label: "Offset about 100% of my usage" },
  { id: "maximize_roof", label: "Use as much of my roof as possible" },
  { id: "battery_backup", label: "Solar with battery backup" },
  { id: "prepare_ev", label: "Prepare for an EV" },
  { id: "electrification", label: "Prepare for a heat pump / electrification" },
  { id: "explore", label: "Just exploring whether solar makes sense" },
];

export function GoalStep({
  answers,
  setAnswer,
  onStrategyChange,
}: {
  answers: SolarAnswers;
  setAnswer: (key: string, value: string) => void;
  onStrategyChange: (goal: string) => void;
}) {
  return (
    <div>
      <h2 className="text-xl font-semibold text-ink-100">What matters most to you?</h2>
      <p className="mt-2 text-sm leading-relaxed text-ink-70">
        This sets the starting layout. You can change the panel count and roof faces afterwards, and the numbers
        update as you do.
      </p>
      <ul className="mt-5 grid gap-3 sm:grid-cols-2">
        {SOLAR_GOALS.map((g) => {
          const selected = answers.project_goal === g.id;
          return (
            <li key={g.id}>
              <button
                type="button"
                onClick={() => {
                  setAnswer("project_goal", g.id);
                  onStrategyChange(g.id);
                }}
                aria-pressed={selected}
                className={`w-full rounded-lg border p-4 text-left text-sm transition ${
                  selected ? "border-accent bg-accent-100 text-ink-100" : "border-ink-15 bg-white text-ink-70 hover:border-ink-40"
                }`}
              >
                {g.label}
              </button>
            </li>
          );
        })}
      </ul>

      {answers.project_goal === "battery_backup" && (
        <p className="mt-4 rounded-lg border border-ink-15 bg-bone-1 p-4 text-sm leading-relaxed text-ink-70">
          Battery planning isn&rsquo;t in this version of the planner yet. We&rsquo;ll record that you want storage
          so installers quote for it, and size the solar array first — which is the right order anyway.
        </p>
      )}
    </div>
  );
}
