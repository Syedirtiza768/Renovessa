import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getSession, canAccessAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";

function generateTempPassword(): string {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  return Array.from({ length: 12 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || !canAccessAdmin(session.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { userId } = await req.json();
  if (!userId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const tempPassword = generateTempPassword();
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: await bcrypt.hash(tempPassword, 12) },
  });

  return NextResponse.json({ email: user.email, tempPassword });
}
