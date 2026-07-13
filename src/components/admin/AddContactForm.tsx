"use client";

import { useState } from "react";

interface Props {
  onCreated: () => void;
}

const TRADES = [
  "plumber", "electrician", "hvac", "roofer", "painter",
  "landscaper", "contractor", "remodeler", "flooring",
  "fencer", "concrete", "drywall", "handyman", "other",
];

export function AddContactForm({ onCreated }: Props) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    companyName: "",
    contactName: "",
    email: "",
    phone: "",
    trade: "contractor",
    city: "",
    state: "",
    website: "",
    serviceZips: "",
  });

  function set(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);

    const res = await fetch("/api/contacts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    const data = await res.json();
    setSaving(false);

    if (!res.ok) {
      setError(data.error || "Failed to create contact");
      return;
    }

    setForm({
      companyName: "",
      contactName: "",
      email: "",
      phone: "",
      trade: "contractor",
      city: "",
      state: "",
      website: "",
      serviceZips: "",
    });
    setOpen(false);
    onCreated();
  }

  return (
    <>
      <button className="btn-primary text-sm" onClick={() => setOpen(true)}>
        + Add Contact
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setOpen(false)}>
          <div
            className="card mx-4 w-full max-w-lg max-h-[90vh] overflow-y-auto p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">Add Contact</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-muted hover:text-slate text-xl leading-none"
              >
                &times;
              </button>
            </div>

            {error && (
              <div className="mb-3 rounded-md bg-[#FDECEA] px-3 py-2 text-sm text-danger">{error}</div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="label">Company Name *</label>
                <input className="input" required value={form.companyName} onChange={(e) => set("companyName", e.target.value)} />
              </div>
              <div>
                <label className="label">Contact Name</label>
                <input className="input" value={form.contactName} onChange={(e) => set("contactName", e.target.value)} />
              </div>
              <div>
                <label className="label">Email *</label>
                <input className="input" type="email" required value={form.email} onChange={(e) => set("email", e.target.value)} />
              </div>
              <div>
                <label className="label">Phone</label>
                <input className="input" value={form.phone} onChange={(e) => set("phone", e.target.value)} />
              </div>
              <div>
                <label className="label">Trade</label>
                <select className="input" value={form.trade} onChange={(e) => set("trade", e.target.value)}>
                  {TRADES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">City</label>
                  <input className="input" value={form.city} onChange={(e) => set("city", e.target.value)} />
                </div>
                <div>
                  <label className="label">State</label>
                  <input className="input" value={form.state} onChange={(e) => set("state", e.target.value)} />
                </div>
              </div>
              <div>
                <label className="label">Website</label>
                <input className="input" value={form.website} onChange={(e) => set("website", e.target.value)} />
              </div>
              <div>
                <label className="label">Service ZIP Codes</label>
                <input className="input" placeholder="Comma-separated" value={form.serviceZips} onChange={(e) => set("serviceZips", e.target.value)} />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" className="btn-secondary text-sm" onClick={() => setOpen(false)}>Cancel</button>
                <button type="submit" className="btn-primary text-sm" disabled={saving}>
                  {saving ? "Saving…" : "Add Contact"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
