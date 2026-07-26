/**
 * Prompt-assisted proposal draft for contractors.
 * Seeds editable fields — contractor always reviews/overrides.
 * Unlike homeowner advisor, contractors may include their own pricing intent.
 */

export type ProposalDraft = {
  totalPrice: number;
  includedScope: string;
  exclusions: string;
  materialAllowances: string;
  fixtureAllowances: string;
  permitHandling: string;
  estimatedStartDate: string;
  estimatedDuration: string;
  paymentSchedule: string;
  warranty: string;
  changeOrderProcess: string;
  optionalUpgrades: string;
  suggestedChanges: string;
  note: string;
};

function moneyFromPrompt(prompt: string, fallback: number): number {
  const withK = prompt.match(/\$\s?([\d,.]+)\s*k\b/i) || prompt.match(/([\d.]+)\s*k\b/i);
  if (withK) return Math.round(Number(withK[1].replace(/,/g, "")) * 1000);
  const m = prompt.match(/\$\s?([\d,]+)/);
  if (m) return Number(m[1].replace(/,/g, ""));
  return fallback;
}

export function draftProposalFromPrompt(params: {
  prompt: string;
  companyName: string;
  clientName?: string | null;
  bathroomType?: string | null;
  projectObjective?: string | null;
  estimateMid?: number | null;
  answers?: Record<string, string>;
}): ProposalDraft {
  const { prompt, companyName, clientName, bathroomType, projectObjective, estimateMid, answers } = params;
  const lower = prompt.toLowerCase();
  const seed = estimateMid && estimateMid > 0 ? estimateMid : 18500;
  const totalPrice = moneyFromPrompt(prompt, seed);

  const objective = projectObjective || answers?.projectObjective || "";
  const type = bathroomType || answers?.bathroomType || "bathroom";

  const scopeBits: string[] = [
    `Provide a complete ${pretty(type)} remodel as discussed with ${clientName || "the client"}.`,
  ];
  if (objective.includes("tub_to_shower") || lower.includes("tub to shower") || lower.includes("remove the tub")) {
    scopeBits.push("Remove existing tub and install a tiled shower in the same wet-wall area.");
  }
  if (lower.includes("curbless")) scopeBits.push("Install a curbless / low-threshold shower where structurally feasible.");
  if (lower.includes("vanity") || answers?.vanity) scopeBits.push("Supply and install vanity / sink assembly as specified.");
  if (lower.includes("tile") || lower.includes("floor")) scopeBits.push("Floor and wet-wall tile per agreed selections.");
  scopeBits.push("Protect adjacent finishes, daily cleanup, and haul-away of construction debris.");
  scopeBits.push(`All work performed by ${companyName} or supervised subcontractors.`);

  if (prompt.trim().length > 40) {
    scopeBits.push(`Contractor notes from intake: ${prompt.trim().slice(0, 600)}`);
  }

  const exclusions = [
    "Unforeseen structural, plumbing, or electrical corrections beyond normal remodel allowances.",
    "Homeowner-furnished materials unless listed as contractor-supplied.",
    "Mold remediation, asbestos abatement, or hazardous material handling (priced separately if discovered).",
    "HOA / condo special assessments or building-management fees not listed herein.",
    "Design services beyond layout coordination included in this proposal.",
  ].join("\n");

  const suggested: string[] = [];
  if (lower.includes("budget") || lower.includes("save")) {
    suggested.push("Consider a prefab shower pan / surround package to reduce tile labor cost.");
  }
  if (lower.includes("luxury") || lower.includes("premium")) {
    suggested.push("Optional: frameless glass, rain head, and heated floor as upgrades.");
  }
  if (!suggested.length) {
    suggested.push("After demolition, verify substrate and plumbing locations before final material orders.");
  }

  return {
    totalPrice,
    includedScope: scopeBits.join("\n\n"),
    exclusions,
    materialAllowances: answers?.fixtureTier === "premium"
      ? "Tile and finish materials: premium allowance — confirm selections before order."
      : "Standard mid-grade tile and finish allowance — upgrades billed as change orders.",
    fixtureAllowances: "Toilet, faucet, and shower trim as specified or equal — allowances noted at selection.",
    permitHandling: lower.includes("permit") || lower.includes("condo")
      ? "Contractor will prepare permit drawings/applications; permit fees billed at cost. Condo / HOA approvals are client's responsibility unless otherwise agreed."
      : "Contractor will pull required permits; fees billed at cost.",
    estimatedStartDate: lower.includes("asap") || lower.includes("soon") ? "Within 2–4 weeks of signed agreement" : "To be scheduled after material lead times",
    estimatedDuration: objective.includes("cosmetic") ? "5–8 working days" : "2–4 weeks",
    paymentSchedule: "30% deposit to schedule · 40% at rough-in / waterproofing · 30% on substantial completion",
    warranty: "1-year workmanship warranty on contractor-installed work. Manufacturer warranties apply to fixtures and materials.",
    changeOrderProcess: "Any scope change requires written approval (email acceptable) with price and schedule impact before work proceeds.",
    optionalUpgrades: "Frameless glass · niche · bench · comfort-height toilet · exhaust fan upgrade · lighting package",
    suggestedChanges: suggested.join("\n"),
    note: "Draft generated from your prompt and job details. Edit freely before sending to your client — this is your proposal, not a platform quote.",
  };
}

function pretty(v: string) {
  return v.replace(/_/g, " ");
}
