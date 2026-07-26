"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { ContractorPricedLineItem, PricingTotals, StudioPricingSettings } from "@/lib/bathroom/contractor-pricing";
import { DEFAULT_STUDIO_PRICING, recalculatePricing } from "@/lib/bathroom/contractor-pricing";

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
  const [proposalStatus, setProposalStatus] = useState<string>("DRAFT");
  const [form, setForm] = useState<ProposalForm>(emptyProposal());
  const [prompt, setPrompt] = useState("");
  const [estimate, setEstimate] = useState<{ low: number; mid: number; high: number; estimateId?: string | null } | null>(null);
  const [lineItems, setLineItems] = useState<ContractorPricedLineItem[]>([]);
  const [pricingSettings, setPricingSettings] = useState<StudioPricingSettings>(DEFAULT_STUDIO_PRICING);
  const [ackLowMargin, setAckLowMargin] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [shareExpiresAt, setShareExpiresAt] = useState<string | null>(null);
  const [viewCount, setViewCount] = useState(0);
  const [clientMessages, setClientMessages] = useState<
    Array<{ id: string; kind: string; body: string; authorName: string | null; createdAt: string }>
  >([]);
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

  const liveTotals: PricingTotals | null = useMemo(() => {
    if (!lineItems.length) return null;
    return recalculatePricing(lineItems, pricingSettings).totals;
  }, [lineItems, pricingSettings]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/contractor/bathroom-jobs/${jobId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load");
      setProject(data.project);
      setCompanyName(data.profile.companyName);
      if (data.pricingSettings) setPricingSettings(data.pricingSettings);
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
        setProposalStatus(latest.status || "DRAFT");
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
        if (Array.isArray(latest.lineItemsJson)) {
          setLineItems(latest.lineItemsJson);
        }
        setViewCount(latest.viewCount || 0);
        setShareExpiresAt(latest.shareExpiresAt || null);
        if (latest.shareToken) {
          setShareUrl(`${window.location.origin}/proposal/${latest.shareToken}`);
        } else {
          setShareUrl(null);
        }
        setClientMessages(
          (latest.clientMessages || []).map((m: any) => ({
            id: m.id,
            kind: m.kind,
            body: m.body,
            authorName: m.authorName,
            createdAt: m.createdAt,
          })),
        );
      }
      const est = data.project.estimates?.[0];
      if (est) {
        setEstimate({
          low: est.lowAmount,
          mid: est.expectedLowAmount,
          high: est.highComplexityAmount,
          estimateId: est.id,
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

  const updateLine = (key: string, patch: Partial<ContractorPricedLineItem>) => {
    setLineItems((items) =>
      items.map((li) => {
        if (li.key !== key) return li;
        const next = { ...li, ...patch };
        if (patch.unitCost !== undefined || patch.quantity !== undefined || patch.markupPercent !== undefined) {
          next.customerPriceLocked = patch.customerPrice !== undefined ? true : false;
          next.costSource = "contractor_override";
        }
        if (patch.customerPrice !== undefined) {
          next.customerPriceLocked = true;
          next.costSource = "contractor_override";
        }
        return next;
      }),
    );
    setProposalStatus((s) => (s === "APPROVED" || s === "SENT" ? "DRAFT" : s));
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
      setEstimate({
        low: data.low,
        mid: data.mid,
        high: data.high,
        estimateId: data.savedId,
      });
      if (data.pricingSettings) setPricingSettings(data.pricingSettings);
      if (Array.isArray(data.pricedLineItems)) {
        setLineItems(data.pricedLineItems);
        if (data.totals?.customerTotal) {
          setField("totalPrice", data.totals.customerTotal);
        }
      }
      setProposalStatus("DRAFT");
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
      const nextTotal =
        liveTotals?.customerTotal ||
        d.suggestedTotalPrice ||
        form.totalPrice ||
        0;
      setForm({
        totalPrice: nextTotal,
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
      const priced = lineItems.length ? recalculatePricing(lineItems, pricingSettings) : null;
      const payload = {
        ...form,
        totalPrice: priced?.totals.customerTotal ?? Number(form.totalPrice) || 0,
        estimateId: estimate?.estimateId || undefined,
        lineItems: priced?.lineItems,
        recomputeFromLines: Boolean(priced),
        pricingSettings,
      };
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
      setProposalStatus(data.status || "DRAFT");
      setForm((f) => ({ ...f, totalPrice: data.totalPrice }));
      if (Array.isArray(data.lineItemsJson)) setLineItems(data.lineItemsJson);
      setMsg("Draft saved. Approve before downloading the client PDF.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const approveProposal = async () => {
    if (!proposalId) {
      setError("Save the proposal first.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const priced = lineItems.length ? recalculatePricing(lineItems, pricingSettings) : null;
      const payload = {
        ...form,
        totalPrice: priced?.totals.customerTotal ?? Number(form.totalPrice) || 0,
        estimateId: estimate?.estimateId || undefined,
        lineItems: priced?.lineItems,
        recomputeFromLines: Boolean(priced),
        pricingSettings,
      };
      const saveRes = await fetch(`/api/contractor/bathroom-jobs/${jobId}/proposals/${proposalId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const saved = await saveRes.json();
      if (!saveRes.ok) throw new Error(saved.error || "Save failed");

      const res = await fetch(`/api/contractor/bathroom-jobs/${jobId}/proposals/${proposalId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          acknowledgeBelowMinimumMargin: ackLowMargin,
          overrideReason: ackLowMargin ? "Contractor acknowledged below-minimum margin" : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.code === "BELOW_MINIMUM_MARGIN") {
          setError(data.error);
          return;
        }
        throw new Error(data.error || "Approve failed");
      }
      setProposalStatus(data.proposal.status);
      setForm((f) => ({ ...f, totalPrice: data.proposal.totalPrice ?? f.totalPrice }));
      setMsg(data.note);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Approve failed");
    } finally {
      setSaving(false);
    }
  };

  const sendToClient = async () => {
    if (!proposalId) {
      setError("Save and approve the proposal first.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/contractor/bathroom-jobs/${jobId}/proposals/${proposalId}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ expiresDays: 30 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Send failed");
      setProposalStatus(data.proposal.status);
      setShareUrl(data.shareUrl);
      setShareExpiresAt(data.shareExpiresAt);
      setMsg(data.note);
      try {
        await navigator.clipboard.writeText(data.shareUrl);
        setMsg(`${data.note} Link copied to clipboard.`);
      } catch {
        /* clipboard may be blocked */
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Send failed");
    } finally {
      setSaving(false);
    }
  };

  const revokeShare = async () => {
    if (!proposalId) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/contractor/bathroom-jobs/${jobId}/proposals/${proposalId}/send`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Revoke failed");
      setProposalStatus(data.proposal.status);
      setShareUrl(null);
      setShareExpiresAt(null);
      setMsg("Client link revoked.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Revoke failed");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className="text-sm text-stone-600">Loading job…</p>;
  if (!project) return <p className="text-sm text-red-700">{error || "Job not found"}</p>;

  const canSend = proposalStatus === "APPROVED" || proposalStatus === "SENT";
  const lockedAccepted = proposalStatus === "ACCEPTED";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-stone-200 pb-4">
        <div>
          <Link href="/portal/contractor/proposal-studio" className="text-xs text-stone-500 hover:text-stone-800">
            ← All jobs
          </Link>
          <p className="mt-2 text-xs uppercase tracking-[0.2em] text-stone-500">{companyName}</p>
          <h1 className="font-serif text-3xl text-stone-900">{project.jobTitle || project.clientName}</h1>
          <p className="text-sm text-stone-500">
            {project.referenceNumber}
            <span className="ml-2 rounded-full bg-stone-100 px-2 py-0.5 text-xs uppercase tracking-wide text-stone-600">
              {proposalStatus.replace(/_/g, " ")}
            </span>
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {proposalId && (
            <>
              <a
                href={`/api/contractor/bathroom-jobs/${jobId}/proposals/${proposalId}/pdf?preview=1`}
                className="rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-800 hover:bg-stone-50"
              >
                Draft PDF preview
              </a>
              {(proposalStatus === "APPROVED" ||
                proposalStatus === "SENT" ||
                proposalStatus === "ACCEPTED" ||
                proposalStatus === "REVISION_REQUESTED") && (
                <a
                  href={`/api/contractor/bathroom-jobs/${jobId}/proposals/${proposalId}/pdf`}
                  className="rounded-lg bg-emerald-800 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-900"
                >
                  Download client PDF
                </a>
              )}
            </>
          )}
          <Link
            href="/portal/contractor/proposal-studio/letterhead"
            className="rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-800 hover:bg-stone-50"
          >
            Letterhead & pricing
          </Link>
        </div>
      </div>

      {error && <p className="text-sm text-red-700">{error}</p>}
      {msg && <p className="text-sm text-emerald-800">{msg}</p>}

      <div className="grid gap-6 xl:grid-cols-2">
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
              placeholder="Describe the job — we draft proposal language; your pricing engine sets dollars."
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
              Run estimate + price lines
            </button>
            <button
              type="button"
              onClick={draftFromPrompt}
              disabled={saving}
              className="rounded-lg bg-stone-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-40"
            >
              Draft proposal language
            </button>
          </div>
          {estimate && (
            <div className="rounded-xl bg-stone-50 p-4 text-sm text-stone-700">
              <p className="font-medium text-stone-900">Renovessa baseline planning range</p>
              <p className="mt-1 text-lg">
                ${estimate.low.toLocaleString()} – ${estimate.high.toLocaleString()}
              </p>
              <p className="text-xs text-stone-500">
                Mid ${estimate.mid.toLocaleString()} · reference only — your markup produces the client total
              </p>
            </div>
          )}
        </section>

        <section className="space-y-3 rounded-2xl border border-stone-200 bg-white p-5">
          <h2 className="text-base font-semibold text-stone-900">Client proposal</h2>
          <p className="text-xs text-stone-500">
            Customer-facing copy. Internal costs stay on your side only.
          </p>

          {liveTotals && (
            <div className="rounded-xl border border-stone-200 bg-stone-50 p-4 text-sm">
              <p className="font-medium text-stone-900">Internal profitability</p>
              <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1">
                <dt className="text-stone-500">Direct cost</dt>
                <dd className="text-right tabular-nums">${liveTotals.directCostTotal.toLocaleString()}</dd>
                <dt className="text-stone-500">Overhead</dt>
                <dd className="text-right tabular-nums">${liveTotals.overheadAmount.toLocaleString()}</dd>
                <dt className="text-stone-500">Contingency</dt>
                <dd className="text-right tabular-nums">${liveTotals.contingencyAmount.toLocaleString()}</dd>
                <dt className="text-stone-500">Profit</dt>
                <dd className="text-right tabular-nums">${liveTotals.profitAmount.toLocaleString()}</dd>
                <dt className="text-stone-500">Markup on cost</dt>
                <dd className="text-right tabular-nums">{liveTotals.markupPercent}%</dd>
                <dt className="text-stone-500">Gross margin</dt>
                <dd className={`text-right tabular-nums ${liveTotals.belowMinimumMargin ? "text-amber-700 font-semibold" : ""}`}>
                  {liveTotals.grossMarginPercent.toFixed(1)}%
                </dd>
                <dt className="font-medium text-stone-800">Customer total</dt>
                <dd className="text-right text-base font-semibold tabular-nums">
                  ${liveTotals.customerTotal.toLocaleString()}
                </dd>
              </dl>
              {liveTotals.belowMinimumMargin && (
                <label className="mt-3 flex items-start gap-2 text-xs text-amber-900">
                  <input
                    type="checkbox"
                    checked={ackLowMargin}
                    onChange={(e) => setAckLowMargin(e.target.checked)}
                    className="mt-0.5"
                  />
                  <span>
                    Margin is below your minimum ({liveTotals.minimumGrossMarginPercent}%). I acknowledge
                    and want to approve anyway.
                  </span>
                </label>
              )}
            </div>
          )}

          {!liveTotals && (
            <label className="block text-sm">
              <span className="text-stone-500">Total price ($)</span>
              <input
                type="number"
                value={form.totalPrice || ""}
                onChange={(e) => setField("totalPrice", Number(e.target.value))}
                className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-lg font-semibold"
              />
            </label>
          )}

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

          <div className="flex flex-wrap gap-2 pt-2">
            <button
              type="button"
              onClick={saveProposal}
              disabled={saving || lockedAccepted || !form.includedScope || !form.exclusions}
              className="rounded-lg border border-stone-300 px-4 py-2 text-sm disabled:opacity-40"
            >
              {proposalId ? "Save draft" : "Create draft"}
            </button>
            <button
              type="button"
              onClick={approveProposal}
              disabled={saving || !proposalId || lockedAccepted || proposalStatus === "APPROVED" || proposalStatus === "SENT"}
              className="rounded-lg bg-stone-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
            >
              {proposalStatus === "APPROVED" || proposalStatus === "SENT" ? "Approved" : "Approve for client"}
            </button>
            <button
              type="button"
              onClick={sendToClient}
              disabled={saving || !proposalId || !canSend || lockedAccepted}
              className="rounded-lg bg-emerald-800 px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
            >
              {proposalStatus === "SENT" ? "Re-send client link" : "Send client link"}
            </button>
          </div>

          {shareUrl && (
            <div className="mt-3 rounded-xl border border-stone-200 bg-stone-50 p-3 text-sm">
              <p className="font-medium text-stone-900">Client share link</p>
              <p className="mt-1 break-all text-xs text-stone-600">{shareUrl}</p>
              <p className="mt-1 text-xs text-stone-500">
                Views: {viewCount}
                {shareExpiresAt ? ` · expires ${new Date(shareExpiresAt).toLocaleDateString()}` : ""}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  className="rounded border border-stone-300 px-2 py-1 text-xs"
                  onClick={() => {
                    void navigator.clipboard.writeText(shareUrl);
                    setMsg("Link copied.");
                  }}
                >
                  Copy link
                </button>
                <a
                  href={shareUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded border border-stone-300 px-2 py-1 text-xs"
                >
                  Open
                </a>
                {!lockedAccepted && (
                  <button
                    type="button"
                    onClick={revokeShare}
                    disabled={saving}
                    className="rounded border border-stone-300 px-2 py-1 text-xs text-red-800 disabled:opacity-40"
                  >
                    Revoke link
                  </button>
                )}
              </div>
            </div>
          )}

          {clientMessages.length > 0 && (
            <div className="mt-3 space-y-2">
              <p className="text-sm font-medium text-stone-900">Client messages</p>
              {clientMessages.map((m) => (
                <div key={m.id} className="rounded-lg border border-stone-200 p-2 text-xs text-stone-700">
                  <p className="uppercase tracking-wide text-stone-400">
                    {m.kind.replace(/_/g, " ")}
                    {m.authorName ? ` · ${m.authorName}` : ""}
                  </p>
                  <p className="mt-1 whitespace-pre-wrap">{m.body}</p>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {lineItems.length > 0 && (
        <section className="rounded-2xl border border-stone-200 bg-white p-5">
          <h2 className="text-base font-semibold text-stone-900">Line items (internal)</h2>
          <p className="mt-1 text-xs text-stone-500">
            Seeded from Renovessa baseline, then your markup. Edit qty / unit cost / markup — customer never sees this table.
          </p>
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-stone-200 text-xs uppercase tracking-wide text-stone-500">
                <tr>
                  <th className="py-2 pr-3">Include</th>
                  <th className="py-2 pr-3">Description</th>
                  <th className="py-2 pr-3">Qty</th>
                  <th className="py-2 pr-3">Unit cost</th>
                  <th className="py-2 pr-3">Markup %</th>
                  <th className="py-2 pr-3 text-right">Customer $</th>
                  <th className="py-2 pl-3">Source</th>
                </tr>
              </thead>
              <tbody>
                {lineItems.map((li) => (
                  <tr key={li.key} className="border-b border-stone-100 align-top">
                    <td className="py-2 pr-3">
                      <input
                        type="checkbox"
                        checked={li.included}
                        onChange={(e) => updateLine(li.key, { included: e.target.checked })}
                      />
                    </td>
                    <td className="py-2 pr-3">
                      <div className="font-medium text-stone-800">{li.description}</div>
                      <div className="text-xs text-stone-400">{li.category}</div>
                    </td>
                    <td className="py-2 pr-3">
                      <input
                        type="number"
                        value={li.quantity}
                        onChange={(e) => updateLine(li.key, { quantity: Number(e.target.value) })}
                        className="w-20 rounded border border-stone-300 px-2 py-1"
                      />
                      <div className="text-xs text-stone-400">{li.unit}</div>
                    </td>
                    <td className="py-2 pr-3">
                      <input
                        type="number"
                        value={li.unitCost}
                        onChange={(e) => updateLine(li.key, { unitCost: Number(e.target.value) })}
                        className="w-24 rounded border border-stone-300 px-2 py-1"
                      />
                    </td>
                    <td className="py-2 pr-3">
                      <input
                        type="number"
                        value={li.markupPercent}
                        onChange={(e) => updateLine(li.key, { markupPercent: Number(e.target.value) })}
                        className="w-20 rounded border border-stone-300 px-2 py-1"
                      />
                    </td>
                    <td className="py-2 pr-3 text-right tabular-nums">
                      ${(li.included ? recalculatePricing([li], pricingSettings).lineItems[0].customerPrice : 0).toLocaleString()}
                    </td>
                    <td className="py-2 pl-3 text-xs text-stone-500">{li.costSource.replace(/_/g, " ")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
