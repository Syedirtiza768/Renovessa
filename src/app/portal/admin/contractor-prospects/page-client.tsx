"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Building2,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Globe,
  Mail,
  MapPin,
  Phone,
  Search,
  Star,
  X,
} from "lucide-react";
import type {
  ContractorProspect,
  ProspectStats,
} from "@/lib/contractor-prospects";
import { cn } from "@/lib/utils";

type Options = {
  markets: string[];
  tradeCategories: string[];
  matchStatuses: string[];
  visibilities: string[];
  channels: string[];
};

type ViewMode = "list" | "grouped";

const TIER_META: Record<
  string,
  { label: string; badge: string; hint: string }
> = {
  hot: { label: "Hot", badge: "badge-copper", hint: "Fit 8–10" },
  warm: { label: "Warm", badge: "badge-amber", hint: "Fit 5–7" },
  cold: { label: "Cold", badge: "badge-neutral", hint: "Fit 0–4" },
};

const MATCH_BADGE: Record<string, string> = {
  matched: "badge-green",
  ambiguous: "badge-amber",
  not_found: "badge-neutral",
  likely_closed: "badge-red",
};

const VIS_BADGE: Record<string, string> = {
  high: "badge-green",
  medium: "badge-blue",
  low: "badge-amber",
  none: "badge-neutral",
  unknown: "badge-neutral",
};

function formatChannel(ch: string) {
  if (ch === "web_form") return "Web form";
  return ch.charAt(0).toUpperCase() + ch.slice(1);
}

function formatMatch(status: string) {
  return status.replace(/_/g, " ");
}

