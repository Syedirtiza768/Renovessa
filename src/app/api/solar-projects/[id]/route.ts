import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { logAuditEvent } from "@/lib/audit";
import { assertSolarProjectAccess } from "@/lib/solar/authorization";
import { updateSolarProjectSchema, setAddressSchema, confirmBuildingSchema } from "@/lib/solar/schemas";
import { loadActiveRoofAnalysis } from "@/lib/solar/persistence";
import { checkSolarRateLimit } from "@/lib/solar/rate-limit";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  try {
    const { id } = await params;
    const project = await assertSolarProjectAccess(session, id);
    const analysis = await loadActiveRoofAnalysis(id);
    return NextResponse.json({ project, analysis });
  } catch (e: unknown) {
    const err = e as { status?: number; message?: string };
    return NextResponse.json({ error: err.message || "Internal error" }, { status: err.status || 500 });
  }
}

/**
 * Autosave endpoint. Accepts a partial planner state, an address selection, or
 * a building confirmation — the planner PATCHes whichever changed.
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const limited = checkSolarRateLimit(req, "project");
  if (limited) return limited;

  const session = await getSession();
  try {
    const { id } = await params;
    await assertSolarProjectAccess(session, id);
    const body = (await req.json()) as Record<string, unknown>;

    const data: Record<string, unknown> = {};

    // Planner state.
    const state = updateSolarProjectSchema.partial().parse(body);
    for (const key of [
      "plannerMode",
      "currentStep",
      "propertyType",
      "ownershipStatus",
      "occupancyStatus",
      "projectGoal",
      "timelineCategory",
    ] as const) {
      if (state[key] !== undefined) data[key] = state[key];
    }
    if (state.answers !== undefined) data.answersJson = state.answers;

    // Address selection.
    if (body.address) {
      const addr = setAddressSchema.parse(body.address);
      Object.assign(data, {
        formattedAddress: addr.formattedAddress,
        streetLine: addr.streetLine ?? null,
        city: addr.city ?? null,
        state: addr.state ?? null,
        postalCode: addr.postalCode ?? null,
        county: addr.county ?? null,
        latitude: addr.location.latitude,
        longitude: addr.location.longitude,
        geocodeQuality: addr.geocodeQuality ?? null,
        // A new address invalidates any prior building confirmation.
        buildingConfirmed: false,
        buildingConfirmedAt: null,
      });
      await logAuditEvent({
        eventType: "SOLAR_ADDRESS_RESOLVED",
        description: `Solar project address set (${addr.city ?? "unknown city"}, ${addr.state ?? "??"})`,
        actorId: session?.id,
        solarProjectId: id,
        // Deliberately no street address in analytics metadata (§59, §51).
        metadata: { quality: addr.geocodeQuality ?? "UNKNOWN", postalCode: addr.postalCode ?? null },
      });
    }

    // Building confirmation — the gate that stops a wrong roof being analysed.
    if (body.buildingConfirmation) {
      const conf = confirmBuildingSchema.parse(body.buildingConfirmation);
      data.buildingConfirmed = conf.confirmed;
      data.buildingConfirmedAt = conf.confirmed ? new Date() : null;
      await logAuditEvent({
        eventType: conf.confirmed ? "SOLAR_BUILDING_CONFIRMED" : "SOLAR_BUILDING_REJECTED",
        description: conf.confirmed
          ? "Homeowner confirmed the analysed building"
          : "Homeowner rejected the analysed building",
        actorId: session?.id,
        solarProjectId: id,
        metadata: { propertyChangedSinceImagery: conf.propertyChangedSinceImagery ?? false },
      });
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
    }

    const project = await prisma.solarProject.update({ where: { id }, data });
    return NextResponse.json({ project });
  } catch (e: unknown) {
    const err = e as { name?: string; status?: number; message?: string; errors?: Array<{ message: string }> };
    if (err.name === "ZodError") {
      return NextResponse.json({ error: err.errors?.[0]?.message ?? "Invalid input" }, { status: 400 });
    }
    console.error("solar-project PATCH", e);
    return NextResponse.json({ error: err.message || "Internal error" }, { status: err.status || 500 });
  }
}
