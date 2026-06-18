"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface Agent {
  id: string;
  name: string;
  email: string;
}

interface Props {
  leadId: string;
  currentStatus: string;
  assignedAgentId: string | null;
  assignedAgentName: string | null;
  sessionId: string;
}

export function AssignAgentPanel({
  leadId,
  currentStatus,
  assignedAgentId,
  assignedAgentName,
  sessionId,
}: Props) {
  const router = useRouter();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState(assignedAgentId ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    fetch("/api/users?role=ops")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setAgents(data);
      })
      .catch(() => {});
  }, []);

  async function assign(agentId?: string) {
    setLoading(true);
    setError("");
    setSuccess("");
    const res = await fetch(`/api/leads/${leadId}/assign`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ agentId: agentId ?? selectedAgentId ?? undefined }),
    });
    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Failed to assign");
    } else {
      setSuccess("Assigned.");
      router.refresh();
    }
    setLoading(false);
  }

  return (
    <div className="card p-4">
      <h2 className="font-semibold">Agent Assignment</h2>
      <div className="mt-3 space-y-3">
        <div className="text-sm">
          <span className="text-muted">Currently: </span>
          <span className="font-medium">{assignedAgentName ?? "Unassigned"}</span>
          <span className="ml-2 text-xs text-muted">({currentStatus})</span>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="btn-primary text-sm"
            disabled={loading}
            onClick={() => assign(sessionId)}
          >
            Assign to Me
          </button>
        </div>

        {agents.length > 0 && (
          <div>
            <label className="text-xs font-medium text-muted">Assign to specific agent</label>
            <div className="mt-1 flex gap-2">
              <select
                className="input flex-1"
                value={selectedAgentId}
                onChange={(e) => setSelectedAgentId(e.target.value)}
              >
                <option value="">— Select agent —</option>
                {agents.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="btn-secondary text-sm"
                disabled={loading || !selectedAgentId}
                onClick={() => assign(selectedAgentId)}
              >
                Assign
              </button>
            </div>
          </div>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}
        {success && <p className="text-sm text-green-700">{success}</p>}
      </div>
    </div>
  );
}
