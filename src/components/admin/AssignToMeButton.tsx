"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function AssignToMeButton({ leadId }: { leadId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function assign() {
    setLoading(true);
    await fetch(`/api/leads/${leadId}/assign`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    router.refresh();
    setLoading(false);
  }

  return (
    <button
      type="button"
      className="btn-primary text-xs py-0.5 px-2"
      disabled={loading}
      onClick={assign}
    >
      {loading ? "…" : "Assign to Me"}
    </button>
  );
}
