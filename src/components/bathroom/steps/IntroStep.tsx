"use client";

import Link from "next/link";
import type { StepProps } from "../planner-types";
import { BATHROOM_TYPES, PROJECT_OBJECTIVES, PROPERTY_TYPES, OWNERSHIP_STATUS, OCCUPANCY_STATUS } from "@/lib/bathroom/config";

export function IntroStep({ answers, setAnswer }: StepProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-ink-100">Let&apos;s start with the basics</h2>
        <p className="mt-1 text-sm text-ink-70">These answers shape the questions and the planning range. You can change them later.</p>
      </div>

      <Field label="What kind of bathroom is this?">
        <ChoiceList
          name="bathroomType"
          value={answers.bathroomType}
          options={BATHROOM_TYPES}
          onChange={(v) => setAnswer("bathroomType", v)}
        />
      </Field>

      <Field label="What is your main objective?">
        <ChoiceList
          name="projectObjective"
          value={answers.projectObjective}
          options={PROJECT_OBJECTIVES}
          onChange={(v) => setAnswer("projectObjective", v)}
        />
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Property type">
          <ChoiceList
            name="propertyType"
            value={answers.propertyType}
            options={PROPERTY_TYPES}
            onChange={(v) => setAnswer("propertyType", v)}
            columns
          />
        </Field>
        <Field label="Ownership">
          <ChoiceList
            name="ownershipStatus"
            value={answers.ownershipStatus}
            options={OWNERSHIP_STATUS}
            onChange={(v) => setAnswer("ownershipStatus", v)}
            columns
          />
        </Field>
      </div>

      <Field label="Who uses the bathroom?">
        <ChoiceList
          name="occupancyStatus"
          value={answers.occupancyStatus}
          options={OCCUPANCY_STATUS}
          onChange={(v) => setAnswer("occupancyStatus", v)}
          columns
        />
      </Field>

      <p className="text-xs text-ink-40">
        By continuing you acknowledge that Renovessa produces planning estimates and conceptual diagrams, not
        contractor quotes or permit drawings. See{" "}
        <Link href="/bathroom-remodeling/rockville-md" className="underline">the landing page</Link> for details.
      </p>
    </div>
  );
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-ink-100">{label}</label>
      <div className="mt-2">{children}</div>
    </div>
  );
}

type Option = { id: string; label: string; hint?: string };

export function ChoiceList({
  name,
  value,
  options,
  onChange,
  columns,
}: {
  name: string;
  value?: string;
  options: readonly Option[];
  onChange: (v: string) => void;
  columns?: boolean;
}) {
  return (
    <div className={columns ? "grid gap-2 sm:grid-cols-2" : "space-y-2"}>
      {options.map((o) => {
        const checked = value === o.id;
        return (
          <label
            key={o.id}
            className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-sm transition ${
              checked ? "border-accent bg-accent/5" : "border-ink-15 hover:border-ink-40"
            }`}
          >
            <input
              type="radio"
              name={name}
              value={o.id}
              checked={checked}
              onChange={() => onChange(o.id)}
              className="mt-1"
            />
            <span>
              <span className="font-medium text-ink-100">{o.label}</span>
              {o.hint && <span className="block text-xs text-ink-70">{o.hint}</span>}
            </span>
          </label>
        );
      })}
    </div>
  );
}
