import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { logAuditEvent } from "@/lib/audit";
import { assertBathroomProjectAccess } from "@/lib/bathroom/authorization";
import { BATHROOM_AI_INTERPRETATION_ENABLED } from "@/lib/feature-flags";
import { buildBathroomAdvisorSystemPrompt, sanitizeAdvisorOutput, isOutOfScope } from "@/lib/bathroom/advisor-prompt";

export const runtime = "nodejs";

const bodySchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().min(1).max(4000),
      }),
    )
    .min(1)
    .max(40),
});

const WINDOW_MS = 5 * 60_000;
const MAX_REQUESTS = 25;
const hits = new Map<string, number[]>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);
  return recent.length > MAX_REQUESTS;
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!BATHROOM_AI_INTERPRETATION_ENABLED) {
    return NextResponse.json({ error: "AI advisor is not enabled." }, { status: 404 });
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "The AI advisor isn't configured." }, { status: 503 });
  }

  const session = await getSession();
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (isRateLimited(ip)) {
    return NextResponse.json({ error: "Too many requests. Please slow down." }, { status: 429 });
  }

  let messages: z.infer<typeof bodySchema>["messages"];
  try {
    const body = bodySchema.parse(await req.json());
    messages = body.messages;
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const { id } = await params;
  try {
    const project = await assertBathroomProjectAccess(session, id);

    // Out-of-scope routing: if the latest user message is clearly out of scope,
    // return a canned safe response without calling the model.
    const lastUser = [...messages].reverse().find((m) => m.role === "user");
    if (lastUser && isOutOfScope(lastUser.content)) {
      const safeReply =
        "That sounds like it may be outside the bathroom remodel planning flow. For emergency plumbing, active leaks, mold, asbestos, structural, or electrical hazards, please contact an appropriate licensed specialist directly — and prioritize safety first. Once that's resolved, I'm happy to help you plan the remodel.";
      await logAuditEvent({
        eventType: "NOTE_ADDED",
        description: `Bathroom advisor routed out-of-scope question for ${project.referenceNumber}`,
        actorId: session?.id,
        bathroomProjectId: id,
        metadata: { routed: true, reason: "out_of_scope" },
      });
      return NextResponse.json({ reply: safeReply, routed: true });
    }

    const model = process.env.OPENROUTER_MODEL || "google/gemini-2.5-flash";
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://renovessa.com";

    let upstream: Response;
    try {
      upstream = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": appUrl,
          "X-Title": "Renovessa Bathroom Advisor",
        },
        body: JSON.stringify({
          model,
          stream: false,
          temperature: 0.4,
          max_tokens: 450,
          messages: [
            { role: "system", content: buildBathroomAdvisorSystemPrompt() },
            ...messages,
          ],
        }),
      });
    } catch {
      return NextResponse.json({ error: "Couldn't reach the advisor." }, { status: 502 });
    }

    if (!upstream.ok) {
      return NextResponse.json({ error: "The advisor is unavailable right now." }, { status: 502 });
    }

    const data = (await upstream.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const rawReply = data.choices?.[0]?.message?.content ?? "";

    // Sanitize output through guardrails
    const { text, violations } = sanitizeAdvisorOutput(rawReply);

    await logAuditEvent({
      eventType: "NOTE_ADDED",
      description: `Bathroom advisor reply for ${project.referenceNumber}${violations.length ? ` (sanitized: ${violations.join(", ")})` : ""}`,
      actorId: session?.id,
      bathroomProjectId: id,
      metadata: { violations, routed: false },
    });

    return NextResponse.json({ reply: text, violations });
  } catch (e: any) {
    const status = e?.status || 500;
    return NextResponse.json({ error: e?.message || "Internal error" }, { status });
  }
}
