import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { generateReferenceNumber } from "@/lib/utils";
import { logAuditEvent } from "@/lib/audit";
import { getSession, canAccessAdmin } from "@/lib/auth";
import { matchesPilotCell, matchesPilotTrade } from "@/lib/first-job-config";

const schema = z.object({
  trade: z.string().min(1),
  description: z.string().max(600).optional().default(""),
  urgency: z.string(),
  budgetRange: z.string(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  phone: z.string().min(10),
  email: z.string().email(),
  zipCode: z.string().length(5),
  preferredContact: z.string().optional(),
  tcpaConsent: z.literal(true),
  address: z.string().optional(),
  ownershipAuthority: z.string().optional(),
  preferredAppointmentWindows: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = schema.parse(body);

    const referenceNumber = generateReferenceNumber();
    const serviceCellMatch = matchesPilotCell(data.zipCode) && matchesPilotTrade(data.trade);

    const project = await prisma.projectRequest.create({
      data: {
        referenceNumber,
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: data.phone,
        zipCode: data.zipCode,
        trade: data.trade,
        description: data.description,
        urgency: data.urgency,
        budgetRange: data.budgetRange,
        preferredContact: data.preferredContact,
        tcpaConsent: data.tcpaConsent,
        address: data.address,
        ownershipAuthority: data.ownershipAuthority,
        preferredAppointmentWindows: data.preferredAppointmentWindows,
        status: "NEW",
        source: "organic",
        serviceCellMatch,
      },
    });

    await logAuditEvent({
      eventType: "FORM_SUBMITTED",
      description: `Project request ${referenceNumber} submitted via landing page`,
      projectRequestId: project.id,
    });

    await logAuditEvent({
      eventType: "CONSENT_RECORDED",
      description: "TCPA/SMS consent recorded",
      projectRequestId: project.id,
    });

    await logAuditEvent({
      eventType: "SMS_SENT",
      description: `Confirmation SMS queued for ${data.phone}`,
      projectRequestId: project.id,
      metadata: { template: "project_received" },
    });

    return NextResponse.json({ referenceNumber, id: project.id });
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
