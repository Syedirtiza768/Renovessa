import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { assertAdminAccess } from "@/lib/authorization";
import { prisma } from "@/lib/db";

/** Returns a single contact with full communication history. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  try {
    await assertAdminAccess(session);
    const { id } = await params;

    const contact = await prisma.contractorInquiry.findUnique({
      where: { id },
      include: { tags: { include: { tag: true } } },
    });
    if (!contact) return NextResponse.json({ error: "Contact not found" }, { status: 404 });

    // Get all email messages for this contact
    const messages = await prisma.emailMessage.findMany({
      where: { toEmail: { equals: contact.email, mode: "insensitive" } },
      orderBy: { createdAt: "desc" },
      include: { campaign: { select: { id: true, name: true } } },
    });

    return NextResponse.json({
      ...contact,
      tags: contact.tags.map((t) => ({ id: t.tag.id, name: t.tag.name, color: t.tag.color })),
      messages: messages.map((m) => ({
        id: m.id,
        direction: m.direction,
        subject: m.subject,
        body: m.body,
        status: m.status,
        campaignId: m.campaignId,
        campaignName: m.campaign?.name || null,
        createdAt: m.createdAt,
        deliveredAt: m.deliveredAt,
        openedAt: m.openedAt,
      })),
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Failed to load contact" }, { status: e?.status || 500 });
  }
}

/** Updates a contact's fields. */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  try {
    await assertAdminAccess(session);
    const { id } = await params;
    const body = await req.json();

    const contact = await prisma.contractorInquiry.findUnique({ where: { id } });
    if (!contact) return NextResponse.json({ error: "Contact not found" }, { status: 404 });

    const { companyName, contactName, phone, trade, city, state, rating, reviewCount, status } = body;
    const updated = await prisma.contractorInquiry.update({
      where: { id },
      data: {
        ...(companyName !== undefined && { companyName }),
        ...(contactName !== undefined && { contactName }),
        ...(phone !== undefined && { phone }),
        ...(trade !== undefined && { trade }),
        ...(city !== undefined && { city }),
        ...(state !== undefined && { state }),
        ...(rating !== undefined && { rating }),
        ...(reviewCount !== undefined && { reviewCount }),
        ...(status !== undefined && { status }),
      },
    });

    return NextResponse.json(updated);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Failed to update contact" }, { status: e?.status || 500 });
  }
}
