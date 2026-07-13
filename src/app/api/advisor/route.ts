import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { buildAdvisorSystemPrompt } from "@/lib/advisor";

const bodySchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().min(1).max(4000),
      })
    )
    .min(1)
    .max(40),
});

// Lightweight in-memory rate limit. Sufficient for the single-container
// deployment; swap for a shared store if this ever runs multi-instance.
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

export async function POST(req: NextRequest) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "The AI advisor isn't configured yet." },
      { status: 503 }
    );
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (isRateLimited(ip)) {
    return NextResponse.json(
      { error: "That's a lot of questions in a short time — give it a minute." },
      { status: 429 }
    );
  }

  let messages;
  try {
    ({ messages } = bodySchema.parse(await req.json()));
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
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
        "X-Title": "Renovessa Advisor",
      },
      body: JSON.stringify({
        model,
        stream: true,
        temperature: 0.5,
        max_tokens: 450,
        messages: [
          { role: "system", content: buildAdvisorSystemPrompt() },
          ...messages,
        ],
      }),
    });
  } catch (e) {
    console.error("OpenRouter request failed", e);
    return NextResponse.json({ error: "Couldn't reach the advisor. Try again." }, { status: 502 });
  }

  if (!upstream.ok || !upstream.body) {
    const detail = await upstream.text().catch(() => "");
    console.error("OpenRouter error", upstream.status, detail);
    return NextResponse.json({ error: "The advisor is unavailable right now." }, { status: 502 });
  }

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  const reader = upstream.body.getReader();
  let buffer = "";

  // Re-emit only the assistant's text tokens as a plain-text stream, so the
  // browser never has to parse SSE and never sees the OpenRouter payload shape.
  // Drain the whole upstream in a single start() loop: OpenRouter interleaves
  // `: OPENROUTER PROCESSING` keep-alive comments that enqueue nothing, and a
  // one-read-per-pull design stalls when a pull makes no progress.
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";
          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith("data:")) continue;
            const data = trimmed.slice(5).trim();
            if (data === "[DONE]") {
              controller.close();
              return;
            }
            try {
              const json = JSON.parse(data);
              const token: string | undefined = json.choices?.[0]?.delta?.content;
              if (token) controller.enqueue(encoder.encode(token));
            } catch {
              // keep-alive comment or a partial line — ignore.
            }
          }
        }
        controller.close();
      } catch (e) {
        controller.error(e);
      }
    },
    cancel() {
      reader.cancel().catch(() => {});
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
}
