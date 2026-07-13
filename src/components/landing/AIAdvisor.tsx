"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getVisibleCategories, type LandingCategoryId } from "@/lib/landing-data";
import { parseAdvisorMessage, parseAdvisorBooking, type AdvisorSuggestion, type AdvisorBooking } from "@/lib/advisor";
import { useCategories } from "./CategoryContext";

type ChatMessage = { role: "user" | "assistant"; content: string };

const STARTERS = [
  "My AC is blowing warm air",
  "Bathroom hasn't been updated since the 80s",
  "There's a water stain on my ceiling",
  "Kitchen cabinets are falling apart",
];

const GREETING =
  "Hi — tell me what's going on around the house and I'll give you a straight answer: likely cause, what the fix usually involves, and a ballpark for the DMV. What are you dealing with?";

interface BookingResult {
  success: boolean;
  referenceNumber: string;
  email: string;
  tempPassword: string;
  isExistingAccount: boolean;
  appointment: {
    id: string;
    scheduledAt: string;
    contractorName: string;
  } | null;
  contractorMatched: boolean;
}

export function AIAdvisor() {
  const { setSelected, setPrefill } = useCategories();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [streaming, setStreaming] = useState("");
  const [suggestion, setSuggestion] = useState<AdvisorSuggestion | null>(null);
  const [booking, setBooking] = useState<AdvisorBooking | null>(null);
  const [bookingInProgress, setBookingInProgress] = useState(false);
  const [bookingResult, setBookingResult] = useState<BookingResult | null>(null);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, streaming, bookingResult]);

  const send = useCallback(
    async (text: string) => {
      const content = text.trim();
      if (!content || busy) return;

      const nextMessages: ChatMessage[] = [...messages, { role: "user", content }];
      setMessages(nextMessages);
      setInput("");
      setError("");
      setSuggestion(null);
      setBooking(null);
      setStreaming("");
      setBusy(true);

      try {
        const res = await fetch("/api/advisor", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: nextMessages }),
        });

        if (!res.ok || !res.body) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "The advisor is unavailable right now.");
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let raw = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          raw += decoder.decode(value, { stream: true });
          setStreaming(parseAdvisorMessage(raw).text);
        }

        const { text, suggestion: parsed } = parseAdvisorMessage(raw);
        const { booking: parsedBooking } = parseAdvisorBooking(raw);

        setMessages([...nextMessages, { role: "assistant", content: text }]);
        setStreaming("");
        if (parsedBooking) setBooking(parsedBooking);
        else if (parsed) setSuggestion(parsed);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong. Try again.");
        setStreaming("");
      } finally {
        setBusy(false);
      }
    },
    [busy, messages]
  );

  const applySuggestion = useCallback(() => {
    if (!suggestion) return;
    const visibleIds = new Set(getVisibleCategories().map((c) => c.id as LandingCategoryId));
    const ids = suggestion.categoryIds.filter((id) => visibleIds.has(id));
    if (ids.length > 0) setSelected(ids);
    setPrefill({
      description: suggestion.description || undefined,
      urgency: suggestion.urgency || undefined,
      budget: suggestion.budget || undefined,
    });
    document.getElementById("request")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [suggestion, setSelected, setPrefill]);

  const confirmBooking = useCallback(async () => {
    if (!booking) return;
    setBookingInProgress(true);
    setError("");

    try {
      const res = await fetch("/api/advisor/book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(booking),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Booking failed");

      setBookingResult(data);
      setBooking(null);

      const confirmMsg = data.appointment
        ? `All set! Your ${booking.categoryIds[0]} appointment is confirmed for ${new Date(data.appointment.scheduledAt).toLocaleString("en-US", { weekday: "long", month: "long", day: "numeric", hour: "numeric", minute: "2-digit" })} with ${data.appointment.contractorName}.\n\nYour login details have been emailed to ${data.email}. You can also use:\n\nEmail: ${data.email}\nPassword: ${data.tempPassword}\n\nLog in at any time to manage your project.`
        : `Got it! Your ${booking.categoryIds[0]} request has been submitted (ref: ${data.referenceNumber}). We're matching you with a contractor and will confirm your appointment shortly.\n\nYour login details have been emailed to ${data.email}.\n\nEmail: ${data.email}\nPassword: ${data.tempPassword}`;

      setMessages((prev) => [...prev, { role: "assistant", content: confirmMsg }]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Booking failed. Please try again.");
    } finally {
      setBookingInProgress(false);
    }
  }, [booking]);

  const started = messages.length > 0 || streaming.length > 0;

  return (
    <div className="landing-card flex h-full flex-col overflow-hidden shadow-[0_8px_24px_rgba(26,26,26,0.06)]">
      <div className="flex items-center justify-between border-b border-ink-15 px-4 py-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-ink-100">
          <span className="landing-pulse" aria-hidden />
          Ask Renovessa · free instant advice
        </div>
        <span className="font-mono-landing text-[11px] text-ink-40">AI</span>
      </div>

      <div
        ref={scrollRef}
        className="flex-1 space-y-3 overflow-y-auto px-4 py-4"
        style={{ maxHeight: "min(52vh, 420px)", minHeight: "220px" }}
        aria-live="polite"
      >
        <Bubble role="assistant">{GREETING}</Bubble>

        {messages.map((m, i) => (
          <Bubble key={i} role={m.role}>
            {m.content}
          </Bubble>
        ))}

        {streaming && <Bubble role="assistant">{streaming}</Bubble>}

        {busy && !streaming && (
          <div className="flex items-center gap-1.5 px-1 text-ink-40" aria-label="Advisor is typing">
            <span className="advisor-dot" />
            <span className="advisor-dot" style={{ animationDelay: "0.15s" }} />
            <span className="advisor-dot" style={{ animationDelay: "0.3s" }} />
          </div>
        )}

        {error && (
          <p className="rounded-lg bg-danger-50 px-3 py-2 text-sm text-danger-landing" role="alert">
            {error}
          </p>
        )}

        {/* Old flow: pre-fill intake form */}
        {suggestion && !booking && !busy && !bookingResult && (
          <div className="rounded-lg border border-accent/40 bg-bone-1 p-3">
            <p className="text-sm font-semibold text-ink-100">
              Ready to line up a real appointment?
            </p>
            <p className="mt-1 text-xs text-ink-70">
              One vetted DMV contractor — not five sales calls. I&apos;ll carry over what you told me.
            </p>
            <button type="button" className="landing-btn-primary mt-3 w-full" onClick={applySuggestion}>
              Book with these details →
            </button>
          </div>
        )}

        {/* New flow: direct booking confirmation */}
        {booking && !busy && !bookingResult && (
          <div className="rounded-lg border border-accent/40 bg-bone-1 p-3">
            <p className="text-sm font-semibold text-ink-100">
              Ready to book your appointment?
            </p>
            <div className="mt-2 space-y-1 text-xs text-ink-70">
              <p><span className="font-medium">Project:</span> {booking.description || booking.categoryIds.join(", ")}</p>
              <p><span className="font-medium">Name:</span> {booking.firstName} {booking.lastName}</p>
              <p><span className="font-medium">Email:</span> {booking.email}</p>
              <p><span className="font-medium">Phone:</span> {booking.phone}</p>
              <p><span className="font-medium">ZIP:</span> {booking.zipCode}</p>
              {booking.preferredTime !== "any" && (
                <p><span className="font-medium">Preferred time:</span> {booking.preferredTime}</p>
              )}
            </div>
            <button
              type="button"
              className="landing-btn-primary mt-3 w-full"
              onClick={confirmBooking}
              disabled={bookingInProgress}
            >
              {bookingInProgress ? "Booking…" : "Confirm & Book Appointment"}
            </button>
          </div>
        )}

        {/* Booking success banner */}
        {bookingResult && (
          <div className="rounded-lg border border-green-300 bg-green-50 p-3">
            <p className="text-sm font-semibold text-green-800">
              {bookingResult.appointment ? "Appointment confirmed!" : "Request submitted!"}
            </p>
            {bookingResult.appointment && (
              <p className="mt-1 text-xs text-green-700">
                {bookingResult.appointment.contractorName} · {new Date(bookingResult.appointment.scheduledAt).toLocaleDateString()}
              </p>
            )}
            <p className="mt-1 text-xs text-green-700">
              Ref: {bookingResult.referenceNumber} · Login details emailed to {bookingResult.email}
            </p>
          </div>
        )}
      </div>

      {!started && (
        <div className="flex flex-wrap gap-2 border-t border-ink-15 px-4 py-3">
          {STARTERS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => send(s)}
              disabled={busy}
              className="rounded-full border border-ink-15 bg-white px-2.5 py-1 text-xs font-medium text-ink-70 transition hover:border-ink-40 disabled:opacity-50"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      <form
        className="flex items-end gap-2 border-t border-ink-15 p-3"
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
      >
        <textarea
          className="landing-input min-h-[44px] flex-1 resize-none py-2.5 text-sm"
          rows={1}
          maxLength={4000}
          placeholder="Describe your project or problem…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send(input);
            }
          }}
          disabled={busy || !!booking}
        />
        <button
          type="submit"
          className="landing-btn-primary shrink-0 px-4 py-2.5"
          disabled={busy || !input.trim() || !!booking}
        >
          Ask
        </button>
      </form>

      <p className="px-4 pb-3 text-center text-[11px] text-ink-40">
        General guidance only · a licensed contractor confirms on site · DMV coverage
      </p>
    </div>
  );
}

function Bubble({ role, children }: { role: "user" | "assistant"; children: React.ReactNode }) {
  const isUser = role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3.5 py-2 text-sm ${
          isUser
            ? "rounded-br-sm bg-accent text-bone-0"
            : "rounded-bl-sm border border-ink-15 bg-white text-ink-100"
        }`}
      >
        {children}
      </div>
    </div>
  );
}
