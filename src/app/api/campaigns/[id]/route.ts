import { NextResponse } from "next/server";
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
