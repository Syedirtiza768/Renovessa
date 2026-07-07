"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

interface AssignedNumber {
  id: string;
  phoneNumber: string;
  label: string | null;
}

interface HistoryCall {
  id: string;
  toNumber: string;
  fromNumber: string;
  status: string;
  durationSeconds: number | null;
  direction: string;
  startedAt: string;
  endedAt: string | null;
  disposition: string | null;
  dispositionNote: string | null;
  projectRequestId: string | null;
  contractorId: string | null;
  projectRequest: { firstName: string; lastName: string; referenceNumber: string } | null;
  contractor: { companyName: string } | null;
}

type DeviceStatus = "idle" | "connecting" | "in-call";

interface DialRequest {
  toNumber: string;
  label?: string;
  projectRequestId?: string;
  contractorId?: string;
}

declare global {
  interface Window {
    __renovessaSoftphoneReady?: boolean;
  }
}

const DIAL_EVENT = "renovessa:dial";
const DIALER_ROUTE = "/portal/admin/dialer";

/**
 * Shared softphone engine. `variant="dock"` renders the fixed bottom-right
 * pill + collapsible panel (mounted in the admin layout). `variant="full"`
 * renders an inline, always-open panel for the dedicated /portal/admin/dialer
 * page.
 */
export function Dialer({ variant = "dock" }: { variant?: "dock" | "full" }) {
  const isDock = variant === "dock";
  const [open, setOpen] = useState(false);
  const [ready, setReady] = useState(false);
  const [bootError, setBootError] = useState("");
  const [status, setStatus] = useState<DeviceStatus>("idle");
  const [error, setError] = useState("");
  const [numbers, setNumbers] = useState<AssignedNumber[]>([]);
  const [callerId, setCallerId] = useState("");
  const [dialedNumber, setDialedNumber] = useState("");
  const [muted, setMuted] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [history, setHistory] = useState<HistoryCall[]>([]);
  const [pendingDial, setPendingDial] = useState<DialRequest | null>(null);

  const [dispCallLogId, setDispCallLogId] = useState<string | null>(null);
  const [dispOpen, setDispOpen] = useState(false);
  const [dispOutcome, setDispOutcome] = useState("");
  const [dispNote, setDispNote] = useState("");
  const [dispSaving, setDispSaving] = useState(false);

  const deviceRef = useRef<any>(null);
  const callRef = useRef<any>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const identityRef = useRef<string>("");

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startTimer = useCallback(() => {
    stopTimer();
    setSeconds(0);
    timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
  }, [stopTimer]);

  const refreshHistory = useCallback(async (): Promise<HistoryCall[]> => {
    try {
      const res = await fetch("/api/calls/history");
      if (res.ok) {
        const rows = await res.json();
        setHistory(rows);
        return rows;
      }
    } catch {
      /* ignore */
    }
    return [];
  }, []);

  const placeCall = useCallback(
    async (request: { toNumber: string; projectRequestId?: string; contractorId?: string }) => {
      const device = deviceRef.current;
      if (!device || !ready) {
        setError("Softphone is not ready yet");
        return;
      }
      if (!callerId) {
        setError("No Twilio number assigned — ask an admin to assign one in Phone Numbers");
        return;
      }
      setError("");
      setStatus("connecting");
      setDialedNumber(request.toNumber);
      try {
        const call = await device.connect({
          params: {
            To: request.toNumber,
            CallerId: callerId,
            AgentId: identityRef.current,
            LeadId: request.projectRequestId || "",
            ContractorId: request.contractorId || "",
          },
        });
        callRef.current = call;
        call.on("accept", () => {
          setStatus("in-call");
          startTimer();
        });
        call.on("disconnect", () => {
          setStatus("idle");
          setMuted(false);
          stopTimer();
          callRef.current = null;
          refreshHistory().then((rows) => {
            const latest = rows[0];
            if (latest && !latest.disposition) {
              setDispCallLogId(latest.id);
              setDispOutcome("");
              setDispNote("");
              setDispOpen(true);
            }
          });
        });
        call.on("error", (err: any) => {
          setError(err?.message || "Call failed");
          setStatus("idle");
          stopTimer();
          callRef.current = null;
        });
      } catch (e: any) {
        setError(e?.message || "Failed to place call");
        setStatus("idle");
      }
    },
    [callerId, ready, refreshHistory, startTimer, stopTimer]
  );

  useEffect(() => {
    let cancelled = false;
    let refreshTimeout: ReturnType<typeof setTimeout>;

    async function boot() {
      try {
        const res = await fetch("/api/calls/token");
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "Failed to load voice token");
        }
        const data = await res.json();
        if (cancelled) return;

        identityRef.current = data.identity;
        setNumbers(data.numbers || []);
        if (data.numbers?.length > 0) setCallerId(data.numbers[0].phoneNumber);

        const { Device } = await import("@twilio/voice-sdk");
        const device = new Device(data.token, { logLevel: "warn" });
        deviceRef.current = device;

        device.on("registered", () => {
          if (cancelled) return;
          setReady(true);
          window.__renovessaSoftphoneReady = true;
        });
        device.on("error", (err: any) => {
          if (cancelled) return;
          setBootError(err?.message || "Twilio device error");
        });
        device.on("incoming", () => {
          /* inbound not enabled in this pilot */
        });

        await device.register();

        refreshTimeout = setInterval(async () => {
          try {
            const r = await fetch("/api/calls/token");
            if (r.ok) {
              const d = await r.json();
              identityRef.current = d.identity;
              setNumbers(d.numbers || []);
              deviceRef.current?.updateToken?.(d.token);
            }
          } catch {
            /* ignore refresh failures */
          }
        }, 50 * 60 * 1000) as unknown as ReturnType<typeof setTimeout>;
      } catch (e: any) {
        if (!cancelled) setBootError(e?.message || "Failed to start softphone");
      }
    }

    boot();
    refreshHistory();

    return () => {
      cancelled = true;
      window.__renovessaSoftphoneReady = false;
      if (refreshTimeout) clearTimeout(refreshTimeout);
      stopTimer();
      try {
        callRef.current?.disconnect?.();
        deviceRef.current?.destroy?.();
      } catch {
        /* ignore */
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    function onDial(e: Event) {
      const detail = (e as CustomEvent<DialRequest>).detail;
      if (!detail?.toNumber) return;
      setOpen(true);
      setDialedNumber(detail.toNumber);
      setPendingDial(detail);
      if (ready && callerId) {
        placeCall({
          toNumber: detail.toNumber,
          projectRequestId: detail.projectRequestId,
          contractorId: detail.contractorId,
        });
      }
    }
    window.addEventListener(DIAL_EVENT, onDial as EventListener);
    return () => window.removeEventListener(DIAL_EVENT, onDial as EventListener);
  }, [ready, callerId, placeCall]);

  useEffect(() => {
    if (ready && callerId && pendingDial) {
      placeCall({
        toNumber: pendingDial.toNumber,
        projectRequestId: pendingDial.projectRequestId,
        contractorId: pendingDial.contractorId,
      });
      setPendingDial(null);
    }
  }, [ready, callerId, pendingDial, placeCall]);

  function hangup() {
    try {
      callRef.current?.disconnect?.();
    } catch {
      /* ignore */
    }
  }

  function toggleMute() {
    const call = callRef.current;
    if (!call) return;
    const next = !muted;
    call.mute(next);
    setMuted(next);
  }

  function pressDigit(d: string) {
    if (status === "in-call") {
      callRef.current?.sendDigits?.(d);
    } else {
      setDialedNumber((n) => (n.length < 16 ? n + d : n));
    }
  }

  function backspace() {
    setDialedNumber((n) => n.slice(0, -1));
  }

  function dialTyped() {
    if (!dialedNumber) return;
    placeCall({ toNumber: dialedNumber });
  }

  async function saveDisposition() {
    if (!dispOutcome) {
      setError("Pick an outcome");
      return;
    }
    setDispSaving(true);
    setError("");
    try {
      const res = await fetch("/api/calls/disposition", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          callLogId: dispCallLogId || undefined,
          outcome: dispOutcome,
          note: dispNote || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to save disposition");
      }
      setDispOpen(false);
      refreshHistory();
    } catch (e: any) {
      setError(e?.message || "Failed to save disposition");
    } finally {
      setDispSaving(false);
    }
  }

  const keypad = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "*", "0", "#"];
  const mmss = `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
  const keyBtn = isDock
    ? "rounded border border-rule py-2 text-sm font-medium hover:bg-rule/30"
    : "rounded border border-rule py-3 text-base font-medium hover:bg-rule/30";

  // Dock collapsed pill.
  if (isDock && !open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-full bg-copper px-4 py-2 text-sm font-medium text-white shadow-lg hover:opacity-90"
      >
        <span
          className={`inline-block h-2 w-2 rounded-full ${
            bootError ? "bg-red-300" : ready ? "bg-green-300" : "bg-yellow-300 animate-pulse"
          }`}
        />
        Dialer
      </button>
    );
  }

  return (
    <div
      className={
        isDock
          ? "fixed bottom-4 right-4 z-50 w-80 rounded-xl border border-rule bg-white shadow-2xl"
          : "mx-auto w-full max-w-sm rounded-xl border border-rule bg-white shadow-sm"
      }
    >
      <div className="flex items-center justify-between border-b border-rule px-4 py-2">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <span
            className={`inline-block h-2 w-2 rounded-full ${
              bootError ? "bg-red-500" : ready ? "bg-green-500" : "bg-yellow-500 animate-pulse"
            }`}
          />
          Dialer
          {status === "in-call" && <span className="text-xs text-muted">· {mmss}</span>}
          {status === "connecting" && <span className="text-xs text-muted">· connecting…</span>}
        </div>
        {isDock && (
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="text-muted hover:text-foreground"
            aria-label="Collapse dialer"
          >
            ✕
          </button>
        )}
      </div>

      <div className="space-y-3 p-4">
        {bootError && (
          <p className="rounded bg-red-50 p-2 text-xs text-red-700">
            {bootError}
            <span className="mt-1 block text-red-500">
              Voice SDK needs TWILIO_API_KEY_SID, TWILIO_API_KEY_SECRET, and a TwiML App.
            </span>
          </p>
        )}

        {numbers.length > 1 && (
          <select
            className="input text-xs"
            value={callerId}
            onChange={(e) => setCallerId(e.target.value)}
            disabled={status !== "idle"}
          >
            {numbers.map((n) => (
              <option key={n.id} value={n.phoneNumber}>
                {n.label || n.phoneNumber}
              </option>
            ))}
          </select>
        )}

        <div className="flex items-center gap-2">
          <input
            className="input flex-1 font-mono text-sm"
            placeholder="+1 ___ ___ ____"
            value={dialedNumber}
            onChange={(e) => setDialedNumber(e.target.value)}
            disabled={status !== "idle"}
          />
          {status === "idle" && dialedNumber && (
            <button type="button" onClick={backspace} className="text-muted hover:text-foreground">
              ⌫
            </button>
          )}
        </div>

        {status === "idle" ? (
          <button
            type="button"
            onClick={dialTyped}
            disabled={!ready || !callerId || !dialedNumber}
            className="btn-primary w-full text-sm"
          >
            📞 Call
          </button>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={toggleMute}
              className={`rounded border border-rule px-3 py-2 text-xs font-medium ${
                muted ? "bg-copper text-white" : "hover:bg-rule/30"
              }`}
            >
              {muted ? "Unmute" : "Mute"}
            </button>
            <button
              type="button"
              onClick={hangup}
              className="rounded border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700 hover:bg-red-100"
            >
              Hang up
            </button>
          </div>
        )}

        <div className="grid grid-cols-3 gap-2">
          {keypad.map((d) => (
            <button key={d} type="button" onClick={() => pressDigit(d)} className={keyBtn}>
              {d}
            </button>
          ))}
        </div>

        {error && <p className="text-xs text-red-600">{error}</p>}

        <div>
          <p className="mb-1 text-xs font-medium text-muted">Recent calls</p>
          <div className="max-h-32 space-y-1 overflow-y-auto text-xs">
            {history.length === 0 && <p className="text-muted">No calls yet.</p>}
            {history.map((c) => (
              <div key={c.id} className="flex items-center justify-between gap-2 border-b border-rule/40 py-1">
                <div className="min-w-0">
                  <p className="truncate font-mono">{c.toNumber}</p>
                  <p className="truncate text-muted">
                    {c.projectRequest
                      ? `${c.projectRequest.firstName} ${c.projectRequest.lastName}`
                      : c.contractor?.companyName || "—"}
                  </p>
                </div>
                <span
                  className={`shrink-0 ${
                    c.status === "completed" ? "text-green-600" : "text-muted"
                  }`}
                >
                  {c.disposition ? c.disposition.replace(/_/g, " ") : c.status}
                  {c.durationSeconds ? ` · ${c.durationSeconds}s` : ""}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {dispOpen && (
        <div className="border-t border-rule p-4">
          <p className="text-xs font-semibold">Log call outcome</p>
          <p className="mb-2 text-xs text-muted">Recorded automatically on the lead audit trail.</p>
          <select
            className="input text-xs"
            value={dispOutcome}
            onChange={(e) => setDispOutcome(e.target.value)}
          >
            <option value="">— Select outcome —</option>
            <option value="answered">Answered</option>
            <option value="no_answer">No answer</option>
            <option value="busy">Busy</option>
            <option value="voicemail">Left voicemail</option>
            <option value="wrong_number">Wrong number</option>
            <option value="confirmed">Confirmed</option>
            <option value="callback_requested">Callback requested</option>
          </select>
          <textarea
            className="input mt-2 text-xs"
            placeholder="Notes (optional)"
            rows={2}
            value={dispNote}
            onChange={(e) => setDispNote(e.target.value)}
          />
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={saveDisposition}
              disabled={dispSaving}
              className="btn-primary flex-1 text-xs"
            >
              {dispSaving ? "Saving…" : "Save"}
            </button>
            <button
              type="button"
              onClick={() => setDispOpen(false)}
              className="rounded border border-rule px-3 text-xs hover:bg-rule/30"
            >
              Skip
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/** Dock wrapper mounted in the admin layout. Hides itself on the dedicated
 *  dialer page so the full-screen variant is the only one shown there. */
export function Softphone() {
  const pathname = usePathname();
  if (pathname === DIALER_ROUTE) return null;
  return <Dialer variant="dock" />;
}
