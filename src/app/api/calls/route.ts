import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { assertAdminAccess } from "@/lib/authorization";
import { prisma } from "@/lib/db";
import { placeCall, TwilioCallError } from "@/lib/twilio";

/** Returns the Twilio numbers assigned to the current agent, for the caller-ID picker. */
export async function GET() {
  const session = await getSession();
  try {
    await assertAdminAccess(session);

    const numbers = await prisma.twilioPhoneNumber.findMany({
      where: { assignedUserId: session!.id, isActive: true },
      select: { id: true, phoneNumber: true, label: true },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json(numbers);
  } catch (e: any) {
    const status = e?.status || 500;
    return NextResponse.json({ error: e?.message || "Failed to load numbers" }, { status });
  }
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  try {
    await assertAdminAccess(session);

    const { toNumber, projectRequestId, contractorId, twilioPhoneNumberId } = await req.json();
    if (!toNumber) {
      return NextResponse.json({ error: "toNumber is required" }, { status: 400 });
    }

    const callLog = await placeCall({
      agentId: session!.id,
      toNumber,
      projectRequestId,
      contractorId,
      twilioPhoneNumberId,
    });

    return NextResponse.json(callLog, { status: 201 });
  } catch (e: any) {
    const status = e?.status || (e instanceof TwilioCallError ? 400 : 500);
    return NextResponse.json({ error: e?.message || "Failed to place call" }, { status });
  }
}
