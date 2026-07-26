import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { logAuditEvent } from "@/lib/audit";
import { bathroomContractorStudioEnabled } from "@/lib/feature-flags";
import { proposalDeclineSchema } from "@/lib/bathroom/schemas";
import {
  buildCustomerFacingProposal,
  isProposalShareViewable,
} from "@/lib/bathroom/proposal-share";

export const runtime = "nodejs";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  if (!bathroomContractorStudioEnabled()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  try {
    const { token } = await params;
    const body = proposalDeclineSchema.parse(await req.json());
    const row = await prisma.contractorProposal.findUnique({
      where: { shareToken: token },
      include: { project: true, contractor: true, clientMessages: true },
    });
    if (!row || !isProposalShareViewable(row.status)) {
      return NextResponse.json({ error: "Proposal not found." }, { status: 404 });
    }

    const view = buildCustomerFacingProposal({
      proposal: row,
      project: row.project,
      contractor: row.contractor,
      messages: row.clientMessages,
    });
    if (!view.canDecline) {
      return NextResponse.json({ error: "This proposal can no longer be declined." }, { status: 409 });
    }

    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      null;

    const proposal = await prisma.contractorProposal.update({
      where: { id: row.id },
      data: {
        status: "DECLINED",
        declinedAt: new Date(),
      },
    });

    await prisma.contractorProposalMessage.create({
      data: {
        proposalId: row.id,
        kind: "decline_note",
        body: body.reason,
        authorName: body.fullName || null,
        authorEmail: body.email || null,
        ipAddress: ip,
      },
    });

    await logAuditEvent({
      eventType: "BATHROOM_PROPOSAL_DECLINED",
      description: `Proposal declined for ${row.project.referenceNumber}`,
      bathroomProjectId: row.projectId,
      metadata: { proposalId: row.id, version: row.version },
    });

    return NextResponse.json({
      ok: true,
      status: proposal.status,
      note: "Your response has been recorded. The contractor has been notified.",
    });
  } catch (e: any) {
    if (e?.name === "ZodError") {
      return NextResponse.json({ error: e.errors?.[0]?.message ?? "Invalid input" }, { status: 400 });
    }
    return NextResponse.json({ error: e?.message || "Failed" }, { status: 500 });
  }
}
