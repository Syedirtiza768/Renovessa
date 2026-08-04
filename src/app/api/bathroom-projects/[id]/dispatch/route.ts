import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession, canAccessAdmin } from "@/lib/auth";
import { logAuditEvent } from "@/lib/audit";
import { randomBytes } from "crypto";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || !canAccessAdmin(session.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const { contractorIds } = await req.json();

    if (!Array.isArray(contractorIds) || contractorIds.length === 0) {
      return NextResponse.json({ error: "Select at least one contractor." }, { status: 400 });
    }

    const project = await prisma.bathroomProject.findUnique({
      where: { id },
      include: {
        briefs: { orderBy: { createdAt: "desc" }, take: 1 },
        estimates: { orderBy: { createdAt: "desc" }, take: 1 },
      },
    });
    if (!project) {
      return NextResponse.json({ error: "Bathroom project not found." }, { status: 404 });
    }

    const contractors = await prisma.contractorProfile.findMany({
      where: {
        id: { in: contractorIds },
        status: "active",
        tier: { notIn: ["SUSPENDED", "BANNED"] },
      },
      include: { user: { select: { id: true, email: true } } },
    });

    if (contractors.length === 0) {
      return NextResponse.json({ error: "No eligible contractors found." }, { status: 400 });
    }

    const latestBrief = project.briefs[0] ?? null;
    const latestEstimate = project.estimates[0] ?? null;

    const results = await prisma.$transaction(async (tx) => {
      const dispatched: { contractorId: string; companyName: string; proposalId: string }[] = [];

      for (const contractor of contractors) {
        const shareToken = randomBytes(24).toString("base64url");
        const shareExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

        const proposal = await tx.contractorProposal.create({
          data: {
            projectId: id,
            contractorId: contractor.id,
            status: "SENT",
            version: 1,
            mode: "detailed",
            totalPrice: 0,
            includedScope: "",
            exclusions: "",
            sentAt: new Date(),
            shareToken,
            shareExpiresAt,
            estimateId: latestEstimate?.id ?? null,
          },
        });

        dispatched.push({
          contractorId: contractor.id,
          companyName: contractor.companyName,
          proposalId: proposal.id,
        });

        try {
          await tx.notification.create({
            data: {
              userId: contractor.user.id,
              title: "New bathroom RFP received",
              message: `You have a new RFP for a ${project.bathroomType ?? "bathroom"} remodeling project (${project.referenceNumber}). Review and submit your proposal.`,
              actionUrl: `/portal/contractor/proposal-studio`,
            },
          });
        } catch {
          // Notification failure is non-fatal
        }
      }

      await tx.bathroomProject.update({
        where: { id },
        data: { status: "CONTRACTOR_INVITED" },
      });

      return dispatched;
    });

    await logAuditEvent({
      eventType: "BATHROOM_RFP_DISPATCHED",
      description: `RFP dispatched to ${results.length} contractor(s) for ${project.referenceNumber}`,
      actorId: session.id,
      bathroomProjectId: id,
      metadata: {
        contractorIds: results.map((r) => r.contractorId),
        companies: results.map((r) => r.companyName),
        briefId: latestBrief?.id,
      },
    });

    return NextResponse.json({
      dispatched: results,
      totalDispatched: results.length,
    }, { status: 201 });
  } catch (e: any) {
    console.error("bathroom-dispatch POST", e);
    const status = e?.status || 500;
    return NextResponse.json({ error: e?.message || "Internal error" }, { status });
  }
}
