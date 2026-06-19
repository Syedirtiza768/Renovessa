"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";

const ROLES = [
  { value: "OPS_AGENT", label: "Ops Agent" },
  { value: "SCHEDULER", label: "Scheduler" },
  { value: "OPS_MANAGER", label: "Ops Manager" },
];

export default function NewTeamMemberPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [createdEmail, setCreatedEmail] = useState("");
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    role: "OPS_AGENT",
  });

  const update = (field: string, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  async function submit() {
    if (!form.name || !form.email) {
      setError("Name and email are required.");
      return;
    }
    setLoading(true);
    setError("");
    const res = await fetch("/api/team", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error || "Failed to create team member");
      return;
    }

    setTempPassword(data.tempPassword);
    setCreatedEmail(data.email);
  }

  if (tempPassword) {
    return (
      <div>
        <h1 className="text-2xl font-bold">Team Member Created</h1>
        <div className="mt-6 card p-6 max-w-lg">
          <p className="text-sm text-muted">
            Share these credentials with the new team member. The password is only shown once.
          </p>
          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between gap-4 rounded bg-blueprint px-3 py-2">
              <dt className="text-muted">Email</dt>
              <dd className="font-medium break-all">{createdEmail}</dd>
            </div>
            <div className="flex justify-between gap-4 rounded bg-blueprint px-3 py-2">
              <dt className="text-muted">Password</dt>
              <dd className="font-mono font-medium tracking-widest">{tempPassword}</dd>
            </div>
          </dl>
          <Link href="/portal/admin/team" className="btn-primary mt-6 inline-flex">
            Back to Team
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Link href="/portal/admin/team" className="text-sm text-copper hover:underline">
        ← Back to Team
      </Link>
      <h1 className="mt-4 text-2xl font-bold">Add Team Member</h1>
      <div className="mt-6 card p-4 max-w-lg">
        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium text-muted">Full name *</label>
            <input className="input mt-1" value={form.name} onChange={(e) => update("name", e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-medium text-muted">Email *</label>
            <input type="email" className="input mt-1" value={form.email} onChange={(e) => update("email", e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-medium text-muted">Phone</label>
            <input className="input mt-1" value={form.phone} onChange={(e) => update("phone", e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-medium text-muted">Role *</label>
            <select className="input mt-1" value={form.role} onChange={(e) => update("role", e.target.value)}>
              {ROLES.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button type="button" className="btn-primary w-full" onClick={submit} disabled={loading}>
            {loading ? "Creating…" : "Create Team Member"}
          </button>
        </div>
      </div>
    </div>
  );
}
