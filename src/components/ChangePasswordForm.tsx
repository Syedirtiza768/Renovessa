"use client";

import { useState } from "react";

export function ChangePasswordForm() {
  const [form, setForm] = useState({ current: "", next: "", confirm: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const update = (field: string, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess(false);

    if (form.next !== form.confirm) {
      setError("New passwords do not match.");
      return;
    }
    if (form.next.length < 8) {
      setError("New password must be at least 8 characters.");
      return;
    }

    setLoading(true);
    const res = await fetch("/api/auth/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword: form.current, newPassword: form.next }),
    });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error || "Failed to change password.");
    } else {
      setSuccess(true);
      setForm({ current: "", next: "", confirm: "" });
    }
  }

  return (
    <div className="card p-4">
      <h2 className="font-semibold">Change Password</h2>
      {success && (
        <p className="mt-3 text-sm text-green-700">Password updated successfully.</p>
      )}
      <form onSubmit={submit} className="mt-4 space-y-3">
        <div>
          <label className="text-xs font-medium text-muted">Current password</label>
          <input
            type="password"
            className="input mt-1"
            value={form.current}
            onChange={(e) => update("current", e.target.value)}
            autoComplete="current-password"
            required
          />
        </div>
        <div>
          <label className="text-xs font-medium text-muted">New password</label>
          <input
            type="password"
            className="input mt-1"
            value={form.next}
            onChange={(e) => update("next", e.target.value)}
            autoComplete="new-password"
            minLength={8}
            required
          />
        </div>
        <div>
          <label className="text-xs font-medium text-muted">Confirm new password</label>
          <input
            type="password"
            className="input mt-1"
            value={form.confirm}
            onChange={(e) => update("confirm", e.target.value)}
            autoComplete="new-password"
            minLength={8}
            required
          />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          className="btn-primary w-full text-sm"
          disabled={loading}
        >
          {loading ? "Updating…" : "Update Password"}
        </button>
      </form>
    </div>
  );
}
