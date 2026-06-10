import { NextRequest, NextResponse } from "next/server";
import { getSession, canAccessAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logAuditEvent } from "@/lib/audit";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || !canAccessAdmin(session.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const {
    email, name, phone, companyName, trade, serviceZips,
    licenseVerified, insuranceVerified, yearsInBusiness,
    employeeCount, contactPerson, pilotTerms,
    firstAppointmentPricing, pilotPriceAmount, responseTimeHours,
    availabilityNotes, internalNotes,
  } = body;

  if (!email || !name || !companyName || !trade) {
    return NextResponse.json({ error: "Missing required fields: email, name, companyName, trade" }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "A user with this email already exists" }, { status: 409 });
  }

  const user = await prisma.user.create({
    data: {
      email,
      name,
      phone: phone || null,
      passwordHash: "provisioned-by-admin",
      role: "CONTRACTOR",
      contractorProfile: {
        create: {
          companyName,
          trade,
          serviceZips: serviceZips || [],
          licenseVerified: licenseVerified ?? false,
          insuranceVerified: insuranceVerified ?? false,
          yearsInBusiness: yearsInBusiness || null,
          employeeCount: employeeCount || null,
          contactPerson: contactPerson || null,
          pilotTerms: pilotTerms || null,
          firstAppointmentPricing: firstAppointmentPricing || "free",
          pilotPriceAmount: pilotPriceAmount ?? null,
          responseTimeHours: responseTimeHours || null,
          availabilityNotes: availabilityNotes || null,
          internalNotes: internalNotes || null,
        },
      },
    },
    include: { contractorProfile: true },
  });

  await logAuditEvent({
    eventType: "STATUS_CHANGED",
    description: `Contractor ${companyName} onboarded by admin`,
    actorId: session.id,
    metadata: { contractorId: user.id, companyName, trade },
  });

  return NextResponse.json(user, { status: 201 });
}
