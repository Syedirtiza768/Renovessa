"use client";

import { useState } from "react";

export function ContentVersionForm() {
  const [slug, setSlug] = useState("");
  const [title, setTitle] = useState("");
  const [bodyText, setBodyText] = useState("");
  const [author, setAuthor] = useState("");
  const [status, setStatus] = useState<"draft" | "published" | "retired">("draft");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      const html = `<div>${bodyText.replace(/\n/g, "<br/>")}</div>`;
      const res = await fetch("/api/bathroom-estimator/content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug,
          title,
          bodyHtml: html,
          bodyText,
          author: author || undefined,
          sourceLinks: [],
          status,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `Failed (${res.status})`);
      setMsg(`✓ Saved /${slug} (${status})`);
      setSlug("");
      setTitle("");
      setBodyText("");
      setAuthor("");
      setStatus("draft");
      window.location.reload();
    } catch (e) {
      setMsg(`✗ ${e instanceof Error ? e.message : "Unknown error"}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-6 rounded-lg border p-4">
      <h2 className="text-sm font-semibold">Add / update a content version</h2>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <label className="text-sm">
          <span className="text-muted">Slug</span>
          <input
            type="text"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="e.g. rockville-md/cost"
            required
            className="mt-1 w-full rounded border border-ink-15 p-2 text-sm"
          />
        </label>
        <label className="text-sm">
          <span className="text-muted">Title</span>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Page title"
            required
            className="mt-1 w-full rounded border border-ink-15 p-2 text-sm"
          />
        </label>
      </div>
      <label className="mt-3 block text-sm">
        <span className="text-muted">Body (plain text, line breaks preserved)</span>
        <textarea
          value={bodyText}
          onChange={(e) => setBodyText(e.target.value)}
          rows={6}
          required
          className="mt-1 w-full rounded border border-ink-15 p-2 text-sm"
        />
      </label>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <label className="text-sm">
          <span className="text-muted">Author</span>
          <input
            type="text"
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            placeholder="Author name"
            className="mt-1 w-full rounded border border-ink-15 p-2 text-sm"
          />
        </label>
        <label className="text-sm">
          <span className="text-muted">Status</span>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as "draft" | "published" | "retired")}
            className="mt-1 w-full rounded border border-ink-15 p-2 text-sm"
          >
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="retired">Retired</option>
          </select>
        </label>
      </div>
      <button
        type="submit"
        disabled={busy}
        className="mt-3 rounded bg-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
      >
        {busy ? "Saving…" : "Save content"}
      </button>
      {msg && <p className="mt-2 text-xs text-ink-70">{msg}</p>}
    </form>
  );
}
