"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  EmailAudience,
  templatesForAudience,
} from "@/lib/emailTemplates";
import { RichTextEditor } from "@/components/editor/RichTextEditor";
import { EmailPreview } from "@/components/editor/EmailPreview";
import { htmlToText } from "@/components/editor/htmlToText";

const AUDIENCES: { value: EmailAudience; label: string; hint: string }[] = [
  { value: "prospect_contractor", label: "Prospective contractors", hint: "From contractor inquiries — cold outreach." },
  { value: "contractor", label: "Active contractors", hint: "Contractors already in the network." },
  { value: "homeowner", label: "Homeowners", hint: "From project requests." },
];

interface PreviewState {
  count: number;
  sample: string[];
  example: { to: string; subject: string; body: string } | null;
  expectedCount: number | null;
  countMatchesExpected: boolean | null;
}

export default function NewCampaignPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [audience, setAudience] = useState<EmailAudience>("prospect_contractor");
  const [templateId, setTemplateId] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [bodyHtml, setBodyHtml] = useState("");
  const [filters, setFilters] = useState({ trade: "", zip: "", status: "", tier: "", tag: "", expectedCount: "" });
  const [showPreview, setShowPreview] = useState(false);

  const [preview, setPreview] = useState<PreviewState | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const templates = useMemo(() => templatesForAudience(audience), [audience]);

  function changeAudience(a: EmailAudience) {
    setAudience(a);
    setTemplateId("");
    setPreview(null);
  }

  function applyTemplate(id: string) {
    setTemplateId(id);
    const t = templates.find((x) => x.id === id);
    if (t) {
      setSubject(t.subject);
      setBody(t.body);
      // Convert template to simple HTML for the editor
      const html = t.body
        .split("\n\n")
        .map((p) => `<p>${p.replace(/\n/g, "<br>")}</p>`)
        .join("");
      setBodyHtml(html);
    }
  }

  function cleanFilters() {
    return {
      trade: filters.trade.trim() || undefined,
      zip: filters.zip.trim() || undefined,
      status: filters.status.trim() || undefined,
      tier: audience === "contractor" ? filters.tier.trim() || undefined : undefined,
      tag: audience === "prospect_contractor" ? filters.tag.trim() || undefined : undefined,
      expectedCount: filters.expectedCount.trim()
        ? Number.parseInt(filters.expectedCount, 10)
        : undefined,
    };
  }

  async function runPreview() {
    setPreviewing(true);
    setError("");
    try {
      const res = await fetch("/api/campaigns/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ audience, filters: cleanFilters(), subject, bodyTemplate: body }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Preview failed");
      setPreview(data);
    } catch (e: any) {
      setError(e.message);
      setPreview(null);
    } finally {
      setPreviewing(false);
    }
  }

  async function saveDraft() {
    if (!name || !subject || (!body && !bodyHtml)) {
      setError("Name, subject, and message are required.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      // Always generate a plain-text fallback from the HTML body
      const plainText = body || htmlToText(bodyHtml);
      const res = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          audience,
          subject,
          bodyTemplate: plainText,
          bodyHtml: bodyHtml || undefined,
          templateId: templateId || undefined,
          filters: cleanFilters(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save campaign");
      router.push(`/portal/admin/campaigns/${data.id}`);
    } catch (e: any) {
      setError(e.message);
      setSaving(false);
    }
  }

  return (
    <div className="max-w-4xl">
      <Link href="/portal/admin/campaigns" className="text-sm text-copper hover:underline">
        ← Back to Campaigns
      </Link>
      <h1 className="mt-4 text-2xl font-bold">New Campaign</h1>
      <p className="text-sm text-muted">
        Draft a bulk send. Use the rich editor to compose HTML emails with merge fields.
      </p>

      <div className="mt-6 space-y-5">
        <div className="card p-4">
          <label className="text-xs font-medium text-muted">Campaign name *</label>
          <input
            className="input mt-1"
            placeholder="e.g. HVAC contractor prospecting — Fairfax"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div className="card space-y-4 p-4">
          <div>
            <label className="text-xs font-medium text-muted">Audience *</label>
            <div className="mt-2 grid gap-2 sm:grid-cols-3">
              {AUDIENCES.map((a) => (
                <button
                  key={a.value}
                  type="button"
                  onClick={() => changeAudience(a.value)}
                  className={`rounded-lg border p-3 text-left text-sm transition-colors ${
                    audience === a.value ? "border-copper bg-blueprint/60" : "border-rule hover:border-copper/50"
                  }`}
                >
                  <span className="font-medium">{a.label}</span>
                  <span className="mt-1 block text-xs text-muted">{a.hint}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-xs font-medium text-muted">Trade filter</label>
              <input className="input mt-1" placeholder="e.g. HVAC" value={filters.trade}
                onChange={(e) => setFilters((f) => ({ ...f, trade: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted">ZIP filter</label>
              <input className="input mt-1" placeholder="e.g. 22030" value={filters.zip}
                onChange={(e) => setFilters((f) => ({ ...f, zip: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted">Status filter</label>
              <input className="input mt-1" placeholder={audience === "homeowner" ? "e.g. NEW" : "e.g. new"} value={filters.status}
                onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))} />
            </div>
            {audience === "contractor" && (
              <div>
                <label className="text-xs font-medium text-muted">Tier filter</label>
                <input className="input mt-1" placeholder="e.g. TRIAL" value={filters.tier}
                  onChange={(e) => setFilters((f) => ({ ...f, tier: e.target.value }))} />
              </div>
            )}
            {audience === "prospect_contractor" && (
              <div>
                <label className="text-xs font-medium text-muted">Contact tag</label>
                <input className="input mt-1" placeholder="e.g. RFQ Pilot 15 — July 2026" value={filters.tag}
                  onChange={(e) => setFilters((f) => ({ ...f, tag: e.target.value }))} />
              </div>
            )}
            <div>
              <label className="text-xs font-medium text-muted">Expected recipient count</label>
              <input className="input mt-1" type="number" min="1" max="10000" placeholder="Fail send if count changes" value={filters.expectedCount}
                onChange={(e) => setFilters((f) => ({ ...f, expectedCount: e.target.value }))} />
            </div>
          </div>
          <p className="text-xs text-muted">Leave a filter blank to include everyone. Demo and unsubscribed contacts are always excluded.</p>
        </div>

        <div className="card space-y-4 p-4">
          <div>
            <label className="text-xs font-medium text-muted">Template</label>
            <select className="input mt-1" value={templateId} onChange={(e) => applyTemplate(e.target.value)}>
              <option value="">— Start from scratch —</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-muted">Subject *</label>
            <input className="input mt-1" value={subject} onChange={(e) => setSubject(e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-medium text-muted">Message *</label>
            <p className="mb-2 text-xs text-muted">
              Use the toolbar to format text. Insert merge fields like company name, city, and rating from the dropdown.
            </p>
            <RichTextEditor
              initialHtml={bodyHtml}
              onChange={(html) => {
                setBodyHtml(html);
                setBody(htmlToText(html));
              }}
              placeholder="Write your email…"
            />
          </div>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex flex-wrap items-center gap-3">
          <button type="button" className="btn-secondary text-sm" onClick={runPreview} disabled={previewing}>
            {previewing ? "Resolving…" : "Preview recipients"}
          </button>
          <button type="button" className="btn-secondary text-sm" onClick={() => setShowPreview(!showPreview)}>
            {showPreview ? "Hide preview" : "Preview email"}
          </button>
          <button type="button" className="btn-primary text-sm" onClick={saveDraft} disabled={saving}>
            {saving ? "Saving…" : "Save draft & review"}
          </button>
        </div>

        {showPreview && bodyHtml && <EmailPreview html={bodyHtml} />}

        {preview && (
          <div className="card space-y-3 p-4">
            <p className="text-sm">
              <span className="text-2xl font-bold">{preview.count}</span>{" "}
              <span className="text-muted">recipient{preview.count === 1 ? "" : "s"} match this segment</span>
            </p>
            {preview.countMatchesExpected === false && (
              <p className="text-sm font-medium text-red-700">
                Safety check failed: expected {preview.expectedCount} recipients but resolved {preview.count}.
              </p>
            )}
            {preview.sample.length > 0 && (
              <p className="text-xs text-muted">
                Sample: {preview.sample.join(", ")}{preview.count > preview.sample.length ? " …" : ""}
              </p>
            )}
            {preview.example && (
              <div className="rounded-md border border-rule bg-blueprint/40 p-3 text-sm">
                <p className="text-xs text-muted">Rendered example → {preview.example.to}</p>
                <p className="mt-1 font-semibold">{preview.example.subject}</p>
                <pre className="mt-2 whitespace-pre-wrap font-sans text-sm">{preview.example.body}</pre>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
