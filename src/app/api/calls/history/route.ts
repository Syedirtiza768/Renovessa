import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { assertAdminAccess } from "@/lib/authorization";
import { prisma } from "@/lib/db";

/** Recent CallLog rows for the current agent, for the softphone's history list. */
export async function GET() {
  const session = await getSession();
  try {
    await assertAdminAccess(session);

    const calls = await prisma.callLog.findMany({
      where: { agentId: session!.id },
      orderBy: { startedAt: "desc" },
      take: 25,
      select: {
        id: true,
        toNumber: true,
        fromNumber: true,
        status: true,
        durationSeconds: true,
        direction: true,
        startedAt: true,
        endedAt: true,
        disposition: true,
        dispositionNote: true,
        projectRequestId: true,
        contractorId: true,
        projectRequest: {
          select: { id: true, firstName: true, lastName: true, referenceNumber: true },
        },
        contractor: { select: { id: true, companyName: true } },
      },
    });

    return NextResponse.json(calls);
  } catch (e: any) {
    const status = e?.status || 500;
    return NextResponse.json({ error: e?.message || "Failed to load call history" }, { status });
  }
}
