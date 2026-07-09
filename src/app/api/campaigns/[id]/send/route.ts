import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { assertAdminAccess } from "@/lib/authorization";
import { sendCampaign } from "@/lib/bulkEmail";
import { SendGridError } from "@/lib/sendgrid";

/**
 * Sends a draft campaign now. Runs synchronously — fine for pilot list sizes;
 * for large lists this should move to a background worker (see phase 2).
 */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  try {
    await assertAdminAccess(session);
    const { id } = await params;
    const result = await sendCampaign(id);
    return NextResponse.json(result);
  } catch (e: any) {
    const status = e?.status || (e instanceof SendGridError ? 400 : 500);
    return NextResponse.json({ error: e?.message || "Failed to send campaign" }, { status });
  }
}
