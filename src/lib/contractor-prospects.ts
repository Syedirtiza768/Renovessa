import { readFileSync } from "fs";
import path from "path";

export type FitTier = "hot" | "warm" | "cold";
export type MatchStatus = "matched" | "ambiguous" | "not_found" | "likely_closed" | string;
export type OutreachChannel = "phone" | "email" | "web_form" | "skip" | string;

export interface ContractorProspect {
  id: string;
  market: string;
  licensedName: string;
  tradeName: string;
  canonicalName: string;
  alternateNames: string[];
  address: string;
  city: string;
  state: string;
  zip: string;
  licenseRegNumber: string;
  licenseExpiration: string;
  matchStatus: MatchStatus;
  confidence: number | null;
  role: string;
  phones: string[];
  emails: string[];
  website: string | null;
  primaryAddress: string | null;
  googleRating: number | null;
  googleReviewCount: number | null;
  googleVisibility: string;
  mapsUrl: string | null;
  bbbRating: string | null;
  bbbUrl: string | null;
  trades: string[];
  tradeCategory: string;
  serviceArea: string[];
  fitScore: number;
  fitTier: FitTier;
  outreachChannel: OutreachChannel;
  outreachCaution: string | null;
  hasPhone: boolean;
  hasEmail: boolean;
  hasWebsite: boolean;
  contactable: boolean;
}

export interface ProspectFilters {
  search?: string;
  market?: string;
  tradeCategory?: string;
  fitTier?: string;
  matchStatus?: string;
  visibility?: string;
  outreachChannel?: string;
  hasPhone?: boolean;
  hasEmail?: boolean;
  hasWebsite?: boolean;
  contactable?: boolean;
  minFit?: number;
  maxFit?: number;
  page?: number;
  pageSize?: number;
  sort?: "fit" | "name" | "rating" | "visibility";
}

export interface ProspectStats {
  total: number;
  hot: number;
  warm: number;
  cold: number;
  withPhone: number;
  withWebsite: number;
  withEmail: number;
  matched: number;
  byMarket: Record<string, number>;
  byTradeCategory: Record<string, number>;
  byVisibility: Record<string, number>;
  byChannel: Record<string, number>;
}

let cache: ContractorProspect[] | null = null;

function prospectsPath() {
  return path.join(process.cwd(), "data", "contractor_enrichment", "prospects.json");
}

export function loadProspects(): ContractorProspect[] {
  if (cache) return cache;
  const raw = readFileSync(prospectsPath(), "utf-8");
  cache = JSON.parse(raw) as ContractorProspect[];
  return cache;
}

export function getProspectFilterOptions(prospects = loadProspects()) {
  const markets = [...new Set(prospects.map((p) => p.market).filter(Boolean))].sort();
  const tradeCategories = [...new Set(prospects.map((p) => p.tradeCategory).filter(Boolean))].sort();
  const matchStatuses = [...new Set(prospects.map((p) => p.matchStatus).filter(Boolean))].sort();
  const visibilities = [...new Set(prospects.map((p) => p.googleVisibility).filter(Boolean))].sort();
  const channels = [...new Set(prospects.map((p) => p.outreachChannel).filter(Boolean))].sort();
  return { markets, tradeCategories, matchStatuses, visibilities, channels };
}

export function computeProspectStats(prospects: ContractorProspect[]): ProspectStats {
  const byMarket: Record<string, number> = {};
  const byTradeCategory: Record<string, number> = {};
  const byVisibility: Record<string, number> = {};
  const byChannel: Record<string, number> = {};

  let hot = 0;
  let warm = 0;
  let cold = 0;
  let withPhone = 0;
  let withWebsite = 0;
  let withEmail = 0;
  let matched = 0;

  for (const p of prospects) {
    if (p.fitTier === "hot") hot += 1;
    else if (p.fitTier === "warm") warm += 1;
    else cold += 1;
    if (p.hasPhone) withPhone += 1;
    if (p.hasWebsite) withWebsite += 1;
    if (p.hasEmail) withEmail += 1;
    if (p.matchStatus === "matched") matched += 1;
    byMarket[p.market] = (byMarket[p.market] || 0) + 1;
    byTradeCategory[p.tradeCategory] = (byTradeCategory[p.tradeCategory] || 0) + 1;
    byVisibility[p.googleVisibility] = (byVisibility[p.googleVisibility] || 0) + 1;
    byChannel[p.outreachChannel] = (byChannel[p.outreachChannel] || 0) + 1;
  }

  return {
    total: prospects.length,
    hot,
    warm,
    cold,
    withPhone,
    withWebsite,
    withEmail,
    matched,
    byMarket,
    byTradeCategory,
    byVisibility,
    byChannel,
  };
}

