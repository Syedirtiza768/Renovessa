/**
 * Import contacts_import.csv into ContractorInquiry (same rules as /api/contacts/import).
 *
 *   npx tsx scripts/import_contacts_from_csv.ts
 *   npx tsx scripts/import_contacts_from_csv.ts path/to/file.csv
 */
import { readFileSync } from "fs";
import path from "path";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const HEADER_MAP: Record<string, string> = {
  company_name: "companyName",
  contact_person: "contactName",
  email: "email",
  phone: "phone",
  trade: "trade",
  city: "city",
  state: "state",
  website: "website",
  service_zips: "serviceZips",
  source: "source",
  rating: "rating",
  review_count: "reviewCount",
};

function normalizeHeader(h: string): string {
  return h.trim().toLowerCase().replace(/[\s-]+/g, "_");
}

function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else inQuotes = false;
      } else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (c !== "\r") field += c;
  }
  if (field.length || row.length) {
    row.push(field);
    rows.push(row);
  }
  if (!rows.length) return [];
  const headers = rows[0].map(normalizeHeader);
  return rows.slice(1).filter((r) => r.some((c) => c.trim())).map((r) => {
    const obj: Record<string, string> = {};
    headers.forEach((h, idx) => {
      obj[h] = (r[idx] || "").trim();
    });
    return obj;
  });
}

async function main() {
  const csvPath =
    process.argv[2] ||
    path.join(process.cwd(), "data", "contractor_enrichment", "contacts_import.csv");
  const text = readFileSync(csvPath, "utf-8");
  const rawRows = parseCsv(text);
  console.log(`Reading ${csvPath} (${rawRows.length} rows)`);

  const emails = rawRows
    .map((r) => (r.email || "").toLowerCase().trim())
    .filter(Boolean);
  const existing = await prisma.contractorInquiry.findMany({
    where: { email: { in: emails } },
    select: { email: true },
  });
  const existingEmails = new Set(existing.map((e) => e.email.toLowerCase()));

  let created = 0;
  let skipped = 0;
  let errors = 0;

  for (const raw of rawRows) {
    const vals: Record<string, string> = {};
    for (const [k, v] of Object.entries(raw)) {
      const field = HEADER_MAP[k];
      if (field && v) vals[field] = v;
    }
    const email = (vals.email || "").toLowerCase().trim();
    if (!email) {
      errors++;
      continue;
    }
    if (existingEmails.has(email)) {
      skipped++;
      continue;
    }
    try {
      await prisma.contractorInquiry.create({
        data: {
          email,
          companyName: vals.companyName || "Unknown",
          contactName: vals.contactName || "",
          phone: vals.phone || "",
          trade: vals.trade || "contractor",
          serviceZips: vals.serviceZips || "",
          city: vals.city || null,
          state: vals.state || null,
          website: vals.website || null,
          source: vals.source || "md-enriched-onboarding-2026-07",
          status: "new",
          isDemo: false,
          rating: vals.rating || null,
          reviewCount: vals.reviewCount ? parseInt(vals.reviewCount, 10) || null : null,
        },
      });
      existingEmails.add(email);
      created++;
    } catch (e: any) {
      errors++;
      console.error(`FAIL ${email}: ${e?.message || e}`);
    }
  }

  console.log(JSON.stringify({ total: rawRows.length, created, skipped, errors }, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
