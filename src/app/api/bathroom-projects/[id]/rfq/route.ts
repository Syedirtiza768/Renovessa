import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { logAuditEvent } from "@/lib/audit";
import { generateReferenceNumber } from "@/lib/utils";
import { requestEvidence, recordProjectCompliance } from "@/lib/compliance";
import { sendRfqConfirmationEmail } from "@/lib/confirmationEmails";
import { rfqPromotionSchema } from "@/lib/bathroom/schemas";
import { assertBathroomProjectAccess } from "@/lib/bathroom/authorization";
import { BATHROOM_CONTRACTOR_MATCHING_ENABLED } from "@/lib/feature-flags";
import { ensureHomeownerAccount, HomeownerAccountConflictError } from "@/lib/homeowner-account";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!BATHROOM_CONTRACTOR_MATCHING_ENABLED) {
    return NextResponse.json({ error: "Contractor matching is not enabled." }, { status: 404 });
  }
  const session = await getSession();
  try {
    const { id } = await params;
    const project = await assertBathroomProjectAccess(session, id);
    const data = rfqPromotionSchema.parse(await req.json());

    if (project.projectRequestId) {
      return NextResponse.json({ error: "This bathroom project has already been submitted as an RFQ." }, { status: 409 });
    }

    const latestBrief = await prisma.projectBrief.findFirst({
      where: { projectId: id },
      orderBy: { createdAt: "desc" },
    });
    const isLoggedInHomeowner = session?.role === "HOMEOWNER";
    if (isLoggedInHomeowner && data.email.trim().toLowerCase() !== session.email.toLowerCase()) {
      return NextResponse.json({ error: "Email must match your portal account" }, { status: 400 });
    }
    const evidence = requestEvidence(req);
    const referenceNumber = generateReferenceNumber();

    // Build a description from the bathroom project context.
    const description = [
      `Bathroom remodeling RFQ via Renovessa Bathroom Planner — ${project.referenceNumber}`,
      ``,
      `Bathroom type: ${project.bathroomType ?? "unspecified"}`,
      `Project objective: ${project.projectObjective ?? "unspecified"}`,
      `Property: ${project.propertyType ?? "unspecified"}, ${project.ownershipStatus ?? "unspecified"}`,
      `Budget: ${data.notes ? "" : ""}${project.budgetMinimum && project.budgetMaximum ? `$${project.budgetMinimum}–$${project.budgetMaximum}` : "not specified"}`,
      `Desired start: ${project.desiredStartDate ?? "flexible"}`,
      `Timeline: ${project.timelineCategory ?? "flexible"}`,
      ``,
      `Homeowner requests up to ${data.maxContractors} qualified Rockville-area bathroom contractor responses.`,
      data.notes ? `Notes: ${data.notes}` : "",
    ].filter(Boolean).join("\n");

    const { rfq, portalAccess } = await prisma.$transaction(async (tx) => {
      const access = isLoggedInHomeowner && session
        ? {
            userId: session.id,
            email: session.email,
            isNewAccount: false,
          }
        : await ensureHomeownerAccount(tx, {
            email: data.email,
            name: `${data.firstName} ${data.lastName}`,
            phone: data.phone.replace(/\D/g, ""),
          });
      const created = await tx.projectRequest.create({
        data: {
          referenceNumber,
          homeownerId: access.userId,
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email.trim().toLowerCase(),
          phone: data.phone.replace(/\D/g, ""),
          zipCode: data.zipCode,
          trade: "Bathroom Remodeling",
          description,
          urgency: "Just planning",
          budgetRange: project.budgetMinimum && project.budgetMaximum
            ? `$${project.budgetMinimum}-$${project.budgetMaximum}`
            : "Not specified",
          preferredContact: data.preferredContact,
          tcpaConsent: false,
          source: "bathroom_planner",
          status: "NEW",
          serviceCellMatch: true,
        },
      });

      await recordProjectCompliance(tx, {
        projectRequestId: created.id,
        userId: access.userId,
        email: data.email,
        phone: data.phone,
        source: "bathroom_planner",
        communicationConsent: data.tcpaConsent,
        evidence,
      });

      // Link the bathroom project to the RFQ.
      await tx.bathroomProject.update({
        where: { id: id },
        data: { projectRequestId: created.id, homeownerId: access.userId, status: "RFQ_SUBMITTED" },
      });

      return { rfq: created, portalAccess: access };
    });
    const homeownerId = portalAccess.userId;

    await logAuditEvent({
      eventType: "FORM_SUBMITTED",
      description: `Bathroom RFQ ${referenceNumber} submitted from planner project ${project.referenceNumber}`,
      actorId: homeownerId ?? undefined,
      projectRequestId: rfq.id,
      bathroomProjectId: id,
      metadata: { maxContractors: data.maxContractors, source: "bathroom_planner" },
    });

    const emailSent = await sendRfqConfirmationEmail({
      to: data.email,
      firstName: data.firstName,
      referenceNumber,
      trade: "Bathroom Remodeling",
      zipCode: data.zipCode,
      projectRequestId: rfq.id,
      portalAccess,
    });

    return NextResponse.json({
      referenceNumber,
      rfqId: rfq.id,
      emailSent,
      accountCreated: portalAccess.isNewAccount,
      portalEmail: portalAccess.email,
      temporaryPassword: !emailSent ? portalAccess.temporaryPassword : undefined,
    }, { status: 201 });
  } catch (e: any) {
    if (e instanceof HomeownerAccountConflictError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    if (e?.name === "ZodError") {
      return NextResponse.json({ error: e.errors?.[0]?.message ?? "Invalid input" }, { status: 400 });
    }
    console.error("bathroom-rfq POST", e);
    const status = e?.status || 500;
    return NextResponse.json({ error: e?.message || "Internal error" }, { status });
  }
}
