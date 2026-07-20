import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { assertAdminAccess } from "@/lib/authorization";
import { prisma } from "@/lib/db";

/**
 * Bulk CSV import for contacts (ContractorInquiry).
 *
 * Accepts a CSV file with these column headers (case-insensitive, flexible):
 *   company_name, contact_person, email, phone, trade/category,
 *   city, state, website, service_zips, years_in_business, employee_count,
 *   licensed_insured, uses_lead_gen, avg_job_size, referral_source, source
 *
 * Deduplicates by email (case-insensitive). Existing contacts are skipped.
 */

const HEADER_MAP: Record<string, string> = {
  company_name: "companyName",
  company: "companyName",
  contact_person: "contactName",
  contact_name: "contactName",
  contact: "contactName",
  name: "contactName",
  email: "email",
  phone: "phone",
  trade: "trade",
  category: "trade",
  city: "city",
  state: "state",
  website: "website",
  service_zips: "serviceZips",
  zip: "serviceZips",
  zip_codes: "serviceZips",
  years_in_business: "yearsInBusiness",
  employee_count: "employeeCount",
  employees: "employeeCount",
  licensed_insured: "licensedInsured",
  licensed: "licensedInsured",
  uses_lead_gen: "usesLeadGen",
  lead_gen: "usesLeadGen",
  avg_job_size: "avgJobSize",
  referral_source: "referralSource",
  rating: "rating",
  review_count: "reviewCount",
  reviews: "reviewCount",
  status: "status",
};

function normalizeHeader(h: string): string {
  return h.trim().toLowerCase().replace(/[\s-]+/g, "_");
}

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
        if (s[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n") {
      row.push(field);
      field = "";
      if (row.some((f) => f.trim() !== "")) rows.push(row);
      row = [];
    } else {
      field += c;
    }
  }
  if (field !== "" || row.length) {
    row.push(field);
    if (row.some((f) => f.trim() !== "")) rows.push(row);
  }

  const header = rows.shift();
  if (!header) return [];

  return rows.map((r) => {
    const obj: Record<string, string> = {};
    header.forEach((h, i) => {
      obj[normalizeHeader(h)] = (r[i] ?? "").trim();
    });
    return obj;
  });
}

interface ContactData {
  companyName: string;
  contactName: string;
  email: string;
  phone: string;
  trade: string;
  serviceZips: string;
  city: string | null;
  state: string | null;
  website: string | null;
  source: string;
  status: string;
  isDemo: boolean;
  licensedInsured: boolean;
  usesLeadGen: boolean;
  yearsInBusiness: number | null;
  employeeCount: number | null;
  avgJobSize: string | null;
  referralSource: string | null;
  rating: string | null;
  reviewCount: number | null;
}

function mapRow(raw: Record<string, string>): ContactData | null {
  const vals: Record<string, string> = {};
  for (const [csvKey, value] of Object.entries(raw)) {
    const field = HEADER_MAP[csvKey];
    if (field && value) vals[field] = value;
  }

  // Must have email
  if (!vals.email) return null;

  return {
    email: vals.email.toLowerCase().trim(),
    companyName: vals.companyName || "Unknown",
    contactName: vals.contactName || "",
    phone: vals.phone || "",
    trade: vals.trade || "contractor",
    serviceZips: vals.serviceZips || "",
    city: vals.city || null,
    state: vals.state || null,
    website: vals.website || null,
    source: vals.source || "csv import",
    status: vals.status || "new",
    isDemo: false,
    licensedInsured: vals.licensedInsured === "true" || vals.licensedInsured === "1" || vals.licensedInsured === "yes",
    usesLeadGen: vals.usesLeadGen === "true" || vals.usesLeadGen === "1" || vals.usesLeadGen === "yes",
    yearsInBusiness: vals.yearsInBusiness ? parseInt(vals.yearsInBusiness, 10) || null : null,
    employeeCount: vals.employeeCount ? parseInt(vals.employeeCount, 10) || null : null,
    avgJobSize: vals.avgJobSize || null,
    referralSource: vals.referralSource || null,
    rating: vals.rating || null,
    reviewCount: vals.reviewCount ? parseInt(vals.reviewCount, 10) || null : null,
  };
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  try {
    await assertAdminAccess(session);

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const text = await file.text();
    const rawRows = parseCsv(text);

    if (rawRows.length === 0) {
      return NextResponse.json({ error: "CSV file is empty or has no valid rows" }, { status: 400 });
    }

    // Collect all existing emails in one query for dedup
    const emails = rawRows
      .map((r) => {
        const normalized = normalizeHeader(Object.keys(r).find((k) => normalizeHeader(k) === "email") || "");
        return r[normalized] || r["email"] || "";
      })
      .filter(Boolean)
      .map((e) => e.toLowerCase());

    const existing = await prisma.contractorInquiry.findMany({
      where: { email: { in: emails } },
      select: { email: true },
    });
    const existingEmails = new Set(existing.map((e) => e.email.toLowerCase()));

    let created = 0;
    let skipped = 0;
    let errors: { row: number; email: string; error: string }[] = [];

    for (let i = 0; i < rawRows.length; i++) {
      const mapped = mapRow(rawRows[i]);
      if (!mapped) {
        errors.push({ row: i + 2, email: "", error: "Missing email" });
        continue;
      }

      if (existingEmails.has(mapped.email)) {
        skipped++;
        continue;
      }

      try {
        await prisma.contractorInquiry.create({ data: mapped });
        existingEmails.add(mapped.email); // prevent dupes within the same CSV
        created++;
      } catch (err: any) {
        errors.push({ row: i + 2, email: mapped.email, error: err?.message || "Create failed" });
      }
    }

    return NextResponse.json({
      total: rawRows.length,
      created,
      skipped,
      errors,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Import failed" }, { status: e?.status || 500 });
  }
}
