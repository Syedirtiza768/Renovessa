"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function FeedbackForm({ appointmentId }: { appointmentId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [actorType, setActorType] = useState("HOMEOWNER");
  const [rating, setRating] = useState("");
  const [comments, setComments] = useState("");
  const [submitted, setSubmitted] = useState(false);

  async function submit() {
    if (!rating) {
      setError("Please provide a rating.");
      return;
    }
    setLoading(true);
    setError("");
    const res = await fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        appointmentId,
        actorType,
        responses: { rating: parseInt(rating), comments },
      }),
    });
    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Failed to submit feedback");
    } else {
      setSubmitted(true);
      router.refresh();
    }
    setLoading(false);
  }

  if (submitted) {
    return (
      <div className="card p-4">
        <h2 className="font-semibold">Feedback</h2>
        <p className="mt-2 text-sm text-green-700">Feedback submitted successfully.</p>
      </div>
    );
  }

  return (
    <div className="card p-4">
      <h2 className="font-semibold">Collect Feedback</h2>
      <div className="mt-4 space-y-3">
        <div>
          <label className="text-xs font-medium text-muted">Feedback From</label>
          <select className="input mt-1" value={actorType} onChange={(e) => setActorType(e.target.value)}>
            <option value="HOMEOWNER">Homeowner</option>
            <option value="CONTRACTOR">Contractor</option>
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-muted">Rating (1-5)</label>
          <select className="input mt-1" value={rating} onChange={(e) => setRating(e.target.value)}>
            <option value="">— Select —</option>
            {[1, 2, 3, 4, 5].map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-muted">Comments</label>
          <textarea className="input mt-1" rows={3} value={comments} onChange={(e) => setComments(e.target.value)} placeholder="Additional feedback…" />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button type="button" className="btn-primary w-full text-sm" onClick={submit} disabled={loading}>
          {loading ? "Submitting…" : "Submit Feedback"}
        </button>
      </div>
    </div>
  );
}
