"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Contractor {
  id: string;
  companyName: string;
  trade: string;
  tier: string;
  email: string;
}

interface Props {
  projectId: string;
  contractors: Contractor[];
  dispatchedContractorIds: string[];
  projectStatus: string;
}

export function ContractorDispatchPanel({ projectId, contractors, dispatchedContractorIds, projectStatus }: Props) {
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>([]);
  const [dispatching, setDispatching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const eligible = contractors.filter((c) => !dispatchedContractorIds.includes(c.id));
  const canDispatch = ["BRIEF_READY", "RFQ_SUBMITTED", "CONTRACTOR_INVITED", "DRAFT", "IN_PROGRESS"].includes(projectStatus);

  const toggle = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const dispatch = async () => {
    if (selected.length === 0) {
      setError("Select at least one contractor.");
      return;
    }
    setDispatching(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch(`/api/bathroom-projects/${projectId}/dispatch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contractorIds: selected }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? `Failed (${res.status})`);
      }
      const data = await res.json();
      setSuccess(`RFP dispatched to ${data.totalDispatched} contractor(s).`);
      setSelected([]);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setDispatching(false);
    }
  };

  return (
    <div className="card-accent p-4">
      <h2 className="font-semibold">Dispatch RFP to Contractors</h2>
      <p className="mt-1 text-xs text-muted">
        Select contractors to send this project brief as an RFP. They&apos;ll be notified and can submit proposals.
      </p>

      {!canDispatch && (
        <p className="mt-2 text-sm text-amber-700">
          Project status is {projectStatus}. Dispatch is available for projects with a brief.
        </p>
      )}

      {canDispatch && (
        <>
          {eligible.length === 0 ? (
            <p className="mt-3 text-sm text-muted italic">
              No eligible contractors available. All active bathroom contractors have already been sent this RFP.
            </p>
          ) : (
            <div className="mt-3 space-y-2 max-h-60 overflow-y-auto">
              {eligible.map((c) => (
                <label
                  key={c.id}
                  className={`flex items-center gap-3 rounded-md border p-3 text-sm cursor-pointer transition ${
                    selected.includes(c.id) ? "border-copper bg-copper/5" : "border-rule hover:border-muted"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selected.includes(c.id)}
                    onChange={() => toggle(c.id)}
                    className="accent-accent"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium">{c.companyName}</p>
                    <p className="text-xs text-muted">{c.trade} · {c.tier}</p>
                  </div>
                </label>
              ))}
            </div>
          )}

          {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
          {success && <p className="mt-2 text-sm text-green-700">{success}</p>}

          {eligible.length > 0 && (
            <button
              type="button"
              onClick={dispatch}
              disabled={dispatching || selected.length === 0}
              className="mt-3 w-full rounded-lg bg-accent px-4 py-2 text-sm font-medium text-bone-0 transition hover:opacity-90 disabled:opacity-40"
            >
              {dispatching
                ? "Dispatching…"
                : `Send RFP to ${selected.length} Contractor${selected.length !== 1 ? "s" : ""}`}
            </button>
          )}
        </>
      )}

      {dispatchedContractorIds.length > 0 && (
        <p className="mt-3 text-xs text-muted">
          {dispatchedContractorIds.length} contractor(s) already have this RFP.
        </p>
      )}
    </div>
  );
}
