"use client";

/**
 * Step 1 — Property address, and Step 2 — Confirm your roof.
 *
 * Two rules are enforced here rather than downstream:
 *   - more than one geocode candidate is shown for the homeowner to choose;
 *   - the analysed building is never used until the homeowner confirms it (§9).
 */

import { useState } from "react";
import type { NormalizedAddress, RoofAnalysis } from "@/lib/solar/types";
import { formatMonthYear, formatSquareFeet } from "@/lib/solar/formatters";
import { squareMetersToSquareFeet, compassLabel } from "@/lib/solar/geo";

export function AddressStep({
  address,
  onSelect,
  onManualCoordinates,
}: {
  address: NormalizedAddress | null;
  onSelect: (a: NormalizedAddress) => void;
  onManualCoordinates: (lat: number, lng: number) => void;
}) {
  const [query, setQuery] = useState(address?.formatted ?? "");
  const [candidates, setCandidates] = useState<NormalizedAddress[]>([]);
  const [failure, setFailure] = useState<{ message: string; recovery: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [showManual, setShowManual] = useState(false);
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");

  async function search(e: React.FormEvent) {
    e.preventDefault();
    if (query.trim().length < 4) return;
    setLoading(true);
    setFailure(null);
    setCandidates([]);
    try {
      const res = await fetch("/api/solar/geocode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFailure({ message: data.error ?? "Address lookup failed.", recovery: "MANUAL_COORDINATES" });
      } else if (data.failure) {
        setFailure({ message: data.failure.message, recovery: data.recovery });
      } else if (data.candidates.length === 1) {
        onSelect(data.candidates[0]);
      } else {
        setCandidates(data.candidates);
      }
    } catch {
      setFailure({
        message: "We couldn't reach the address service. Check your connection and try again.",
        recovery: "MANUAL_COORDINATES",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h2 className="text-xl font-semibold text-ink-100">Where is your home?</h2>
      <p className="mt-2 text-sm leading-relaxed text-ink-70">
        We use your address to look up your roof&rsquo;s shape, orientation and sunlight. Nothing is shared with
        installers unless you decide to request proposals.
      </p>

      <form onSubmit={search} className="mt-5 flex flex-col gap-3 sm:flex-row">
        <label className="sr-only" htmlFor="solar-address">
          Street address
        </label>
        <input
          id="solar-address"
          className="landing-input flex-1"
          placeholder="123 Main St, Rockville, MD 20850"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoComplete="street-address"
        />
        <button type="submit" className="landing-btn-primary whitespace-nowrap" disabled={loading}>
          {loading ? "Looking up…" : "See my roof →"}
        </button>
      </form>

      {failure && (
        <div className="mt-4 rounded-lg border border-ink-15 bg-bone-1 p-4">
          <p className="text-sm text-ink-100">{failure.message}</p>
          <button
            type="button"
            onClick={() => setShowManual(true)}
            className="mt-2 text-sm font-medium text-accent underline"
          >
            Enter coordinates manually instead
          </button>
        </div>
      )}

      {candidates.length > 1 && (
        <fieldset className="mt-5">
          <legend className="landing-label">We found more than one match — which is yours?</legend>
          <ul className="mt-2 space-y-2">
            {candidates.map((c) => (
              <li key={`${c.formatted}-${c.location.latitude}`}>
                <button
                  type="button"
                  onClick={() => onSelect(c)}
                  className="w-full rounded-lg border border-ink-15 bg-white p-3 text-left text-sm transition hover:border-accent"
                >
                  <span className="block font-medium text-ink-100">{c.formatted}</span>
                  <span className="block text-xs text-ink-40">
                    {c.locationQuality === "ROOFTOP"
                      ? "Precise rooftop match"
                      : "Approximate match — you'll confirm the building next"}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </fieldset>
      )}

      {showManual && (
        <div className="mt-5 rounded-lg border border-ink-15 bg-bone-1 p-4">
          <p className="text-sm text-ink-70">
            Enter your home&rsquo;s coordinates. You can find them by long-pressing your home in most map apps.
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <div>
              <label className="landing-label" htmlFor="solar-lat">
                Latitude
              </label>
              <input id="solar-lat" className="landing-input" value={lat} onChange={(e) => setLat(e.target.value)} />
            </div>
            <div>
              <label className="landing-label" htmlFor="solar-lng">
                Longitude
              </label>
              <input id="solar-lng" className="landing-input" value={lng} onChange={(e) => setLng(e.target.value)} />
            </div>
            <div className="flex items-end">
              <button
                type="button"
                className="landing-btn-ghost w-full"
                onClick={() => {
                  const la = Number(lat);
                  const lo = Number(lng);
                  if (Number.isFinite(la) && Number.isFinite(lo)) onManualCoordinates(la, lo);
                }}
              >
                Use these
              </button>
            </div>
          </div>
        </div>
      )}

      <p className="mt-6 text-xs leading-relaxed text-ink-40">
        Free planning tool. No obligation. Estimates are planning estimates — not installer proposals or engineering
        designs.
      </p>
    </div>
  );
}

/** Step 2 — the confirmation gate. Nothing downstream runs until this passes. */
export function ConfirmBuildingStep({
  address,
  analysis,
  imageryStaleYears,
  onConfirm,
  onReject,
  onPropertyChanged,
  propertyChanged,
}: {
  address: NormalizedAddress | null;
  analysis: RoofAnalysis;
  imageryStaleYears: number;
  onConfirm: () => void;
  onReject: () => void;
  onPropertyChanged: (changed: boolean) => void;
  propertyChanged: boolean;
}) {
  const imageryAgeYears = analysis.imageryDate
    ? (Date.now() - new Date(analysis.imageryDate).getTime()) / (365.25 * 86_400_000)
    : null;
  const stale = imageryAgeYears !== null && imageryAgeYears > imageryStaleYears;

  return (
    <div>
      <h2 className="text-xl font-semibold text-ink-100">Is this your home?</h2>
      <p className="mt-2 text-sm leading-relaxed text-ink-70">
        We found a building near {address?.formatted ?? "that location"}. Check the roof shape below against your
        home before we go any further — we won&rsquo;t analyse a building you haven&rsquo;t confirmed.
      </p>

      <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
        <div className="rounded-lg border border-ink-15 bg-bone-1 p-3">
          <dt className="landing-eyebrow">Roof faces found</dt>
          <dd className="mt-1 text-ink-100">
            {analysis.segments.length} ·{" "}
            {[...new Set(analysis.segments.map((s) => compassLabel(s.azimuthDegrees)))].join(", ") || "unknown"}
          </dd>
        </div>
        <div className="rounded-lg border border-ink-15 bg-bone-1 p-3">
          <dt className="landing-eyebrow">Total roof area</dt>
          <dd className="mt-1 text-ink-100">
            {analysis.wholeRoofAreaMeters2
              ? formatSquareFeet(squareMetersToSquareFeet(analysis.wholeRoofAreaMeters2))
              : "Not reported"}
          </dd>
        </div>
        <div className="rounded-lg border border-ink-15 bg-bone-1 p-3">
          <dt className="landing-eyebrow">Imagery captured</dt>
          <dd className="mt-1 text-ink-100">{formatMonthYear(analysis.imageryDate) ?? "Not reported"}</dd>
        </div>
        <div className="rounded-lg border border-ink-15 bg-bone-1 p-3">
          <dt className="landing-eyebrow">Suitable panel positions</dt>
          <dd className="mt-1 text-ink-100">{analysis.maxPanelCount}</dd>
        </div>
      </dl>

      {stale && (
        <div className="mt-5 rounded-lg border border-ink-15 bg-accent-100 p-4">
          <p className="text-sm text-ink-100">
            This imagery is about {Math.floor(imageryAgeYears!)} years old. Has anything changed since then — a new
            roof, an addition, trees removed or grown, new construction next door, or existing solar panels?
          </p>
          <label className="mt-3 flex items-start gap-2 text-sm text-ink-70">
            <input
              type="checkbox"
              checked={propertyChanged}
              onChange={(e) => onPropertyChanged(e.target.checked)}
              className="mt-0.5 h-4 w-4 accent-[#c17a2a]"
            />
            <span>Yes, something has changed. We&rsquo;ll flag this for your installer and lower the confidence.</span>
          </label>
        </div>
      )}

      <div className="mt-6 flex flex-wrap gap-3">
        <button type="button" onClick={onConfirm} className="landing-btn-primary">
          Yes, this is my home
        </button>
        <button type="button" onClick={onReject} className="landing-btn-ghost">
          No — let me describe my roof
        </button>
      </div>
    </div>
  );
}
