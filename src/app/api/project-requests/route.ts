import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { generateReferenceNumber } from "@/lib/utils";
import { logAuditEvent } from "@/lib/audit";
import { getSession, canAccessAdmin } from "@/lib/auth";
import { matchesPilotCell, matchesPilotTrade } from "@/lib/first-job-config";
import { sendRfqConfirmationEmail } from "@/lib/confirmationEmails";
import { recordProjectCompliance, requestEvidence } from "@/lib/compliance";

const schema = z.object({
  trade: z.string().min(1),
  description: z.string().max(8000).optional().default(""),
  urgency: z.string(),
  budgetRange: z.string(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  phone: z.string().refine((value) => value.replace(/\D/g, "").length === 10, "Valid 10-digit US phone number is required"),
  email: z.string().email(),
  zipCode: z.string().regex(/^\d{5}$/, "ZIP code must be 5 digits"),
  preferredContact: z.string().optional(),
  tcpaConsent: z.boolean().default(false),
  termsAccepted: z.literal(true),
  privacyAcknowledged: z.literal(true),
  address: z.string().optional(),
  ownershipAuthority: z.string().optional(),
  preferredAppointmentWindows: z.string().optional(),
  source: z.enum(["organic", "homeowner_portal", "estimate_wizard", "ai_advisor"]).optional(),
  qualificationNotes: z.string().max(12000).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = schema.parse(body);
    const session = await getSession();

    const referenceNumber = generateReferenceNumber();
    const serviceCellMatch = matchesPilotCell(data.zipCode) && matchesPilotTrade(data.trade);
    const isLoggedInHomeowner = session?.role === "HOMEOWNER";

    if (isLoggedInHomeowner && data.email.trim().toLowerCase() !== session.email.toLowerCase()) {
      return NextResponse.json(
        { error: "Email must match your portal account" },
        { status: 400 }
      );
    }

    // Public submissions never create, link, or reset an account based only on
    // an email address. Only an already-authenticated homeowner owns the RFQ.
    const homeownerId = isLoggedInHomeowner ? session.id : undefined;

    const source = isLoggedInHomeowner
      ? "homeowner_portal"
      : data.source === "estimate_wizard"
        ? "estimate_wizard"
        : data.source === "ai_advisor"
          ? "ai_advisor"
          : "organic";

    const evidence = requestEvidence(req);
    const project = await prisma.$transaction(async (tx) => {
      const created = await tx.projectRequest.create({
        data: {
          referenceNumber,
          homeownerId: homeownerId ?? null,
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email.trim().toLowerCase(),
          phone: data.phone.replace(/\D/g, ""),
          zipCode: data.zipCode,
          trade: data.trade,
          description: data.description,
          urgency: data.urgency,
          budgetRange: data.budgetRange,
          preferredContact: data.preferredContact,
          tcpaConsent: false,
          address: data.address,
          ownershipAuthority: data.ownershipAuthority,
          preferredAppointmentWindows: data.preferredAppointmentWindows,
          qualificationNotes: data.qualificationNotes,
          status: "NEW",
          source,
          serviceCellMatch,
        },
      });
      await recordProjectCompliance(tx, {
        projectRequestId: created.id,
        userId: homeownerId,
        email: data.email,
        phone: data.phone,
        source,
        communicationConsent: data.tcpaConsent,
        evidence,
      });
      return created;
    });

    const sourceLabel =
      source === "estimate_wizard"
        ? "estimate wizard RFQ"
        : source === "homeowner_portal"
          ? "homeowner portal"
          : source === "ai_advisor"
            ? "AI advisor"
            : "landing page";

    await logAuditEvent({
      eventType: "FORM_SUBMITTED",
      description: `Project request ${referenceNumber} submitted via ${sourceLabel}`,
      projectRequestId: project.id,
      actorId: isLoggedInHomeowner ? session.id : undefined,
    });

    await logAuditEvent({
      eventType: "CONSENT_RECORDED",
      description: data.tcpaConsent
        ? "Versioned project-communication consent and legal acknowledgments recorded"
        : "Versioned legal acknowledgments recorded; no phone/SMS consent granted",
      projectRequestId: project.id,
      actorId: homeownerId,
      metadata: { communicationConsent: data.tcpaConsent, source },
    });

    const emailSent = await sendRfqConfirmationEmail({
      to: data.email,
      firstName: data.firstName,
      referenceNumber,
      trade: data.trade,
      zipCode: data.zipCode,
      urgency: data.urgency,
      budgetRange: data.budgetRange,
      description: data.description,
      projectRequestId: project.id,
      hasPortalAccess: isLoggedInHomeowner,
    });

    return NextResponse.json({
      referenceNumber,
      id: project.id,
      email: data.email,
      confirmationEmailSent: emailSent,
    });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: e.errors[0].message }, { status: 400 });
    }
    console.error(e);
    return NextResponse.json({ error: "Failed to submit project request" }, { status: 500 });
  }
}

export async function GET() {
  const session = await getSession();
  if (!session || !canAccessAdmin(session.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const leads = await prisma.projectRequest.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { appointment: true, homeowner: true, assignedAgent: true },
  });
  return NextResponse.json(leads);
}
