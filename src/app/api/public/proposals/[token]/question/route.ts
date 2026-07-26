import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { logAuditEvent } from "@/lib/audit";
import { bathroomContractorStudioEnabled } from "@/lib/feature-flags";
import { proposalQuestionSchema } from "@/lib/bathroom/schemas";
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
    const body = proposalQuestionSchema.parse(await req.json());
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
    if (!view.canAskQuestion) {
      return NextResponse.json({ error: "Questions are closed for this proposal." }, { status: 409 });
    }

    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      null;

    const message = await prisma.contractorProposalMessage.create({
      data: {
        proposalId: row.id,
        kind: body.kind,
        body: body.body,
        authorName: body.fullName || null,
        authorEmail: body.email || null,
        ipAddress: ip,
      },
    });

    if (body.kind === "revision_request") {
      await prisma.contractorProposal.update({
        where: { id: row.id },
        data: { status: "REVISION_REQUESTED" },
      });
    }

    await logAuditEvent({
      eventType: "BATHROOM_PROPOSAL_QUESTION",
      description: `Client ${body.kind} on ${row.project.referenceNumber}`,
      bathroomProjectId: row.projectId,
      metadata: {
        proposalId: row.id,
        messageId: message.id,
        kind: body.kind,
      },
    });

    return NextResponse.json({
      ok: true,
      messageId: message.id,
      note:
        body.kind === "revision_request"
          ? "Revision request sent. The contractor will review and may send an updated proposal."
          : "Your question was sent to the contractor.",
    });
  } catch (e: any) {
    if (e?.name === "ZodError") {
      return NextResponse.json({ error: e.errors?.[0]?.message ?? "Invalid input" }, { status: 400 });
    }
    return NextResponse.json({ error: e?.message || "Failed" }, { status: 500 });
  }
}
