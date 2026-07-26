import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { bathroomContractorStudioEnabled } from "@/lib/feature-flags";
import { requireContractorProfile } from "@/lib/bathroom/authorization";
import { contractorLetterheadSchema } from "@/lib/bathroom/schemas";

export const runtime = "nodejs";

export async function GET() {
  if (!bathroomContractorStudioEnabled()) {
    return NextResponse.json({ error: "Not enabled" }, { status: 404 });
  }
  const session = await getSession();
  try {
    const profile = await requireContractorProfile(session);
    return NextResponse.json({
      companyName: profile.companyName,
      contactPerson: profile.contactPerson,
      letterheadPhone: profile.letterheadPhone,
      letterheadEmail: profile.letterheadEmail,
      letterheadAddress: profile.letterheadAddress,
      letterheadTagline: profile.letterheadTagline,
      letterheadLicenseText: profile.letterheadLicenseText,
      proposalFooterText: profile.proposalFooterText,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Failed" }, { status: e?.status || 500 });
  }
}

export async function PATCH(req: NextRequest) {
  if (!bathroomContractorStudioEnabled()) {
    return NextResponse.json({ error: "Not enabled" }, { status: 404 });
  }
  const session = await getSession();
  try {
    const profile = await requireContractorProfile(session);
    const body = contractorLetterheadSchema.parse(await req.json());
    const updated = await prisma.contractorProfile.update({
      where: { id: profile.id },
      data: {
        contactPerson: body.contactPerson === undefined ? undefined : body.contactPerson,
        letterheadPhone: body.letterheadPhone === undefined ? undefined : body.letterheadPhone,
        letterheadEmail:
          body.letterheadEmail === undefined
            ? undefined
            : body.letterheadEmail === ""
              ? null
              : body.letterheadEmail,
        letterheadAddress: body.letterheadAddress === undefined ? undefined : body.letterheadAddress,
        letterheadTagline: body.letterheadTagline === undefined ? undefined : body.letterheadTagline,
        letterheadLicenseText:
          body.letterheadLicenseText === undefined ? undefined : body.letterheadLicenseText,
        proposalFooterText:
          body.proposalFooterText === undefined ? undefined : body.proposalFooterText,
      },
    });
    return NextResponse.json({
      companyName: updated.companyName,
      contactPerson: updated.contactPerson,
      letterheadPhone: updated.letterheadPhone,
      letterheadEmail: updated.letterheadEmail,
      letterheadAddress: updated.letterheadAddress,
      letterheadTagline: updated.letterheadTagline,
      letterheadLicenseText: updated.letterheadLicenseText,
      proposalFooterText: updated.proposalFooterText,
    });
  } catch (e: any) {
    if (e?.name === "ZodError") {
      return NextResponse.json({ error: e.errors?.[0]?.message ?? "Invalid input" }, { status: 400 });
    }
    return NextResponse.json({ error: e?.message || "Failed" }, { status: e?.status || 500 });
  }
}
