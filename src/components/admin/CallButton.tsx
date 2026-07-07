"use client";

import { useEffect, useState } from "react";

interface AgentNumber {
  id: string;
  phoneNumber: string;
  label: string | null;
}

const DIAL_EVENT = "renovessa:dial";

export function CallButton({
  toNumber,
  label = "Call",
  projectRequestId,
  contractorId,
}: {
  toNumber: string;
  label?: string;
  projectRequestId?: string;
  contractorId?: string;
}) {
  const [softphoneReady, setSoftphoneReady] = useState(false);
  const [numbers, setNumbers] = useState<AgentNumber[] | null>(null);
  const [selectedId, setSelectedId] = useState("");
  const [calling, setCalling] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  // Track whether the docked softphone has registered with Twilio.
  useEffect(() => {
    setSoftphoneReady(!!window.__renovessaSoftphoneReady);
    const id = setInterval(() => {
      setSoftphoneReady(!!window.__renovessaSoftphoneReady);
    }, 1000);
    return () => clearInterval(id);
  }, []);

  // Only needed for the click-to-call fallback path.
  useEffect(() => {
    if (softphoneReady) return;
    fetch("/api/calls")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setNumbers(data);
          if (data.length > 0) setSelectedId(data[0].id);
        }
      })
      .catch(() => setNumbers([]));
  }, [softphoneReady]);

  function dial() {
    if (softphoneReady) {
      window.dispatchEvent(
        new CustomEvent(DIAL_EVENT, {
          detail: { toNumber, projectRequestId, contractorId },
        })
      );
      setStatus("Dialing from softphone…");
      return;
    }

    // Fallback: click-to-call rings the agent's own phone, then bridges.
    runClickToCall();
  }

  async function runClickToCall() {
    setCalling(true);
    setError("");
    setStatus("");
    const res = await fetch("/api/calls", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ toNumber, projectRequestId, contractorId, twilioPhoneNumberId: selectedId || undefined }),
    });
    const data = await res.json();
    setCalling(false);
    if (!res.ok) {
      setError(data.error || "Failed to place call");
      return;
    }
    setStatus("Calling your phone now — answer it to connect the call.");
  }

  if (softphoneReady) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className="btn-primary text-sm" onClick={dial}>
          {label} {toNumber}
        </button>
        {status && <span className="text-xs text-muted">{status}</span>}
        {error && <span className="text-xs text-red-600">{error}</span>}
      </div>
    );
  }

  if (numbers === null) return null;

  if (numbers.length === 0) {
    return (
      <p className="text-xs text-muted">
        No Twilio number assigned to you — ask an admin to assign one in Phone Numbers.
      </p>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {numbers.length > 1 && (
        <select
          className="input w-auto text-xs"
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
        >
          {numbers.map((n) => (
            <option key={n.id} value={n.id}>
              {n.label || n.phoneNumber}
            </option>
          ))}
        </select>
      )}
      <button type="button" className="btn-primary text-sm" onClick={dial} disabled={calling}>
        {calling ? "Calling…" : `${label} ${toNumber}`}
      </button>
      {status && <span className="text-xs text-muted">{status}</span>}
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  );
}
