import { prisma } from "./db";
import { normalizeEmail } from "./unsubscribe";
import type { EmailAudience, EmailContext } from "./emailTemplates";

/**
 * Resolves audience segments into concrete recipient lists for bulk email.
 *
 * A segment is an audience ("homeowner" | "contractor" | "prospect_contractor")
 * plus a set of filters. Each recipient carries an EmailContext for template
 * merge and, where the source row is a tracked entity, the projectRequestId or
 * contractorId so the resulting EmailMessage appears in that contact's timeline.
 *
 * Every resolver excludes demo rows, drops anything present in EmailSuppression,
 * and dedupes by normalized email so a person is never mailed twice per send.
 */

export interface SegmentFilters {
  trade?: string;
  zip?: string;
  status?: string;
  tier?: string;
}

export interface Recipient {
  email: string;
  context: EmailContext;
  projectRequestId?: string;
  contractorId?: string;
}

/** Loads the current suppression set as normalized emails. */
async function loadSuppressed(): Promise<Set<string>> {
  const rows = await prisma.emailSuppression.findMany({ select: { email: true } });
  return new Set(rows.map((r) => normalizeEmail(r.email)));
}

async function resolveHomeowners(f: SegmentFilters): Promise<Recipient[]> {
  const rows = await prisma.projectRequest.findMany({
    where: {
      isDemo: false,
      trade: f.trade || undefined,
      zipCode: f.zip || undefined,
      status: (f.status as any) || undefined,
    },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      trade: true,
      referenceNumber: true,
    },
  });
  return rows
    .filter((r) => r.email)
    .map((r) => ({
      email: r.email,
      projectRequestId: r.id,
      context: {
        firstName: r.firstName,
        lastName: r.lastName,
        trade: r.trade,
        reference: r.referenceNumber,
      },
    }));
}

async function resolveContractors(f: SegmentFilters): Promise<Recipient[]> {
  const rows = await prisma.contractorProfile.findMany({
    where: {
      isDemo: false,
      trade: f.trade || undefined,
      status: f.status || undefined,
      tier: (f.tier as any) || undefined,
      serviceZips: f.zip ? { has: f.zip } : undefined,
    },
    select: {
      id: true,
      companyName: true,
      trade: true,
      contactPerson: true,
      user: { select: { email: true } },
    },
  });
  return rows
    .filter((r) => r.user?.email)
    .map((r) => ({
      email: r.user!.email,
      contractorId: r.id,
      context: {
        companyName: r.companyName,
        trade: r.trade,
        firstName: r.contactPerson || undefined,
      },
    }));
}

/** Maps a raw scraped trade/category to a human-readable label for email copy. */
const TRADE_LABELS: Record<string, string> = {
  contractor: "contracting",
  remodel: "remodeling",
  construction: "construction",
  handyman: "handyman",
  builder: "building",
  "home improvement": "home improvement",
  kitchen: "kitchen remodeling",
  masonry: "masonry",
};

function tradeLabel(trade: string): string {
  return TRADE_LABELS[trade?.toLowerCase().trim()] || trade || "home improvement";
}

/** The one line that adapts to whether we scraped a review rating for the row. */
function ratingLine(rating: string | null | undefined): string {
  const r = rating?.trim();
  return r
    ? `Your ${r}-star rating is exactly why I'm emailing you and not the guy down the road.`
    : `Your reviews are exactly why I'm emailing you and not the guy down the road.`;
}

/** First name for the greeting, or "there" when we only have the company. */
function greetingName(contactName: string | null | undefined): string {
  const first = contactName?.trim().split(/\s+/)[0];
  return first || "there";
}

async function resolveProspectContractors(f: SegmentFilters): Promise<Recipient[]> {
  const rows = await prisma.contractorInquiry.findMany({
    where: {
      isDemo: false,
      trade: f.trade || undefined,
      status: f.status || undefined,
      // serviceZips is a comma-separated string on inquiries.
      serviceZips: f.zip ? { contains: f.zip } : undefined,
    },
    select: {
      companyName: true,
      contactName: true,
      trade: true,
      email: true,
      city: true,
      rating: true,
    },
  });
  return rows
    .filter((r) => r.email)
    .map((r) => ({
      email: r.email,
      context: {
        companyName: r.companyName,
        firstName: r.contactName || undefined,
        greetingName: greetingName(r.contactName),
        trade: r.trade,
        tradeLabel: tradeLabel(r.trade),
        // "Washington" reads better as "DC" in the outreach line.
        city: r.city === "Washington" ? "DC" : r.city || undefined,
        rating: r.rating || undefined,
        ratingLine: ratingLine(r.rating),
      },
    }));
}

/** Resolves a segment to a deduped, suppression-filtered recipient list. */
export async function resolveSegment(
  audience: EmailAudience,
  filters: SegmentFilters = {}
): Promise<Recipient[]> {
  let recipients: Recipient[];
  switch (audience) {
    case "homeowner":
      recipients = await resolveHomeowners(filters);
      break;
    case "contractor":
      recipients = await resolveContractors(filters);
      break;
    case "prospect_contractor":
      recipients = await resolveProspectContractors(filters);
      break;
    default:
      recipients = [];
  }

  const suppressed = await loadSuppressed();
  const seen = new Set<string>();
  const out: Recipient[] = [];
  for (const r of recipients) {
    const key = normalizeEmail(r.email);
    if (!key || suppressed.has(key) || seen.has(key)) continue;
    seen.add(key);
    out.push(r);
  }
  return out;
}
