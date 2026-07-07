import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { assertAdminAccess } from "@/lib/authorization";
import { prisma } from "@/lib/db";
import { issueVoiceToken, TwilioVoiceTokenError } from "@/lib/twilio";

/**
 * Returns a Twilio Voice SDK access token for the authenticated agent, plus the
 * Twilio numbers assigned to them (so the softphone can pick a caller ID).
 */
export async function GET() {
  const session = await getSession();
  try {
    await assertAdminAccess(session);

    const { token, identity } = await issueVoiceToken({ agentId: session!.id });

    const numbers = await prisma.twilioPhoneNumber.findMany({
      where: { assignedUserId: session!.id, isActive: true },
      select: { id: true, phoneNumber: true, label: true },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({
      token,
      identity,
      expiresAt: new Date(Date.now() + 55 * 60 * 1000).toISOString(),
      numbers,
    });
  } catch (e: any) {
    const status = e?.status || (e instanceof TwilioVoiceTokenError ? 503 : 500);
    return NextResponse.json({ error: e?.message || "Failed to issue voice token" }, { status });
  }
}
