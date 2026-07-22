import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { generateReferenceNumber } from "@/lib/utils";
import { logAuditEvent } from "@/lib/audit";
import { getSession } from "@/lib/auth";
import { recordProjectCompliance, requestEvidence } from "@/lib/compliance";
import { matchesPilotCell, matchesPilotTrade } from "@/lib/first-job-config";
import { LANDING_CATEGORIES } from "@/lib/landing-data";
import { sendRfqConfirmationEmail } from "@/lib/confirmationEmails";

/**
 * Legacy advisor submission endpoint.
 *
 * Despite the historical `/book` path, this endpoint now creates only a
 * reviewed RFQ. It never resets/creates accounts, impersonates consent, assigns
 * a contractor, or confirms an appointment from an unauthenticated chat.
 */
const schema = z.object({
  categoryIds: z.array(z.string()).min(1).refine(
    (ids) => ids.every((id) => LANDING_CATEGORIES.some((category) => category.id === id)),
    "Unsupported project category",
  ),
  urgency: z.string().default(""),
  budget: z.string().default(""),
  description: z.string().max(8000).default(""),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Valid email is required"),
  phone: z.string().refine((value) => value.replace(/\D/g, "").length === 10, "Valid 10-digit US phone number is required"),
  zipCode: z.string().regex(/^\d{5}$/, "ZIP code must be 5 digits"),
  preferredTime: z.string().default("any"),
  tcpaConsent: z.boolean().default(false),
  termsAccepted: z.literal(true),
  privacyAcknowledged: z.literal(true),
});

export async function POST(req: NextRequest) {
  try {
    const data = schema.parse(await req.json());
    const session = await getSession();
    const isLoggedInHomeowner = session?.role === "HOMEOWNER";

    if (isLoggedInHomeowner && data.email.trim().toLowerCase() !== session.email.toLowerCase()) {
      return NextResponse.json(
        { error: "Email must match your signed-in homeowner account" },
        { status: 400 },
      );
    }

    const tradeId = data.categoryIds[0];
    const trade = LANDING_CATEGORIES.find((item) => item.id === tradeId)?.label || tradeId;
    const source = "ai_advisor";
    const homeownerId = isLoggedInHomeowner ? session.id : undefined;
    const referenceNumber = generateReferenceNumber();
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
          trade,
          description: data.description || "Submitted from the Renovessa advisor for RFQ review.",
          urgency: data.urgency || "Just planning",
          budgetRange: data.budget || "Not specified",
          preferredContact: data.preferredTime,
          tcpaConsent: false,
          status: "NEW",
          source,
          serviceCellMatch: matchesPilotCell(data.zipCode) && matchesPilotTrade(tradeId),
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

    await logAuditEvent({
      eventType: "FORM_SUBMITTED",
      description: `Project request ${referenceNumber} submitted via AI advisor for RFQ review`,
      projectRequestId: project.id,
      actorId: homeownerId,
    });
    await logAuditEvent({
      eventType: "CONSENT_RECORDED",
      description: data.tcpaConsent
        ? "Versioned project-communication consent and legal acknowledgments recorded via AI advisor"
        : "Versioned legal acknowledgments recorded via AI advisor; no phone/SMS consent granted",
      projectRequestId: project.id,
      actorId: homeownerId,
      metadata: { communicationConsent: data.tcpaConsent, source },
    });

    const confirmationEmailSent = await sendRfqConfirmationEmail({
      to: data.email,
      firstName: data.firstName,
      referenceNumber,
      trade,
      zipCode: data.zipCode,
      urgency: data.urgency || "Just planning",
      budgetRange: data.budget || "Not specified",
      description: data.description,
      projectRequestId: project.id,
      hasPortalAccess: isLoggedInHomeowner,
    });

    return NextResponse.json({
      success: true,
      referenceNumber,
      projectId: project.id,
      email: data.email,
      appointment: null,
      contractorMatched: false,
      confirmationEmailSent,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    console.error(error);
    return NextResponse.json({ error: "Failed to submit advisor RFQ" }, { status: 500 });
  }
}
