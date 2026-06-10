import { NextRequest, NextResponse } from "next/server";
import { getSession, canAccessAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || !canAccessAdmin(session.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();

  const profile = await prisma.contractorProfile.findUnique({ where: { id } });
  if (!profile) return NextResponse.json({ error: "Contractor not found" }, { status: 404 });

  const updateData: Record<string, any> = {};
  const fields = [
    "companyName", "trade", "serviceZips", "tier", "status",
    "licenseVerified", "insuranceVerified", "yearsInBusiness",
    "employeeCount", "avgJobSize", "showRate", "acceptanceRate",
    "contactPerson", "availabilityNotes", "pilotTerms",
    "firstAppointmentPricing", "pilotPriceAmount", "responseTimeHours",
    "googleBusinessUrl", "internalNotes",
  ];
  for (const field of fields) {
    if (body[field] !== undefined) updateData[field] = body[field];
  }

  const updated = await prisma.contractorProfile.update({
    where: { id },
    data: updateData,
  });

  return NextResponse.json(updated);
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || !canAccessAdmin(session.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const profile = await prisma.contractorProfile.findUnique({
    where: { id },
    include: { user: true, capacityCells: true, appointments: { include: { projectRequest: true } } },
  });
  if (!profile) return NextResponse.json({ error: "Contractor not found" }, { status: 404 });

  return NextResponse.json(profile);
}
