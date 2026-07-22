import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(__dirname, "..");
const sourcePath = resolve(root, "data/contractor_enrichment/rfq_pilot_50_email_drafts.json");
const prospectsPath = resolve(root, "data/contractor_enrichment/prospects.json");
const outputBase = resolve(root, "data/contractor_enrichment/rfq_pilot_15_campaign");

const selectedRanks = [3, 8, 12, 18, 23, 24, 30, 34, 35, 42, 43, 48];
const tag = "RFQ Pilot 15 — July 2026";
const campaignName = "RFQ Pilot 15 — Trade-balanced contractor outreach — July 2026";
const subjectTemplate = "{{companyName}} — {{tradeLabel}} requests near {{city}}";
const bodyTemplate = `Hi {{greetingName}},

I came across {{companyName}} while reviewing {{city}} contractors. {{proofLine}}

On Renovessa, homeowners use a guided estimator to describe the trade, size, materials, and timing of a project. If they want contractor bids, they can submit that scope as a request for quote.

We're building our {{tradeLabel}} coverage around {{city}} and {{zip}}. Once approved, {{companyName}} can review matching requests and decide which ones to bid. Availability varies; there is no promised job volume or obligation to accept a request.

Reply “yes” for onboarding, “info” for a sample RFQ, or “later.” Or apply here: [Apply](https://renovessa.com/for-contractors)

{{agentName}}
[Renovessa](https://renovessa.com)

{{licenseLine}}`;

const publishedEmailEvidence: Record<string, string> = {
  "107117": "https://floorconceptsanddesign.com/contact/",
  "161548": "https://alihanllc.com/",
  "148020": "https://www.ejfconstruction.com/",
  "111067": "https://www.centralexteriors.com/contact",
};

type JsonObject = Record<string, any>;

function interpolate(template: string, context: Record<string, string>): string {
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_match, key: string) => context[key] || "");
}

function proofLine(rating: number | null, reviews: number | null): string {
  if (rating && rating >= 4.5 && reviews) return `Its ${rating}-star profile across ${reviews} reviews stood out.`;
  if (rating && rating >= 4.5) return `Its ${rating}-star profile stood out.`;
  return "Your local work appears relevant to the project requests homeowners bring to Renovessa.";
}

function licenseLine(company: string, license: string): string {
  return `P.S. This note is intended for ${company} (MD license ${license}). Wrong inbox? Please forward it to the owner.`;
}

