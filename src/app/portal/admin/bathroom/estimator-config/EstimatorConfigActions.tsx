"use client";

import { useState } from "react";

export function EstimatorConfigActions({
  id,
  status,
}: {
  id: string | null;
  status: "PUBLISHED" | "DRAFT" | "RETIRED" | "NONE";
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  async function call(action: string, configId: string) {
    setBusy(action);
    setMsg(null);
    try {
      const res = await fetch(`/api/bathroom-estimator/configurations/${configId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `Failed (${res.status})`);
      setMsg(`✓ ${action} succeeded`);
      window.location.reload();
    } catch (e) {
      setMsg(`✗ ${e instanceof Error ? e.message : "Unknown error"}`);
    } finally {
      setBusy(null);
    }
  }

  async function seedDefault() {
    setBusy("seed");
    setMsg(null);
    try {
      const res = await fetch("/api/bathroom-estimator/configurations", {
        method: "PUT",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `Failed (${res.status})`);
      setMsg("✓ Default seeded");
      window.location.reload();
    } catch (e) {
      setMsg(`✗ ${e instanceof Error ? e.message : "Unknown error"}`);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="mt-3">
      <div className="flex flex-wrap gap-2">
        {status === "NONE" && (
          <button
            type="button"
            onClick={seedDefault}
            disabled={busy !== null}
            className="rounded border border-ink-15 px-3 py-1 text-xs font-medium text-ink-70 hover:border-ink-40 disabled:opacity-40"
          >
            {busy === "seed" ? "Seeding…" : "Seed default config"}
          </button>
        )}
        {id && status === "DRAFT" && (
          <button
            type="button"
            onClick={() => call("publish", id)}
            disabled={busy !== null}
            className="rounded border border-green-600 bg-green-600 px-3 py-1 text-xs font-medium text-white hover:opacity-90 disabled:opacity-40"
          >
            {busy === "publish" ? "Publishing…" : "Publish"}
          </button>
        )}
        {id && status === "PUBLISHED" && (
          <button
            type="button"
            onClick={() => call("retire", id)}
            disabled={busy !== null}
            className="rounded border border-amber-600 px-3 py-1 text-xs font-medium text-amber-700 hover:bg-amber-50 disabled:opacity-40"
          >
            {busy === "retire" ? "Retiring…" : "Retire"}
          </button>
        )}
        {id && status !== "PUBLISHED" && (
          <button
            type="button"
            onClick={() => call("clone", id)}
            disabled={busy !== null}
            className="rounded border border-ink-15 px-3 py-1 text-xs font-medium text-ink-70 hover:border-ink-40 disabled:opacity-40"
          >
            {busy === "clone" ? "Cloning…" : "Clone"}
          </button>
        )}
      </div>
      {msg && <p className="mt-2 text-xs text-ink-70">{msg}</p>}
    </div>
  );
}
