"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { StepProps } from "../planner-types";
import { PermitsStep } from "./PermitsStep";

type EstimateResult = {
  low: number;
  mid: number;
  high: number;
  confidence: { level: string; reasons: string[]; suggestions: string[] };
  lineItems: { category: string; low: number; mid: number; high: number }[];
  scenarios?: { id: string; label: string; total: number; compromises: string[]; benefits: string[] }[];
};

export function EstimateStep({ answers, setAnswer, flags, projectId, referenceNumber }: StepProps) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<EstimateResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showPermits, setShowPermits] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/bathroom-estimator/preview", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ answers }),
        });
        if (!res.ok) throw new Error(`Estimate failed (${res.status})`);
        const data = (await res.json()) as EstimateResult;
        if (!cancelled) setResult(data);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Unknown error");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void run();
    return () => {
      cancelled = true;
    };
  }, [answers]);

  if (loading) {
    return <p className="text-sm text-ink-70">Calculating planning range…</p>;
  }

  if (error) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-red-700">We couldn&apos;t generate an estimate yet. {error}</p>
        <p className="text-xs text-ink-40">You can still continue and request a contractor bid with the answers you have.</p>
      </div>
    );
  }

  if (!result) return null;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-ink-100">Your planning results</h2>
        <p className="mt-1 text-sm text-ink-70">Illustrative planning range only — not a contractor quote. Permit questions are optional below.</p>
      </div>

      <div className="rounded-xl border border-ink-15 bg-bone-1 p-5">
        <p className="text-xs uppercase tracking-wide text-ink-40">Planning range</p>
        <p className="mt-1 font-serif-landing text-3xl text-ink-100">
          ${result.low.toLocaleString()} – ${result.high.toLocaleString()}
        </p>
        <p className="mt-1 text-sm text-ink-70">Mid estimate: ${result.mid.toLocaleString()}</p>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-ink-100">Confidence: {result.confidence.level}</h3>
        {result.confidence.reasons.length > 0 && (
          <ul className="mt-2 list-disc pl-5 text-sm text-ink-70">
            {result.confidence.reasons.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        )}
        {result.confidence.suggestions.length > 0 && (
          <>
            <p className="mt-3 text-xs font-medium text-ink-40">To improve confidence:</p>
            <ul className="mt-1 list-disc pl-5 text-sm text-ink-70">
              {result.confidence.suggestions.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          </>
        )}
      </div>

      <div>
        <h3 className="text-sm font-semibold text-ink-100">Cost categories</h3>
        <div className="mt-2 overflow-hidden rounded-lg border border-ink-15">
          <table className="w-full text-sm">
            <thead className="bg-bone-1 text-left text-xs uppercase tracking-wide text-ink-40">
              <tr>
                <th className="p-3">Category</th>
                <th className="p-3">Low</th>
                <th className="p-3">Mid</th>
                <th className="p-3">High</th>
              </tr>
            </thead>
            <tbody>
              {result.lineItems.map((li) => (
                <tr key={li.category} className="border-t border-ink-15">
                  <td className="p-3">{li.category}</td>
                  <td className="p-3">${li.low.toLocaleString()}</td>
                  <td className="p-3">${li.mid.toLocaleString()}</td>
                  <td className="p-3">${li.high.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {result.scenarios && result.scenarios.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-ink-100">Budget scenarios</h3>
          <div className="mt-2 grid gap-3 sm:grid-cols-3">
            {result.scenarios.map((s) => (
              <div key={s.id} className="rounded-lg border border-ink-15 p-4">
                <p className="font-semibold text-ink-100">{s.label}</p>
                <p className="mt-1 text-lg text-ink-100">${s.total.toLocaleString()}</p>
                {s.benefits.length > 0 && (
                  <p className="mt-2 text-xs text-ink-70">Benefits: {s.benefits.join(", ")}</p>
                )}
                {s.compromises.length > 0 && (
                  <p className="mt-1 text-xs text-ink-40">Trade-offs: {s.compromises.join(", ")}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {flags.projectBrief && projectId && (
        <BriefActions projectId={projectId} />
      )}

      <div className="rounded-lg border border-ink-15 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold text-ink-100">Permit guidance</h3>
            <p className="mt-0.5 text-xs text-ink-40">
              Optional — flags likely categories for Rockville / Montgomery County. Not a legal determination.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowPermits((v) => !v)}
            className="text-sm font-medium text-accent"
          >
            {showPermits ? "Hide questions" : "Answer permit questions"}
          </button>
        </div>
        {showPermits && (
          <div className="mt-4 border-t border-ink-15 pt-4">
            <PermitsStep
              answers={answers}
              setAnswer={setAnswer}
              flags={flags}
              projectId={projectId}
              referenceNumber={referenceNumber}
            />
          </div>
        )}
      </div>

      {flags.contractorMatching && (
        <div className="rounded-lg border border-accent bg-accent/5 p-4">
          <p className="text-sm font-medium text-ink-100">Ready to request contractor bids?</p>
          <p className="mt-1 text-xs text-ink-70">Continue to generate your project brief and request bids from reviewed Rockville contractors.</p>
          <Link href="#" className="mt-2 inline-block text-sm font-medium text-accent">Continue to brief →</Link>
        </div>
      )}
    </div>
  );
}

function BriefActions({ projectId }: { projectId: string }) {
  const [generating, setGenerating] = useState(false);
  const [briefId, setBriefId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const generateBrief = async () => {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch(`/api/bathroom-projects/${projectId}/brief`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? `Failed (${res.status})`);
      }
      const data = (await res.json()) as { saved: { id: string } };
      setBriefId(data.saved.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="rounded-lg border border-ink-15 bg-bone-1 p-5">
      <h3 className="font-semibold text-ink-100">Project brief</h3>
      <p className="mt-1 text-sm text-ink-70">
        Generate a contractor-ready brief with your project details, planning estimate, and permit guidance.
        Then download it as a PDF to share with contractors.
      </p>
      {error && <p className="mt-2 text-sm text-red-700">{error}</p>}
      <div className="mt-3 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={generateBrief}
          disabled={generating}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-bone-0 transition hover:opacity-90 disabled:opacity-40"
        >
          {generating ? "Generating…" : briefId ? "Regenerate brief" : "Generate brief"}
        </button>
        {briefId && (
          <a
            href={`/api/bathroom-projects/${projectId}/brief/pdf`}
            className="rounded-lg border border-ink-15 px-4 py-2 text-sm font-medium text-ink-70 transition hover:border-ink-40"
          >
            Download PDF →
          </a>
        )}
      </div>
    </div>
  );
}
