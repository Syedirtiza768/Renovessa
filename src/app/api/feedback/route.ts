import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { appointmentId, actorType, responses } = await req.json();

  if (!appointmentId || !actorType || !responses) {
    return NextResponse.json({ error: "appointmentId, actorType, and responses are required" }, { status: 400 });
  }

  const feedback = await prisma.feedback.create({
    data: { appointmentId, actorType, responses },
  });

  return NextResponse.json(feedback, { status: 201 });
}
