import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { bathroomContractorStudioEnabled } from "@/lib/feature-flags";
import {
  buildCustomerFacingProposal,
  isProposalShareViewable,
} from "@/lib/bathroom/proposal-share";

export const runtime = "nodejs";

async function loadByToken(token: string) {
  return prisma.contractorProposal.findUnique({
    where: { shareToken: token },
    include: {
      project: true,
      contractor: true,
      clientMessages: { orderBy: { createdAt: "asc" }, take: 50 },
    },
  });
}

/**
 * Public customer view of a shared proposal (no auth).
 * Records first/last viewed timestamps. Never returns internal cost data.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  if (!bathroomContractorStudioEnabled()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  try {
    const { token } = await params;
    if (!token || token.length < 16) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const row = await loadByToken(token);
    if (!row || !isProposalShareViewable(row.status)) {
      return NextResponse.json({ error: "This proposal link is not available." }, { status: 404 });
    }

    const now = new Date();
    await prisma.contractorProposal.update({
      where: { id: row.id },
      data: {
        firstViewedAt: row.firstViewedAt ?? now,
        lastViewedAt: now,
        viewCount: { increment: 1 },
      },
    });

    if (!row.firstViewedAt) {
      // Fire-and-forget style audit (awaited for reliability)
      const { logAuditEvent } = await import("@/lib/audit");
      await logAuditEvent({
        eventType: "BATHROOM_PROPOSAL_VIEWED",
        description: `Client viewed proposal ${row.project.referenceNumber}`,
        bathroomProjectId: row.projectId,
        metadata: { proposalId: row.id, version: row.version },
      });
    }

    const view = buildCustomerFacingProposal({
      proposal: row,
      project: row.project,
      contractor: row.contractor,
      messages: row.clientMessages,
    });

    return NextResponse.json({
      proposal: view,
      disclaimer:
        "This proposal is issued by the contractor named above. Renovessa provides software tools only and is not a party to the contract.",
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Failed" }, { status: 500 });
  }
}
