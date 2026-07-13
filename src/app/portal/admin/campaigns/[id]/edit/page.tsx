"use client";

import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { RichTextEditor } from "@/components/editor/RichTextEditor";
import { EmailPreview } from "@/components/editor/EmailPreview";
import { htmlToText } from "@/components/editor/htmlToText";

export default function EditCampaignPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [bodyHtml, setBodyHtml] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    fetch(`/api/campaigns/${id}`)
      .then((r) => r.json())
      .then((c) => {
        if (c.error) throw new Error(c.error);
        setName(c.name || "");
        setSubject(c.subject || "");
        setBody(c.bodyTemplate || "");
        setBodyHtml(c.bodyHtml || "");
        setStatus(c.status || "");
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  async function save() {
    if (!name || !subject || (!body && !bodyHtml)) {
      setError("Name, subject, and message are required.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const plainText = body || htmlToText(bodyHtml);
      const res = await fetch(`/api/campaigns/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          subject,
          bodyTemplate: plainText,
          bodyHtml: bodyHtml || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save");
      router.push(`/portal/admin/campaigns/${id}`);
    } catch (e: any) {
      setError(e.message);
      setSaving(false);
    }
  }

  if (loading) return <p className="text-muted">Loading campaign…</p>;
  if (status && status !== "draft" && status !== "failed") {
    return (
      <div className="max-w-3xl">
        <Link href={`/portal/admin/campaigns/${id}`} className="text-sm text-copper hover:underline">← Back</Link>
        <h1 className="mt-4 text-2xl font-bold">Cannot Edit</h1>
        <p className="mt-2 text-muted">This campaign has already been sent. Only draft or failed campaigns can be edited.</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl">
      <Link href={`/portal/admin/campaigns/${id}`} className="text-sm text-copper hover:underline">
        ← Back to Campaign
      </Link>
      <h1 className="mt-4 text-2xl font-bold">Edit Campaign</h1>

      <div className="mt-6 space-y-5">
        <div className="card p-4">
          <label className="text-xs font-medium text-muted">Campaign name *</label>
          <input className="input mt-1" value={name} onChange={(e) => setName(e.target.value)} />
        </div>

        <div className="card space-y-4 p-4">
          <div>
            <label className="text-xs font-medium text-muted">Subject *</label>
            <input className="input mt-1" value={subject} onChange={(e) => setSubject(e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-medium text-muted">Message *</label>
            <RichTextEditor
              initialHtml={bodyHtml || undefined}
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
          <button type="button" className="btn-secondary text-sm" onClick={() => setShowPreview(!showPreview)}>
            {showPreview ? "Hide preview" : "Preview email"}
          </button>
          <button type="button" className="btn-primary text-sm" onClick={save} disabled={saving}>
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>

        {showPreview && bodyHtml && <EmailPreview html={bodyHtml} />}
      </div>
    </div>
  );
}