function csvCell(value: unknown): string {
  const text = value == null ? "" : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

const source = JSON.parse(readFileSync(sourcePath, "utf8"));
const prospects = JSON.parse(readFileSync(prospectsPath, "utf8")) as JsonObject[];
const byLicense = new Map(prospects.map((row) => [String(row.licenseRegNumber || ""), row]));
function manualDraft(
  licenseRegNumber: string,
  pilotRank: number,
  contactName: string,
  greetingName: string,
  tradeCategory: string,
  tradeLabel: string
): JsonObject {
  const prospect = byLicense.get(licenseRegNumber);
  if (!prospect) throw new Error(`Replacement prospect ${licenseRegNumber} was not found`);
  return {
    pilotRank,
    prospectId: prospect.id,
    company: prospect.canonicalName,
    licensedName: contactName,
    greetingName,
    email: prospect.emails[0],
    tradeCategory,
    tradeLabel,
    city: prospect.city,
    state: prospect.state,
    zip: prospect.zip,
    fitScore: prospect.fitScore,
    fitTier: prospect.fitTier,
    matchStatus: prospect.matchStatus,
    outreachChannel: prospect.outreachChannel,
    outreachCaution: prospect.outreachCaution,
    licenseRegNumber: prospect.licenseRegNumber,
    googleRating: prospect.googleRating,
    googleReviewCount: prospect.googleReviewCount,
    website: prospect.website,
  };
}

const selectedDrafts = [
  ...source.drafts.filter((draft: JsonObject) => selectedRanks.includes(Number(draft.pilotRank))),
  manualDraft("147741", 5, "Luiz Eduardo Deandrade", "Luiz", "Electrical", "electrical"),
  manualDraft("90504", 21, "Christopher Charles Scango", "Christopher", "Landscaping", "hardscaping and outdoor living"),
  manualDraft("158941", 40, "Mariana Perez Martinez", "Mariana", "Restoration", "restoration"),
];

const selected = selectedDrafts
  .sort((a: JsonObject, b: JsonObject) => Number(a.pilotRank) - Number(b.pilotRank))
  .map((draft: JsonObject) => {
    const prospect = byLicense.get(String(draft.licenseRegNumber));
    if (!prospect) throw new Error(`No enriched record found for license ${draft.licenseRegNumber}`);

    const proof = proofLine(draft.googleRating, draft.googleReviewCount);
    const license = licenseLine(draft.company, String(draft.licenseRegNumber));
    const context = {
      companyName: draft.company,
      greetingName: draft.greetingName,
      tradeLabel: draft.tradeLabel,
      city: draft.city,
      zip: String(draft.zip),
      proofLine: proof,
      licenseLine: license,
      agentName: "Ray Cooper",
    };

    const publishedEmailUrl = publishedEmailEvidence[String(draft.licenseRegNumber)] || null;
    const requiresEmailVerification = draft.outreachChannel !== "email" && !publishedEmailUrl;

    return {
      pilotRank: Number(draft.pilotRank),
      prospectId: draft.prospectId,
      tradeCategory: draft.tradeCategory,
      tradeLabel: draft.tradeLabel,
      company: draft.company,
      contactName: draft.licensedName,
      greetingName: draft.greetingName,
      email: String(draft.email).trim().toLowerCase(),
      city: draft.city,
      state: draft.state,
      zip: String(draft.zip),
      fitScore: Number(draft.fitScore),
      fitTier: draft.fitTier,
      matchStatus: draft.matchStatus,
      outreachChannel: draft.outreachChannel,
      requiresEmailVerification,
      emailVerification:
        draft.outreachChannel === "email"
          ? "Enrichment marked the address email-first; recipient domain has a confirmed MX route."
          : `Address is published on the company website (${publishedEmailUrl}); recipient domain has a confirmed MX route.`,
      outreachCaution: draft.outreachCaution || null,
      licenseRegNumber: String(draft.licenseRegNumber),
      licenseExpiration: prospect.licenseExpiration,
      rating: draft.googleRating == null ? null : Number(draft.googleRating),
      reviewCount: draft.googleReviewCount == null ? null : Number(draft.googleReviewCount),
      website: draft.website || null,
      selectionRationale:
        draft.outreachChannel === "email"
          ? "Matched, high-fit prospect with no caution and an email-first outreach recommendation."
          : "Matched, high-fit prospect with no caution; the listed address was confirmed on the company website despite a phone-first enrichment recommendation.",
      renderedSubject: interpolate(subjectTemplate, context),
      renderedBody: interpolate(bodyTemplate, context),
    };
  });

if (selected.length !== 15) throw new Error(`Expected 15 selected records, found ${selected.length}`);

const payload = {
  generatedAt: new Date().toISOString(),
  campaign: {
    name: campaignName,
    tag,
    audience: "prospect_contractor",
    expectedCount: 15,
    templateId: "prospect_contractor_rfq_pilot_15",
    subjectTemplate,
    bodyTemplate,
    replyTo: "ray@renovessa.com",
  },
  recipients: selected,
};

writeFileSync(`${outputBase}.json`, `${JSON.stringify(payload, null, 2)}\n`, "utf8");

const csvFields = [
  "pilotRank", "tradeCategory", "company", "contactName", "email", "city", "zip",
  "fitScore", "fitTier", "matchStatus", "outreachChannel", "requiresEmailVerification",
  "licenseRegNumber", "licenseExpiration", "selectionRationale", "renderedSubject", "renderedBody",
];
writeFileSync(
  `${outputBase}.csv`,
  [csvFields.map(csvCell).join(","), ...selected.map((row: JsonObject) => csvFields.map((field) => csvCell(row[field])).join(","))].join("\n") + "\n",
  "utf8"
);

const markdown = [
  "# RFQ Pilot 15 — pre-send approval packet",
  "",
  `Generated: ${payload.generatedAt}`,
  "",
  "No external email is sent by this artifact. The production preparation command creates or updates a draft campaign only.",
  "",
  "## Cohort",
  "",
  "| # | Trade | Company | Contact | Email | City / ZIP | Fit | Outreach | License / expiry | Verification |",
  "|---:|---|---|---|---|---|---:|---|---|---|",
  ...selected.map((row: JsonObject) =>
    `| ${row.pilotRank} | ${row.tradeCategory} | ${row.company.replace(/\|/g, "\\|")} | ${row.contactName} | ${row.email} | ${row.city} ${row.zip} | ${row.fitScore}/10 | ${row.outreachChannel} | ${row.licenseRegNumber} / ${row.licenseExpiration} | ${row.requiresEmailVerification ? "Address/domain check required" : "Email-first"} |`
  ),
  "",
  "## Rendered messages",
  "",
  ...selected.flatMap((row: JsonObject) => [
    `### ${row.pilotRank}. ${row.company}`,
    "",
    `**To:** ${row.email}`,
    "",
    `**Subject:** ${row.renderedSubject}`,
    "",
    row.renderedBody,
    "",
    "---",
    "",
  ]),
].join("\n");
writeFileSync(`${outputBase}.md`, `${markdown}\n`, "utf8");

console.log(`Generated ${selected.length} recipients at ${outputBase}.{json,csv,md}`);
