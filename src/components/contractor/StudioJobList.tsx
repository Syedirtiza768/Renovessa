"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Job = {
  id: string;
  referenceNumber: string;
  jobTitle: string | null;
  clientName: string | null;
  status: string;
  updatedAt: string;
  proposals: { totalPrice: number }[];
  _count: { media: number; proposals: number };
};

export function StudioJobList() {
  const router = useRouter();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [companyName, setCompanyName] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    clientName: "",
    jobTitle: "",
    clientPhone: "",
    clientEmail: "",
    requirementsPrompt: "",
  });

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/contractor/bathroom-jobs");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load");
      setJobs(data.jobs);
      setCompanyName(data.profile?.companyName || "");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const createJob = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/contractor/bathroom-jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Create failed");
      router.push(`/portal/contractor/proposal-studio/${data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Create failed");
      setCreating(false);
    }
  };

  if (loading) return <p className="text-sm text-stone-600">Loading jobs…</p>;

  return (
    <div className="space-y-8">
      <header className="border-b border-stone-200 pb-6">
        <p className="text-xs uppercase tracking-[0.2em] text-stone-500">Proposal studio</p>
        <h1 className="mt-1 font-serif text-3xl text-stone-900">{companyName || "Your company"}</h1>
        <p className="mt-2 max-w-2xl text-sm text-stone-600">
          Create bathroom estimates and client proposals under your letterhead. Independent of homeowner RFQs —
          this is your working tool.
        </p>
        <div className="mt-4 flex flex-wrap gap-3 text-sm">
          <Link href="/portal/contractor/proposal-studio/letterhead" className="text-stone-800 underline">
            Letterhead & pricing
          </Link>
        </div>
      </header>

      {error && <p className="text-sm text-red-700">{error}</p>}

      <section className="rounded-2xl border border-stone-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-stone-900">New job</h2>
        <form onSubmit={createJob} className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="text-sm sm:col-span-1">
            <span className="text-stone-500">Client name</span>
            <input
              required
              value={form.clientName}
              onChange={(e) => setForm((f) => ({ ...f, clientName: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2"
            />
          </label>
          <label className="text-sm">
            <span className="text-stone-500">Job title</span>
            <input
              value={form.jobTitle}
              onChange={(e) => setForm((f) => ({ ...f, jobTitle: e.target.value }))}
              placeholder="Primary bath remodel"
              className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2"
            />
          </label>
          <label className="text-sm">
            <span className="text-stone-500">Phone</span>
            <input
              value={form.clientPhone}
              onChange={(e) => setForm((f) => ({ ...f, clientPhone: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2"
            />
          </label>
          <label className="text-sm">
            <span className="text-stone-500">Email</span>
            <input
              type="email"
              value={form.clientEmail}
              onChange={(e) => setForm((f) => ({ ...f, clientEmail: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2"
            />
          </label>
          <label className="text-sm sm:col-span-2">
            <span className="text-stone-500">Scope notes / prompt</span>
            <textarea
              rows={3}
              value={form.requirementsPrompt}
              onChange={(e) => setForm((f) => ({ ...f, requirementsPrompt: e.target.value }))}
              placeholder="Tub-to-shower, mid-range tile, occupied home, Rockville condo…"
              className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2"
            />
          </label>
          <div className="sm:col-span-2">
            <button
              type="submit"
              disabled={creating}
              className="rounded-lg bg-stone-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
            >
              {creating ? "Creating…" : "Create job"}
            </button>
          </div>
        </form>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-stone-900">Your jobs</h2>
        {jobs.length === 0 ? (
          <p className="mt-2 text-sm text-stone-500">No jobs yet — create one above.</p>
        ) : (
          <ul className="mt-3 divide-y divide-stone-200 rounded-2xl border border-stone-200 bg-white">
            {jobs.map((j) => (
              <li key={j.id}>
                <Link
                  href={`/portal/contractor/proposal-studio/${j.id}`}
                  className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 hover:bg-stone-50"
                >
                  <div>
                    <p className="font-medium text-stone-900">{j.jobTitle || j.clientName || "Untitled"}</p>
                    <p className="text-xs text-stone-500">
                      {j.clientName} · {j.referenceNumber} · {j.status.replace(/_/g, " ")}
                    </p>
                  </div>
                  <div className="text-right text-sm text-stone-600">
                    {j.proposals[0] ? `$${j.proposals[0].totalPrice.toLocaleString()}` : "No proposal yet"}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
