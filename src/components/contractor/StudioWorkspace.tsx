"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type {
  ContractorPricedLineItem,
  PricingTotals,
  StudioPricingSettings,
} from "@/lib/bathroom/contractor-pricing";
import {
  DEFAULT_STUDIO_PRICING,
  createManualLineItem,
  ensureCustomerPricing,
  recalculatePricing,
} from "@/lib/bathroom/contractor-pricing";

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

const DEFAULT_SCOPE =
  "Provide the bathroom remodel scope discussed with the client, including protection of adjacent finishes, daily cleanup, and haul-away of construction debris.";
const DEFAULT_EXCLUSIONS = [
  "Unforeseen structural, plumbing, or electrical corrections beyond normal remodel allowances.",
  "Homeowner-furnished materials unless listed as contractor-supplied.",
  "Mold remediation, asbestos abatement, or hazardous material handling (priced separately if discovered).",
].join("\n");

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
  const [estimate, setEstimate] = useState<{
    low: number;
    mid: number;
    high: number;
    estimateId?: string | null;
  } | null>(null);
  const [lineItems, setLineItems] = useState<ContractorPricedLineItem[]>([]);
  const [pricingSettings, setPricingSettings] = useState<StudioPricingSettings>(DEFAULT_STUDIO_PRICING);
  const [ackLowMargin, setAckLowMargin] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [shareExpiresAt, setShareExpiresAt] = useState<string | null>(null);
  const [viewCount, setViewCount] = useState(0);
  const [showPreview, setShowPreview] = useState(true);
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

  const linesTotal = liveTotals?.customerTotal ?? 0;
  const customerTotal = linesTotal > 0 ? linesTotal : Number(form.totalPrice) || 0;
  const needsPackageTotal = linesTotal <= 0;
  const readyToApprove = customerTotal > 0;

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
        if (Array.isArray(latest.lineItemsJson)) setLineItems(latest.lineItemsJson);
        setViewCount(latest.viewCount || 0);
        setShareExpiresAt(latest.shareExpiresAt || null);
        setShareUrl(
          latest.shareToken ? `${window.location.origin}/proposal/${latest.shareToken}` : null,
        );
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

  const markDirtyIfIssued = () => {
    setProposalStatus((s) =>
      s === "APPROVED" || s === "SENT" || s === "REVISION_REQUESTED" ? "DRAFT" : s,
    );
  };

  const updateLine = (key: string, patch: Partial<ContractorPricedLineItem>) => {
    setLineItems((items) =>
      items.map((li) => {
        if (li.key !== key) return li;
        const next = { ...li, ...patch };
        if (
          patch.unitCost !== undefined ||
          patch.quantity !== undefined ||
          patch.markupPercent !== undefined ||
          patch.wastePercent !== undefined ||
          patch.laborHours !== undefined ||
          patch.otherDirectCost !== undefined
        ) {
          next.customerPriceLocked = false;
          next.costSource = next.costSource === "renovessa_baseline" ? "contractor_override" : next.costSource;
        }
        if (patch.customerPrice !== undefined) {
          next.customerPriceLocked = true;
          next.costSource = "contractor_override";
        }
        return next;
      }),
    );
    markDirtyIfIssued();
  };

  const addLine = () => {
    setLineItems((items) => [
      ...items,
      createManualLineItem(pricingSettings, {
        description: "New line item",
        unitCost: 500,
        sortOrder: items.length,
      }),
    ]);
    markDirtyIfIssued();
    setMsg("Line added — edit description, qty, and cost.");
  };

  const removeLine = (key: string) => {
    setLineItems((items) => items.filter((li) => li.key !== key));
    markDirtyIfIssued();
  };

  const patchJobMeta = async () => {
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
    if (!res.ok) throw new Error(data.error || "Save job failed");
    setProject(data);
    return data;
  };

  const saveJobMeta = async () => {
    setSaving(true);
    setMsg(null);
    setError(null);
    try {
      await patchJobMeta();
      setMsg("Job details saved.");
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
      await patchJobMeta();
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
      if (Array.isArray(data.pricedLineItems) && data.pricedLineItems.length) {
        setLineItems(data.pricedLineItems);
        if (data.totals?.customerTotal) setField("totalPrice", data.totals.customerTotal);
      } else {
        setLineItems([createManualLineItem(pricingSettings)]);
      }
      markDirtyIfIssued();
      setMsg(data.note || "Estimate ready — review line items below.");
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
      await patchJobMeta();
      const res = await fetch(`/api/contractor/bathroom-jobs/${jobId}/draft-proposal`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: prompt || "Bathroom remodel proposal for this client.",
          seedFromEstimate: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Draft failed");
      const d = data.draft;
      setForm({
        totalPrice: liveTotals?.customerTotal || d.suggestedTotalPrice || form.totalPrice || 0,
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
      markDirtyIfIssued();
      setShowPreview(true);
      setMsg(d.note || "Proposal language drafted — review the client preview.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Draft failed");
    } finally {
      setSaving(false);
    }
  };

  /** Ensure scope/exclusions exist so save never blocks on empty required fields. */
  const formWithDefaults = useCallback((): ProposalForm => {
    return {
      ...form,
      includedScope: form.includedScope.trim() || DEFAULT_SCOPE,
      exclusions: form.exclusions.trim() || DEFAULT_EXCLUSIONS,
      totalPrice: customerTotal || form.totalPrice || 0,
    };
  }, [form, customerTotal]);

  const buildProposalPayload = (opts?: { requirePrice?: boolean }) => {
    const ready = formWithDefaults();
    const ensured = ensureCustomerPricing(lineItems, ready.totalPrice, pricingSettings);
    if (opts?.requirePrice && ensured.totals.customerTotal <= 0) {
      throw new Error(
        "Customer total is $0. Run an estimate, add priced line items, or enter a package total below.",
      );
    }
    return {
      ...ready,
      totalPrice: ensured.totals.customerTotal || Math.round(Number(ready.totalPrice) || 0),
      estimateId: estimate?.estimateId || null,
      lineItems: ensured.lineItems.length ? ensured.lineItems : lineItems,
      recomputeFromLines: Boolean(ensured.lineItems.length || lineItems.length),
      pricingSettings,
      ensured,
    };
  };

  const persistProposal = async (
    currentId: string | null,
    opts?: { requirePrice?: boolean },
  ): Promise<{ id: string; status: string; totalPrice: number; lineItemsJson?: ContractorPricedLineItem[] }> => {
    const { ensured, ...payload } = buildProposalPayload(opts);
    if (ensured.usedPackage) {
      setLineItems(ensured.lineItems);
      setForm((f) => ({
        ...f,
        totalPrice: ensured.totals.customerTotal,
        includedScope: payload.includedScope,
        exclusions: payload.exclusions,
      }));
    } else if (payload.includedScope !== form.includedScope || payload.exclusions !== form.exclusions) {
      setForm((f) => ({
        ...f,
        includedScope: payload.includedScope,
        exclusions: payload.exclusions,
      }));
    }
    const url = currentId
      ? `/api/contractor/bathroom-jobs/${jobId}/proposals/${currentId}`
      : `/api/contractor/bathroom-jobs/${jobId}/proposals`;
    const res = await fetch(url, {
      method: currentId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Save failed");
    return data;
  };

  const saveProposal = async () => {
    setSaving(true);
    setError(null);
    try {
      const data = await persistProposal(proposalId);
      setProposalId(data.id);
      setProposalStatus(data.status || "DRAFT");
      setForm((f) => ({
        ...f,
        totalPrice: data.totalPrice,
        includedScope: f.includedScope || DEFAULT_SCOPE,
        exclusions: f.exclusions || DEFAULT_EXCLUSIONS,
      }));
      if (Array.isArray(data.lineItemsJson)) setLineItems(data.lineItemsJson);
      setMsg("Draft saved.");
      return data;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
      return null;
    } finally {
      setSaving(false);
    }
  };

  const approveProposal = async () => {
    setSaving(true);
    setError(null);
    setMsg(null);
    try {
      if (liveTotals?.belowMinimumMargin && !ackLowMargin) {
        setError(
          `Gross margin is below your minimum (${liveTotals.minimumGrossMarginPercent}%). Check the override box under Internal profitability, then approve again.`,
        );
        return;
      }

      let id = proposalId;
      if (!id) {
        const saved = await persistProposal(null, { requirePrice: true });
        id = saved.id;
        setProposalId(id);
        if (Array.isArray(saved.lineItemsJson)) setLineItems(saved.lineItemsJson);
      }

      const { ensured, ...payload } = buildProposalPayload({ requirePrice: true });
      if (ensured.usedPackage) setLineItems(ensured.lineItems);

      const res = await fetch(`/api/contractor/bathroom-jobs/${jobId}/proposals/${id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...payload,
          acknowledgeBelowMinimumMargin: ackLowMargin,
          overrideReason: ackLowMargin ? "Contractor acknowledged below-minimum margin" : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.code === "BELOW_MINIMUM_MARGIN") {
          setError(`${data.error} Check the box under Internal profitability, then approve again.`);
          return;
        }
        throw new Error(data.error || "Approve failed");
      }
      setProposalStatus(data.proposal.status);
      setForm((f) => ({ ...f, totalPrice: data.proposal.totalPrice ?? f.totalPrice }));
      if (Array.isArray(data.proposal.lineItemsJson)) setLineItems(data.proposal.lineItemsJson);
      setMsg(data.note || "Approved — you can send the client link.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Approve failed");
    } finally {
      setSaving(false);
    }
  };

  const sendToClient = async () => {
    setSaving(true);
    setError(null);
    setMsg(null);
    try {
      if (liveTotals?.belowMinimumMargin && !ackLowMargin) {
        setError(
          `Gross margin is below your minimum (${liveTotals.minimumGrossMarginPercent}%). Check the override box, then try again.`,
        );
        return;
      }

      let id = proposalId;
      if (!id) {
        const saved = await persistProposal(null, { requirePrice: true });
        id = saved.id;
        setProposalId(id);
      }

      const { ensured, ...payload } = buildProposalPayload({ requirePrice: true });
      if (ensured.usedPackage) setLineItems(ensured.lineItems);

      const res = await fetch(`/api/contractor/bathroom-jobs/${jobId}/proposals/${id}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...payload,
          expiresDays: 30,
          rotateToken: true,
          autoApprove: true,
          acknowledgeBelowMinimumMargin: ackLowMargin,
          overrideReason: ackLowMargin ? "Contractor acknowledged below-minimum margin" : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.code === "BELOW_MINIMUM_MARGIN") {
          setError(`${data.error} Check the margin override box, then try again.`);
          return;
        }
        throw new Error(data.error || "Send failed");
      }
      setProposalStatus(data.proposal.status);
      setShareUrl(data.shareUrl);
      setShareExpiresAt(data.shareExpiresAt);
      setForm((f) => ({ ...f, totalPrice: data.proposal.totalPrice ?? f.totalPrice }));
      if (Array.isArray(data.proposal.lineItemsJson)) setLineItems(data.proposal.lineItemsJson);
      setMsg(data.note);
      try {
        await navigator.clipboard.writeText(data.shareUrl);
        setMsg(`${data.note} Link copied.`);
      } catch {
        /* ignore */
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

  const lockedAccepted = proposalStatus === "ACCEPTED";
  const pricedLines = lineItems.length ? recalculatePricing(lineItems, pricingSettings).lineItems : [];

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
            <a
              href={`/api/contractor/bathroom-jobs/${jobId}/proposals/${proposalId}/pdf?preview=1`}
              className="rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-800 hover:bg-stone-50"
              target="_blank"
              rel="noreferrer"
            >
              Draft PDF
            </a>
          )}
          {(proposalStatus === "APPROVED" ||
            proposalStatus === "SENT" ||
            proposalStatus === "ACCEPTED" ||
            proposalStatus === "REVISION_REQUESTED") &&
            proposalId && (
              <a
                href={`/api/contractor/bathroom-jobs/${jobId}/proposals/${proposalId}/pdf`}
                className="rounded-lg bg-emerald-800 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-900"
              >
                Client PDF
              </a>
            )}
          <Link
            href="/portal/contractor/proposal-studio/letterhead"
            className="rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-800 hover:bg-stone-50"
          >
            Letterhead & pricing
          </Link>
        </div>
      </div>

      {/* Workflow guide */}
      <ol className="grid gap-2 rounded-2xl border border-stone-200 bg-white p-4 text-sm sm:grid-cols-4">
        {[
          ["1. Price", lineItems.length > 0 ? "done" : "Run estimate or add lines"],
          ["2. Draft", form.includedScope.trim() ? "done" : "Draft language or type scope"],
          ["3. Approve", proposalStatus === "APPROVED" || proposalStatus === "SENT" || proposalStatus === "ACCEPTED" ? "done" : "Approve for client"],
          ["4. Send", proposalStatus === "SENT" || proposalStatus === "ACCEPTED" ? "done" : "Send client link"],
        ].map(([label, state]) => (
          <li key={label} className="rounded-xl bg-stone-50 px-3 py-2">
            <p className="font-medium text-stone-900">{label}</p>
            <p className={`text-xs ${state === "done" ? "text-emerald-700" : "text-stone-500"}`}>
              {state === "done" ? "Ready" : state}
            </p>
          </li>
        ))}
      </ol>

      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>
      )}
      {msg && (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">{msg}</p>
      )}

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
              rows={4}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2"
              placeholder="Describe the job — used to draft proposal language."
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={saveJobMeta} disabled={saving} className="rounded-lg border border-stone-300 px-3 py-2 text-sm disabled:opacity-40">
              Save job
            </button>
            <button type="button" onClick={runEstimate} disabled={saving} className="rounded-lg border border-stone-300 px-3 py-2 text-sm disabled:opacity-40">
              Run estimate + seed lines
            </button>
            <button type="button" onClick={draftFromPrompt} disabled={saving} className="rounded-lg bg-stone-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-40">
              Draft proposal language
            </button>
          </div>
          {estimate && (
            <div className="rounded-xl bg-stone-50 p-4 text-sm text-stone-700">
              <p className="font-medium text-stone-900">Renovessa baseline range</p>
              <p className="mt-1 text-lg">
                ${estimate.low.toLocaleString()} – ${estimate.high.toLocaleString()}
              </p>
              <p className="text-xs text-stone-500">Mid ${estimate.mid.toLocaleString()} · your markup sets the client total</p>
            </div>
          )}
        </section>

        <section className="space-y-3 rounded-2xl border border-stone-200 bg-white p-5">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-base font-semibold text-stone-900">Client proposal</h2>
            <button
              type="button"
              onClick={() => setShowPreview((v) => !v)}
              className="text-xs text-stone-600 underline"
            >
              {showPreview ? "Hide preview" : "Show client preview"}
            </button>
          </div>

          {liveTotals && liveTotals.customerTotal > 0 && (
            <div className="rounded-xl border border-stone-200 bg-stone-50 p-4 text-sm">
              <p className="font-medium text-stone-900">Internal profitability</p>
              <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1">
                <dt className="text-stone-500">Direct cost</dt>
                <dd className="text-right tabular-nums">${liveTotals.directCostTotal.toLocaleString()}</dd>
                <dt className="text-stone-500">Overhead + contingency</dt>
                <dd className="text-right tabular-nums">
                  ${(liveTotals.overheadAmount + liveTotals.contingencyAmount).toLocaleString()}
                </dd>
                <dt className="text-stone-500">Profit</dt>
                <dd className="text-right tabular-nums">${liveTotals.profitAmount.toLocaleString()}</dd>
                <dt className="text-stone-500">Gross margin</dt>
                <dd className={`text-right tabular-nums ${liveTotals.belowMinimumMargin ? "font-semibold text-amber-700" : ""}`}>
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
                    Margin is below your minimum ({liveTotals.minimumGrossMarginPercent}%). I acknowledge and want to
                    approve anyway.
                  </span>
                </label>
              )}
            </div>
          )}

          {needsPackageTotal && (
            <label className="block text-sm">
              <span className="text-stone-500">Package total for client ($)</span>
              <input
                type="number"
                min={0}
                value={form.totalPrice || ""}
                onChange={(e) => {
                  setField("totalPrice", Number(e.target.value));
                  markDirtyIfIssued();
                }}
                className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-lg font-semibold"
                placeholder="e.g. 18500"
              />
              <span className="mt-1 block text-xs text-stone-500">
                Required before approve/send. Or run an estimate / add priced line items above.
              </span>
            </label>
          )}

          {!readyToApprove && (
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
              Approve and Send need a customer total greater than $0.
            </p>
          )}

          {(
            [
              ["includedScope", "Included scope", 5],
              ["exclusions", "Exclusions", 3],
              ["suggestedChanges", "Suggested changes", 2],
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
                  onChange={(e) => {
                    setField(key, e.target.value);
                    markDirtyIfIssued();
                  }}
                  className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2"
                />
              ) : (
                <textarea
                  rows={rows}
                  value={form[key]}
                  onChange={(e) => {
                    setField(key, e.target.value);
                    markDirtyIfIssued();
                  }}
                  className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2"
                />
              )}
            </label>
          ))}

          <div className="flex flex-wrap gap-2 border-t border-stone-100 pt-4">
            <button
              type="button"
              onClick={() => void saveProposal()}
              disabled={saving || lockedAccepted}
              className="rounded-lg border border-stone-300 px-4 py-2 text-sm disabled:opacity-40"
            >
              Save draft
            </button>
            <button
              type="button"
              onClick={() => void approveProposal()}
              disabled={saving || lockedAccepted || !readyToApprove}
              className="rounded-lg bg-stone-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
              title={!readyToApprove ? "Enter a package total or run an estimate first" : undefined}
            >
              {proposalStatus === "APPROVED" || proposalStatus === "SENT" ? "Re-approve" : "Approve for client"}
            </button>
            <button
              type="button"
              onClick={() => void sendToClient()}
              disabled={saving || lockedAccepted || !readyToApprove}
              className="rounded-lg bg-emerald-800 px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
              title={!readyToApprove ? "Enter a package total or run an estimate first" : undefined}
            >
              {proposalStatus === "SENT" ? "Re-send client link" : "Send client link"}
            </button>
          </div>
          <p className="text-xs text-stone-500">
            Send saves, approves, and creates the share link in one step. You do not need to click Save first.
          </p>

          {shareUrl && (
            <div className="rounded-xl border border-stone-200 bg-stone-50 p-3 text-sm">
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
                  Copy
                </button>
                <a href={shareUrl} target="_blank" rel="noreferrer" className="rounded border border-stone-300 px-2 py-1 text-xs">
                  Open
                </a>
                {!lockedAccepted && (
                  <button type="button" onClick={revokeShare} disabled={saving} className="rounded border border-stone-300 px-2 py-1 text-xs text-red-800 disabled:opacity-40">
                    Revoke
                  </button>
                )}
              </div>
            </div>
          )}

          {clientMessages.length > 0 && (
            <div className="space-y-2">
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

      {/* Client-facing preview of what will be sent */}
      {showPreview && (
        <section className="rounded-2xl border border-amber-200/80 bg-amber-50/40 p-5">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-base font-semibold text-stone-900">Client draft preview</h2>
            <p className="text-xs text-stone-500">What the homeowner sees on the share page / PDF (no costs or margins)</p>
          </div>
          <div className="mt-4 rounded-xl border border-stone-200 bg-white p-5">
            <p className="text-xs uppercase tracking-[0.2em] text-stone-400">{companyName}</p>
            <p className="mt-1 text-sm text-stone-500">Prepared for {jobMeta.clientName || "your client"}</p>
            {jobMeta.jobTitle && <p className="font-medium text-stone-800">{jobMeta.jobTitle}</p>}
            <p className="mt-4 font-serif text-4xl text-stone-900">${customerTotal.toLocaleString()}</p>
            <div className="mt-6 space-y-4 text-sm text-stone-800">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">Included scope</p>
                <p className="mt-1 whitespace-pre-wrap">{form.includedScope.trim() || DEFAULT_SCOPE}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">Exclusions</p>
                <p className="mt-1 whitespace-pre-wrap">{form.exclusions.trim() || DEFAULT_EXCLUSIONS}</p>
              </div>
              {form.paymentSchedule && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">Payment</p>
                  <p className="mt-1 whitespace-pre-wrap">{form.paymentSchedule}</p>
                </div>
              )}
              {(form.estimatedStartDate || form.estimatedDuration) && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">Schedule</p>
                  <p className="mt-1">
                    Start: {form.estimatedStartDate || "—"} · Duration: {form.estimatedDuration || "—"}
                  </p>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Line items — always visible */}
      <section className="rounded-2xl border border-stone-200 bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-stone-900">Line items (internal)</h2>
            <p className="mt-1 text-xs text-stone-500">
              Seed from estimate or add your own. Customer never sees this table — only the total above.
            </p>
          </div>
          <button
            type="button"
            onClick={addLine}
            disabled={lockedAccepted}
            className="rounded-lg bg-stone-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-40"
          >
            + Add line
          </button>
        </div>

        {pricedLines.length === 0 ? (
          <div className="mt-4 rounded-xl border border-dashed border-stone-300 bg-stone-50 p-6 text-center text-sm text-stone-600">
            <p>No line items yet.</p>
            <div className="mt-3 flex flex-wrap justify-center gap-2">
              <button type="button" onClick={runEstimate} disabled={saving} className="rounded-lg border border-stone-300 px-3 py-2 text-sm disabled:opacity-40">
                Run estimate + seed lines
              </button>
              <button type="button" onClick={addLine} className="rounded-lg border border-stone-300 px-3 py-2 text-sm">
                Add a blank line
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-stone-200 text-xs uppercase tracking-wide text-stone-500">
                <tr>
                  <th className="py-2 pr-2">On</th>
                  <th className="py-2 pr-2">Description</th>
                  <th className="py-2 pr-2">Qty</th>
                  <th className="py-2 pr-2">Unit cost</th>
                  <th className="py-2 pr-2">Markup %</th>
                  <th className="py-2 pr-2 text-right">Customer $</th>
                  <th className="py-2 pl-2" />
                </tr>
              </thead>
              <tbody>
                {pricedLines.map((li) => (
                  <tr key={li.key} className="border-b border-stone-100 align-top">
                    <td className="py-2 pr-2">
                      <input
                        type="checkbox"
                        checked={li.included}
                        disabled={lockedAccepted}
                        onChange={(e) => updateLine(li.key, { included: e.target.checked })}
                      />
                    </td>
                    <td className="py-2 pr-2">
                      <input
                        value={li.description}
                        disabled={lockedAccepted}
                        onChange={(e) => updateLine(li.key, { description: e.target.value })}
                        className="w-full min-w-[10rem] rounded border border-stone-300 px-2 py-1 font-medium"
                      />
                      <div className="text-xs text-stone-400">{li.category} · {li.costSource.replace(/_/g, " ")}</div>
                    </td>
                    <td className="py-2 pr-2">
                      <input
                        type="number"
                        value={li.quantity}
                        disabled={lockedAccepted}
                        onChange={(e) => updateLine(li.key, { quantity: Number(e.target.value) })}
                        className="w-20 rounded border border-stone-300 px-2 py-1"
                      />
                      <div className="text-xs text-stone-400">{li.unit}</div>
                    </td>
                    <td className="py-2 pr-2">
                      <input
                        type="number"
                        value={li.unitCost}
                        disabled={lockedAccepted}
                        onChange={(e) => updateLine(li.key, { unitCost: Number(e.target.value) })}
                        className="w-24 rounded border border-stone-300 px-2 py-1"
                      />
                    </td>
                    <td className="py-2 pr-2">
                      <input
                        type="number"
                        value={li.markupPercent}
                        disabled={lockedAccepted}
                        onChange={(e) => updateLine(li.key, { markupPercent: Number(e.target.value) })}
                        className="w-20 rounded border border-stone-300 px-2 py-1"
                      />
                    </td>
                    <td className="py-2 pr-2 text-right tabular-nums">
                      ${li.included ? li.customerPrice.toLocaleString() : "0"}
                    </td>
                    <td className="py-2 pl-2">
                      <button
                        type="button"
                        disabled={lockedAccepted}
                        onClick={() => removeLine(li.key)}
                        className="text-xs text-red-700 disabled:opacity-40"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
