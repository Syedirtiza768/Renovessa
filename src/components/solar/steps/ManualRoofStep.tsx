"use client";

/**
 * Manual roof entry — the no-dead-end path (§37, §57).
 *
 * Reached when the geospatial provider has no coverage, timed out, returned
 * the wrong building, or is switched off. The homeowner describes their roof
 * faces and the whole rest of the planner works unchanged, at lower confidence.
 */

import { useState } from "react";

export interface ManualFace {
  azimuthDegrees: number;
  pitchDegrees: number;
  areaSquareFeet: number;
}

const DIRECTIONS = [
  { label: "South", azimuth: 180 },
  { label: "South-west", azimuth: 225 },
  { label: "South-east", azimuth: 135 },
  { label: "West", azimuth: 270 },
  { label: "East", azimuth: 90 },
  { label: "North-west", azimuth: 315 },
  { label: "North-east", azimuth: 45 },
  { label: "North", azimuth: 0 },
];

const PITCHES = [
  { label: "Flat or nearly flat", degrees: 3 },
  { label: "Low slope", degrees: 15 },
  { label: "Typical", degrees: 27 },
  { label: "Steep", degrees: 38 },
  { label: "Very steep", degrees: 50 },
];

export function ManualRoofStep({
  reason,
  onSubmit,
  onRetryProvider,
  retryable,
}: {
  reason: string;
  onSubmit: (faces: ManualFace[]) => void;
  onRetryProvider?: () => void;
  retryable: boolean;
}) {
  const [faces, setFaces] = useState<ManualFace[]>([
    { azimuthDegrees: 180, pitchDegrees: 27, areaSquareFeet: 500 },
  ]);

  const update = (i: number, patch: Partial<ManualFace>) =>
    setFaces((prev) => prev.map((f, idx) => (idx === i ? { ...f, ...patch } : f)));

  return (
    <div>
      <h2 className="text-xl font-semibold text-ink-100">Tell us about your roof</h2>
      <p className="mt-2 text-sm leading-relaxed text-ink-70">{reason}</p>
      <p className="mt-2 text-sm leading-relaxed text-ink-70">
        Describe the roof faces you&rsquo;d consider putting panels on. Rough numbers are fine — we&rsquo;ll model
        production from them and mark the result as preliminary, because it isn&rsquo;t measured data.
      </p>

      {retryable && onRetryProvider && (
        <button type="button" onClick={onRetryProvider} className="mt-4 text-sm font-medium text-accent underline">
          Try automatic roof analysis again
        </button>
      )}

      <ul className="mt-6 space-y-4">
        {faces.map((face, i) => (
          <li key={i} className="rounded-lg border border-ink-15 bg-bone-1 p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-ink-100">Roof face {i + 1}</h3>
              {faces.length > 1 && (
                <button
                  type="button"
                  onClick={() => setFaces((prev) => prev.filter((_, idx) => idx !== i))}
                  className="text-xs text-ink-40 underline"
                >
                  Remove
                </button>
              )}
            </div>

            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <div>
                <label className="landing-label" htmlFor={`face-dir-${i}`}>
                  Which way does it slope?
                </label>
                <select
                  id={`face-dir-${i}`}
                  className="landing-input"
                  value={face.azimuthDegrees}
                  onChange={(e) => update(i, { azimuthDegrees: Number(e.target.value) })}
                >
                  {DIRECTIONS.map((d) => (
                    <option key={d.azimuth} value={d.azimuth}>
                      {d.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="landing-label" htmlFor={`face-pitch-${i}`}>
                  How steep is it?
                </label>
                <select
                  id={`face-pitch-${i}`}
                  className="landing-input"
                  value={face.pitchDegrees}
                  onChange={(e) => update(i, { pitchDegrees: Number(e.target.value) })}
                >
                  {PITCHES.map((p) => (
                    <option key={p.degrees} value={p.degrees}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="landing-label" htmlFor={`face-area-${i}`}>
                  Roughly how big? (sq ft)
                </label>
                <input
                  id={`face-area-${i}`}
                  inputMode="numeric"
                  className="landing-input"
                  value={face.areaSquareFeet}
                  onChange={(e) => update(i, { areaSquareFeet: Number(e.target.value) || 0 })}
                />
              </div>
            </div>
          </li>
        ))}
      </ul>

      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() =>
            setFaces((prev) => [...prev, { azimuthDegrees: 270, pitchDegrees: 27, areaSquareFeet: 400 }])
          }
          className="landing-btn-ghost"
          disabled={faces.length >= 12}
        >
          + Add another roof face
        </button>
        <button
          type="button"
          onClick={() => onSubmit(faces.filter((f) => f.areaSquareFeet > 0))}
          className="landing-btn-primary"
          disabled={!faces.some((f) => f.areaSquareFeet > 0)}
        >
          Continue with this roof →
        </button>
      </div>

      <p className="mt-5 text-xs leading-relaxed text-ink-40">
        Because this roof wasn&rsquo;t measured from aerial data, panel positions shown are a planning sketch, per-panel
        sunlight isn&rsquo;t modelled, and your installer will need to measure the roof on site.
      </p>
    </div>
  );
}
