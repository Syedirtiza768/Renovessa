"use client";

import Link from "next/link";
import { useState } from "react";

interface Tag {
  id: string;
  name: string;
  color: string;
}

interface Message {
  id: string;
  direction: string;
  subject: string;
  body: string;
  status: string;
  campaignId: string | null;
  campaignName: string | null;
  createdAt: string;
}

interface Contact {
  id: string;
  companyName: string;
  contactName: string | null;
  email: string;
  phone: string | null;
  trade: string;
  city: string | null;
  state: string | null;
  rating: string | null;
  reviewCount: number | null;
  status: string;
  website: string | null;
  tags: Tag[];
}

export function ContactDetailClient({
  contact: initialContact,
  messages,
  allTags,
}: {
  contact: Contact;
  messages: Message[];
  allTags: Tag[];
}) {
  const [contact, setContact] = useState(initialContact);
  const [tags, setTags] = useState<Tag[]>(initialContact.tags);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  async function assignTag(tagId: string) {
    const res = await fetch(`/api/contacts/${contact.id}/tags`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tagIds: [tagId] }),
    });
    if (res.ok) {
      const updated = await res.json();
      setTags(updated);
    }
  }

  async function removeTag(tagId: string) {
    const res = await fetch(`/api/contacts/${contact.id}/tags`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tagIds: [tagId] }),
    });
    if (res.ok) {
      setTags(tags.filter((t) => t.id !== tagId));
    }
  }

  async function saveEdit() {
    setSaving(true);
    const res = await fetch(`/api/contacts/${contact.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(contact),
    });
    if (res.ok) setEditing(false);
    setSaving(false);
  }

  const assignedTagIds = new Set(tags.map((t) => t.id));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{contact.companyName}</h1>
          <p className="text-sm text-muted">
            {contact.contactName ? `${contact.contactName} · ` : ""}{contact.email}
            {contact.city ? ` · ${contact.city}${contact.state ? `, ${contact.state}` : ""}` : ""}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href={`/portal/admin/campaigns/new?email=${contact.email}`} className="btn-secondary text-sm">
            Email
          </Link>
          <button type="button" className="btn-secondary text-sm" onClick={() => setEditing(!editing)}>
            {editing ? "Cancel" : "Edit"}
          </button>
        </div>
      </div>

      {/* Contact info */}
      <div className="card p-4">
        <h2 className="mb-3 text-sm font-semibold">Contact Details</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Company" value={contact.companyName} editing={editing} onChange={(v) => setContact({ ...contact, companyName: v })} />
          <Field label="Contact Name" value={contact.contactName} editing={editing} onChange={(v) => setContact({ ...contact, contactName: v })} />
          <Field label="Email" value={contact.email} editing={false} />
          <Field label="Phone" value={contact.phone} editing={editing} onChange={(v) => setContact({ ...contact, phone: v })} />
          <Field label="Trade" value={contact.trade} editing={editing} onChange={(v) => setContact({ ...contact, trade: v })} />
          <Field label="City" value={contact.city} editing={editing} onChange={(v) => setContact({ ...contact, city: v })} />
          <Field label="Rating" value={contact.rating ? `${contact.rating}★${contact.reviewCount ? ` (${contact.reviewCount} reviews)` : ""}` : "—"} editing={false} />
          <Field label="Status" value={contact.status} editing={false} />
          <Field label="Website" value={contact.website} editing={false} />
        </div>
        {editing && (
          <div className="mt-4">
            <button className="btn-primary text-sm" onClick={saveEdit} disabled={saving}>
              {saving ? "Saving…" : "Save changes"}
            </button>
          </div>
        )}
      </div>

      {/* Tags */}
      <div className="card p-4">
        <h2 className="mb-3 text-sm font-semibold">Tags</h2>
        <div className="flex flex-wrap gap-2">
          {tags.map((t) => (
            <span key={t.id} className="flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium text-white" style={{ backgroundColor: t.color }}>
              {t.name}
              <button type="button" onClick={() => removeTag(t.id)} className="ml-1 text-white/70 hover:text-white">×</button>
            </span>
          ))}
          {tags.length === 0 && <span className="text-sm text-muted">No tags assigned</span>}
        </div>
        <div className="mt-3">
          <select
            className="input w-auto text-sm"
            defaultValue=""
            onChange={(e) => { if (e.target.value) { assignTag(e.target.value); e.target.value = ""; } }}
          >
            <option value="">Add tag…</option>
            {allTags.filter((t) => !assignedTagIds.has(t.id)).map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Communication timeline */}
      <div className="card p-4">
        <h2 className="mb-3 text-sm font-semibold">Communication History ({messages.length})</h2>
        {messages.length === 0 ? (
          <p className="text-sm text-muted">No emails sent to this contact yet.</p>
        ) : (
          <div className="space-y-3">
            {messages.map((m) => (
              <details key={m.id} className="rounded-lg border border-rule">
                <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-2 p-3">
                  <div className="flex items-center gap-2">
                    <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${m.direction === "inbound" ? "badge-green" : "badge-blue"}`}>
                      {m.direction === "inbound" ? "Reply received" : "Sent"}
                    </span>
                    <span className="text-sm font-medium">{m.subject}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted">
                    {m.campaignName && <span>re: {m.campaignName}</span>}
                    <span>{new Date(m.createdAt).toLocaleDateString()}</span>
                  </div>
                </summary>
                <div className="border-t border-rule p-3">
                  <pre className="whitespace-pre-wrap font-sans text-sm text-muted">{m.body}</pre>
                </div>
              </details>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  editing,
  onChange,
}: {
  label: string;
  value: string | null | undefined;
  editing: boolean;
  onChange?: (v: string) => void;
}) {
  const display = value || "";
  return (
    <div>
      <label className="text-xs font-medium text-muted">{label}</label>
      {editing && onChange ? (
        <input className="input mt-1" value={display} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <p className="mt-1 text-sm">{display || "—"}</p>
      )}
    </div>
  );
}
