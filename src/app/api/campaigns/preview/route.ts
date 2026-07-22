import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { assertAdminAccess } from "@/lib/authorization";
import { resolveSegment, type SegmentFilters } from "@/lib/emailSegments";
import { interpolate, type EmailAudience } from "@/lib/emailTemplates";
import { complianceFooter } from "@/lib/unsubscribe";

/**
 * Resolves a segment and returns the recipient count plus a small sample and one
 * fully rendered example (with compliance footer). Body-driven so the "new
 * campaign" builder can show live counts before the campaign is created.
 */
export async function POST(req: NextRequest) {
  const session = await getSession();
  try {
    await assertAdminAccess(session);
    const { audience, filters, subject, bodyTemplate } = await req.json();
    if (!audience) return NextResponse.json({ error: "audience is required" }, { status: 400 });

    const recipients = await resolveSegment(audience as EmailAudience, (filters as SegmentFilters) || {});

    const sample = recipients.slice(0, 5).map((r) => r.email);

    let example: { to: string; subject: string; body: string } | null = null;
    if (recipients.length > 0 && subject && bodyTemplate) {
      const r = recipients[0];
      example = {
        to: r.email,
        subject: interpolate(subject, r.context).trim(),
        body: interpolate(bodyTemplate, r.context) + complianceFooter(r.email),
      };
    }

    const expectedCount = filters?.expectedCount === undefined
      ? null
      : Number(filters.expectedCount);
    const countMatchesExpected = expectedCount === null
      ? null
      : Number.isInteger(expectedCount) && recipients.length === expectedCount;

    return NextResponse.json({
      count: recipients.length,
      sample,
      example,
      expectedCount,
      countMatchesExpected,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Failed to preview segment" }, { status: e?.status || 500 });
  }
}
