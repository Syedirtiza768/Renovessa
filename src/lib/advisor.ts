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
 * Two-phase output protocol:
 *
 * 1. [[SUGGEST]] — emitted as soon as the trade is identified.
 *    The homeowner cannot see it. Pre-fills the intake form.
 *
 * 2. [[BOOK]] — a legacy wire-format name. It replaces [[SUGGEST]] once the
 *    homeowner has provided RFQ details and opens a review/clickwrap step. It
 *    never books an appointment or creates an account.
 */

export const SUGGEST_OPEN = "[[SUGGEST]]";
export const SUGGEST_CLOSE = "[[/SUGGEST]]";

export const BOOK_OPEN = "[[BOOK]]";
export const BOOK_CLOSE = "[[/BOOK]]";

export type AdvisorSuggestion = {
  categoryIds: LandingCategoryId[];
  urgency: string;
  budget: string;
  description: string;
};

export type AdvisorBooking = {
  categoryIds: LandingCategoryId[];
  urgency: string;
  budget: string;
  description: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  zipCode: string;
  preferredTime: string; // contact preference only
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
 * Strips the SUGGEST machine block from streamed text and returns the clean,
 * display-safe advice plus a validated suggestion (or null).
 */
export function parseAdvisorMessage(raw: string): {
  text: string;
  suggestion: AdvisorSuggestion | null;
} {
  const openIdx = raw.indexOf(SUGGEST_OPEN);

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

/**
 * Parses a [[BOOK]] block from the advisor output. Returns the display-safe
 * text (without the block) and the validated booking data (or null).
 */
export function parseAdvisorBooking(raw: string): {
  text: string;
  booking: AdvisorBooking | null;
} {
  const openIdx = raw.indexOf(BOOK_OPEN);

  if (openIdx === -1) {
    return { text: raw.replace(/\[\[[^\]]*$/, "").trimEnd(), booking: null };
  }

  const text = raw.slice(0, openIdx).trimEnd();
  const afterOpen = raw.slice(openIdx + BOOK_OPEN.length);
  const closeIdx = afterOpen.indexOf(BOOK_CLOSE);
  const jsonStr = (closeIdx === -1 ? afterOpen : afterOpen.slice(0, closeIdx)).trim();

  let booking: AdvisorBooking | null = null;
  try {
    const parsed = JSON.parse(jsonStr) as Record<string, unknown>;
    const categoryIds = (Array.isArray(parsed.categoryIds) ? parsed.categoryIds : [])
      .filter((id): id is LandingCategoryId => VALID_CATEGORY_IDS.has(id as LandingCategoryId));

    if (categoryIds.length > 0 && typeof parsed.email === "string" && parsed.email.includes("@")) {
      booking = {
        categoryIds,
        urgency: typeof parsed.urgency === "string" ? parsed.urgency : "",
        budget: canonicalBudget(parsed.budget),
        description: typeof parsed.description === "string" ? parsed.description.slice(0, 600) : "",
        firstName: typeof parsed.firstName === "string" ? parsed.firstName.trim() : "",
        lastName: typeof parsed.lastName === "string" ? parsed.lastName.trim() : "",
        email: parsed.email.toLowerCase().trim(),
        phone: typeof parsed.phone === "string" ? parsed.phone.replace(/\D/g, "").trim() : "",
        zipCode: typeof parsed.zipCode === "string" ? parsed.zipCode.trim() : "",
        preferredTime: typeof parsed.preferredTime === "string" ? parsed.preferredTime : "any",
      };
    }
  } catch {
    // Block not fully streamed / malformed — treat as no booking yet.
  }

  return { text, booking };
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
- Lead with real value: the likely cause and what a job like this usually involves. Do not invent or state numeric prices; the versioned Renovessa estimator is the only approved source for a planning range.
- Ask at most ONE sharp follow-up question to pin down the diagnosis.

Your goal:
- Give advice so useful the homeowner *wants* to move forward.
- Once you understand the work, invite them to create a scoped RFQ so Renovessa can check current trade and ZIP availability and request contractor responses.
- After the homeowner agrees, collect their contact details naturally: first name, last name, email, phone, ZIP code, and preferred appointment time (morning, afternoon, evening, or any time). Ask for these one or two at a time in a conversational way — never dump a list of questions.
- Confirm all details back to the homeowner before emitting the RFQ-review block.

Hard rules:
- Renovessa serves ONLY the DMV. If they're clearly elsewhere, say so kindly and don't push a booking.
- Never state a numeric price or savings claim. Tell the homeowner the estimator can provide a documented planning range and that a contractor determines any actual quote.
- You are not a replacement for a licensed contractor's inspection. For gas, active leaks, sparking, or loss of heat/AC in extreme weather, tell them to prioritize safety and contact the appropriate emergency service or qualified professional.
- Only cover these home-improvement trades. If asked something off-topic, gently steer back.${pilotNote}

Trades (use the id exactly when tagging):
${trades}

Budget bands (choose one exactly, or leave empty): ${budgets}
Urgency options (choose one exactly, or leave empty): ${urgencies}

OUTPUT FORMAT — TWO BLOCK TYPES (the homeowner cannot see either block):

1. SUGGEST block — emit as soon as you know the trade:
${SUGGEST_OPEN}{"categoryIds":["<trade id>"],"urgency":"<one urgency option or empty>","budget":"<one budget band or empty>","description":"<one plain-language sentence summarizing their project>"}${SUGGEST_CLOSE}

2. BOOK block (legacy protocol name) — replace SUGGEST with this once you have ALL required RFQ fields (trade, first name, last name, email, phone, ZIP code):
${BOOK_OPEN}{"categoryIds":["<trade id>"],"urgency":"<urgency or empty>","budget":"<budget or empty>","description":"<project summary>","firstName":"<first name>","lastName":"<last name>","email":"<email>","phone":"<digits only>","zipCode":"<5-digit ZIP>","preferredTime":"<morning|afternoon|evening|any>"}${BOOK_CLOSE}

Rules for blocks:
- Emit SUGGEST on its own line as soon as you identify the trade. Never skip it.
- After collecting contact info and the homeowner confirms they want to review an RFQ, replace SUGGEST with BOOK in your next reply.
- Never emit both SUGGEST and BOOK in the same reply. BOOK replaces SUGGEST.
- If you genuinely cannot tell the trade yet, ask one question and omit both blocks.
- Never mention, explain, or reference these blocks to the homeowner.

Example conversation flow:
Turn 1 (trade identified):
Sounds like a failed igniter. The estimator can show a documented DMV planning range; an inspection is needed for an actual quote. Want me to prepare an RFQ for review?
${SUGGEST_OPEN}{"categoryIds":["hvac"],"urgency":"As soon as possible","budget":"","description":"Gas furnace not heating in Fairfax"}${SUGGEST_CLOSE}

Turn 2 (homeowner says yes):
Great — I can prepare the RFQ details for you to review. What's your name and best email?

Turn 3 (collecting more):
Thanks Jane! And what's the best phone number and your ZIP code?

Turn 4 (confirming):
Perfect. I've got: HVAC repair, Jane Smith, jane@example.com, 703-555-1234, ZIP 22030, morning contact preference. Sound right? I'll open the RFQ review step; nothing is booked yet.
${BOOK_OPEN}{"categoryIds":["hvac"],"urgency":"As soon as possible","budget":"","description":"Gas furnace not heating","firstName":"Jane","lastName":"Smith","email":"jane@example.com","phone":"7035551234","zipCode":"22030","preferredTime":"morning"}${BOOK_CLOSE}`;
}
