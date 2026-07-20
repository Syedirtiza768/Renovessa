import { NextRequest, NextResponse } from "next/server";
import { getSession, canAccessAdmin } from "@/lib/auth";
import { filterProspects } from "@/lib/contractor-prospects";

function boolParam(v: string | null): boolean | undefined {
  if (v === "1" || v === "true") return true;
  if (v === "0" || v === "false") return false;
  return undefined;
}

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session || !canAccessAdmin(session.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sp = req.nextUrl.searchParams;
  const minFitRaw = sp.get("minFit");
  const maxFitRaw = sp.get("maxFit");
  const pageRaw = sp.get("page");
  const pageSizeRaw = sp.get("pageSize");
  const sort = sp.get("sort");

  const result = filterProspects({
    search: sp.get("search") || undefined,
    market: sp.get("market") || undefined,
    tradeCategory: sp.get("tradeCategory") || undefined,
    fitTier: sp.get("fitTier") || undefined,
    matchStatus: sp.get("matchStatus") || undefined,
    visibility: sp.get("visibility") || undefined,
    outreachChannel: sp.get("outreachChannel") || undefined,
    hasPhone: boolParam(sp.get("hasPhone")),
    hasEmail: boolParam(sp.get("hasEmail")),
    hasWebsite: boolParam(sp.get("hasWebsite")),
    contactable: boolParam(sp.get("contactable")),
    minFit: minFitRaw ? Number(minFitRaw) : undefined,
    maxFit: maxFitRaw ? Number(maxFitRaw) : undefined,
    page: pageRaw ? Number(pageRaw) : 1,
    pageSize: pageSizeRaw ? Number(pageSizeRaw) : 40,
    sort:
      sort === "name" || sort === "rating" || sort === "visibility" || sort === "fit"
        ? sort
        : "fit",
  });

  return NextResponse.json(result);
}