function visibilityRank(v: string): number {
  switch (v) {
    case "high":
      return 4;
    case "medium":
      return 3;
    case "low":
      return 2;
    case "none":
      return 1;
    default:
      return 0;
  }
}

export function filterProspects(filters: ProspectFilters = {}) {
  const all = loadProspects();
  const search = filters.search?.trim().toLowerCase() || "";
  let rows = all.filter((p) => {
    if (filters.market && p.market !== filters.market) return false;
    if (filters.tradeCategory && p.tradeCategory !== filters.tradeCategory) return false;
    if (filters.fitTier && p.fitTier !== filters.fitTier) return false;
    if (filters.matchStatus && p.matchStatus !== filters.matchStatus) return false;
    if (filters.visibility && p.googleVisibility !== filters.visibility) return false;
    if (filters.outreachChannel && p.outreachChannel !== filters.outreachChannel) return false;
    if (filters.hasPhone === true && !p.hasPhone) return false;
    if (filters.hasEmail === true && !p.hasEmail) return false;
    if (filters.hasWebsite === true && !p.hasWebsite) return false;
    if (filters.contactable === true && !p.contactable) return false;
    if (typeof filters.minFit === "number" && p.fitScore < filters.minFit) return false;
    if (typeof filters.maxFit === "number" && p.fitScore > filters.maxFit) return false;
    if (search) {
      const hay = [
        p.canonicalName,
        p.tradeName,
        p.licensedName,
        p.address,
        p.city,
        p.zip,
        p.licenseRegNumber,
        p.phones.join(" "),
        p.emails.join(" "),
        p.website || "",
        p.trades.join(" "),
        p.tradeCategory,
      ]
        .join(" ")
        .toLowerCase();
      if (!hay.includes(search)) return false;
    }
    return true;
  });

  const sort = filters.sort || "fit";
  rows = [...rows].sort((a, b) => {
    if (sort === "name") {
      return a.canonicalName.localeCompare(b.canonicalName);
    }
    if (sort === "rating") {
      return (b.googleRating || 0) - (a.googleRating || 0);
    }
    if (sort === "visibility") {
      return visibilityRank(b.googleVisibility) - visibilityRank(a.googleVisibility);
    }
    // fit default: tier weight then score
    const tierWeight = { hot: 3, warm: 2, cold: 1 } as const;
    const tw = tierWeight[b.fitTier] - tierWeight[a.fitTier];
    if (tw !== 0) return tw;
    return b.fitScore - a.fitScore;
  });

  const pageSize = Math.min(Math.max(filters.pageSize || 40, 1), 100);
  const page = Math.max(filters.page || 1, 1);
  const total = rows.length;
  const start = (page - 1) * pageSize;
  const items = rows.slice(start, start + pageSize);

  return {
    items,
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
    stats: computeProspectStats(rows),
    globalStats: computeProspectStats(all),
    options: getProspectFilterOptions(all),
  };
}

export function groupProspectsByTrade(prospects: ContractorProspect[]) {
  const map = new Map<string, ContractorProspect[]>();
  for (const p of prospects) {
    const list = map.get(p.tradeCategory) || [];
    list.push(p);
    map.set(p.tradeCategory, list);
  }
  return [...map.entries()]
    .map(([category, items]) => ({
      category,
      count: items.length,
      hot: items.filter((i) => i.fitTier === "hot").length,
      withPhone: items.filter((i) => i.hasPhone).length,
      items,
    }))
    .sort((a, b) => b.count - a.count);
}
