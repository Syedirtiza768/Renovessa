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
  const [legacyRows, complianceRows] = await Promise.all([
    prisma.emailSuppression.findMany({ select: { email: true } }),
    prisma.communicationSuppression.findMany({
      where: { channel: "EMAIL" },
      select: { normalizedValue: true },
    }),
  ]);
  return new Set([
    ...legacyRows.map((r) => normalizeEmail(r.email)),
    ...complianceRows.map((r) => normalizeEmail(r.normalizedValue)),
  ]);
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

/**
 * Computes the "harsh reality" math line: how many consecutive 5-star reviews
 * a contractor needs to reach 4.9, given their current rating and review count.
 *
 * Formula: n = ceil((4.9 * (R + n) - S) / (5 - 4.9))
 *   where R = current review count, S = sum of all ratings = rating * R
 *   Simplifies to: n = ceil((4.9*R - S) / 0.1) = ceil((4.9 - rating) * R / 0.1)
 */
function ratingMath(
  rating: string | null | undefined,
  reviewCount: number | null | undefined
): string {
  const r = parseFloat(rating || "");
  const rc = reviewCount ?? 0;
  if (!r || r <= 0 || r >= 4.9 || rc <= 0) {
    // No useful data — return empty so the template slot collapses.
    return "";
  }
  // n = (4.9 - r) * rc / (5.0 - 4.9) = (4.9 - r) * rc / 0.1
  const n = Math.ceil(((4.9 - r) * rc) / 0.1);
  if (n <= 0 || n > 100000) return "";
  return (
    `Right now, with a ${r} average across ${rc} reviews, you'd need ${n} consecutive ` +
    `5-star reviews — without a single negative interruption — to pull your average up to a 4.9. ` +
    `That's not going to happen by itself.`
  );
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
      // Default: exclude prospects we've already contacted or who replied.
      // Pass status="all" to override, or status="contacted" to target only
      // previously-contacted prospects (e.g. for a follow-up campaign).
      status: f.status === "all" ? undefined : (f.status || "new"),
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
      reviewCount: true,
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
        reviewCount: r.reviewCount ? String(r.reviewCount) : undefined,
        ratingLine: ratingLine(r.rating),
        ratingMath: ratingMath(r.rating, r.reviewCount),
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
