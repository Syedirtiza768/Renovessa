import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { assertAdminAccess } from "@/lib/authorization";
import { prisma } from "@/lib/db";
import { EMAIL_TEMPLATES, type EmailAudience } from "@/lib/emailTemplates";

const AUDIENCES: EmailAudience[] = ["homeowner", "contractor", "prospect_contractor"];

/** Lists campaigns (newest first) for the ops dashboard. */
export async function GET() {
  const session = await getSession();
  try {
    await assertAdminAccess(session);
    const campaigns = await prisma.emailCampaign.findMany({
      orderBy: { createdAt: "desc" },
      include: { owner: { select: { name: true } } },
    });
    return NextResponse.json(campaigns);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Failed to load campaigns" }, { status: e?.status || 500 });
  }
}

/** Creates a draft campaign. Sending is a separate, explicit step. */
export async function POST(req: NextRequest) {
  const session = await getSession();
  try {
    await assertAdminAccess(session);
    const body = await req.json();
    const { name, audience, subject, bodyTemplate, templateId, filters, replyTo } = body;

    if (!name || !audience || !subject || !bodyTemplate) {
      return NextResponse.json(
        { error: "name, audience, subject, and bodyTemplate are required" },
        { status: 400 }
      );
    }
    if (!AUDIENCES.includes(audience)) {
      return NextResponse.json({ error: "Invalid audience" }, { status: 400 });
    }
    if (templateId && !EMAIL_TEMPLATES.some((t) => t.id === templateId)) {
      return NextResponse.json({ error: "Unknown templateId" }, { status: 400 });
    }

    const campaign = await prisma.emailCampaign.create({
      data: {
        name,
        audience,
        subject,
        bodyTemplate,
        templateId: templateId || null,
        filters: filters ?? undefined,
        replyTo: replyTo || null,
        ownerAgentId: session!.id,
        status: "draft",
      },
    });

    return NextResponse.json(campaign, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Failed to create campaign" }, { status: e?.status || 500 });
  }
}
