"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

interface Agent {
  id: string;
  name: string;
  email: string;
}

interface PhoneNumber {
  id: string;
  phoneNumber: string;
  label: string | null;
  isActive: boolean;
  assignedUserId: string | null;
  assignedUserName: string | null;
}

export function PhoneNumberAssignment({ numbers, agents }: { numbers: PhoneNumber[]; agents: Agent[] }) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [label, setLabel] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  async function addNumber() {
    setError("");
    if (!/^\+[1-9]\d{1,14}$/.test(phoneNumber)) {
      setError("Enter the number in E.164 format, e.g. +15551234567");
      return;
    }
    setAdding(true);
    const res = await fetch("/api/admin/phone-numbers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phoneNumber, label: label || undefined }),
    });
    const data = await res.json();
    setAdding(false);
    if (!res.ok) {
      setError(data.error || "Failed to add number");
      return;
    }
    setPhoneNumber("");
    setLabel("");
    router.refresh();
  }

  async function assign(id: string, assignedUserId: string) {
    setBusyId(id);
    await fetch(`/api/admin/phone-numbers/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assignedUserId: assignedUserId || null }),
    });
    router.refresh();
    setBusyId(null);
  }

  async function toggleActive(id: string, isActive: boolean) {
    setBusyId(id);
    await fetch(`/api/admin/phone-numbers/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !isActive }),
    });
    router.refresh();
    setBusyId(null);
  }

  return (
    <div className="space-y-6">
      <div className="card p-4 max-w-lg">
        <h2 className="font-semibold">Add a Number</h2>
        <p className="mt-1 text-xs text-muted">
          The number must already be purchased and Voice-enabled in your Twilio account — this just
          registers it so it can be assigned to an agent.
        </p>
        <div className="mt-4 space-y-3">
          <div>
            <label className="text-xs font-medium text-muted">Phone number (E.164) *</label>
            <input
              className="input mt-1"
              placeholder="+15551234567"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted">Label</label>
            <input
              className="input mt-1"
              placeholder="e.g. Fairfax line"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button type="button" className="btn-primary w-full text-sm" onClick={addNumber} disabled={adding}>
            {adding ? "Adding…" : "Add Number"}
          </button>
        </div>
      </div>

      <div className="overflow-x-auto card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-rule bg-blueprint text-left text-xs uppercase text-muted">
              <th className="p-3">Number</th>
              <th className="p-3">Label</th>
              <th className="p-3">Assigned Agent</th>
              <th className="p-3">Active</th>
            </tr>
          </thead>
          <tbody>
            {numbers.map((n) => (
              <tr key={n.id} className="border-b border-rule/50">
                <td className="p-3 font-mono">{n.phoneNumber}</td>
                <td className="p-3">{n.label || "—"}</td>
                <td className="p-3">
                  <select
                    className="input"
                    value={n.assignedUserId ?? ""}
                    disabled={busyId === n.id}
                    onChange={(e) => assign(n.id, e.target.value)}
                  >
                    <option value="">— Unassigned —</option>
                    {agents.map((a) => (
                      <option key={a.id} value={a.id}>{a.name}</option>
                    ))}
                  </select>
                </td>
                <td className="p-3">
                  <button
                    type="button"
                    className="text-xs font-medium text-copper hover:underline"
                    disabled={busyId === n.id}
                    onClick={() => toggleActive(n.id, n.isActive)}
                  >
                    {n.isActive ? "Active" : "Disabled"}
                  </button>
                </td>
              </tr>
            ))}
            {numbers.length === 0 && (
              <tr>
                <td className="p-3 text-muted" colSpan={4}>No phone numbers added yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
