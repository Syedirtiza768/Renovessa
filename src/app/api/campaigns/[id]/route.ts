import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { assertAdminAccess } from "@/lib/authorization";
import { prisma } from "@/lib/db";

/** Returns a single campaign with its owner. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  try {
    await assertAdminAccess(session);
    const { id } = await params;
    const campaign = await prisma.emailCampaign.findUnique({
      where: { id },
      include: { owner: { select: { name: true } } },
    });
    if (!campaign) return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    return NextResponse.json(campaign);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Failed to load campaign" }, { status: e?.status || 500 });
  }
}

/** Updates a draft/failed campaign. */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  try {
    await assertAdminAccess(session);
    const { id } = await params;
    const campaign = await prisma.emailCampaign.findUnique({ where: { id } });
    if (!campaign) return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    if (campaign.status !== "draft" && campaign.status !== "failed") {
      return NextResponse.json({ error: "Only draft or failed campaigns can be edited" }, { status: 400 });
    }

    const body = await req.json();
    const { name, subject, bodyTemplate, bodyHtml, filters, replyTo } = body;

    const updated = await prisma.emailCampaign.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(subject !== undefined && { subject }),
        ...(bodyTemplate !== undefined && { bodyTemplate }),
        ...(bodyHtml !== undefined && { bodyHtml }),
        ...(filters !== undefined && { filters }),
        ...(replyTo !== undefined && { replyTo }),
      },
    });

    return NextResponse.json(updated);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Failed to update campaign" }, { status: e?.status || 500 });
  }
}