export function ContractorProspectsClient({
  initialItems,
  initialTotal,
  initialStats,
  globalStats,
  options,
}: {
  initialItems: ContractorProspect[];
  initialTotal: number;
  initialStats: ProspectStats;
  globalStats: ProspectStats;
  options: Options;
}) {
  const [items, setItems] = useState(initialItems);
  const [total, setTotal] = useState(initialTotal);
  const [stats, setStats] = useState(initialStats);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("list");

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [market, setMarket] = useState("");
  const [tradeCategory, setTradeCategory] = useState("");
  const [fitTier, setFitTier] = useState("");
  const [matchStatus, setMatchStatus] = useState("");
  const [visibility, setVisibility] = useState("");
  const [outreachChannel, setOutreachChannel] = useState("");
  const [hasPhone, setHasPhone] = useState(false);
  const [hasWebsite, setHasWebsite] = useState(false);
  const [hasEmail, setHasEmail] = useState(false);
  const [contactable, setContactable] = useState(false);
  const [sort, setSort] = useState<"fit" | "name" | "rating" | "visibility">("fit");

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 250);
    return () => clearTimeout(t);
  }, [search]);

  const fetchProspects = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("pageSize", viewMode === "grouped" ? "100" : "40");
    params.set("sort", sort);
    if (debouncedSearch) params.set("search", debouncedSearch);
    if (market) params.set("market", market);
    if (tradeCategory) params.set("tradeCategory", tradeCategory);
    if (fitTier) params.set("fitTier", fitTier);
    if (matchStatus) params.set("matchStatus", matchStatus);
    if (visibility) params.set("visibility", visibility);
    if (outreachChannel) params.set("outreachChannel", outreachChannel);
    if (hasPhone) params.set("hasPhone", "1");
    if (hasWebsite) params.set("hasWebsite", "1");
    if (hasEmail) params.set("hasEmail", "1");
    if (contactable) params.set("contactable", "1");

    try {
      const res = await fetch(`/api/contractor-prospects?${params}`);
      const data = await res.json();
      setItems(data.items || []);
      setTotal(data.total || 0);
      setStats(data.stats || initialStats);
    } finally {
      setLoading(false);
    }
  }, [
    page,
    viewMode,
    sort,
    debouncedSearch,
    market,
    tradeCategory,
    fitTier,
    matchStatus,
    visibility,
    outreachChannel,
    hasPhone,
    hasWebsite,
    hasEmail,
    contactable,
    initialStats,
  ]);

  useEffect(() => {
    fetchProspects();
  }, [fetchProspects]);

  function resetFilters() {
    setSearch("");
    setDebouncedSearch("");
    setMarket("");
    setTradeCategory("");
    setFitTier("");
    setMatchStatus("");
    setVisibility("");
    setOutreachChannel("");
    setHasPhone(false);
    setHasWebsite(false);
    setHasEmail(false);
    setContactable(false);
    setSort("fit");
    setPage(1);
  }

  const activeFilterCount = [
    market,
    tradeCategory,
    fitTier,
    matchStatus,
    visibility,
    outreachChannel,
    hasPhone,
    hasWebsite,
    hasEmail,
    contactable,
    debouncedSearch,
  ].filter(Boolean).length;

  const grouped = useMemo(() => {
    const map = new Map<string, ContractorProspect[]>();
    for (const p of items) {
      const list = map.get(p.tradeCategory) || [];
      list.push(p);
      map.set(p.tradeCategory, list);
    }
    return [...map.entries()]
      .map(([category, rows]) => ({
        category,
        rows,
        hot: rows.filter((r) => r.fitTier === "hot").length,
      }))
      .sort((a, b) => b.rows.length - a.rows.length);
  }, [items]);

  const pageSize = viewMode === "grouped" ? 100 : 40;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Contractor Prospects</h1>
          <p className="mt-1 text-sm text-muted">
            Enriched Gaithersburg &amp; Rockville MD license list — classified by
            fit, trade, and contactability for outreach.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className={cn(
              "btn-secondary text-sm !min-h-10 !px-4",
              viewMode === "list" && "border-copper text-copper",
            )}
            onClick={() => {
              setViewMode("list");
              setPage(1);
            }}
          >
            List
          </button>
          <button
            type="button"
            className={cn(
              "btn-secondary text-sm !min-h-10 !px-4",
              viewMode === "grouped" && "border-copper text-copper",
            )}
            onClick={() => {
              setViewMode("grouped");
              setPage(1);
            }}
          >
            By trade
          </button>
        </div>
      </div>

      {/* KPI strip */}
      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi
          label="In view"
          value={stats.total}
          sub={`${globalStats.total} in catalog`}
        />
        <Kpi
          label="Hot prospects"
          value={stats.hot}
          sub={`${stats.warm} warm · ${stats.cold} cold`}
          accent
        />
        <Kpi
          label="Phone ready"
          value={stats.withPhone}
          sub={`${stats.withWebsite} with website`}
        />
        <Kpi
          label="Matched online"
          value={stats.matched}
          sub={`${stats.withEmail} with email`}
        />
      </div>

      {/* Fit tier chips */}
      <div className="mt-4 flex flex-wrap gap-2">
        <TierChip
          active={!fitTier}
          label={`All tiers (${globalStats.total})`}
          onClick={() => {
            setFitTier("");
            setPage(1);
          }}
        />
        {(["hot", "warm", "cold"] as const).map((tier) => (
          <TierChip
            key={tier}
            active={fitTier === tier}
            label={`${TIER_META[tier].label} (${globalStats[tier]})`}
            tone={tier}
            onClick={() => {
              setFitTier(fitTier === tier ? "" : tier);
              setPage(1);
            }}
          />
        ))}
      </div>

      {/* Filters */}
      <div className="mt-4 card p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[200px] flex-1">
            <label className="text-xs font-medium text-muted">Search</label>
            <div className="relative mt-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              <input
                className="input pl-9"
                placeholder="Company, license #, phone, trade…"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
              />
            </div>
          </div>
          <FilterSelect
            label="Market"
            value={market}
            onChange={(v) => {
              setMarket(v);
              setPage(1);
            }}
            options={options.markets.map((m) => ({ value: m, label: m }))}
          />
          <FilterSelect
            label="Trade group"
            value={tradeCategory}
            onChange={(v) => {
              setTradeCategory(v);
              setPage(1);
            }}
            options={options.tradeCategories.map((t) => ({
              value: t,
              label: `${t} (${globalStats.byTradeCategory[t] || 0})`,
            }))}
          />
          <FilterSelect
            label="Match"
            value={matchStatus}
            onChange={(v) => {
              setMatchStatus(v);
              setPage(1);
            }}
            options={options.matchStatuses.map((s) => ({
              value: s,
              label: formatMatch(s),
            }))}
          />
          <FilterSelect
            label="Visibility"
            value={visibility}
            onChange={(v) => {
              setVisibility(v);
              setPage(1);
            }}
            options={options.visibilities.map((v) => ({
              value: v,
              label: v,
            }))}
          />
          <FilterSelect
            label="Outreach"
            value={outreachChannel}
            onChange={(v) => {
              setOutreachChannel(v);
              setPage(1);
            }}
            options={options.channels.map((c) => ({
              value: c,
              label: formatChannel(c),
            }))}
          />
          <FilterSelect
            label="Sort"
            value={sort}
            allowEmpty={false}
            onChange={(v) => {
              setSort(v as typeof sort);
              setPage(1);
            }}
            options={[
              { value: "fit", label: "Best fit" },
              { value: "name", label: "Name" },
              { value: "rating", label: "Google rating" },
              { value: "visibility", label: "Visibility" },
            ]}
          />
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <ToggleChip
            active={hasPhone}
            label="Has phone"
            onClick={() => {
              setHasPhone(!hasPhone);
              setPage(1);
            }}
          />
          <ToggleChip
            active={hasWebsite}
            label="Has website"
            onClick={() => {
              setHasWebsite(!hasWebsite);
              setPage(1);
            }}
          />
          <ToggleChip
            active={hasEmail}
            label="Has email"
            onClick={() => {
              setHasEmail(!hasEmail);
              setPage(1);
            }}
          />
          <ToggleChip
            active={contactable}
            label="Contactable"
            onClick={() => {
              setContactable(!contactable);
              setPage(1);
            }}
          />
          {activeFilterCount > 0 && (
            <button
              type="button"
              onClick={resetFilters}
              className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium text-muted hover:text-copper"
            >
              <X className="h-3.5 w-3.5" />
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* Results */}
      <div className="mt-4 flex items-center justify-between gap-3">
        <p className="text-sm text-muted">
          {loading ? "Loading…" : `${total.toLocaleString()} prospects`}
          {market ? ` · ${market}` : ""}
          {tradeCategory ? ` · ${tradeCategory}` : ""}
        </p>
      </div>

      {viewMode === "list" ? (
        <ProspectTable
          items={items}
          loading={loading}
          expanded={expanded}
          onToggle={(id) => setExpanded(expanded === id ? null : id)}
        />
      ) : (
        <div className="mt-3 space-y-4">
          {loading && items.length === 0 ? (
            <div className="card p-8 text-center text-muted">Loading…</div>
          ) : grouped.length === 0 ? (
            <div className="card p-8 text-center text-muted">No prospects found.</div>
          ) : (
            grouped.map((g) => (
              <section key={g.category} className="card overflow-hidden">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-rule bg-blueprint/40 px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-copper" />
                    <h2 className="font-semibold">{g.category}</h2>
                    <span className="badge-neutral">{g.rows.length}</span>
                    {g.hot > 0 && (
                      <span className="badge-copper">{g.hot} hot</span>
                    )}
                  </div>
                </div>
                <ProspectRows
                  items={g.rows}
                  expanded={expanded}
                  onToggle={(id) => setExpanded(expanded === id ? null : id)}
                />
              </section>
            ))
          )}
        </div>
      )}

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm text-muted">
            Page {page} of {totalPages}
          </p>
          <div className="flex gap-2">
            <button
              className="btn-secondary text-sm !min-h-10"
              disabled={page <= 1 || loading}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </button>
            <button
              className="btn-secondary text-sm !min-h-10"
              disabled={page >= totalPages || loading}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Kpi({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: number;
  sub: string;
  accent?: boolean;
}) {
  return (
    <div className={cn("kpi-card", accent && "border-l-4 border-l-copper")}>
      <p className="text-xs font-medium uppercase tracking-wide text-muted">
        {label}
      </p>
      <p className="mt-1 text-2xl font-bold tabular-nums">{value.toLocaleString()}</p>
      <p className="mt-0.5 text-xs text-muted">{sub}</p>
    </div>
  );
}

function TierChip({
  active,
  label,
  tone,
  onClick,
}: {
  active: boolean;
  label: string;
  tone?: "hot" | "warm" | "cold";
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full px-3 py-1 text-xs font-semibold transition-colors",
        active
          ? tone === "hot"
            ? "bg-copper text-white"
            : tone === "warm"
              ? "bg-warning text-white"
              : tone === "cold"
                ? "bg-slate text-white"
                : "bg-slate text-white"
          : "bg-blueprint text-muted hover:text-copper",
      )}
    >
      {label}
    </button>
  );
}

