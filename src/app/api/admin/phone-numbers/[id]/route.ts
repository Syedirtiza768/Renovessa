import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession, canManageTeam } from "@/lib/auth";
import { prisma } from "@/lib/db";

const updateSchema = z.object({
  assignedUserId: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
  label: z.string().nullable().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || !canManageTeam(session.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const data = updateSchema.parse(await req.json());

    const number = await prisma.twilioPhoneNumber.update({
      where: { id },
      data,
      include: { assignedUser: { select: { id: true, name: true, email: true } } },
    });

    return NextResponse.json(number);
  } catch (e: any) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: e.errors[0].message }, { status: 400 });
    }
    console.error(e);
    return NextResponse.json({ error: "Failed to update phone number" }, { status: 500 });
  }
}
