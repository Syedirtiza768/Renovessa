import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import type { UserRole } from "@prisma/client";
import { getSession, canManageTeam } from "@/lib/auth";
import { prisma } from "@/lib/db";

const TEAM_ROLES = ["OPS_AGENT", "SCHEDULER", "OPS_MANAGER"] as const;

function generateTempPassword(): string {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  return Array.from({ length: 12 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

const createSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  role: z.enum(TEAM_ROLES),
});

export async function GET() {
  const session = await getSession();
  if (!session || !canManageTeam(session.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const members = await prisma.user.findMany({
    where: { role: { in: [...TEAM_ROLES, "SUPER_ADMIN" as UserRole] } },
    select: { id: true, name: true, email: true, phone: true, role: true, createdAt: true },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(members);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || !canManageTeam(session.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const data = createSchema.parse(body);

    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) {
      return NextResponse.json({ error: "A user with this email already exists" }, { status: 409 });
    }

    const tempPassword = generateTempPassword();
    const user = await prisma.user.create({
      data: {
        email: data.email,
        name: data.name,
        phone: data.phone || null,
        passwordHash: await bcrypt.hash(tempPassword, 12),
        role: data.role,
      },
      select: { id: true, name: true, email: true, role: true },
    });

    return NextResponse.json({ ...user, tempPassword }, { status: 201 });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: e.errors[0].message }, { status: 400 });
    }
    console.error(e);
    return NextResponse.json({ error: "Failed to create team member" }, { status: 500 });
  }
}
