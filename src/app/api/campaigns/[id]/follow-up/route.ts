import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { assertAdminAccess } from "@/lib/authorization";
import { prisma } from "@/lib/db";

/**
 * Creates a follow-up campaign targeting recipients from the original campaign.
 * Targets: "all" (all recipients), "opened", "not-opened", "replied".
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  try {
    await assertAdminAccess(session);
    const { id } = await params;
    const body = await req.json();
    const target: string = body.target || "not-replied";

    const original = await prisma.emailCampaign.findUnique({ where: { id } });
    if (!original) return NextResponse.json({ error: "Campaign not found" }, { status: 404 });

    // Build the follow-up subject
    const origSubject = original.subject;
    const followupSubject = origSubject.toLowerCase().startsWith("re:")
      ? origSubject
      : `re: ${origSubject}`;

    // Resolve target recipients from the original campaign's EmailMessage rows
    const whereBase: any = { campaignId: id, direction: "outbound" };
    if (target === "opened") whereBase.openedAt = { not: null };
    if (target === "not-opened") whereBase.openedAt = null;
    if (target === "replied") {
      // Find emails that have an inbound reply linked to this campaign
      const repliedEmails = await prisma.emailMessage.findMany({
        where: { campaignId: id, direction: "inbound" },
        select: { fromEmail: true },
        distinct: ["fromEmail"],
      });
      whereBase.toEmail = { in: repliedEmails.map((r) => r.fromEmail) };
    }
    if (target === "not-replied") {
      const repliedEmails = await prisma.emailMessage.findMany({
        where: { campaignId: id, direction: "inbound" },
        select: { fromEmail: true },
        distinct: ["fromEmail"],
      });
      whereBase.toEmail = { notIn: repliedEmails.map((r) => r.fromEmail) };
    }

    const originalRecipients = await prisma.emailMessage.findMany({
      where: whereBase,
      select: { toEmail: true },
      distinct: ["toEmail"],
    });

    if (originalRecipients.length === 0) {
      return NextResponse.json({ error: "No recipients match the target criteria" }, { status: 400 });
    }

    // Create the follow-up campaign as a draft
    const followup = await prisma.emailCampaign.create({
      data: {
        name: `Follow-up: ${original.name}`,
        audience: original.audience,
        subject: followupSubject,
        bodyTemplate: original.bodyTemplate,
        bodyHtml: original.bodyHtml,
        filters: original.filters ?? undefined,
        replyTo: original.replyTo,
        ownerAgentId: session!.id,
        clonedFromId: original.id,
        status: "draft",
      },
    });

    return NextResponse.json({
      ...followup,
      targetRecipientCount: originalRecipients.length,
      target,
    }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Failed to create follow-up" }, { status: e?.status || 500 });
  }
}
