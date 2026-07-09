import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { assertAdminAccess } from "@/lib/authorization";
import { prisma } from "@/lib/db";

export interface CommunicationItem {
  id: string;
  type: "call" | "email";
  at: string;
  direction: string;
  // call fields
  toNumber?: string;
  fromNumber?: string;
  status?: string;
  durationSeconds?: number | null;
  disposition?: string | null;
  dispositionNote?: string | null;
  // email fields
  subject?: string;
  body?: string;
  toEmail?: string;
  agentName?: string | null;
}

/**
 * Merged communication history (calls + emails) for a single contact, keyed by
 * projectRequestId or contractorId. Powers the per-contact timeline in the
 * unified ContactCommunications panel so agents see who they've reached and how.
 */
export async function GET(req: NextRequest) {
  const session = await getSession();
  try {
    await assertAdminAccess(session);

    const projectRequestId = req.nextUrl.searchParams.get("projectRequestId") || undefined;
    const contractorId = req.nextUrl.searchParams.get("contractorId") || undefined;
    if (!projectRequestId && !contractorId) {
      return NextResponse.json({ error: "projectRequestId or contractorId is required" }, { status: 400 });
    }

    const where = { projectRequestId, contractorId };

    const [calls, emails] = await Promise.all([
      prisma.callLog.findMany({
        where,
        orderBy: { startedAt: "desc" },
        take: 50,
        select: {
          id: true,
          direction: true,
          toNumber: true,
          fromNumber: true,
          status: true,
          durationSeconds: true,
          disposition: true,
          dispositionNote: true,
          startedAt: true,
          agent: { select: { name: true } },
        },
      }),
      prisma.emailMessage.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: 50,
        select: {
          id: true,
          subject: true,
          body: true,
          toEmail: true,
          status: true,
          createdAt: true,
          agent: { select: { name: true } },
        },
      }),
    ]);

    const items: CommunicationItem[] = [
      ...calls.map((c) => ({
        id: c.id,
        type: "call" as const,
        at: c.startedAt.toISOString(),
        direction: c.direction,
        toNumber: c.toNumber,
        fromNumber: c.fromNumber,
        status: c.status,
        durationSeconds: c.durationSeconds,
        disposition: c.disposition,
        dispositionNote: c.dispositionNote,
        agentName: c.agent?.name ?? null,
      })),
      ...emails.map((e) => ({
        id: e.id,
        type: "email" as const,
        at: e.createdAt.toISOString(),
        direction: "outbound",
        subject: e.subject,
        body: e.body,
        toEmail: e.toEmail,
        status: e.status,
        agentName: e.agent?.name ?? null,
      })),
    ].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

    return NextResponse.json(items);
  } catch (e: any) {
    const status = e?.status || 500;
    return NextResponse.json({ error: e?.message || "Failed to load communications" }, { status });
  }
}
