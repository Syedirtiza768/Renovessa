"use client";

import { useCallback, useEffect, useState } from "react";
import type { CustomerFacingProposal } from "@/lib/bathroom/proposal-share";

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; proposal: CustomerFacingProposal; disclaimer: string };

export function PublicProposalView({ token }: { token: string }) {
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [tab, setTab] = useState<"review" | "question" | "accept" | "decline">("review");
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [question, setQuestion] = useState({ fullName: "", email: "", body: "", kind: "question" as "question" | "revision_request" });
  const [accept, setAccept] = useState({ fullName: "", email: "", phone: "", notes: "", acceptedTerms: false });
  const [decline, setDecline] = useState({ fullName: "", email: "", reason: "" });

  const load = useCallback(async () => {
    setState({ status: "loading" });
    try {
      const res = await fetch(`/api/public/proposals/${encodeURIComponent(token)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Proposal not found");
      setState({ status: "ready", proposal: data.proposal, disclaimer: data.disclaimer });
    } catch (e) {
      setState({ status: "error", message: e instanceof Error ? e.message : "Failed to load" });
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  const post = async (path: string, body: unknown) => {
    setBusy(true);
    setError(null);
    setFlash(null);
    try {
      const res = await fetch(`/api/public/proposals/${encodeURIComponent(token)}${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Request failed");
      setFlash(data.note || "Saved.");
      await load();
      setTab("review");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed");
    } finally {
      setBusy(false);
    }
  };

  if (state.status === "loading") {
    return (
      <main className="mx-auto max-w-2xl px-4 py-16 text-stone-600">
        <p className="text-sm">Loading proposal…</p>
      </main>
    );
  }

  if (state.status === "error") {
    return (
      <main className="mx-auto max-w-2xl px-4 py-16 text-center">
        <h1 className="font-serif text-2xl text-stone-900">Proposal unavailable</h1>
        <p className="mt-2 text-sm text-stone-600">{state.message}</p>
      </main>
    );
  }

  const p = state.proposal;
  const c = p.contractor;

  return (
    <main className="min-h-screen bg-gradient-to-b from-stone-100 via-stone-50 to-white">
      <div className="mx-auto max-w-2xl px-4 py-10 sm:py-14">
        <header className="border-b border-stone-200 pb-6">
          <p className="text-xs uppercase tracking-[0.22em] text-stone-500">Proposal</p>
          <h1 className="mt-2 font-serif text-3xl text-stone-900 sm:text-4xl">{c.companyName}</h1>
          {c.tagline && <p className="mt-1 text-sm italic text-stone-600">{c.tagline}</p>}
          <div className="mt-3 space-y-0.5 text-sm text-stone-600">
            {c.contactPerson && <p>{c.contactPerson}</p>}
            {c.address && <p>{c.address}</p>}
            <p>{[c.phone, c.email].filter(Boolean).join(" · ")}</p>
            {c.licenseText && <p className="text-xs text-stone-500">{c.licenseText}</p>}
          </div>
        </header>

        <div className="mt-6 flex flex-wrap items-center gap-2 text-xs">
          <span className="rounded-full bg-stone-200/80 px-2.5 py-1 uppercase tracking-wide text-stone-700">
            {p.status.replace(/_/g, " ")}
          </span>
          <span className="text-stone-500">v{p.version}</span>
          <span className="text-stone-500">#{p.job.referenceNumber}</span>
          {p.expired && <span className="rounded-full bg-amber-100 px-2.5 py-1 text-amber-900">Expired</span>}
        </div>

        {flash && <p className="mt-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-900">{flash}</p>}
        {error && <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>}

        {p.status === "ACCEPTED" && (
          <p className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
            Accepted{p.acceptedAt ? ` on ${new Date(p.acceptedAt).toLocaleString()}` : ""}. This version is locked.
          </p>
        )}
        {p.status === "DECLINED" && (
          <p className="mt-4 rounded-lg border border-stone-200 bg-stone-100 px-3 py-2 text-sm text-stone-700">
            This proposal was declined{p.declinedAt ? ` on ${new Date(p.declinedAt).toLocaleString()}` : ""}.
          </p>
        )}

        <section className="mt-8">
          <p className="text-sm text-stone-500">Prepared for {p.job.clientName || "you"}</p>
          {p.job.jobTitle && <p className="text-lg font-medium text-stone-900">{p.job.jobTitle}</p>}
          <p className="mt-4 font-serif text-4xl text-stone-900">${p.totalPrice.toLocaleString()}</p>
          <p className="mt-1 text-xs text-stone-500">
            Proposal total · subject to the scope, exclusions, and terms below
            {p.expirationDate ? ` · valid through ${new Date(p.expirationDate).toLocaleDateString()}` : ""}
          </p>
        </section>

        <Section title="Included scope" body={p.includedScope} />
        <Section title="Exclusions" body={p.exclusions} />
        {(p.materialAllowances || p.fixtureAllowances) && (
          <section className="mt-8">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-500">Allowances</h2>
            {p.materialAllowances && <p className="mt-2 whitespace-pre-wrap text-sm text-stone-800">{p.materialAllowances}</p>}
            {p.fixtureAllowances && <p className="mt-2 whitespace-pre-wrap text-sm text-stone-800">{p.fixtureAllowances}</p>}
          </section>
        )}
        {p.permitHandling && <Section title="Permits" body={p.permitHandling} />}
        <section className="mt-8">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-500">Schedule</h2>
          <p className="mt-2 text-sm text-stone-800">Start: {p.estimatedStartDate || "—"}</p>
          <p className="text-sm text-stone-800">Duration: {p.estimatedDuration || "—"}</p>
        </section>
        {p.paymentSchedule && <Section title="Payment schedule" body={p.paymentSchedule} />}
        {p.warranty && <Section title="Warranty" body={p.warranty} />}
        {p.changeOrderProcess && <Section title="Change orders" body={p.changeOrderProcess} />}
        {p.optionalUpgrades && <Section title="Optional upgrades" body={p.optionalUpgrades} />}
        {p.suggestedChanges && <Section title="Recommendations" body={p.suggestedChanges} />}

        {p.messages.length > 0 && (
          <section className="mt-8">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-500">Messages</h2>
            <ul className="mt-3 space-y-3">
              {p.messages.map((m) => (
                <li key={m.id} className="rounded-xl border border-stone-200 bg-white p-3 text-sm">
                  <p className="text-xs uppercase tracking-wide text-stone-400">
                    {m.kind.replace(/_/g, " ")}
                    {m.authorName ? ` · ${m.authorName}` : ""}
                  </p>
                  <p className="mt-1 whitespace-pre-wrap text-stone-800">{m.body}</p>
                </li>
              ))}
            </ul>
          </section>
        )}

        {!p.locked && (p.canAccept || p.canAskQuestion) && (
          <section className="mt-10 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap gap-2 border-b border-stone-100 pb-3">
              {(
                [
                  ["review", "Actions"],
                  ["question", "Ask / revise"],
                  ["accept", "Accept"],
                  ["decline", "Decline"],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setTab(id)}
                  className={`rounded-lg px-3 py-1.5 text-sm ${
                    tab === id ? "bg-stone-900 text-white" : "border border-stone-300 text-stone-700"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {tab === "review" && (
              <div className="mt-4 space-y-2 text-sm text-stone-600">
                <p>Review the scope carefully. You can ask a question, request a revision, accept, or decline.</p>
                <div className="flex flex-wrap gap-2 pt-2">
                  {p.canAskQuestion && (
                    <button type="button" onClick={() => setTab("question")} className="rounded-lg border border-stone-300 px-3 py-2">
                      Ask a question
                    </button>
                  )}
                  {p.canAccept && (
                    <button type="button" onClick={() => setTab("accept")} className="rounded-lg bg-stone-900 px-3 py-2 text-white">
                      Accept proposal
                    </button>
                  )}
                  {p.canDecline && (
                    <button type="button" onClick={() => setTab("decline")} className="rounded-lg border border-stone-300 px-3 py-2">
                      Decline
                    </button>
                  )}
                </div>
              </div>
            )}

            {tab === "question" && p.canAskQuestion && (
              <form
                className="mt-4 space-y-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  void post("/question", question);
                }}
              >
                <label className="block text-sm">
                  <span className="text-stone-500">Your name</span>
                  <input
                    value={question.fullName}
                    onChange={(e) => setQuestion((q) => ({ ...q, fullName: e.target.value }))}
                    className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2"
                  />
                </label>
                <label className="block text-sm">
                  <span className="text-stone-500">Email</span>
                  <input
                    type="email"
                    value={question.email}
                    onChange={(e) => setQuestion((q) => ({ ...q, email: e.target.value }))}
                    className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2"
                  />
                </label>
                <label className="block text-sm">
                  <span className="text-stone-500">Type</span>
                  <select
                    value={question.kind}
                    onChange={(e) =>
                      setQuestion((q) => ({
                        ...q,
                        kind: e.target.value as "question" | "revision_request",
                      }))
                    }
                    className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2"
                  >
                    <option value="question">Question</option>
                    <option value="revision_request">Request revision</option>
                  </select>
                </label>
                <label className="block text-sm">
                  <span className="text-stone-500">Message</span>
                  <textarea
                    required
                    rows={4}
                    value={question.body}
                    onChange={(e) => setQuestion((q) => ({ ...q, body: e.target.value }))}
                    className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2"
                  />
                </label>
                <button
                  type="submit"
                  disabled={busy}
                  className="rounded-lg bg-stone-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
                >
                  Send
                </button>
              </form>
            )}

            {tab === "accept" && p.canAccept && (
              <form
                className="mt-4 space-y-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!accept.acceptedTerms) {
                    setError("Please confirm you accept the proposal terms.");
                    return;
                  }
                  void post("/accept", {
                    fullName: accept.fullName,
                    email: accept.email,
                    phone: accept.phone || undefined,
                    notes: accept.notes || undefined,
                    acceptedTerms: true,
                  });
                }}
              >
                <p className="text-sm text-stone-600">
                  By accepting, you agree to the scope, price (${p.totalPrice.toLocaleString()}), and terms in version {p.version}.
                </p>
                <label className="block text-sm">
                  <span className="text-stone-500">Full legal name</span>
                  <input
                    required
                    value={accept.fullName}
                    onChange={(e) => setAccept((a) => ({ ...a, fullName: e.target.value }))}
                    className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2"
                  />
                </label>
                <label className="block text-sm">
                  <span className="text-stone-500">Email</span>
                  <input
                    required
                    type="email"
                    value={accept.email}
                    onChange={(e) => setAccept((a) => ({ ...a, email: e.target.value }))}
                    className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2"
                  />
                </label>
                <label className="block text-sm">
                  <span className="text-stone-500">Phone (optional)</span>
                  <input
                    value={accept.phone}
                    onChange={(e) => setAccept((a) => ({ ...a, phone: e.target.value }))}
                    className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2"
                  />
                </label>
                <label className="block text-sm">
                  <span className="text-stone-500">Notes (optional)</span>
                  <textarea
                    rows={2}
                    value={accept.notes}
                    onChange={(e) => setAccept((a) => ({ ...a, notes: e.target.value }))}
                    className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2"
                  />
                </label>
                <label className="flex items-start gap-2 text-sm text-stone-700">
                  <input
                    type="checkbox"
                    checked={accept.acceptedTerms}
                    onChange={(e) => setAccept((a) => ({ ...a, acceptedTerms: e.target.checked }))}
                    className="mt-1"
                  />
                  <span>I accept this proposal version, including the stated price, scope, exclusions, and terms.</span>
                </label>
                <button
                  type="submit"
                  disabled={busy}
                  className="rounded-lg bg-emerald-800 px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
                >
                  Accept & lock this version
                </button>
              </form>
            )}

            {tab === "decline" && p.canDecline && (
              <form
                className="mt-4 space-y-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  void post("/decline", decline);
                }}
              >
                <label className="block text-sm">
                  <span className="text-stone-500">Name (optional)</span>
                  <input
                    value={decline.fullName}
                    onChange={(e) => setDecline((d) => ({ ...d, fullName: e.target.value }))}
                    className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2"
                  />
                </label>
                <label className="block text-sm">
                  <span className="text-stone-500">Reason</span>
                  <textarea
                    required
                    rows={3}
                    value={decline.reason}
                    onChange={(e) => setDecline((d) => ({ ...d, reason: e.target.value }))}
                    className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2"
                  />
                </label>
                <button
                  type="submit"
                  disabled={busy}
                  className="rounded-lg border border-stone-400 px-4 py-2 text-sm disabled:opacity-40"
                >
                  Decline proposal
                </button>
              </form>
            )}
          </section>
        )}

        <footer className="mt-12 border-t border-stone-200 pt-6 text-xs text-stone-500">
          <p>{c.footerText || "This proposal is provided for planning and contracting purposes."}</p>
          <p className="mt-3">{state.disclaimer}</p>
        </footer>
      </div>
    </main>
  );
}

function Section({ title, body }: { title: string; body: string }) {
  return (
    <section className="mt-8">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-500">{title}</h2>
      <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-stone-800">{body}</p>
    </section>
  );
}
