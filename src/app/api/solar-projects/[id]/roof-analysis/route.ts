import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { logAuditEvent } from "@/lib/audit";
import { assertSolarProjectAccess } from "@/lib/solar/authorization";
import { roofAnalysisRequestSchema } from "@/lib/solar/schemas";
import { getGeospatialProvider } from "@/lib/solar/providers";
import { buildManualRoofAnalysis } from "@/lib/solar/manual-roof";
import { saveRoofAnalysis, loadActiveRoofAnalysis } from "@/lib/solar/persistence";
import { checkSolarRateLimit } from "@/lib/solar/rate-limit";
import { checkRoofAnalysisBudget, budgetExceededFailure } from "@/lib/solar/provider-budget";
import { solarPlannerUsable } from "@/lib/feature-flags";
import type { RoofAnalysis } from "@/lib/solar/types";

/**
 * Run a roof analysis and persist it.
 *
 * Two modes:
 *   provider — ask the geospatial provider for the closest building.
 *   manual   — build the analysis from homeowner-described roof faces.
 *
 * A provider miss is NOT an error response: it returns 200 with a typed
 * failure and a `recovery` instruction, so the planner can offer the manual
 * path instead of showing a dead end (§37, §57).
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!solarPlannerUsable()) {
    return NextResponse.json({ error: "The solar planner is not enabled." }, { status: 404 });
  }
  const limited = checkSolarRateLimit(req, "roofAnalysis");
  if (limited) return limited;

  const session = await getSession();
  try {
    const { id } = await params;
    await assertSolarProjectAccess(session, id);
    const body = roofAnalysisRequestSchema.parse(await req.json());

    if (body.mode === "manual") {
      const analysis = buildManualRoofAnalysis({
        location: body.location,
        faces: body.faces,
        panelCapacityWatts: body.panelCapacityWatts,
      });
      await saveRoofAnalysis(id, analysis, null);
      await prisma.solarProject.update({ where: { id }, data: { status: "ANALYSIS_READY" } });
      await logAuditEvent({
        eventType: "SOLAR_MANUAL_ROOF_ENTERED",
        description: `Manual roof entered: ${body.faces.length} face(s)`,
        actorId: session?.id,
        solarProjectId: id,
        metadata: { faceCount: body.faces.length },
      });
      return NextResponse.json({ analysis, failure: null });
    }

    // --- Provider mode ---
    // Aggregate daily spend guard, checked before the provider is touched.
    // The per-IP limiter bounds one caller; this bounds the bill.
    const budget = await checkRoofAnalysisBudget();
    if (!budget.allowed) {
      await logAuditEvent({
        eventType: "SOLAR_PROVIDER_FAILURE",
        description: `Daily roof-analysis budget exhausted (${budget.used}/${budget.cap})`,
        actorId: session?.id,
        solarProjectId: id,
        metadata: { used: budget.used, cap: budget.cap },
      });
      return NextResponse.json(
        { analysis: null, failure: budgetExceededFailure() },
        { headers: { "Retry-After": String(budget.resetsInSeconds) } },
      );
    }

    const provider = getGeospatialProvider();
    if (!provider) {
      await logSolarProviderFailure(id, session?.id, "google-solar", "DISABLED");
      return NextResponse.json({
        analysis: null,
        failure: {
          reason: "NOT_CONFIGURED",
          message:
            "Automatic roof analysis isn't available right now. You can describe your roof and we'll still model production.",
          recovery: "MANUAL_ROOF",
          retryable: false,
        },
      });
    }

    const result = await provider.findBuilding(body.location);

    if (!result.ok) {
      await logSolarProviderFailure(id, session?.id, provider.availability.id, result.reason);
      return NextResponse.json({
        analysis: null,
        failure: {
          reason: result.reason,
          message: result.message,
          recovery: result.recovery,
          retryable: result.retryable,
        },
      });
    }

    const analysis: RoofAnalysis = result.analysis;

    // Zero suitable positions is a real, honest answer — not a failure to hide.
    if (analysis.maxPanelCount === 0) {
      await saveRoofAnalysis(id, analysis, null);
      await logAuditEvent({
        eventType: "SOLAR_ROOF_ANALYSIS_COMPLETED",
        description: "Roof analysis completed with zero suitable panel positions",
        actorId: session?.id,
        solarProjectId: id,
        metadata: { maxPanelCount: 0, imageryQuality: analysis.imageryQuality },
      });
      return NextResponse.json({
        analysis,
        failure: {
          reason: "NO_SUITABLE_AREA",
          message:
            "We couldn't find roof area in this dataset that's suitable for panels. This can happen with heavy shade, a very small roof, or an unusual roof shape. You can describe your roof yourself, or send the project to installers to assess on site.",
          recovery: "MANUAL_ROOF",
          retryable: false,
        },
      });
    }

    await saveRoofAnalysis(id, analysis, null);
    await prisma.solarProject.update({ where: { id }, data: { status: "ANALYSIS_READY" } });

    await logAuditEvent({
      eventType: "SOLAR_ROOF_ANALYSIS_COMPLETED",
      description: `Roof analysis completed: ${analysis.segments.length} segments, ${analysis.maxPanelCount} candidate positions`,
      actorId: session?.id,
      solarProjectId: id,
      metadata: {
        provider: analysis.providerId,
        segmentCount: analysis.segments.length,
        maxPanelCount: analysis.maxPanelCount,
        imageryQuality: analysis.imageryQuality,
        imageryDate: analysis.imageryDate ?? null,
      },
    });

    return NextResponse.json({ analysis, failure: null });
  } catch (e: unknown) {
    const err = e as { name?: string; status?: number; message?: string; errors?: Array<{ message: string }> };
    if (err.name === "ZodError") {
      return NextResponse.json({ error: err.errors?.[0]?.message ?? "Invalid input" }, { status: 400 });
    }
    console.error("solar roof-analysis POST", e);
    return NextResponse.json({ error: err.message || "Internal error" }, { status: err.status || 500 });
  }
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  try {
    const { id } = await params;
    await assertSolarProjectAccess(session, id);
    const analysis = await loadActiveRoofAnalysis(id);
    return NextResponse.json({ analysis });
  } catch (e: unknown) {
    const err = e as { status?: number; message?: string };
    return NextResponse.json({ error: err.message || "Internal error" }, { status: err.status || 500 });
  }
}

async function logSolarProviderFailure(
  projectId: string,
  actorId: string | undefined,
  providerId: string,
  reason: string,
) {
  await logAuditEvent({
    eventType: "SOLAR_ROOF_ANALYSIS_FAILED",
    description: `Roof analysis unavailable (${providerId}): ${reason}`,
    actorId,
    solarProjectId: projectId,
    metadata: { providerId, reason },
  });
}
