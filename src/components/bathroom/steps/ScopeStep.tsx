"use client";

import { Field, ChoiceList } from "./IntroStep";
import type { StepProps } from "../planner-types";
import {
  SHOWER_TUB_CHOICES,
  VANITY_CHOICES,
  FLOORING_CHOICES,
  WALL_FINISH_CHOICES,
  FIXTURE_QUALITY_TIERS,
  FIXTURE_REPLACEMENT_TYPES,
  ACCESSIBILITY_FEATURES,
} from "@/lib/bathroom/config";

function toOptions(list: readonly string[]): { id: string; label: string }[] {
  return list.map((id) => ({ id, label: id.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) }));
}

export function ScopeStep({ answers, setAnswer }: StepProps) {
  const isFixtureSwap = answers.projectObjective === "fixture_replacement";
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-ink-100">Scope and finishes</h2>
        <p className="mt-1 text-sm text-ink-70">Tell us what changes and the finish tier you have in mind.</p>
      </div>

      {isFixtureSwap && (
        <Field label="Which fixture are you replacing?">
          <ChoiceList
            name="fixtureType"
            value={answers.fixtureType}
            options={FIXTURE_REPLACEMENT_TYPES}
            onChange={(v) => setAnswer("fixtureType", v)}
            columns
          />
        </Field>
      )}

      {!isFixtureSwap && (
        <>
          <Field label="Shower / tub">
            <ChoiceList
              name="showerTub"
              value={answers.showerTub}
              options={toOptions(SHOWER_TUB_CHOICES)}
              onChange={(v) => setAnswer("showerTub", v)}
              columns
            />
          </Field>

          <Field label="Vanity">
            <ChoiceList
              name="vanity"
              value={answers.vanity}
              options={toOptions(VANITY_CHOICES)}
              onChange={(v) => setAnswer("vanity", v)}
              columns
            />
          </Field>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Flooring">
              <ChoiceList
                name="flooring"
                value={answers.flooring}
                options={toOptions(FLOORING_CHOICES)}
                onChange={(v) => setAnswer("flooring", v)}
                columns
              />
            </Field>
            <Field label="Wall finish">
              <ChoiceList
                name="wallFinish"
                value={answers.wallFinish}
                options={toOptions(WALL_FINISH_CHOICES)}
                onChange={(v) => setAnswer("wallFinish", v)}
                columns
              />
            </Field>
          </div>
        </>
      )}

      <Field label="Fixture and finish quality tier">
        <ChoiceList
          name="fixtureTier"
          value={answers.fixtureTier}
          options={FIXTURE_QUALITY_TIERS}
          onChange={(v) => setAnswer("fixtureTier", v)}
          columns
        />
      </Field>

      {!isFixtureSwap && (
      <Field label="Accessibility features (select all that apply)">
        <div className="grid gap-2 sm:grid-cols-2">
          {ACCESSIBILITY_FEATURES.map((f) => {
            const label = f.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
            const selected = (answers.accessibilityFeatures ?? "").split(",").includes(f);
            return (
              <label
                key={f}
                className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-sm transition ${
                  selected ? "border-accent bg-accent/5" : "border-ink-15 hover:border-ink-40"
                }`}
              >
                <input
                  type="checkbox"
                  checked={selected}
                  onChange={(e) => {
                    const current = (answers.accessibilityFeatures ?? "").split(",").filter(Boolean);
                    const next = e.target.checked
                      ? [...current, f]
                      : current.filter((x) => x !== f);
                    setAnswer("accessibilityFeatures", next.join(","));
                  }}
                  className="mt-1"
                />
                <span className="font-medium text-ink-100">{label}</span>
              </label>
            );
          })}
        </div>
      </Field>
      )}
    </div>
  );
}
