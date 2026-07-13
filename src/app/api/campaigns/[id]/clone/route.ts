import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { assertAdminAccess } from "@/lib/authorization";
import { prisma } from "@/lib/db";

/** Clones a campaign into a new draft. */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  try {
    await assertAdminAccess(session);
    const { id } = await params;
    const original = await prisma.emailCampaign.findUnique({ where: { id } });
    if (!original) return NextResponse.json({ error: "Campaign not found" }, { status: 404 });

    const clone = await prisma.emailCampaign.create({
      data: {
        name: `${original.name} (copy)`,
        audience: original.audience,
        subject: original.subject,
        bodyTemplate: original.bodyTemplate,
        bodyHtml: original.bodyHtml,
        templateId: original.templateId,
        emailTemplateId: original.emailTemplateId,
        filters: original.filters ?? undefined,
        replyTo: original.replyTo,
        ownerAgentId: session!.id,
        clonedFromId: original.id,
        status: "draft",
      },
    });

    return NextResponse.json(clone, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Failed to clone campaign" }, { status: e?.status || 500 });
  }
}