function ToggleChip({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
        active
          ? "border-copper bg-copper/10 text-copper"
          : "border-rule bg-white text-muted hover:text-copper",
      )}
    >
      {label}
    </button>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
  allowEmpty = true,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  allowEmpty?: boolean;
}) {
  return (
    <div className="min-w-[140px]">
      <label className="text-xs font-medium text-muted">{label}</label>
      <select
        className="input mt-1"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {allowEmpty && <option value="">All</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function ProspectTable({
  items,
  loading,
  expanded,
  onToggle,
}: {
  items: ContractorProspect[];
  loading: boolean;
  expanded: string | null;
  onToggle: (id: string) => void;
}) {
  return (
    <div className="mt-3 card overflow-hidden">
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-rule bg-blueprint/40 text-left text-xs font-medium text-muted">
              <th className="w-8 p-3" />
              <th className="p-3">Company</th>
              <th className="p-3">Trade</th>
              <th className="p-3">Market</th>
              <th className="p-3">Fit</th>
              <th className="p-3">Contact</th>
              <th className="p-3">Visibility</th>
              <th className="p-3">Match</th>
            </tr>
          </thead>
          <tbody>
            {loading && items.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-8 text-center text-muted">
                  Loading…
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-8 text-center text-muted">
                  No prospects found.
                </td>
              </tr>
            ) : (
              items.map((p) => (
                <ProspectTableRow
                  key={p.id}
                  prospect={p}
                  open={expanded === p.id}
                  onToggle={() => onToggle(p.id)}
                />
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="divide-y divide-rule md:hidden">
        {loading && items.length === 0 ? (
          <div className="p-8 text-center text-muted">Loading…</div>
        ) : items.length === 0 ? (
          <div className="p-8 text-center text-muted">No prospects found.</div>
        ) : (
          items.map((p) => (
            <MobileProspectCard
              key={p.id}
              prospect={p}
              open={expanded === p.id}
              onToggle={() => onToggle(p.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}

function ProspectRows({
  items,
  expanded,
  onToggle,
}: {
  items: ContractorProspect[];
  expanded: string | null;
  onToggle: (id: string) => void;
}) {
  return (
    <div className="divide-y divide-rule">
      {items.map((p) => (
        <MobileProspectCard
          key={p.id}
          prospect={p}
          open={expanded === p.id}
          onToggle={() => onToggle(p.id)}
          dense
        />
      ))}
    </div>
  );
}

function ProspectTableRow({
  prospect: p,
  open,
  onToggle,
}: {
  prospect: ContractorProspect;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <>
      <tr
        className="cursor-pointer border-b border-rule hover:bg-blueprint/20"
        onClick={onToggle}
      >
        <td className="p-3 text-muted">
          {open ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </td>
        <td className="p-3">
          <div className="font-medium text-slate">{p.canonicalName}</div>
          <div className="text-xs text-muted">{p.licensedName}</div>
        </td>
        <td className="p-3">
          <div>{p.tradeCategory}</div>
          {p.trades[0] && (
            <div className="text-xs text-muted line-clamp-1">{p.trades[0]}</div>
          )}
        </td>
        <td className="p-3">{p.city}</td>
        <td className="p-3">
          <span className={TIER_META[p.fitTier]?.badge || "badge-neutral"}>
            {p.fitScore}/10 · {TIER_META[p.fitTier]?.label}
          </span>
        </td>
        <td className="p-3">
          <ContactIcons prospect={p} />
        </td>
        <td className="p-3">
          <span className={VIS_BADGE[p.googleVisibility] || "badge-neutral"}>
            {p.googleVisibility}
          </span>
          {p.googleRating != null && (
            <span className="ml-1 text-xs text-muted">
              {p.googleRating.toFixed(1)}★
            </span>
          )}
        </td>
        <td className="p-3">
          <span className={MATCH_BADGE[p.matchStatus] || "badge-neutral"}>
            {formatMatch(p.matchStatus)}
          </span>
        </td>
      </tr>
      {open && (
        <tr className="border-b border-rule bg-blueprint/20">
          <td colSpan={8} className="p-4">
            <ProspectDetail prospect={p} />
          </td>
        </tr>
      )}
    </>
  );
}

function MobileProspectCard({
  prospect: p,
  open,
  onToggle,
  dense,
}: {
  prospect: ContractorProspect;
  open: boolean;
  onToggle: () => void;
  dense?: boolean;
}) {
  return (
    <div className={cn(dense ? "px-4 py-3" : "p-4")}>
      <button
        type="button"
        className="flex w-full items-start justify-between gap-3 text-left"
        onClick={onToggle}
      >
        <div className="min-w-0">
          <div className="font-medium">{p.canonicalName}</div>
          <div className="mt-0.5 text-xs text-muted">
            {p.tradeCategory} · {p.city}
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <span className={TIER_META[p.fitTier]?.badge || "badge-neutral"}>
              {p.fitScore}/10
            </span>
            <span className={MATCH_BADGE[p.matchStatus] || "badge-neutral"}>
              {formatMatch(p.matchStatus)}
            </span>
            <span className={VIS_BADGE[p.googleVisibility] || "badge-neutral"}>
              {p.googleVisibility}
            </span>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2 text-muted">
          <ContactIcons prospect={p} />
          {open ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </div>
      </button>
      {open && (
        <div className="mt-3 border-t border-rule pt-3">
          <ProspectDetail prospect={p} />
        </div>
      )}
    </div>
  );
}

function ContactIcons({ prospect: p }: { prospect: ContractorProspect }) {
  return (
    <div className="flex items-center gap-1.5 text-muted">
      {p.hasPhone && <Phone className="h-3.5 w-3.5 text-success" />}
      {p.hasEmail && <Mail className="h-3.5 w-3.5 text-[#1A56A0]" />}
      {p.hasWebsite && <Globe className="h-3.5 w-3.5 text-copper" />}
      {!p.hasPhone && !p.hasEmail && !p.hasWebsite && (
        <span className="text-xs">—</span>
      )}
    </div>
  );
}

function ProspectDetail({ prospect: p }: { prospect: ContractorProspect }) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <div className="space-y-2 text-sm">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">
          Identity
        </h3>
        <p>
          <span className="text-muted">Trade name:</span> {p.tradeName}
        </p>
        <p>
          <span className="text-muted">Licensee:</span> {p.licensedName}
        </p>
        <p>
          <span className="text-muted">MHIC / Reg #:</span> {p.licenseRegNumber}
        </p>
        <p>
          <span className="text-muted">Expires:</span>{" "}
          {p.licenseExpiration || "—"}
        </p>
        <p>
          <span className="text-muted">Role:</span> {p.role}
        </p>
        {p.alternateNames.length > 0 && (
          <p>
            <span className="text-muted">Also known as:</span>{" "}
            {p.alternateNames.join(", ")}
          </p>
        )}
      </div>

      <div className="space-y-2 text-sm">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">
          Contact
        </h3>
        {p.phones.length > 0 ? (
          p.phones.map((phone) => (
            <a
              key={phone}
              href={`tel:${phone.replace(/\D/g, "")}`}
              className="flex items-center gap-2 text-copper hover:underline"
            >
              <Phone className="h-3.5 w-3.5" />
              {phone}
            </a>
          ))
        ) : (
          <p className="text-muted">No phone found</p>
        )}
        {p.emails.map((email) => (
          <a
            key={email}
            href={`mailto:${email}`}
            className="flex items-center gap-2 text-copper hover:underline"
          >
            <Mail className="h-3.5 w-3.5" />
            {email}
          </a>
        ))}
        {p.website && (
          <a
            href={p.website.startsWith("http") ? p.website : `https://${p.website}`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 text-copper hover:underline"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Website
          </a>
        )}
        <p className="flex items-start gap-2 text-muted">
          <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>
            {p.primaryAddress || p.address}
            {p.zip ? ` ${p.zip}` : ""}
          </span>
        </p>
        <p>
          <span className="text-muted">Outreach:</span>{" "}
          {formatChannel(p.outreachChannel)}
          {p.outreachCaution ? ` — ${p.outreachCaution}` : ""}
        </p>
      </div>

      <div className="space-y-2 text-sm">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">
          Services &amp; presence
        </h3>
        <div className="flex flex-wrap gap-1">
          {p.trades.length > 0 ? (
            p.trades.map((t) => (
              <span key={t} className="badge-neutral">
                {t}
              </span>
            ))
          ) : (
            <span className="text-muted">No trades listed</span>
          )}
        </div>
        {p.serviceArea.length > 0 && (
          <p className="text-xs text-muted">
            Area: {p.serviceArea.slice(0, 8).join(", ")}
            {p.serviceArea.length > 8 ? "…" : ""}
          </p>
        )}
        <p className="flex items-center gap-1">
          <Star className="h-3.5 w-3.5 text-warning" />
          {p.googleRating != null
            ? `${p.googleRating.toFixed(1)} (${p.googleReviewCount ?? 0} reviews)`
            : "No Google rating"}
        </p>
        {p.bbbUrl && (
          <a
            href={p.bbbUrl}
            target="_blank"
            rel="noreferrer"
            className="text-copper hover:underline"
          >
            BBB{p.bbbRating ? ` ${p.bbbRating}` : ""}
          </a>
        )}
        {p.mapsUrl && (
          <a
            href={p.mapsUrl}
            target="_blank"
            rel="noreferrer"
            className="block text-copper hover:underline"
          >
            Open in Maps
          </a>
        )}
        {p.confidence != null && (
          <p className="text-xs text-muted">
            Match confidence {(p.confidence * 100).toFixed(0)}%
          </p>
        )}
      </div>
    </div>
  );
}
