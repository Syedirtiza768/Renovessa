"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { DEFAULT_STUDIO_PRICING, type StudioPricingSettings } from "@/lib/bathroom/contractor-pricing";

type Letterhead = {
  companyName: string;
  contactPerson: string;
  letterheadPhone: string;
  letterheadEmail: string;
  letterheadAddress: string;
  letterheadTagline: string;
  letterheadLicenseText: string;
  proposalFooterText: string;
};

export function LetterheadEditor() {
  const [form, setForm] = useState<Letterhead>({
    companyName: "",
    contactPerson: "",
    letterheadPhone: "",
    letterheadEmail: "",
    letterheadAddress: "",
    letterheadTagline: "",
    letterheadLicenseText: "",
    proposalFooterText: "",
  });
  const [pricing, setPricing] = useState<StudioPricingSettings>(DEFAULT_STUDIO_PRICING);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/contractor/letterhead");
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed");
        setForm({
          companyName: data.companyName || "",
          contactPerson: data.contactPerson || "",
          letterheadPhone: data.letterheadPhone || "",
          letterheadEmail: data.letterheadEmail || "",
          letterheadAddress: data.letterheadAddress || "",
          letterheadTagline: data.letterheadTagline || "",
          letterheadLicenseText: data.letterheadLicenseText || "",
          proposalFooterText: data.proposalFooterText || "",
        });
        if (data.studioPricing) setPricing(data.studioPricing);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    setError(null);
    try {
      const res = await fetch("/api/contractor/letterhead", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contactPerson: form.contactPerson,
          letterheadPhone: form.letterheadPhone,
          letterheadEmail: form.letterheadEmail,
          letterheadAddress: form.letterheadAddress,
          letterheadTagline: form.letterheadTagline,
          letterheadLicenseText: form.letterheadLicenseText,
          proposalFooterText: form.proposalFooterText,
          studioPricing: pricing,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      setMsg("Letterhead and pricing defaults saved.");
      setForm((f) => ({ ...f, ...data }));
      if (data.studioPricing) setPricing(data.studioPricing);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className="text-sm text-stone-600">Loading…</p>;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link href="/portal/contractor/proposal-studio" className="text-xs text-stone-500 hover:text-stone-800">
          ← Proposal studio
        </Link>
        <h1 className="mt-2 font-serif text-3xl text-stone-900">Letterhead & pricing</h1>
        <p className="mt-1 text-sm text-stone-600">
          Letterhead appears on every proposal PDF. Pricing defaults apply when you seed estimates.
          Company name comes from your profile ({form.companyName}).
        </p>
      </div>

      {error && <p className="text-sm text-red-700">{error}</p>}
      {msg && <p className="text-sm text-emerald-800">{msg}</p>}

      <form onSubmit={save} className="space-y-6">
        <section className="space-y-3 rounded-2xl border border-stone-200 bg-white p-6">
          <h2 className="text-base font-semibold text-stone-900">Letterhead</h2>
          {(
            [
              ["contactPerson", "Contact person"],
              ["letterheadPhone", "Phone"],
              ["letterheadEmail", "Email"],
              ["letterheadAddress", "Address"],
              ["letterheadTagline", "Tagline"],
              ["letterheadLicenseText", "License / insurance line"],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className="block text-sm">
              <span className="text-stone-500">{label}</span>
              <input
                value={form[key]}
                onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2"
              />
            </label>
          ))}
          <label className="block text-sm">
            <span className="text-stone-500">PDF footer</span>
            <textarea
              rows={3}
              value={form.proposalFooterText}
              onChange={(e) => setForm((f) => ({ ...f, proposalFooterText: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2"
              placeholder="Optional disclaimer under your proposals"
            />
          </label>
        </section>

        <section className="space-y-3 rounded-2xl border border-stone-200 bg-white p-6">
          <h2 className="text-base font-semibold text-stone-900">Studio pricing defaults</h2>
          <p className="text-xs text-stone-500">
            Markup is percent on cost. Gross margin is percent of customer price — they are not the same.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {(
              [
                ["markupPercent", "Default markup %"],
                ["overheadPercent", "Overhead %"],
                ["contingencyPercent", "Contingency %"],
                ["minimumGrossMarginPercent", "Minimum gross margin %"],
                ["defaultLaborRate", "Default labor rate ($/hr)"],
              ] as const
            ).map(([key, label]) => (
              <label key={key} className="block text-sm">
                <span className="text-stone-500">{label}</span>
                <input
                  type="number"
                  value={pricing[key]}
                  onChange={(e) =>
                    setPricing((p) => ({ ...p, [key]: Number(e.target.value) }))
                  }
                  className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2"
                />
              </label>
            ))}
          </div>
        </section>

        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-stone-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
        >
          {saving ? "Saving…" : "Save settings"}
        </button>
      </form>
    </div>
  );
}
