import {
  LANDING_CATEGORIES,
  BUDGET_OPTIONS,
  URGENCY_OPTIONS_LANDING,
  type LandingCategoryId,
} from "@/lib/landing-data";
import { FIRST_JOB_MODE, PILOT_TRADE } from "@/lib/first-job-config";

/**
 * Homepage AI advisor — shared contract between the streaming API route
 * (src/app/api/advisor/route.ts) and the hero widget (AIAdvisor.tsx).
 *
 * The model gives conversational advice, then — once it has inferred the
 * trade — appends a single machine-readable block on the last line so the
 * client can pre-fill the existing project intake form:
 *
 *   [[SUGGEST]]{"categoryIds":["hvac"],"urgency":"As soon as possible",...}[[/SUGGEST]]
 */

export const SUGGEST_OPEN = "[[SUGGEST]]";
export const SUGGEST_CLOSE = "[[/SUGGEST]]";

export type AdvisorSuggestion = {
  categoryIds: LandingCategoryId[];
  urgency: string;
  budget: string;
  description: string;
};

const VALID_CATEGORY_IDS = new Set(LANDING_CATEGORIES.map((c) => c.id));
const VALID_URGENCY = new Set(URGENCY_OPTIONS_LANDING);

// Match budget bands dash-insensitively (the model may emit a hyphen where the
// canonical option uses an en-dash) and return the canonical option string.
const normalizeDash = (s: string) => s.replace(/[–—-]/g, "-").trim();
const BUDGET_BY_NORMALIZED = new Map(BUDGET_OPTIONS.map((b) => [normalizeDash(b), b]));
function canonicalBudget(value: unknown): string {
  if (typeof value !== "string") return "";
  return BUDGET_BY_NORMALIZED.get(normalizeDash(value)) ?? "";
}

/**
 * Strips the machine block from streamed text and returns the clean, display-safe
 * advice plus a validated suggestion (or null). Tolerant of partial / trailing
 * markers that appear mid-stream.
 */
export function parseAdvisorMessage(raw: string): {
  text: string;
  suggestion: AdvisorSuggestion | null;
} {
  const openIdx = raw.indexOf(SUGGEST_OPEN);

  // No block yet — also trim any partial "[[..." that is still streaming in.
  if (openIdx === -1) {
    return { text: raw.replace(/\[\[[^\]]*$/, "").trimEnd(), suggestion: null };
  }

  const text = raw.slice(0, openIdx).trimEnd();
  const afterOpen = raw.slice(openIdx + SUGGEST_OPEN.length);
  const closeIdx = afterOpen.indexOf(SUGGEST_CLOSE);
  const jsonStr = (closeIdx === -1 ? afterOpen : afterOpen.slice(0, closeIdx)).trim();

  let suggestion: AdvisorSuggestion | null = null;
  try {
    const parsed = JSON.parse(jsonStr) as Partial<AdvisorSuggestion>;
    const categoryIds = (Array.isArray(parsed.categoryIds) ? parsed.categoryIds : [])
      .filter((id): id is LandingCategoryId => VALID_CATEGORY_IDS.has(id as LandingCategoryId));
    if (categoryIds.length > 0) {
      suggestion = {
        categoryIds,
        urgency: typeof parsed.urgency === "string" && VALID_URGENCY.has(parsed.urgency) ? parsed.urgency : "",
        budget: canonicalBudget(parsed.budget),
        description: typeof parsed.description === "string" ? parsed.description.slice(0, 600) : "",
      };
    }
  } catch {
    // Block not fully streamed / malformed — treat as no suggestion yet.
  }

  return { text, suggestion };
}

export function buildAdvisorSystemPrompt(): string {
  const trades = LANDING_CATEGORIES.map((c) => `- ${c.id} — ${c.label}: ${c.description}`).join("\n");
  const budgets = BUDGET_OPTIONS.map((b) => `"${b}"`).join(", ");
  const urgencies = URGENCY_OPTIONS_LANDING.map((u) => `"${u}"`).join(", ");

  const pilotNote = FIRST_JOB_MODE
    ? `\nRenovessa is currently running a focused pilot for ${PILOT_TRADE} work in the DMV. If the homeowner's problem is a different trade, still give them helpful advice, but gently note that ${PILOT_TRADE} is what the team is booking right now.`
    : "";

  return `You are Renovessa's home-improvement advisor. You help homeowners in the DMV (Washington DC, Maryland, and Northern Virginia) understand their home project and feel confident about the next step.

How you talk:
- Warm, plain-spoken, and genuinely expert — like a trusted contractor friend, not a salesperson.
- Keep every reply short and skimmable: 2 to 4 sentences. No markdown headings, no bullet dumps.
- Lead with real value: the likely cause, what a job like this usually involves, and a rough DMV cost range when it's relevant (always framed as a range, never a firm quote).
- Ask at most ONE sharp follow-up question to pin down the diagnosis.

Your goal:
- Give advice so useful the homeowner *wants* to move forward. Once you understand the type of work and rough urgency, warmly invite them to let Renovessa line up a confirmed appointment with ONE vetted local contractor — not a flood of sales calls.

Hard rules:
- Renovessa serves ONLY the DMV. If they're clearly elsewhere, say so kindly and don't push a booking.
- Never give a firm or guaranteed price. Ranges only, and note the on-site visit confirms the real number.
- You are not a replacement for a licensed contractor's inspection. Always steer toward booking a visit, never away from it. For anything involving gas, active leaks, sparking, or no heat/AC in extreme weather, tell them to prioritize safety and book quickly.
- Only cover these home-improvement trades. If asked something off-topic, gently steer back.${pilotNote}

Trades (use the id exactly when tagging):
${trades}

Budget bands (choose one exactly, or leave empty): ${budgets}
Urgency options (choose one exactly, or leave empty): ${urgencies}

CRITICAL OUTPUT FORMAT (mandatory):
The MOMENT you can tell which trade this is, you MUST end your reply with the single machine block below, on its own final line, AFTER any question you ask. The homeowner cannot see it. Never skip it once you know the trade, never mention or explain it, and write nothing after it.
${SUGGEST_OPEN}{"categoryIds":["<trade id>"],"urgency":"<one urgency option or empty>","budget":"<one budget band or empty>","description":"<one plain-language sentence summarizing their project>"}${SUGGEST_CLOSE}
Example of a complete reply:
Sounds like a failed igniter or a bad flame sensor — a diagnostic visit runs about $150–$400 in the DMV, more if parts are needed. Want me to line up a licensed HVAC pro to take a look?
${SUGGEST_OPEN}{"categoryIds":["hvac"],"urgency":"As soon as possible","budget":"","description":"Gas furnace not heating in Fairfax"}${SUGGEST_CLOSE}
If you genuinely cannot tell the trade yet, ask one question and omit the block that one turn.`;
}
