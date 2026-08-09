import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { logAuditEvent } from "@/lib/audit";
import { generateReferenceNumber } from "@/lib/utils";
import { requestEvidence, recordProjectCompliance } from "@/lib/compliance";
import { sendRfqConfirmationEmail } from "@/lib/confirmationEmails";
import { rfpSubmissionSchema } from "@/lib/bathroom/schemas";
import { assertBathroomProjectAccess } from "@/lib/bathroom/authorization";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  try {
    const { id } = await params;
    const project = await assertBathroomProjectAccess(session, id);

    if (project.projectRequestId) {
      return NextResponse.json({ error: "This project has already been submitted as an RFP." }, { status: 409 });
    }

    const latestBrief = await prisma.projectBrief.findFirst({
      where: { projectId: id },
      orderBy: { createdAt: "desc" },
    });
    if (!latestBrief) {
      return NextResponse.json({ error: "Generate a brief before submitting an RFP." }, { status: 409 });
    }

    const data = rfpSubmissionSchema.parse(await req.json());

    const isLoggedInHomeowner = session?.role === "HOMEOWNER";
    if (isLoggedInHomeowner && session.email && data.email.trim().toLowerCase() !== session.email.toLowerCase()) {
      return NextResponse.json({ error: "Email must match your portal account" }, { status: 400 });
    }
    const homeownerId = isLoggedInHomeowner ? session.id : null;

    const latestEstimate = await prisma.bathroomEstimate.findFirst({
      where: { projectId: id },
      orderBy: { createdAt: "desc" },
    });

    const evidence = requestEvidence(req);
    const referenceNumber = generateReferenceNumber();

    const planningRange = latestEstimate
      ? `$${latestEstimate.lowAmount.toLocaleString()}–$${latestEstimate.highComplexityAmount.toLocaleString()}`
      : "not generated";

    const description = [
      `Bathroom remodeling RFP via Renovessa Bathroom Planner — ${project.referenceNumber}`,
      ``,
      `Bathroom type: ${project.bathroomType ?? "unspecified"}`,
      `Project objective: ${project.projectObjective ?? "unspecified"}`,
      `Property: ${project.propertyType ?? "unspecified"}, ${project.ownershipStatus ?? "unspecified"}`,
      `Budget: ${project.budgetMinimum && project.budgetMaximum ? `$${project.budgetMinimum}–$${project.budgetMaximum}` : "not specified"}`,
      `Desired start: ${project.desiredStartDate ?? "flexible"}`,
      `Timeline: ${data.timeline ?? project.timelineCategory ?? "flexible"}`,
      `Planning range: ${planningRange}`,
      ``,
      `Brief generated: ${latestBrief.createdAt.toISOString()}`,
      `Brief ID: ${latestBrief.id}`,
      latestEstimate ? `Estimate ID: ${latestEstimate.id}` : "",
      data.notes ? `Notes: ${data.notes}` : "",
    ].filter(Boolean).join("\n");

    const rfp = await prisma.$transaction(async (tx) => {
      const created = await tx.projectRequest.create({
        data: {
          referenceNumber,
          homeownerId: homeownerId ?? null,
          firstName: data.firstName.trim(),
          lastName: data.lastName?.trim() ?? "",
          email: data.email.trim().toLowerCase(),
          phone: data.phone.replace(/\D/g, ""),
          zipCode: data.zipCode,
          trade: "Bathroom Remodeling",
          description,
          urgency: data.timeline ?? project.timelineCategory ?? "Just planning",
          budgetRange: project.budgetMinimum && project.budgetMaximum
            ? `$${project.budgetMinimum}-$${project.budgetMaximum}`
            : "Not specified",
          preferredContact: data.preferredContact ?? null,
          tcpaConsent: data.tcpaConsent,
          source: "bathroom_rfp",
          status: "NEW",
        },
      });

      await recordProjectCompliance(tx, {
        projectRequestId: created.id,
        userId: homeownerId ?? undefined,
        email: data.email,
        phone: data.phone,
        source: "bathroom_rfp",
        communicationConsent: data.tcpaConsent,
        evidence,
      });

      // Atomic claim: only the first submission wins; concurrent retries roll back.
      const claimed = await tx.bathroomProject.updateMany({
        where: { id, projectRequestId: null },
        data: { projectRequestId: created.id, status: "RFQ_SUBMITTED" },
      });
      if (claimed.count === 0) {
        throw Object.assign(new Error("This project has already been submitted as an RFP."), { status: 409 });
      }

      return created;
    });

    await logAuditEvent({
      eventType: "BATHROOM_RFP_SUBMITTED",
      description: `Bathroom RFP ${referenceNumber} submitted from project ${project.referenceNumber}`,
      actorId: homeownerId ?? undefined,
      projectRequestId: rfp.id,
      bathroomProjectId: id,
      metadata: { briefId: latestBrief.id, estimateId: latestEstimate?.id, source: "bathroom_planner" },
    });

    const emailSent = await sendRfqConfirmationEmail({
      to: data.email,
      firstName: data.firstName,
      referenceNumber,
      trade: "Bathroom Remodeling",
      zipCode: data.zipCode,
      urgency: data.timeline ?? project.timelineCategory ?? "Just planning",
      budgetRange: project.budgetMinimum && project.budgetMaximum
        ? `$${project.budgetMinimum}-$${project.budgetMaximum}`
        : "Not specified",
      description,
      projectRequestId: rfp.id,
      hasPortalAccess: isLoggedInHomeowner,
    });

    return NextResponse.json({
      referenceNumber,
      rfpId: rfp.id,
      emailSent,
    }, { status: 201 });
  } catch (e: any) {
    if (e?.name === "ZodError") {
      return NextResponse.json({ error: e.errors?.[0]?.message ?? "Invalid input" }, { status: 400 });
    }
    console.error("bathroom-rfp POST", e);
    const status = e?.status || 500;
    return NextResponse.json({ error: e?.message || "Internal error" }, { status });
  }
}
