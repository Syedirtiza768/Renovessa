"use client";

import { Field } from "./IntroStep";
import type { StepProps } from "../planner-types";
import { MEASUREMENT_METHODS } from "@/lib/bathroom/config";

export function MeasurementsStep({ answers, setAnswer }: StepProps) {
  const lengthFt = answers.lengthFt ?? "";
  const widthFt = answers.widthFt ?? "";
  const ceilingFt = answers.ceilingFt ?? "";
  const area = lengthFt && widthFt ? (parseFloat(lengthFt) * parseFloat(widthFt)).toFixed(1) : null;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-ink-100">Measurements</h2>
        <p className="mt-1 text-sm text-ink-70">Approximate dimensions are fine for a planning range. The contractor will verify on site.</p>
      </div>

      <Field label="How did you measure?">
        <div className="grid gap-2 sm:grid-cols-2">
          {MEASUREMENT_METHODS.map((m) => {
            const checked = answers.measurementMethod === m.id;
            return (
              <label
                key={m.id}
                className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-sm transition ${
                  checked ? "border-accent bg-accent/5" : "border-ink-15 hover:border-ink-40"
                }`}
              >
                <input
                  type="radio"
                  name="measurementMethod"
                  value={m.id}
                  checked={checked}
                  onChange={() => setAnswer("measurementMethod", m.id)}
                  className="mt-1"
                />
                <span>
                  <span className="font-medium text-ink-100">{m.label}</span>
                  <span className="block text-xs text-ink-70">{m.hint}</span>
                </span>
              </label>
            );
          })}
        </div>
      </Field>

      <div className="grid gap-5 sm:grid-cols-3">
        <Field label="Length (feet)">
          <NumberInput value={lengthFt} onChange={(v) => setAnswer("lengthFt", v)} placeholder="e.g. 8" />
        </Field>
        <Field label="Width (feet)">
          <NumberInput value={widthFt} onChange={(v) => setAnswer("widthFt", v)} placeholder="e.g. 5" />
        </Field>
        <Field label="Ceiling height (feet)">
          <NumberInput value={ceilingFt} onChange={(v) => setAnswer("ceilingFt", v)} placeholder="e.g. 8" />
        </Field>
      </div>

      {area && (
        <p className="text-sm text-ink-70">
          Approximate floor area: <span className="font-medium text-ink-100">{area} sq ft</span>
        </p>
      )}

      <Field label="Any unusual shapes or constraints?">
        <textarea
          value={answers.shapeNotes ?? ""}
          onChange={(e) => setAnswer("shapeNotes", e.target.value)}
          rows={3}
          className="w-full rounded-lg border border-ink-15 p-3 text-sm"
          placeholder="e.g. sloped ceiling, bulkhead, angled wall"
        />
      </Field>
    </div>
  );
}

function NumberInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <input
      type="number"
      inputMode="decimal"
      step="0.1"
      min="0"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full rounded-lg border border-ink-15 p-3 text-sm"
    />
  );
}
