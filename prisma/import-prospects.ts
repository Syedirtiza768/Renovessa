/**
 * One-off importer for the DMV contractor cold-outreach pilot.
 *
 * Lives under prisma/ (not scripts/) so it ships inside the production runtime
 * image, which copies prisma/ and bundles tsx + bcryptjs. Run it in the app
 * container after the CSV has been copied in:
 *
 *   docker cp dmv_contractor_emails.csv renovessa-app-1:/tmp/dmv.csv
 *   docker compose exec app node node_modules/tsx/dist/cli.mjs \
 *     prisma/import-prospects.ts /tmp/dmv.csv
 *
 * It is idempotent: prospects are matched by email, and campaigns by name, so
 * re-running updates rather than duplicates. It does NOT send anything — sends
 * remain an explicit, separate action.
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { readFileSync } from "node:fs";

const prisma = new PrismaClient();

// ── Template snapshots (kept in sync with src/lib/emailTemplates.ts) ──
// src/ is not present in the runtime image, so the copy the campaign stores is
// inlined here. Merge tokens are filled per-recipient by the segment resolver.
const INTRO_SUBJECT = "The homeowner who ghosted you says hi";
const INTRO_BODY = `Hi {{greetingName}},

You don't know me, so instead of introducing myself, let me guess a few things about you:

Somewhere in your phone right now is a homeowner you quoted three weeks ago who vanished into thin air. You've rebuilt at least one "I saw it on Pinterest" idea this year. And the jobs you're best at are NOT the ones that walk in the door most often.

If I got two out of three right, keep reading. (I usually get all three.)

I'm {{agentName}} with Renovessa. We put {{tradeLabel}} pros in {{city}} in front of homeowners who are actually ready to start — not tire-kickers collecting five quotes for sport. {{ratingLine}}

Here's the part you'll like: there's nothing to sign, no demo to sit through, no "book a call" link. My only goal is to bring {{companyName}} more of the right jobs.

Just hit reply. One word works — even "how?" — and I'll take it from there.

Quick favor: if you're the one reading the inbox but not the one who decides where new work comes from, forward this to the owner. They'll thank you when the calendar fills up.

{{agentName}}
Renovessa

P.S. Buried in the busy season? Reply "later" and I'll circle back when the dust settles.`;

const FOLLOWUP_SUBJECT = "re: the homeowner who ghosted you";
const FOLLOWUP_BODY = `Hi {{greetingName}},

No pitch — just floating my last note back to the top of your inbox.

The offer stands: homeowners in {{city}} who are ready to start {{tradeLabel}} work, sent straight to {{companyName}}, with the only goal being to bring you more of the right jobs.

A one-word reply still works. Even "maybe."

{{agentName}}
Renovessa`;

/** Minimal RFC-4180-ish CSV parser: handles quoted fields and escaped quotes. */
function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let field = "";
  let row: string[] = [];
  let inQuotes = false;
  const s = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (inQuotes) {
      if (c === '"') {
        if (s[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += c;
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(field); field = "";
    } else if (c === "\n") {
      row.push(field); field = "";
      if (row.some((f) => f.trim() !== "")) rows.push(row);
      row = [];
    } else field += c;
  }
  if (field !== "" || row.length) { row.push(field); if (row.some((f) => f.trim() !== "")) rows.push(row); }

  const header = rows.shift();
  if (!header) return [];
  return rows.map((r) => {
    const obj: Record<string, string> = {};
    header.forEach((h, i) => { obj[h.trim()] = (r[i] ?? "").trim(); });
    return obj;
  });
}

/** Idempotent find-or-update by email (ContractorInquiry.email is not unique). */
async function upsertProspect(data: {
  companyName: string; contactName: string; email: string; trade: string;
  city: string; state: string; rating: string; website: string; status: string; source: string;
}) {
  const existing = await prisma.contractorInquiry.findFirst({ where: { email: data.email } });
  if (existing) {
    await prisma.contractorInquiry.update({ where: { id: existing.id }, data });
    return "updated";
  }
  await prisma.contractorInquiry.create({
    data: { ...data, phone: "", serviceZips: "", isDemo: false },
  });
  return "created";
}

/** Creates a draft campaign by name only if one doesn't already exist. */
async function ensureCampaign(input: {
  name: string; subject: string; bodyTemplate: string; templateId: string;
  filters: object; ownerAgentId: string; replyTo: string;
}) {
  const existing = await prisma.emailCampaign.findFirst({ where: { name: input.name } });
  if (existing) return `exists (${existing.id})`;
  const c = await prisma.emailCampaign.create({
    data: {
      name: input.name,
      audience: "prospect_contractor",
      subject: input.subject,
      bodyTemplate: input.bodyTemplate,
      templateId: input.templateId,
      filters: input.filters,
      replyTo: input.replyTo,
      ownerAgentId: input.ownerAgentId,
      status: "draft",
    },
  });
  return `created (${c.id})`;
}

async function main() {
  const csvPath = process.argv[2];
  if (!csvPath) throw new Error("Usage: import-prospects.ts <path-to-csv>");

  const replyTo = process.env.SENDGRID_REPLY_TO || "ray@renovessa.com";
  const rayEmail = process.env.RAY_EMAIL || "ray@renovessa.com";
  const rayPassword = process.env.RAY_PASSWORD || "Renovessa#2026";

  // ── 1. Ray Cooper (campaign owner + reply recipient) ──
  let ray = await prisma.user.findUnique({ where: { email: rayEmail } });
  if (!ray) {
    ray = await prisma.user.create({
      data: {
        email: rayEmail,
        passwordHash: bcrypt.hashSync(rayPassword, 10),
        name: "Ray Cooper",
        role: "CONTRACTOR_ACQUISITION",
        isDemo: false,
      },
    });
    console.log(`Created Ray Cooper (${rayEmail}) — temp password: ${rayPassword}`);
  } else {
    console.log(`Ray Cooper already exists (${rayEmail})`);
  }

  // ── 2. Import CSV prospects ──
  const records = parseCsv(readFileSync(csvPath, "utf8"));
  let created = 0, updated = 0;
  for (const r of records) {
    const email = (r.email || "").toLowerCase();
    if (!email) continue;
    const res = await upsertProspect({
      companyName: r.company_name || "",
      contactName: r.contact_person || "",
      email,
      trade: r.category || "contractor",
      city: r.city || "",
      state: r.state || "",
      rating: r.rating || "",
      website: r.website || "",
      status: "new",
      source: r.source || "DMV scrape",
    });
    res === "created" ? created++ : updated++;
  }
  console.log(`Prospects: ${created} created, ${updated} updated (of ${records.length} rows)`);

  // ── 3. Monitoring seeds — status "monitor" so they are targeted only by the
  //       monitoring campaign and excluded from the pilot (status "new"). ──
  const monitors = [
    { companyName: "Acme Inc.", contactName: "Abdullah Cheema", email: "abdullahcheema2223@gmail.com", city: "Arlington", state: "VA" },
    { companyName: "GBC", contactName: "Irtiza Hassan", email: "irtiza.hassan@gmail.com", city: "Arlington", state: "VA" },
  ];
  for (const m of monitors) {
    const res = await upsertProspect({
      ...m,
      trade: "contractor",
      rating: "5.0",
      website: "",
      status: "monitor",
      source: "monitoring",
    });
    console.log(`Monitoring contact (${m.contactName} / ${m.companyName}): ${res}`);
  }

  // ── 4. Draft campaigns (idempotent) ──
  console.log("Pilot:      " + await ensureCampaign({
    name: "DMV Contractor Icebreaker — Pilot",
    subject: INTRO_SUBJECT, bodyTemplate: INTRO_BODY,
    templateId: "prospect_contractor_intro",
    filters: { status: "new" }, ownerAgentId: ray.id, replyTo,
  }));
  console.log("Monitoring: " + await ensureCampaign({
    name: "Monitoring — Abdullah (Acme Inc.)",
    subject: INTRO_SUBJECT, bodyTemplate: INTRO_BODY,
    templateId: "prospect_contractor_intro",
    filters: { status: "monitor" }, ownerAgentId: ray.id, replyTo,
  }));
  console.log("Follow-up:  " + await ensureCampaign({
    name: "DMV Contractor Icebreaker — Follow-up",
    subject: FOLLOWUP_SUBJECT, bodyTemplate: FOLLOWUP_BODY,
    templateId: "prospect_contractor_followup",
    filters: { status: "new" }, ownerAgentId: ray.id, replyTo,
  }));

  console.log("Done.");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
