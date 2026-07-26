"use client";

import { Field } from "./IntroStep";
import type { StepProps } from "../planner-types";
import { PERMIT_QUESTIONS } from "@/lib/bathroom/config";

const PERMIT_ANSWER_OPTIONS = ["Yes", "No", "Unknown"] as const;

export function PermitsStep({ answers, setAnswer }: StepProps) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-base font-semibold text-ink-100">Permit questions</h3>
        <p className="mt-1 text-sm text-ink-70">
          These answers help flag likely permit categories. This is not a legal determination — your
          contractor and the City of Rockville / Montgomery County will confirm.
        </p>
      </div>

      {PERMIT_QUESTIONS.map((q) => (
        <Field key={q.id} label={q.label}>
          <div className="flex flex-wrap gap-2">
            {PERMIT_ANSWER_OPTIONS.map((o) => {
              const checked = answers[`permit_${q.id}`] === o;
              return (
                <button
                  key={o}
                  type="button"
                  onClick={() => setAnswer(`permit_${q.id}`, o)}
                  className={`rounded-full border px-4 py-2 text-sm transition ${
                    checked
                      ? "border-accent bg-accent text-bone-0"
                      : "border-ink-15 text-ink-70 hover:border-ink-40"
                  }`}
                >
                  {o}
                </button>
              );
            })}
          </div>
          <p className="mt-1 text-xs text-ink-40">Category: {q.category}</p>
        </Field>
      ))}
    </div>
  );
}
