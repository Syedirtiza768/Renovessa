import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { assertAdminAccess } from "@/lib/authorization";
import { sendEmail, SendGridError } from "@/lib/sendgrid";

export async function POST(req: NextRequest) {
  const session = await getSession();
  try {
    await assertAdminAccess(session);

    const { to, subject, message, projectRequestId, contractorId } = await req.json();
    if (!to || !subject || !message) {
      return NextResponse.json({ error: "to, subject, and message are required" }, { status: 400 });
    }

    const emailMessage = await sendEmail({
      agentId: session!.id,
      to,
      subject,
      message,
      projectRequestId,
      contractorId,
    });

    return NextResponse.json(emailMessage, { status: 201 });
  } catch (e: any) {
    const status = e?.status || (e instanceof SendGridError ? 400 : 500);
    return NextResponse.json({ error: e?.message || "Failed to send email" }, { status });
  }
}
