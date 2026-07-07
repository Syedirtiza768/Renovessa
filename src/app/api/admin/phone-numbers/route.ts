import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession, canManageTeam } from "@/lib/auth";
import { prisma } from "@/lib/db";

const createSchema = z.object({
  phoneNumber: z.string().regex(/^\+[1-9]\d{1,14}$/, "Phone number must be in E.164 format, e.g. +15551234567"),
  label: z.string().optional(),
  assignedUserId: z.string().optional(),
});

export async function GET() {
  const session = await getSession();
  if (!session || !canManageTeam(session.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const numbers = await prisma.twilioPhoneNumber.findMany({
    include: { assignedUser: { select: { id: true, name: true, email: true } } },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(numbers);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || !canManageTeam(session.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const data = createSchema.parse(await req.json());

    const existing = await prisma.twilioPhoneNumber.findUnique({ where: { phoneNumber: data.phoneNumber } });
    if (existing) {
      return NextResponse.json({ error: "This number is already registered" }, { status: 409 });
    }

    const number = await prisma.twilioPhoneNumber.create({
      data: {
        phoneNumber: data.phoneNumber,
        label: data.label || null,
        assignedUserId: data.assignedUserId || null,
      },
      include: { assignedUser: { select: { id: true, name: true, email: true } } },
    });

    return NextResponse.json(number, { status: 201 });
  } catch (e: any) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: e.errors[0].message }, { status: 400 });
    }
    console.error(e);
    return NextResponse.json({ error: "Failed to add phone number" }, { status: 500 });
  }
}
