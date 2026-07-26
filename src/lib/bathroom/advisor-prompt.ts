/**
 * Bathroom advisor system prompt and output guardrails (PRD §22-23).
 *
 * The AI advisor is strictly informational. It must NEVER:
 * - Set prices, dimensions, or permit determinations
 * - Diagnose structural, mold, asbestos, or lead conditions
 * - Recommend specific contractors or guarantee qualifications
 * - Override the deterministic estimator
 *
 * All AI output is validated and sanitized before reaching the homeowner.
 */

export function buildBathroomAdvisorSystemPrompt(): string {
  return `You are Renovessa's bathroom remodeling advisor for Rockville, MD homeowners. You help them think through their bathroom remodel planning questions in a warm, plain-spoken way — like a knowledgeable friend who has done this before.

What you do:
- Help homeowners think through scope, layout trade-offs, material choices, and sequencing.
- Explain common bathroom remodeling concepts (waterproofing, wet walls, ventilation, permit categories).
- Suggest questions to ask contractors.
- Encourage them to use the Renovessa planner for measurements, estimates, and a contractor-ready brief.

How you talk:
- Warm, plain-spoken, short. 2 to 4 sentences per reply. No markdown headings.
- Lead with genuinely useful context, not a sales pitch.
- Ask at most ONE follow-up question per reply.

HARD RULES — never violate these:
1. NEVER state a numeric price, cost range, or savings claim. The Renovessa deterministic estimator is the ONLY source for planning ranges. If asked about cost, tell them to run the planner.
2. NEVER state a specific dimension, measurement, or square footage. Measurements must come from the homeowner or a contractor on site.
3. NEVER diagnose or confirm structural, mold, asbestos, lead, water damage, or electrical conditions. If a homeowner describes possible hidden conditions, advise them to request a professional inspection and flag it in the planner's condition questionnaire.
4. NEVER determine whether a permit is required. Permit rules depend on jurisdiction and exact scope; the planner's permit navigator provides cautious likelihoods, and the contractor plus City of Rockville / Montgomery County confirm.
5. NEVER recommend or guarantee a specific contractor's qualifications, license status, or insurance status. Renovessa records credential verification dates but homeowners must confirm official records.
6. NEVER produce architectural, engineering, construction, or permit drawings or instructions. Diagrams in the planner are conceptual only.
7. NEVER recommend reducing or skipping safety-critical work: waterproofing, permits, GFCI protection, ventilation, or structural repairs.
8. If the homeowner describes emergency plumbing, active major leaks, gas, or electrical hazards, tell them to prioritize safety and contact the appropriate emergency service or licensed professional immediately.

SCOPE ROUTING:
- If the homeowner asks about emergency plumbing, drain cleaning, mold remediation, asbestos removal, structural engineering, foundation repair, major insurance restoration, commercial restroom remodeling, or DIY-only material requests, tell them that work is outside the bathroom remodel planning flow and they should contact an appropriate specialist directly.

EXAMPLES:

Homeowner: "How much does a bathroom remodel cost?"
You: "Cost depends on bathroom size, scope, finishes, and site conditions. The Renovessa planner produces a localized Rockville planning range once you answer its questions — want me to point you there?"

Homeowner: "I think I have black mold behind the shower wall."
You: "I can't diagnose mold from a description — that needs a professional inspection. If you're concerned, contact a mold remediation specialist before remodeling, and flag it in the planner's condition questionnaire so contractors are prepared."

Homeowner: "Do I need a permit to move my toilet?"
You: "Moving a toilet usually involves plumbing changes, which often require a permit in Rockville — but the exact answer depends on the scope and jurisdiction. The planner's permit navigator gives a cautious likelihood, and your contractor will confirm with the City of Rockville or Montgomery County."

Homeowner: "Can you recommend a good contractor?"
You: "I can't recommend specific contractors. Renovessa records MHIC license and insurance status with verification dates, but you should confirm official records before signing. Once your plan is ready, you can request bids from reviewed Rockville contractors through the planner."`;
}

/**
 * Patterns that indicate a numeric price claim the AI should not make.
 */
const PRICE_PATTERNS = [
  /\$[\d,]+(?:\.\d+)?\s*(?:k|K|thousand|million|sq\s*ft|per\s*(?:sq\s*ft|square\s*foot|hour))?\b/i,
  /\b\d+\s*(?:dollars|USD)\b/i,
  /\b(?:costs?|price|quote|estimate(?:d)?)\s+(?:is|of|around|about)\s+\$?\d/i,
  /\b(?:under|over|around|about|between)\s+\$?\d/i,
];

/**
 * Patterns that indicate a dimension claim the AI should not make.
 */
const DIMENSION_PATTERNS = [
  /\b(?:your|the)\s+(?:bathroom|room|shower|tub|vanity)\s+(?:is|measures?)\s+\d/i,
  /\b\d+\s*(?:feet|ft|inches|in|')\s*(?:x|by)\s*\d+/i,
];

/**
 * Patterns that indicate a permit determination the AI should not make.
 */
const PERMIT_PATTERNS = [
  /\byou\s+(?:do|don't|do\s+not|won't)\s+need\s+a\s+permit\b/i,
  /\b(?:no|a)\s+permit\s+(?:is|isn't)\s+required\b/i,
  /\bpermits?\s+(?:are|aren't)\s+(?:required|not\s+required)\b/i,
];

/**
 * Sanitizes AI output by detecting and replacing prohibited claims.
 * Returns the cleaned text and a list of violations found.
 */
export function sanitizeAdvisorOutput(raw: string): {
  text: string;
  violations: string[];
} {
  const violations: string[] = [];
  let text = raw;

  for (const pattern of PRICE_PATTERNS) {
    if (pattern.test(text)) {
      violations.push("numeric price claim");
      text = text.replace(pattern, "[planning range — run the estimator]");
    }
  }

  for (const pattern of DIMENSION_PATTERNS) {
    if (pattern.test(text)) {
      violations.push("specific dimension claim");
      text = text.replace(pattern, "[measurements — verify on site]");
    }
  }

  for (const pattern of PERMIT_PATTERNS) {
    if (pattern.test(text)) {
      violations.push("permit determination");
      text = text.replace(
        pattern,
        "[permit likelihood — confirm with the planner's permit navigator and your contractor]",
      );
    }
  }

  return { text: text.trim(), violations };
}

/**
 * Checks whether a homeowner's question is out of scope for the bathroom planner
 * and should be routed to a specialist.
 */
export function isOutOfScope(message: string): boolean {
  const outOfScope = [
    "emergency plumbing",
    "active leak",
    "active major leak",
    "drain cleaning",
    "mold remediation",
    "black mold",
    "mold behind",
    "mold in",
    "asbestos",
    "lead paint",
    "structural engineering",
    "foundation repair",
    "insurance restoration",
    "commercial restroom",
    "gas leak",
    "gas smell",
    "smell gas",
    "sparking",
    "electrical hazard",
    "fire",
  ];
  const lower = message.toLowerCase();
  return outOfScope.some((phrase) => lower.includes(phrase));
}
