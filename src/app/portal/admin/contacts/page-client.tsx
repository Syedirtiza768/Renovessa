"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

interface Tag {
  id: string;
  name: string;
  color: string;
  count: number;
}

interface Contact {
  id: string;
  companyName: string;
  contactName: string;
  email: string;
  phone: string;
  trade: string;
  city: string;
  state: string;
  rating: string;
  reviewCount: number | null;
  status: string;
  website: string;
  tags: { id: string; name: string; color: string }[];
  lastContacted: string | null;
  emailsSent: number;
  repliesReceived: number;
}

const STATUS_LABELS: Record<string, string> = {
  new: "New",
  contacted: "Contacted",
  replied: "Replied",
  converted: "Converted",
  monitor: "Monitor",
};

export function ContactsPageClient({
  initialTags,
  trades,
  cities,
}: {
  initialTags: Tag[];
  trades: string[];
  cities: string[];
}) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [trade, setTrade] = useState("");
  const [city, setCity] = useState("");
  const [status, setStatus] = useState("");
  const [selectedTag, setSelectedTag] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [tags] = useState(initialTags);

  const fetchContacts = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("pageSize", "50");
    if (search) params.set("search", search);
    if (trade) params.set("trade", trade);
    if (city) params.set("city", city);
    if (status) params.set("status", status);
    if (selectedTag) params.set("tag", selectedTag);

    const res = await fetch(`/api/contacts?${params}`);
    const data = await res.json();
    setContacts(data.contacts || []);
    setTotal(data.total || 0);
    setLoading(false);
  }, [page, search, trade, city, status, selectedTag]);

  useEffect(() => { fetchContacts(); }, [fetchContacts]);

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (selected.size === contacts.length) setSelected(new Set());
    else setSelected(new Set(contacts.map((c) => c.id)));
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Contacts</h1>
          <p className="text-sm text-muted">Manage prospective contractors. Filter, tag, and pick contacts for campaigns.</p>
        </div>
        <div className="flex gap-2">
          {selected.size > 0 && (
            <BulkTagBar
              tags={tags}
              selectedCount={selected.size}
              onAssign={async (tagId) => {
                await fetch("/api/contacts/bulk-tag", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ contactIds: [...selected], tagIds: [tagId], action: "assign" }),
                });
                setSelected(new Set());
                fetchContacts();
              }}
            />
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="mt-4 flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-[200px]">
          <label className="text-xs font-medium text-muted">Search</label>
          <input className="input mt-1" placeholder="Company, contact, email, city…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
        </div>
        <div>
          <label className="text-xs font-medium text-muted">Trade</label>
          <select className="input mt-1" value={trade} onChange={(e) => { setTrade(e.target.value); setPage(1); }}>
            <option value="">All</option>
            {trades.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-muted">City</label>
          <select className="input mt-1" value={city} onChange={(e) => { setCity(e.target.value); setPage(1); }}>
            <option value="">All</option>
            {cities.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-muted">Status</label>
          <select className="input mt-1" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
            <option value="">All</option>
            {Object.entries(STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-muted">Tag</label>
          <select className="input mt-1" value={selectedTag} onChange={(e) => { setSelectedTag(e.target.value); setPage(1); }}>
            <option value="">All</option>
            {tags.map((t) => <option key={t.id} value={t.name}>{t.name} ({t.count})</option>)}
          </select>
        </div>
      </div>

      {/* Tags bar */}
      {tags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => { setSelectedTag(""); setPage(1); }}
            className={`rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors ${!selectedTag ? "bg-copper text-white" : "bg-blueprint text-muted hover:text-copper"}`}
          >
            All ({total})
          </button>
          {tags.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => { setSelectedTag(t.name); setPage(1); }}
              className={`rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors ${selectedTag === t.name ? "text-white" : "bg-blueprint text-muted hover:text-copper"}`}
              style={selectedTag === t.name ? { backgroundColor: t.color } : undefined}
            >
              {t.name} ({t.count})
            </button>
          ))}
        </div>
      )}

      {/* Table */}
      <div className="mt-4 card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-rule bg-blueprint/40 text-left text-xs font-medium text-muted">
                <th className="p-3"><input type="checkbox" checked={selected.size === contacts.length && contacts.length > 0} onChange={toggleAll} /></th>
                <th className="p-3">Company</th>
                <th className="p-3">Contact</th>
                <th className="p-3">Email</th>
                <th className="p-3">Trade</th>
                <th className="p-3">City</th>
                <th className="p-3">Rating</th>
                <th className="p-3">Status</th>
                <th className="p-3">Tags</th>
                <th className="p-3">Emails</th>
                <th className="p-3">Last Contacted</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={11} className="p-6 text-center text-muted">Loading…</td></tr>
              ) : contacts.length === 0 ? (
                <tr><td colSpan={11} className="p-6 text-center text-muted">No contacts found.</td></tr>
              ) : contacts.map((c) => (
                <tr key={c.id} className="border-b border-rule hover:bg-blueprint/20 transition-colors">
                  <td className="p-3"><input type="checkbox" checked={selected.has(c.id)} onChange={() => toggleSelect(c.id)} /></td>
                  <td className="p-3"><Link href={`/portal/admin/contacts/${c.id}`} className="font-medium text-copper hover:underline">{c.companyName}</Link></td>
                  <td className="p-3 text-muted">{c.contactName || "—"}</td>
                  <td className="p-3"><a href={`mailto:${c.email}`} className="text-copper hover:underline">{c.email}</a></td>
                  <td className="p-3">{c.trade}</td>
                  <td className="p-3">{c.city}</td>
                  <td className="p-3">{c.rating ? `${c.rating}★${c.reviewCount ? ` (${c.reviewCount})` : ""}` : "—"}</td>
                  <td className="p-3"><span className={`rounded-full px-2 py-0.5 text-xs font-medium ${c.status === "contacted" ? "badge-blue" : c.status === "replied" ? "badge-green" : c.status === "new" ? "badge-neutral" : "bg-blueprint text-muted"}`}>{STATUS_LABELS[c.status] || c.status}</span></td>
                  <td className="p-3">
                    <div className="flex flex-wrap gap-1">
                      {c.tags.map((t) => (
                        <span key={t.id} className="rounded-full px-1.5 py-0.5 text-[10px] font-medium text-white" style={{ backgroundColor: t.color }}>{t.name}</span>
                      ))}
                      {c.tags.length === 0 && <span className="text-muted">—</span>}
                    </div>
                  </td>
                  <td className="p-3 text-center">
                    {c.emailsSent > 0 ? (
                      <span className="text-muted">{c.emailsSent}{c.repliesReceived > 0 ? ` / ${c.repliesReceived}↩` : ""}</span>
                    ) : <span className="text-muted">—</span>}
                  </td>
                  <td className="p-3 text-xs text-muted">
                    {c.lastContacted ? new Date(c.lastContacted).toLocaleDateString() : "Never"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {total > 50 && (
        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm text-muted">Showing {(page - 1) * 50 + 1}–{Math.min(page * 50, total)} of {total}</p>
          <div className="flex gap-2">
            <button className="btn-secondary text-sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button>
            <button className="btn-secondary text-sm" disabled={page * 50 >= total} onClick={() => setPage(page + 1)}>Next</button>
          </div>
        </div>
      )}
    </div>
  );
}

function BulkTagBar({ tags, selectedCount, onAssign }: { tags: Tag[]; selectedCount: number; onAssign: (tagId: string) => void }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-copper/30 bg-blueprint/40 px-3 py-2">
      <span className="text-xs font-medium text-muted">{selectedCount} selected</span>
      <select
        className="input w-auto text-xs"
        defaultValue=""
        onChange={(e) => { if (e.target.value) { onAssign(e.target.value); e.target.value = ""; } }}
      >
        <option value="">Assign tag…</option>
        {tags.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
      </select>
    </div>
  );
}
