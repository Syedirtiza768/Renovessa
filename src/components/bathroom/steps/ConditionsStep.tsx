"use client";

import { Field } from "./IntroStep";
import type { StepProps } from "../planner-types";
import { CONDITION_CONCERNS, OUT_OF_SCOPE_INDICATORS } from "@/lib/bathroom/config";
import { PhotoUploadPanel } from "./RequirementsPromptStep";

function toOptions(list: readonly string[]): { id: string; label: string }[] {
  return list.map((id) => ({ id, label: id.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) }));
}

export function ConditionsStep({ answers, setAnswer, projectId }: StepProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-ink-100">Existing conditions</h2>
        <p className="mt-1 text-sm text-ink-70">Known issues help the estimator apply the right contingency and help contractors prepare.</p>
      </div>

      <PhotoUploadPanel
        projectId={projectId}
        onCountChange={(n) => setAnswer("photo_count", String(n))}
      />

      <Field label="Known conditions (select all that apply)">
        <div className="grid gap-2 sm:grid-cols-2">
          {CONDITION_CONCERNS.map((c) => {
            const selected = (answers.conditions ?? "").split(",").includes(c.id);
            return (
              <label
                key={c.id}
                className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-sm transition ${
                  selected ? "border-accent bg-accent/5" : "border-ink-15 hover:border-ink-40"
                }`}
              >
                <input
                  type="checkbox"
                  checked={selected}
                  onChange={(e) => {
                    const current = (answers.conditions ?? "").split(",").filter(Boolean);
                    const next = e.target.checked
                      ? [...current, c.id]
                      : current.filter((x) => x !== c.id);
                    setAnswer("conditions", next.join(","));
                  }}
                  className="mt-1"
                />
                <span>
                  <span className="font-medium text-ink-100">{c.label}</span>
                  {"severity" in c && c.severity === "high" && <span className="ml-2 text-xs font-medium text-red-700">High priority</span>}
                </span>
              </label>
            );
          })}
        </div>
      </Field>

      <Field label="Anything explicitly out of scope?">
        <div className="grid gap-2 sm:grid-cols-2">
          {toOptions(OUT_OF_SCOPE_INDICATORS).map((o) => {
            const selected = (answers.outOfScope ?? "").split(",").includes(o.id);
            return (
              <label
                key={o.id}
                className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-sm transition ${
                  selected ? "border-accent bg-accent/5" : "border-ink-15 hover:border-ink-40"
                }`}
              >
                <input
                  type="checkbox"
                  checked={selected}
                  onChange={(e) => {
                    const current = (answers.outOfScope ?? "").split(",").filter(Boolean);
                    const next = e.target.checked
                      ? [...current, o.id]
                      : current.filter((x) => x !== o.id);
                    setAnswer("outOfScope", next.join(","));
                  }}
                  className="mt-1"
                />
                <span className="font-medium text-ink-100">{o.label}</span>
              </label>
            );
          })}
        </div>
      </Field>

      <Field label="Home age (approximate year built)">
        <input
          type="number"
          value={answers.homeAge ?? ""}
          onChange={(e) => setAnswer("homeAge", e.target.value)}
          placeholder="e.g. 1985"
          className="w-full rounded-lg border border-ink-15 p-3 text-sm sm:max-w-xs"
        />
      </Field>
    </div>
  );
}
