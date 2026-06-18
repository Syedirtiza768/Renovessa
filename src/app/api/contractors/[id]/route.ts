import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getSession, canAccessAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";

function generateTempPassword(): string {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  return Array.from({ length: 12 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

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

// Admin resets a contractor's portal password.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || !canAccessAdmin(session.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  if (body.action !== "reset-password") {
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }

  const profile = await prisma.contractorProfile.findUnique({
    where: { id },
    include: { user: true },
  });
  if (!profile) return NextResponse.json({ error: "Contractor not found" }, { status: 404 });

  const tempPassword = generateTempPassword();
  await prisma.user.update({
    where: { id: profile.userId },
    data: { passwordHash: await bcrypt.hash(tempPassword, 12) },
  });

  return NextResponse.json({ email: profile.user.email, tempPassword });
}
