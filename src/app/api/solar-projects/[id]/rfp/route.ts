import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { logAuditEvent } from "@/lib/audit";
import { generateReferenceNumber } from "@/lib/utils";
import { requestEvidence, recordProjectCompliance } from "@/lib/compliance";
import { sendRfqConfirmationEmail } from "@/lib/confirmationEmails";
import { solarRfpSubmissionSchema } from "@/lib/solar/schemas";
import { assertSolarProjectAccess } from "@/lib/solar/authorization";
import { ensureHomeownerAccount, HomeownerAccountConflictError } from "@/lib/homeowner-account";
import { buildAnswerMapEstimatorSnapshot } from "@/lib/estimator-submission";

/**
 * Promote a solar plan into the shared RFQ pipeline.
 *
 * Deliberately mirrors the bathroom RFP route so solar leads flow through the
 * same lead routing, consent evidence, dispatch and billing machinery. A brief
 * is required first: contractors receive the structured project, not a name
 * and a phone number.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  try {
    const { id } = await params;
    const project = await assertSolarProjectAccess(session, id);

    if (project.projectRequestId) {
      return NextResponse.json({ error: "This project has already been submitted." }, { status: 409 });
    }

    const latestBrief = await prisma.solarProjectBrief.findFirst({
      where: { projectId: id },
      orderBy: { version: "desc" },
    });
    if (!latestBrief) {
      return NextResponse.json(
        { error: "Generate your project brief before requesting installer proposals." },
        { status: 409 },
      );
    }

    const data = solarRfpSubmissionSchema.parse(await req.json());

    const isLoggedInHomeowner = session?.role === "HOMEOWNER";
    if (isLoggedInHomeowner && session.email && data.email.trim().toLowerCase() !== session.email.toLowerCase()) {
      return NextResponse.json({ error: "Email must match your portal account" }, { status: 400 });
    }
    const [layout, production, cost] = await Promise.all([
      prisma.solarPanelLayout.findFirst({ where: { projectId: id, isActive: true }, orderBy: { createdAt: "desc" } }),
      prisma.solarProductionEstimate.findFirst({ where: { projectId: id }, orderBy: { createdAt: "desc" } }),
      prisma.solarCostEstimate.findFirst({ where: { projectId: id }, orderBy: { createdAt: "desc" } }),
    ]);

    const planningRange =
      cost?.displayable && cost
        ? `$${cost.installedCostLow.toLocaleString()}–$${cost.installedCostHigh.toLocaleString()}`
        : "withheld (no reviewed local pricing model published)";

    const savedAnswers = project.answersJson && typeof project.answersJson === "object"
      ? project.answersJson as Record<string, unknown>
      : {};
    const estimatorSnapshot = buildAnswerMapEstimatorSnapshot({
      estimatorId: "solar",
      estimatorLabel: "Solar",
      source: "solar",
      answers: {
        ...savedAnswers,
        propertyType: project.propertyType,
        ownershipStatus: project.ownershipStatus,
        occupancyStatus: project.occupancyStatus,
        projectGoal: project.projectGoal,
        timelineCategory: project.timelineCategory,
        city: project.city,
        state: project.state,
        postalCode: project.postalCode,
        buildingConfirmed: project.buildingConfirmed,
      },
      notes: data.notes,
      contact: {
        firstName: data.firstName.trim(),
        lastName: data.lastName?.trim() || null,
        email: data.email.trim().toLowerCase(),
        phone: data.phone.replace(/\D/g, ""),
        zipCode: data.zipCode,
        timeline: data.timeline ?? project.timelineCategory ?? null,
        preferredContact: data.preferredContact ?? "any",
        maxContractors: data.maxContractors,
        notes: data.notes ?? null,
        tcpaConsent: data.tcpaConsent,
        termsAccepted: data.termsAccepted,
        privacyAcknowledged: data.privacyAcknowledged,
      },
      estimate: cost ? {
        installedCostLow: cost.installedCostLow,
        installedCostHigh: cost.installedCostHigh,
        netCostLow: cost.netCostLow,
        netCostHigh: cost.netCostHigh,
        displayable: cost.displayable,
        withheldReason: cost.withheldReason,
        confidence: cost.confidenceLevel,
        assumptions: cost.assumptionsJson,
        exclusions: cost.exclusionsJson,
        costDrivers: cost.costDriversJson,
      } : null,
    });

    const description = [
      `Residential solar RFP via Renovessa Solar Planner — ${project.referenceNumber}`,
      ``,
      `Proposed system: ${layout ? `${layout.dcSystemSizeKw.toFixed(1)} kW DC, ${layout.panelCount} panels` : "not configured"}`,
      `Estimated first-year production: ${production?.annualAcKwh ? `${Math.round(production.annualAcKwh).toLocaleString()} kWh` : "not modelled"}`,
      `Production model agreement: ${production?.agreement ?? "n/a"}`,
      `Roof data: ${project.buildingConfirmed ? "building confirmed by homeowner" : "building not confirmed"}`,
      `Property: ${project.propertyType ?? "unspecified"}, ${project.ownershipStatus ?? "unspecified"}`,
      `Goal: ${project.projectGoal ?? "unspecified"}`,
      `Timeline: ${data.timeline ?? project.timelineCategory ?? "flexible"}`,
      `Planning range: ${planningRange}`,
      ``,
      `Maximum installers requested: ${data.maxContractors}`,
      data.preferredContactTimes ? `Preferred contact times: ${data.preferredContactTimes}` : "",
      ``,
      `Structured Solar Project Brief v${latestBrief.version} attached (id ${latestBrief.id}).`,
      `The brief includes roof segment geometry, panel layout, consumption basis, assumptions, and the on-site verification checklist.`,
      data.notes ? `\nHomeowner notes: ${data.notes}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    const evidence = requestEvidence(req);
    const referenceNumber = generateReferenceNumber();

    const { rfp, portalAccess } = await prisma.$transaction(async (tx) => {
      const access = isLoggedInHomeowner && session
        ? {
            userId: session.id,
            email: session.email,
            isNewAccount: false,
          }
        : await ensureHomeownerAccount(tx, {
            email: data.email,
            name: `${data.firstName} ${data.lastName ?? ""}`,
            phone: data.phone.replace(/\D/g, ""),
          });
      const created = await tx.projectRequest.create({
        data: {
          referenceNumber,
          homeownerId: access.userId,
          firstName: data.firstName.trim(),
          lastName: data.lastName?.trim() ?? "",
          email: data.email.trim().toLowerCase(),
          phone: data.phone.replace(/\D/g, ""),
          zipCode: data.zipCode,
          trade: "Solar Installation",
          description,
          urgency: data.timeline ?? project.timelineCategory ?? "Just planning",
          budgetRange:
            cost?.displayable && cost
              ? `$${cost.installedCostLow}-$${cost.installedCostHigh}`
              : "Not specified",
          preferredContact: data.preferredContact ?? null,
          tcpaConsent: data.tcpaConsent,
          termsAccepted: data.termsAccepted,
          privacyAcknowledged: data.privacyAcknowledged,
          source: "solar_rfp",
          status: "NEW",
          estimatorSnapshotJson: estimatorSnapshot as any,
        },
      });

      await recordProjectCompliance(tx, {
        projectRequestId: created.id,
        userId: access.userId,
        email: data.email,
        phone: data.phone,
        source: "solar_rfp",
        communicationConsent: data.tcpaConsent,
        evidence,
      });

      // Atomic claim: only the first submission wins, so a double-click or a
      // retry after a network blip cannot create two leads.
      const claimed = await tx.solarProject.updateMany({
        where: { id, projectRequestId: null },
        data: { projectRequestId: created.id, homeownerId: access.userId, status: "RFQ_SUBMITTED" },
      });
      if (claimed.count === 0) {
        throw Object.assign(new Error("This project has already been submitted."), { status: 409 });
      }

      return { rfp: created, portalAccess: access };
    });
    const homeownerId = portalAccess.userId;

    await logAuditEvent({
      eventType: "SOLAR_RFP_SUBMITTED",
      description: `Solar RFP ${referenceNumber} submitted from project ${project.referenceNumber}`,
      actorId: homeownerId ?? undefined,
      projectRequestId: rfp.id,
      solarProjectId: id,
      metadata: {
        briefId: latestBrief.id,
        briefVersion: latestBrief.version,
        layoutId: layout?.id,
        costEstimateId: cost?.id,
        maxContractors: data.maxContractors,
        source: "solar_planner",
      },
    });

    const emailSent = await sendRfqConfirmationEmail({
      to: data.email,
      firstName: data.firstName,
      referenceNumber,
      trade: "Solar Installation",
      zipCode: data.zipCode,
      projectRequestId: rfp.id,
      portalAccess,
    });

    return NextResponse.json({ referenceNumber, rfpId: rfp.id, emailSent }, { status: 201 });
  } catch (e: unknown) {
    const err = e as { name?: string; status?: number; message?: string; errors?: Array<{ message: string }> };
    if (e instanceof HomeownerAccountConflictError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    if (err.name === "ZodError") {
      return NextResponse.json({ error: err.errors?.[0]?.message ?? "Invalid input" }, { status: 400 });
    }
    console.error("solar rfp POST", e);
    return NextResponse.json({ error: err.message || "Internal error" }, { status: err.status || 500 });
  }
}
