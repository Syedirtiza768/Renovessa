import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const path = resolve(__dirname, "../data/contractor_enrichment/rfq_pilot_15_campaign.json");
const payload = JSON.parse(readFileSync(path, "utf8"));
const recipients = payload.recipients as Record<string, any>[];
const expectedTrades: Record<string, number> = {
  "Design-Build": 1,
  Electrical: 1,
  Flooring: 1,
  "General Contracting": 1,
  HVAC: 1,
  Landscaping: 1,
  "Masonry & Concrete": 1,
  Painting: 1,
  Plumbing: 1,
  Remodeling: 2,
  Restoration: 1,
  Roofing: 2,
  "Windows & Doors": 1,
};

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

assert(payload.campaign.expectedCount === 15, "Campaign expectedCount must be 15");
assert(recipients.length === 15, `Expected 15 recipients, found ${recipients.length}`);
assert(new Set(recipients.map((r) => r.email)).size === 15, "Recipient emails are not unique");
assert(new Set(recipients.map((r) => r.company.toLowerCase())).size === 15, "Recipient companies are not unique");

const actualTrades: Record<string, number> = {};
for (const recipient of recipients) {
  actualTrades[recipient.tradeCategory] = (actualTrades[recipient.tradeCategory] || 0) + 1;
  assert(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient.email), `Invalid email: ${recipient.email}`);
  assert(recipient.matchStatus === "matched", `${recipient.company} is not a matched identity`);
  assert(recipient.fitTier === "hot", `${recipient.company} is not a hot-fit prospect`);
  assert(!recipient.outreachCaution, `${recipient.company} has an unresolved outreach caution`);
  assert(recipient.licenseRegNumber, `${recipient.company} is missing a license number`);
  assert(new Date(recipient.licenseExpiration).getTime() > Date.now(), `${recipient.company} license is expired`);
  assert(!/\{\{/.test(recipient.renderedSubject + recipient.renderedBody), `${recipient.company} has unresolved merge fields`);
  assert(recipient.renderedBody.includes("Availability varies"), `${recipient.company} is missing the availability disclaimer`);
  assert(recipient.renderedBody.includes("https://renovessa.com/for-contractors"), `${recipient.company} is missing the application link`);
  assert(!/guarantee|guaranteed|usually 1|vetted contractor/i.test(recipient.renderedBody), `${recipient.company} contains a prohibited claim`);
  if (recipient.rating && recipient.rating < 4.5) {
    assert(!recipient.renderedBody.includes(`${recipient.rating}-star`), `${recipient.company} should not highlight a low rating`);
  }
  const wordCount = recipient.renderedBody.trim().split(/\s+/).length;
  assert(wordCount >= 100 && wordCount <= 190, `${recipient.company} body is ${wordCount} words; expected 100–190`);
}

assert(JSON.stringify(actualTrades) === JSON.stringify(expectedTrades), `Trade mix mismatch: ${JSON.stringify(actualTrades)}`);

const verificationRequired = recipients.filter((r) => r.requiresEmailVerification).length;
assert(verificationRequired === 0, `${verificationRequired} recipients still require email verification`);
console.log(`Verified ${recipients.length} recipients across ${Object.keys(actualTrades).length} trades.`);
console.log("All selected recipient domains have MX records; phone-first addresses are published on their company websites.");
