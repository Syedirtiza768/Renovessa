"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

type ProposalForm = {
  totalPrice: number;
  includedScope: string;
  exclusions: string;
  materialAllowances: string;
  fixtureAllowances: string;
  permitHandling: string;
  estimatedStartDate: string;
  estimatedDuration: string;
  paymentSchedule: string;
  warranty: string;
  changeOrderProcess: string;
  optionalUpgrades: string;
  suggestedChanges: string;
};

const emptyProposal = (): ProposalForm => ({
  totalPrice: 0,
  includedScope: "",
  exclusions: "",
  materialAllowances: "",
  fixtureAllowances: "",
  permitHandling: "",
  estimatedStartDate: "",
  estimatedDuration: "",
  paymentSchedule: "",
  warranty: "",
  changeOrderProcess: "",
  optionalUpgrades: "",
  suggestedChanges: "",
});

export function StudioWorkspace({ jobId }: { jobId: string }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState("");
  const [project, setProject] = useState<any>(null);
  const [proposalId, setProposalId] = useState<string | null>(null);
  const [form, setForm] = useState<ProposalForm>(emptyProposal());
  const [prompt, setPrompt] = useState("");
  const [estimate, setEstimate] = useState<{ low: number; mid: number; high: number } | null>(null);
  const [jobMeta, setJobMeta] = useState({
    clientName: "",
    jobTitle: "",
    clientPhone: "",
    clientEmail: "",
    bathroomType: "",
    projectObjective: "",
    length: "",
    width: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/contractor/bathroom-jobs/${jobId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load");
      setProject(data.project);
      setCompanyName(data.profile.companyName);
      const answers = (data.project.answersJson || {}) as Record<string, string>;
      setJobMeta({
        clientName: data.project.clientName || "",
        jobTitle: data.project.jobTitle || "",
        clientPhone: data.project.clientPhone || "",
        clientEmail: data.project.clientEmail || "",
        bathroomType: data.project.bathroomType || "",
        projectObjective: data.project.projectObjective || "",
        length: answers.length || "",
        width: answers.width || "",
      });
      setPrompt(answers.requirementsPrompt || "");
      const latest = data.project.proposals?.[0];
      if (latest) {
        setProposalId(latest.id);
        setForm({
          totalPrice: latest.totalPrice,
          includedScope: latest.includedScope || "",
          exclusions: latest.exclusions || "",
          materialAllowances: latest.materialAllowances || "",
          fixtureAllowances: latest.fixtureAllowances || "",
          permitHandling: latest.permitHandling || "",
          estimatedStartDate: latest.estimatedStartDate || "",
          estimatedDuration: latest.estimatedDuration || "",
          paymentSchedule: latest.paymentSchedule || "",
          warranty: latest.warranty || "",
          changeOrderProcess: latest.changeOrderProcess || "",
          optionalUpgrades: latest.optionalUpgrades || "",
          suggestedChanges: latest.suggestedChanges || "",
        });
      }
      const est = data.project.estimates?.[0];
      if (est) {
        setEstimate({
          low: est.lowAmount,
          mid: est.expectedLowAmount,
          high: est.highComplexityAmount,
        });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  }, [jobId]);

  useEffect(() => {
    void load();
  }, [load]);

  const setField = <K extends keyof ProposalForm>(key: K, value: ProposalForm[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
  };

  const saveJobMeta = async () => {
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/contractor/bathroom-jobs/${jobId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientName: jobMeta.clientName,
          jobTitle: jobMeta.jobTitle,
          clientPhone: jobMeta.clientPhone,
          clientEmail: jobMeta.clientEmail,
          bathroomType: jobMeta.bathroomType || undefined,
          projectObjective: jobMeta.projectObjective || undefined,
          requirementsPrompt: prompt,
          answers: {
            length: jobMeta.length,
            width: jobMeta.width,
            requirementsPrompt: prompt,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      setMsg("Job details saved.");
      setProject(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const runEstimate = async () => {
    setSaving(true);
    setError(null);
    try {
      await saveJobMeta();
      const res = await fetch(`/api/contractor/bathroom-jobs/${jobId}/estimate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Estimate failed");
      setEstimate({ low: data.low, mid: data.mid, high: data.high });
      if (!form.totalPrice) setField("totalPrice", data.mid);
      setMsg(data.note || "Estimate ready.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Estimate failed");
    } finally {
      setSaving(false);
    }
  };

  const draftFromPrompt = async () => {
    setSaving(true);
    setError(null);
    try {
      await saveJobMeta();
      const res = await fetch(`/api/contractor/bathroom-jobs/${jobId}/draft-proposal`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: prompt || "Bathroom remodel proposal for this client.", seedFromEstimate: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Draft failed");
      const d = data.draft;
      setForm({
        totalPrice: d.totalPrice,
        includedScope: d.includedScope,
        exclusions: d.exclusions,
        materialAllowances: d.materialAllowances,
        fixtureAllowances: d.fixtureAllowances,
        permitHandling: d.permitHandling,
        estimatedStartDate: d.estimatedStartDate,
        estimatedDuration: d.estimatedDuration,
        paymentSchedule: d.paymentSchedule,
        warranty: d.warranty,
        changeOrderProcess: d.changeOrderProcess,
        optionalUpgrades: d.optionalUpgrades,
        suggestedChanges: d.suggestedChanges,
      });
      setMsg(d.note);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Draft failed");
    } finally {
      setSaving(false);
    }
  };

  const saveProposal = async () => {
    setSaving(true);
    setError(null);
    try {
      const payload = { ...form, totalPrice: Number(form.totalPrice) || 0 };
      const url = proposalId
        ? `/api/contractor/bathroom-jobs/${jobId}/proposals/${proposalId}`
        : `/api/contractor/bathroom-jobs/${jobId}/proposals`;
      const res = await fetch(url, {
        method: proposalId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      setProposalId(data.id);
      setMsg("Proposal saved — download PDF when ready.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className="text-sm text-stone-600">Loading job…</p>;
  if (!project) return <p className="text-sm text-red-700">{error || "Job not found"}</p>;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-stone-200 pb-4">
        <div>
          <Link href="/portal/contractor/proposal-studio" className="text-xs text-stone-500 hover:text-stone-800">
            ← All jobs
          </Link>
          <p className="mt-2 text-xs uppercase tracking-[0.2em] text-stone-500">{companyName}</p>
          <h1 className="font-serif text-3xl text-stone-900">{project.jobTitle || project.clientName}</h1>
          <p className="text-sm text-stone-500">{project.referenceNumber}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {proposalId && (
            <a
              href={`/api/contractor/bathroom-jobs/${jobId}/proposals/${proposalId}/pdf`}
              className="rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-800 hover:bg-stone-50"
            >
              Download PDF
            </a>
          )}
          <Link
            href="/portal/contractor/proposal-studio/letterhead"
            className="rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-800 hover:bg-stone-50"
          >
            Letterhead
          </Link>
        </div>
      </div>

      {error && <p className="text-sm text-red-700">{error}</p>}
      {msg && <p className="text-sm text-emerald-800">{msg}</p>}

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="space-y-4 rounded-2xl border border-stone-200 bg-white p-5">
          <h2 className="text-base font-semibold text-stone-900">Job intake</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {(
              [
                ["clientName", "Client"],
                ["jobTitle", "Job title"],
                ["clientPhone", "Phone"],
                ["clientEmail", "Email"],
                ["bathroomType", "Bathroom type"],
                ["projectObjective", "Objective"],
                ["length", "Length (ft)"],
                ["width", "Width (ft)"],
              ] as const
            ).map(([key, label]) => (
              <label key={key} className="text-sm">
                <span className="text-stone-500">{label}</span>
                <input
                  value={jobMeta[key]}
                  onChange={(e) => setJobMeta((m) => ({ ...m, [key]: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2"
                />
              </label>
            ))}
          </div>
          <label className="block text-sm">
            <span className="text-stone-500">Prompt / scope notes</span>
            <textarea
              rows={5}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2"
              placeholder="Describe what you’ll bid — AI will draft proposal fields you can edit."
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={saveJobMeta}
              disabled={saving}
              className="rounded-lg border border-stone-300 px-3 py-2 text-sm disabled:opacity-40"
            >
              Save job
            </button>
            <button
              type="button"
              onClick={runEstimate}
              disabled={saving}
              className="rounded-lg border border-stone-300 px-3 py-2 text-sm disabled:opacity-40"
            >
              Run planning estimate
            </button>
            <button
              type="button"
              onClick={draftFromPrompt}
              disabled={saving}
              className="rounded-lg bg-stone-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-40"
            >
              Draft proposal from prompt
            </button>
          </div>
          {estimate && (
            <div className="rounded-xl bg-stone-50 p-4 text-sm text-stone-700">
              <p className="font-medium text-stone-900">Internal planning range</p>
              <p className="mt-1 text-lg">
                ${estimate.low.toLocaleString()} – ${estimate.high.toLocaleString()}
              </p>
              <p className="text-xs text-stone-500">Mid ${estimate.mid.toLocaleString()} · not shown as your client price unless you choose it</p>
            </div>
          )}
        </section>

        <section className="space-y-3 rounded-2xl border border-stone-200 bg-white p-5">
          <h2 className="text-base font-semibold text-stone-900">Client proposal</h2>
          <p className="text-xs text-stone-500">Fully editable. Your letterhead appears on the PDF.</p>

          <label className="block text-sm">
            <span className="text-stone-500">Total price ($)</span>
            <input
              type="number"
              value={form.totalPrice || ""}
              onChange={(e) => setField("totalPrice", Number(e.target.value))}
              className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-lg font-semibold"
            />
          </label>

          {(
            [
              ["includedScope", "Included scope", 6],
              ["exclusions", "Exclusions", 4],
              ["suggestedChanges", "Suggested changes / recommendations", 3],
              ["materialAllowances", "Material allowances", 2],
              ["fixtureAllowances", "Fixture allowances", 2],
              ["permitHandling", "Permits", 2],
              ["estimatedStartDate", "Estimated start", 1],
              ["estimatedDuration", "Duration", 1],
              ["paymentSchedule", "Payment schedule", 2],
              ["warranty", "Warranty", 2],
              ["changeOrderProcess", "Change orders", 2],
              ["optionalUpgrades", "Optional upgrades", 2],
            ] as const
          ).map(([key, label, rows]) => (
            <label key={key} className="block text-sm">
              <span className="text-stone-500">{label}</span>
              {rows === 1 ? (
                <input
                  value={form[key]}
                  onChange={(e) => setField(key, e.target.value)}
                  className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2"
                />
              ) : (
                <textarea
                  rows={rows}
                  value={form[key]}
                  onChange={(e) => setField(key, e.target.value)}
                  className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2"
                />
              )}
            </label>
          ))}

          <button
            type="button"
            onClick={saveProposal}
            disabled={saving || !form.includedScope || !form.exclusions}
            className="rounded-lg bg-stone-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
          >
            {proposalId ? "Update proposal" : "Save proposal"}
          </button>
        </section>
      </div>
    </div>
  );
}
