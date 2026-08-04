import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { logAuditEvent } from "@/lib/audit";
import { generateReferenceNumber } from "@/lib/utils";
import { assertBathroomProjectAccess } from "@/lib/bathroom/authorization";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  try {
    const { id } = await params;
    const project = await assertBathroomProjectAccess(session, id);

    if (project.projectRequestId) {
      return NextResponse.json({ error: "This project has already been submitted as an RFP." }, { status: 409 });
    }

    const latestBrief = await prisma.projectBrief.findFirst({
      where: { projectId: id },
      orderBy: { createdAt: "desc" },
    });
    if (!latestBrief) {
      return NextResponse.json({ error: "Generate a brief before submitting an RFP." }, { status: 409 });
    }

    const isLoggedInHomeowner = session?.role === "HOMEOWNER";
    const homeownerId = isLoggedInHomeowner ? session.id : null;

    let firstName: string;
    let lastName: string;
    let email: string;
    let phone: string;
    let zipCode: string;

    if (isLoggedInHomeowner && session.email) {
      const user = await prisma.user.findUnique({ where: { id: session.id } });
      if (!user) {
        return NextResponse.json({ error: "User not found." }, { status: 404 });
      }
      firstName = user.name?.split(" ")[0] ?? "Homeowner";
      lastName = user.name?.split(" ").slice(1).join(" ") ?? "";
      email = user.email;
      phone = user.phone ?? "";
      zipCode = "";
    } else {
      const body = await req.json().catch(() => ({}));
      firstName = body.firstName?.trim() ?? "";
      lastName = body.lastName?.trim() ?? "";
      email = body.email?.trim() ?? "";
      phone = body.phone?.replace(/\D/g, "") ?? "";
      zipCode = body.zipCode?.trim() ?? "";

      if (!firstName || !email) {
        return NextResponse.json({ error: "First name and email are required." }, { status: 400 });
      }
    }

    const referenceNumber = generateReferenceNumber();

    const description = [
      `Bathroom remodeling RFP via Renovessa Bathroom Planner — ${project.referenceNumber}`,
      ``,
      `Bathroom type: ${project.bathroomType ?? "unspecified"}`,
      `Project objective: ${project.projectObjective ?? "unspecified"}`,
      `Property: ${project.propertyType ?? "unspecified"}, ${project.ownershipStatus ?? "unspecified"}`,
      `Budget: ${project.budgetMinimum && project.budgetMaximum ? `$${project.budgetMinimum}–$${project.budgetMaximum}` : "not specified"}`,
      `Desired start: ${project.desiredStartDate ?? "flexible"}`,
      `Timeline: ${project.timelineCategory ?? "flexible"}`,
      ``,
      `Brief generated: ${latestBrief.createdAt.toISOString()}`,
      `Brief ID: ${latestBrief.id}`,
    ].filter(Boolean).join("\n");

    const rfp = await prisma.$transaction(async (tx) => {
      const created = await tx.projectRequest.create({
        data: {
          referenceNumber,
          homeownerId: homeownerId ?? null,
          firstName,
          lastName,
          email: email.toLowerCase(),
          phone,
          zipCode,
          trade: "Bathroom Remodeling",
          description,
          urgency: project.timelineCategory ?? "Just planning",
          budgetRange: project.budgetMinimum && project.budgetMaximum
            ? `$${project.budgetMinimum}-$${project.budgetMaximum}`
            : "Not specified",
          source: "bathroom_rfp",
          status: "NEW",
        },
      });

      await tx.bathroomProject.update({
        where: { id },
        data: { projectRequestId: created.id, status: "BRIEF_READY" },
      });

      return created;
    });

    await logAuditEvent({
      eventType: "BATHROOM_RFP_SUBMITTED",
      description: `Bathroom RFP ${referenceNumber} submitted from project ${project.referenceNumber}`,
      actorId: homeownerId ?? undefined,
      projectRequestId: rfp.id,
      bathroomProjectId: id,
      metadata: { briefId: latestBrief.id, source: "bathroom_planner" },
    });

    return NextResponse.json({
      referenceNumber,
      rfpId: rfp.id,
    }, { status: 201 });
  } catch (e: any) {
    console.error("bathroom-rfp POST", e);
    const status = e?.status || 500;
    return NextResponse.json({ error: e?.message || "Internal error" }, { status });
  }
}
