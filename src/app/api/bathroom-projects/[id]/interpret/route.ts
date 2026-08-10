import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { logAuditEvent } from "@/lib/audit";
import { assertBathroomProjectAccess } from "@/lib/bathroom/authorization";
import { bathroomPlannerUsable, BATHROOM_AI_INTERPRETATION_ENABLED, BATHROOM_DEMO_MODE } from "@/lib/feature-flags";
import {
  buildRequirementsInterpretPrompt,
  sanitizeInterpretedAnswers,
  interpretedToPlannerAnswers,
} from "@/lib/bathroom/requirements-interpret";

export const runtime = "nodejs";

const bodySchema = z.object({
  prompt: z.string().min(10).max(4000),
});

const WINDOW_MS = 5 * 60_000;
const MAX_REQUESTS = 20;
const hits = new Map<string, number[]>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);
  return recent.length > MAX_REQUESTS;
}

function aiEnabled() {
  return BATHROOM_AI_INTERPRETATION_ENABLED || BATHROOM_DEMO_MODE;
}

/**
 * Lightweight keyword fallback when OpenRouter is unavailable.
 * Never invents prices or dimensions.
 */
function heuristicInterpret(prompt: string) {
  const lower = prompt.toLowerCase();
  const out: Record<string, unknown> = {
    requirementsSummary: prompt.slice(0, 280),
    followUpQuestions: [] as string[],
  };

  if (lower.includes("powder")) out.bathroomType = "powder";
  else if (lower.includes("primary") || lower.includes("master")) out.bathroomType = "primary";
  else if (lower.includes("basement")) out.bathroomType = "basement";
  else if (lower.includes("guest") || lower.includes("hall")) out.bathroomType = "guest";
  else if (lower.includes("accessible") || lower.includes("aging") || lower.includes("ada")) out.bathroomType = "accessible";

  if (lower.includes("tub to shower") || lower.includes("tub-to-shower") || lower.includes("remove the tub")) {
    out.projectObjective = "tub_to_shower";
    out.showerTub = "tub_to_shower_conversion";
  } else if (lower.includes("curbless")) {
    out.projectObjective = "curbless_shower";
    out.showerTub = "curbless_shower";
  } else if (lower.includes("walk-in") || lower.includes("walk in shower")) {
    out.projectObjective = "walk_in_shower";
    out.showerTub = "custom_tiled_shower";
  } else if (/(replace|replacing|change|changing|swap|swapping|install|new)\b/.test(lower) &&
    /(wash ?basin|basin|\bsink\b|\bfaucet\b|\btoilet\b|\bvanity\b|shower ?head)/.test(lower)) {
    // Single-fixture swap, e.g. "change the wash basin in the powder room"
    out.projectObjective = "fixture_replacement";
    if (/(wash ?basin|basin|\bsink\b)/.test(lower)) out.fixtureType = "sink_basin";
    else if (/\bfaucet\b/.test(lower)) out.fixtureType = "faucet";
    else if (/\btoilet\b/.test(lower)) out.fixtureType = "toilet";
    else if (/\bvanity\b/.test(lower)) out.fixtureType = "vanity_cabinet";
    else if (/shower ?head/.test(lower)) out.fixtureType = "shower_head";
  } else if (lower.includes("full gut") || lower.includes("gut remodel")) out.projectObjective = "full_gut";
  else if (lower.includes("layout")) out.projectObjective = "layout_redesign";
  else if (lower.includes("refresh") || lower.includes("cosmetic") || lower.includes("update paint")) {
    out.projectObjective = "cosmetic_refresh";
  } else if (lower.includes("accessible") || lower.includes("aging in place")) {
    out.projectObjective = "accessibility_upgrade";
  } else {
    out.projectObjective = "remodel_same_layout";
  }

  if (lower.includes("condo")) out.propertyType = "condo";
  else if (lower.includes("townhouse") || lower.includes("townhome")) out.propertyType = "townhouse";
  else if (lower.includes("apartment")) out.propertyType = "apartment";
  else if (lower.includes("single") || lower.includes("house")) out.propertyType = "sfh";

  if (lower.includes("double vanity") || lower.includes("double sink")) out.vanity = "double_sink";
  else if (lower.includes("floating vanity")) out.vanity = "floating_vanity";
  else if (lower.includes("vanity")) out.vanity = "stock_vanity";

  if (lower.includes("premium") || lower.includes("luxury")) out.fixtureTier = "premium";
  else if (lower.includes("budget") || lower.includes("entry")) out.fixtureTier = "entry";
  else out.fixtureTier = "standard";

  const conditions: string[] = [];
  if (lower.includes("leak")) conditions.push(lower.includes("active") ? "active_leak" : "past_leak");
  if (lower.includes("mold") || lower.includes("mildew")) conditions.push("mildew_concern");
  if (lower.includes("soft floor") || lower.includes("soft spot")) conditions.push("soft_flooring");
  if (lower.includes("cracked tile")) conditions.push("cracked_tile");
  if (conditions.length) out.conditions = conditions;

  const accessibility: string[] = [];
  if (lower.includes("grab bar")) accessibility.push("installed_grab_bars");
  if (lower.includes("curbless")) accessibility.push("curbless_shower");
  if (lower.includes("comfort height") || lower.includes("taller toilet")) accessibility.push("comfort_height_toilet");
  if (accessibility.length) out.accessibilityFeatures = accessibility;

  const followUps: string[] = [];
  if (!out.bathroomType) followUps.push("Which bathroom is this — powder, guest, or primary?");
  if (!("length" in out)) followUps.push("About how long and wide is the room?");
  followUps.push("Any known leaks, soft floors, or ventilation issues?");
  out.followUpQuestions = followUps.slice(0, 3);
  out.confidenceNote = "Structured from your description with a local keyword parser. Review and adjust the answers below.";

  return sanitizeInterpretedAnswers(out);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!bathroomPlannerUsable()) {
    return NextResponse.json({ error: "Bathroom planner is not enabled." }, { status: 404 });
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (isRateLimited(ip)) {
    return NextResponse.json({ error: "Too many requests. Please slow down." }, { status: 429 });
  }

  const session = await getSession();
  try {
    const { id } = await params;
    const project = await assertBathroomProjectAccess(session, id);
    const { prompt } = bodySchema.parse(await req.json());

    let interpreted = heuristicInterpret(prompt);
    let source: "heuristic" | "openrouter" = "heuristic";

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (aiEnabled() && apiKey) {
      try {
        const model = process.env.OPENROUTER_MODEL || "openai/gpt-5.6-luna";
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://renovessa.com";
        const upstream = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
            "HTTP-Referer": appUrl,
            "X-Title": "Renovessa Bathroom Requirements",
          },
          body: JSON.stringify({
            model,
            stream: false,
            temperature: 0.2,
            max_tokens: 900,
            messages: [
              { role: "system", content: buildRequirementsInterpretPrompt() },
              { role: "user", content: prompt },
            ],
          }),
        });
        if (upstream.ok) {
          const data = (await upstream.json()) as {
            choices?: Array<{ message?: { content?: string } }>;
          };
          const raw = data.choices?.[0]?.message?.content ?? "";
          const jsonStr = raw.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```$/i, "").trim();
          try {
            interpreted = sanitizeInterpretedAnswers(JSON.parse(jsonStr));
            source = "openrouter";
          } catch {
            // keep heuristic
          }
        }
      } catch {
        // keep heuristic
      }
    }

    const answers = interpretedToPlannerAnswers(interpreted);
    answers.requirementsPrompt = prompt;

    await logAuditEvent({
      eventType: "NOTE_ADDED",
      description: `Requirements prompt interpreted for ${project.referenceNumber} (${source})`,
      actorId: session?.id,
      bathroomProjectId: id,
      metadata: { source, keys: Object.keys(answers) },
    });

    return NextResponse.json({
      interpreted,
      answers,
      source,
      note:
        source === "heuristic"
          ? "Answers suggested from your description. Review each field before continuing — this is not a quote or diagnosis."
          : "Answers suggested by the advisor from your description. Review each field before continuing — this is not a quote or diagnosis.",
    });
  } catch (e: any) {
    if (e?.name === "ZodError") {
      return NextResponse.json({ error: e.errors?.[0]?.message ?? "Invalid input" }, { status: 400 });
    }
    const status = e?.status || 500;
    return NextResponse.json({ error: e?.message || "Internal error" }, { status });
  }
}
