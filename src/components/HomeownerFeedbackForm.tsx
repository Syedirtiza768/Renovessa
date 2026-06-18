"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

interface Props {
  appointmentId: string;
}

const RATINGS = [1, 2, 3, 4, 5];

export function HomeownerFeedbackForm({ appointmentId }: Props) {
  const router = useRouter();
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [rating, setRating] = useState(0);
  const [comments, setComments] = useState("");
  const [wouldRebook, setWouldRebook] = useState<boolean | null>(null);

  async function submit() {
    if (rating === 0) {
      setError("Please select a rating.");
      return;
    }
    setLoading(true);
    setError("");
    const res = await fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        appointmentId,
        actorType: "homeowner",
        responses: { rating, comments, wouldRebook },
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
      <div className="mt-4 rounded-md bg-blueprint p-4 text-sm text-center">
        <p className="font-semibold">Thank you for your feedback!</p>
        <p className="text-muted mt-1">Your response helps us improve the service.</p>
      </div>
    );
  }

  return (
    <div className="mt-4 rounded-md border border-rule p-4 space-y-4">
      <p className="text-sm font-semibold">How was your appointment?</p>

      <div>
        <p className="text-xs font-medium text-muted mb-2">Rating</p>
        <div className="flex gap-2">
          {RATINGS.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRating(r)}
              className={`h-9 w-9 rounded-md border text-sm font-semibold transition ${
                rating === r
                  ? "border-copper bg-copper text-white"
                  : "border-rule bg-white text-slate hover:border-copper"
              }`}
            >
              {r}
            </button>
          ))}
          <span className="self-center text-xs text-muted ml-1">
            {rating === 1 ? "Poor" : rating === 2 ? "Fair" : rating === 3 ? "Good" : rating === 4 ? "Great" : rating === 5 ? "Excellent" : ""}
          </span>
        </div>
      </div>

      <div>
        <label className="text-xs font-medium text-muted">Comments (optional)</label>
        <textarea
          className="input mt-1 text-sm"
          rows={3}
          value={comments}
          onChange={(e) => setComments(e.target.value)}
          placeholder="Tell us about your experience…"
        />
      </div>

      <div>
        <p className="text-xs font-medium text-muted mb-2">Would you book this contractor again?</p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setWouldRebook(true)}
            className={`rounded-md border px-4 py-1.5 text-sm font-medium transition ${
              wouldRebook === true ? "border-copper bg-copper text-white" : "border-rule bg-white text-slate hover:border-copper"
            }`}
          >
            Yes
          </button>
          <button
            type="button"
            onClick={() => setWouldRebook(false)}
            className={`rounded-md border px-4 py-1.5 text-sm font-medium transition ${
              wouldRebook === false ? "border-copper bg-copper text-white" : "border-rule bg-white text-slate hover:border-copper"
            }`}
          >
            No
          </button>
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="button"
        className="btn-primary w-full text-sm"
        onClick={submit}
        disabled={loading}
      >
        {loading ? "Submitting…" : "Submit Feedback"}
      </button>
    </div>
  );
}
