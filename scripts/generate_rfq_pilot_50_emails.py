"""
Select 50 contractors (balanced by trade + ZIP) and generate short RFQ-focused
onboarding emails aligned with renovessa.com Estimates & RFQ flow.

Outputs under data/contractor_enrichment/:
  - rfq_pilot_50_strategy.md
  - rfq_pilot_50_email_drafts.md
  - rfq_pilot_50_email_drafts.json
  - rfq_pilot_50_email_drafts.csv

Usage:
  python scripts/generate_rfq_pilot_50_emails.py
"""
from __future__ import annotations

import csv
import json
import re
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PROSPECTS = ROOT / "data" / "contractor_enrichment" / "prospects.json"
OUT_DIR = ROOT / "data" / "contractor_enrichment"

AGENT_NAME = "Ray Cooper"
PORTAL_URL = "https://renovessa.com/for-contractors"
APP_URL = "https://renovessa.com"
ESTIMATE_URL = "https://renovessa.com/#estimate"

SKIP_CHANNELS = {"skip"}

# Target mix — few from each trade, 50 total. Prefer landing-page trades.
TRADE_TARGETS: list[tuple[str, int]] = [
    ("Roofing", 6),
    ("Remodeling", 8),
    ("HVAC", 4),
    ("Plumbing", 4),
    ("Electrical", 4),
    ("Flooring", 4),
    ("Painting", 4),
    ("Windows & Doors", 3),
    ("General Contracting", 4),
    ("Design-Build", 3),
    ("Restoration", 2),
    ("Masonry & Concrete", 2),
    ("Landscaping", 2),
]

# Map trade → homeowner RFQ language used on renovessa.com
RFQ_TRADE_PHRASE = {
    "Roofing": "roofing RFQs (repairs, replacements, leaks, gutters)",
    "Remodeling": "kitchen and bathroom remodeling RFQs",
    "HVAC": "HVAC RFQs (furnace, AC, heat pumps, ductwork)",
    "Plumbing": "plumbing RFQs (leaks, water heaters, fixtures)",
    "Electrical": "electrical RFQs (panels, wiring, EV chargers)",
    "Flooring": "flooring RFQs (hardwood, tile, LVP, refinishing)",
    "Painting": "painting RFQs (interior, exterior, cabinets)",
    "Windows & Doors": "windows and doors RFQs",
    "General Contracting": "general contracting / full-project RFQs",
    "Design-Build": "design-build and remodeling RFQs",
    "Restoration": "restoration and repair RFQs",
    "Masonry & Concrete": "masonry and concrete RFQs",
    "Landscaping": "exterior / landscaping project RFQs",
    "Specialty": "home improvement RFQs",
}


def normalize_email(email: str) -> str:
    return (email or "").strip().lower()


def title_case_name(name: str) -> str:
    parts = []
    for p in (name or "").strip().split():
        if p.isupper() and len(p) > 1:
            parts.append(p.title())
        else:
            parts.append(p)
    return " ".join(parts) or name


def title_case_company(name: str) -> str:
    keep = {"llc", "inc", "co", "ltd", "dba", "llp", "plc", "usa", "us", "md", "dc", "va"}
    parts = []
    for p in (name or "").strip().split():
        low = p.lower().strip(".,")
        if low in keep:
            parts.append(low.upper() + ("." if p.endswith(".") else ""))
        elif p.isupper() and len(p) > 1:
            parts.append(p.title())
        else:
            parts.append(p)
    return " ".join(parts) or name


def greeting_name(licensed_name: str) -> str:
    first = title_case_name(licensed_name).split()[0] if licensed_name else ""
    if not first or first.lower() in {"llc", "inc", "corp"}:
        return "there"
    return first


def trade_label(category: str, trades: list[str]) -> str:
    mapping = {
        "Remodeling": "remodeling",
        "General Contracting": "general contracting",
        "Roofing": "roofing",
        "Flooring": "flooring",
        "Painting": "painting",
        "HVAC": "HVAC",
        "Plumbing": "plumbing",
        "Electrical": "electrical",
        "Landscaping": "landscaping",
        "Design-Build": "design-build",
        "Windows & Doors": "windows and doors",
        "Masonry & Concrete": "masonry and concrete",
        "Restoration": "restoration",
        "Specialty": "home improvement",
    }
    if category in mapping and category not in {"Specialty", "Unclassified"}:
        return mapping[category]
    if trades:
        return trades[0].strip().lower()
    return mapping.get(category, (category or "home improvement").lower())


def zip3(z: str) -> str:
    z = (z or "").strip()
    if len(z) >= 5 and z[:5].isdigit():
        return z[:5]
    return z or "unknown"


def prepare(raw: dict, email: str, alt_emails: list[str]) -> dict:
    licensed = title_case_name(raw.get("licensedName") or "")
    company = title_case_company(raw.get("canonicalName") or raw.get("tradeName") or "your company")
    city = (raw.get("city") or raw.get("market") or "your area").title()
    trades = raw.get("trades") or []
    category = raw.get("tradeCategory") or "Specialty"
    return {
        "prospectId": raw.get("id"),
        "email": email,
        "altEmails": alt_emails,
        "company": company,
        "licensedName": licensed,
        "greetingName": greeting_name(licensed),
        "role": raw.get("role") or "unknown",
        "tradeCategory": category,
        "tradeLabel": trade_label(category, trades),
        "trades": trades,
        "city": city,
        "state": raw.get("state") or "MD",
        "zip": zip3(raw.get("zip") or ""),
        "licenseRegNumber": raw.get("licenseRegNumber") or "",
        "phones": raw.get("phones") or [],
        "website": raw.get("website"),
        "hasWebsite": bool(raw.get("hasWebsite")),
        "googleRating": raw.get("googleRating"),
        "googleReviewCount": raw.get("googleReviewCount"),
        "googleVisibility": raw.get("googleVisibility") or "unknown",
        "bbbRating": raw.get("bbbRating"),
        "serviceArea": raw.get("serviceArea") or [],
        "fitScore": float(raw.get("fitScore") or 0),
        "fitTier": raw.get("fitTier") or "cold",
        "matchStatus": raw.get("matchStatus") or "",
        "outreachChannel": raw.get("outreachChannel") or "",
        "outreachCaution": raw.get("outreachCaution"),
        "market": raw.get("market") or city,
    }


def load_pool() -> list[dict]:
    rows = json.loads(PROSPECTS.read_text(encoding="utf-8"))
    by_email: dict[str, list[tuple[dict, str, list[str]]]] = {}

    for raw in rows:
        emails = [normalize_email(e) for e in (raw.get("emails") or []) if normalize_email(e)]
        if not emails:
            continue
        if (raw.get("outreachChannel") or "").lower() in SKIP_CHANNELS:
            continue
        if raw.get("matchStatus") == "likely_closed":
            continue
        z = zip3(raw.get("zip") or "")
        if not z.isdigit() or len(z) != 5:
            continue
        # Keep DMV / MD service ZIPs only (exclude bad OCR like 29879)
        if not (z.startswith("20") or z.startswith("21") or z.startswith("22")):
            continue
        primary = emails[0]
        by_email.setdefault(primary, []).append((raw, primary, emails[1:]))

    pool: list[dict] = []
    for primary, group in by_email.items():
        def score(item: tuple[dict, str, list[str]]) -> tuple:
            r = item[0]
            tier = {"hot": 3, "warm": 2, "cold": 1}.get(r.get("fitTier") or "cold", 0)
            matched = 1 if r.get("matchStatus") == "matched" else 0
            return (tier, matched, r.get("fitScore") or 0)

        raw, primary, alts = sorted(group, key=score, reverse=True)[0]
        all_alts = set(alts)
        for r, _, a in group:
            all_alts.update(a)
        all_alts.discard(primary)
        pool.append(prepare(raw, primary, sorted(all_alts)))

    return pool


def select_50(pool: list[dict]) -> list[dict]:
    """Greedy pick: hit trade quotas while spreading ZIPs and preferring fit."""
    by_trade: dict[str, list[dict]] = defaultdict(list)
    for p in pool:
        by_trade[p["tradeCategory"]].append(p)

    for cat in by_trade:
        by_trade[cat].sort(
            key=lambda p: (
                {"hot": 3, "warm": 2, "cold": 1}.get(p["fitTier"], 0),
                p["fitScore"],
                1 if p.get("googleRating") else 0,
                p.get("googleReviewCount") or 0,
            ),
            reverse=True,
        )

    selected: list[dict] = []
    used_emails: set[str] = set()
    used_companies: set[str] = set()
    zip_counts: Counter[str] = Counter()

    def company_key(p: dict) -> str:
        return re.sub(r"[^a-z0-9]", "", (p["company"] or "").lower())

    def pick_from(candidates: list[dict], n: int) -> list[dict]:
        picked: list[dict] = []
        # Pass 1: prefer ZIPs we have fewer of
        remaining = [
            c
            for c in candidates
            if c["email"] not in used_emails and company_key(c) not in used_companies
        ]
        while remaining and len(picked) < n:
            remaining.sort(
                key=lambda p: (
                    zip_counts[p["zip"]],
                    -({"hot": 3, "warm": 2, "cold": 1}.get(p["fitTier"], 0)),
                    -p["fitScore"],
                )
            )
            choice = remaining.pop(0)
            picked.append(choice)
            used_emails.add(choice["email"])
            used_companies.add(company_key(choice))
            zip_counts[choice["zip"]] += 1
        return picked

    for cat, n in TRADE_TARGETS:
        selected.extend(pick_from(by_trade.get(cat, []), n))

    # Backfill if any quota under-filled (rare trades)
    if len(selected) < 50:
        leftovers = [
            p
            for p in sorted(
                pool,
                key=lambda x: (
                    {"hot": 3, "warm": 2, "cold": 1}.get(x["fitTier"], 0),
                    x["fitScore"],
                ),
                reverse=True,
            )
            if p["email"] not in used_emails and company_key(p) not in used_companies
        ]
        for p in leftovers:
            if len(selected) >= 50:
                break
            # Prefer landing-adjacent categories still
            selected.append(p)
            used_emails.add(p["email"])
            used_companies.add(company_key(p))
            zip_counts[p["zip"]] += 1

    selected = selected[:50]
    selected.sort(key=lambda p: (p["tradeCategory"], p["zip"], -p["fitScore"], p["company"]))
    for i, p in enumerate(selected, 1):
        p["pilotRank"] = i
    return selected


def presence_hook(p: dict) -> str:
    company, city = p["company"], p["city"]
    rating, reviews = p.get("googleRating"), p.get("googleReviewCount")
    vis = (p.get("googleVisibility") or "").lower()
    bbb = p.get("bbbRating")

    if rating and reviews:
        line = (
            f"I came across {company} while reviewing {city} contractors — "
            f"{rating:g} stars across {reviews} reviews stood out."
        )
    elif vis == "high":
        line = (
            f"{company} already shows up when homeowners search in {city} — "
            f"strong local footprint."
        )
    else:
        line = (
            f"I've been matching licensed {city} pros to the RFQs we're getting "
            f"on Renovessa, and {company} looks like a fit."
        )
    if bbb:
        line += f" (BBB {bbb}.)"
    return line


def services_bit(p: dict) -> str:
    trades = p.get("trades") or []
    area = p.get("serviceArea") or []
    label = p["tradeLabel"]
    extra = f" ({', '.join(trades[:3])})" if len(trades) >= 2 else ""
    if area:
        area_bit = f" across {', '.join(area[:3])}"
        if len(area) > 3:
            area_bit += ", and nearby"
    else:
        area_bit = f" in {p['city']} ({p['zip']})"
    return f"Your {label} focus{extra}{area_bit} lines up with what homeowners are requesting."


def rfq_pitch(p: dict) -> str:
    company = p["company"]
    city = p["city"]
    z = p["zip"]
    cat = p["tradeCategory"]
    rfq = RFQ_TRADE_PHRASE.get(cat, f"{p['tradeLabel']} RFQs")
    role = (p.get("role") or "").lower()

    owner = ""
    if role in {"owner", "officer"}:
        owner = "You're on the license as decision-maker, so I'm writing you directly. "

    return (
        f"{owner}"
        f"On renovessa.com, homeowners run a free estimate wizard, get a DMV ballpark, "
        f"then submit an RFQ — a scoped request for quote (trade, size, materials, timing). "
        f"We shop that RFQ to vetted contractors in the right trade and ZIP.\n\n"
        f"Onboard {company} and we send you {rfq} in {city} ({z}) and nearby. "
        f"Not shared lead lists — real scoped jobs to bid."
    )


def cta(p: dict) -> str:
    return f"""Reply one word: "yes" (onboarding steps), "info" (see a sample RFQ), or "later".
Or apply in 2 min: [Apply]({PORTAL_URL})"""


def build_subject(p: dict) -> str:
    return f"{p['company']} — {p['tradeLabel']} RFQs in {p['city']} ({p['zip']})"


def build_body(p: dict) -> str:
    body = f"""Hi {p['greetingName']},

{presence_hook(p)} {services_bit(p)}

{rfq_pitch(p)}

{cta(p)}

{AGENT_NAME}
[Renovessa]({APP_URL})

P.S. For {p['company']} only (MD license {p['licenseRegNumber'] or 'on file'}). Wrong inbox? Forward to the owner."""
    return re.sub(r"\n{3,}", "\n\n", body).strip() + "\n"


def build_followup(p: dict) -> str:
    return f"""Hi {p['greetingName']},

Quick bump — still want to put {p['company']} on the RFQ list for {p['tradeLabel']} jobs in {p['city']} ({p['zip']}).

Homeowners submit scoped RFQs on Renovessa; onboarded contractors get those requests to bid.

Reply "yes" or apply: [Apply]({PORTAL_URL})

{AGENT_NAME}
[Renovessa]({APP_URL})
"""


def write_csv(path: Path, rows: list[dict], fieldnames: list[str]) -> None:
    with path.open("w", encoding="utf-8", newline="") as f:
        w = csv.DictWriter(f, fieldnames=fieldnames, extrasaction="ignore")
        w.writeheader()
        for r in rows:
            flat = dict(r)
            for k, v in list(flat.items()):
                if isinstance(v, list):
                    flat[k] = "; ".join(str(x) for x in v)
                elif v is None:
                    flat[k] = ""
            w.writerow(flat)


def strategy_md(selected: list[dict]) -> str:
    by_trade = Counter(p["tradeCategory"] for p in selected)
    by_zip = Counter(p["zip"] for p in selected)
    by_city = Counter(p["city"] for p in selected)

    trade_rows = "\n".join(f"| {t} | {n} |" for t, n in sorted(by_trade.items(), key=lambda x: -x[1]))
    zip_rows = "\n".join(f"| {z} | {n} |" for z, n in by_zip.most_common())

    return f"""# RFQ Pilot 50 — Outreach strategy + feature alignment

Generated: {datetime.now(timezone.utc).isoformat()}

## What renovessa.com does now (Estimates + RFQ)

Public homeowner flow on [renovessa.com](https://renovessa.com):

1. **Estimate wizard** — homeowner picks a trade and answers scoped questions (size, materials, condition, timing, constraints).
2. **DMV ballpark** — instant planning range based on typical DMV labor/materials (not a binding quote).
3. **Submit RFQ** — scoped request for quote to Renovessa.
4. **Renovessa solicits bids** — from vetted contractors in that trade/area, then returns options (usually 1–2 business days).

Trades on the landing wizard: HVAC, Roofing, Kitchen, Bathroom, Basement, Plumbing, Electrical, Windows & Doors, Deck & Patio, Flooring, Painting, General Repairs.

**Contractor value prop (this pilot's message):** we already get RFQs from homeowners; onboard → we send you RFQs in your trade and ZIP to bid. Not a shared lead dump.

Note: `/for-contractors` still leans "verified appointments" language. These emails lead with the **RFQ / bid** story matching the live homepage. Consider aligning the contractor page later.

## How this builds on the existing outreach prep

| Existing (Wave A–D drafts) | This RFQ pilot |
|---|---|
| Longer onboarding + reputation offer | Shorter, RFQ-first pitch |
| "Route jobs / qualified opportunities" | Explicit estimate → ballpark → RFQ → bid flow |
| 365 drafts across all emailable prospects | **50** balanced by trade + ZIP for a first send |
| Same enrichment (fit, BBB, Google, license, owner) | Same personalization hooks, tighter CTA |

Keep using: Ray Cooper signature, one-word reply CTA, MD license P.S., apply URL `{PORTAL_URL}`.

## Selection rules (50 total)

- Emailable, not `skip` / likely closed, valid 5-digit ZIP
- Quota by trade (few from each), then ZIP diversity (avoid stacking one ZIP)
- Prefer hot fit + higher fit score + review footprint
- Dedupe by email and company name

### Mix by trade

| Trade | Count |
|---|---:|
{trade_rows}

### Mix by ZIP

| ZIP | Count |
|---|---:|
{zip_rows}

### Cities

{', '.join(f'{c} ({n})' for c, n in by_city.most_common())}

## Send guidance

1. Send as a **pilot batch of 50** (not all 365) to learn reply rates by trade.
2. Personalize from drafts as-is — each names company, trade, city, ZIP, and RFQ type.
3. Follow up once after 4–5 business days with the included follow-up body.
4. Track replies: yes / info / later / unsubscribe / bounce.
5. Expand from remaining enriched list after measuring which trades convert.

## Files

- `rfq_pilot_50_email_drafts.md` — full readable drafts
- `rfq_pilot_50_email_drafts.json` — structured
- `rfq_pilot_50_email_drafts.csv` — spreadsheet for import/review
"""


def drafts_md(selected: list[dict]) -> str:
    lines = [
        "# Renovessa RFQ pilot — 50 customized onboarding emails",
        "",
        f"Generated: {datetime.now(timezone.utc).isoformat()}",
        f"Total: **{len(selected)}**",
        "",
        "Pitch: homeowners submit scoped RFQs via the estimate wizard; onboarded contractors receive those RFQs to bid.",
        "",
    ]
    for p in selected:
        lines.append(f"## {p['pilotRank']}. {p['company']}")
        lines.append(f"**To:** {p['email']}  ")
        if p.get("altEmails"):
            lines.append(f"**Alt:** {', '.join(p['altEmails'])}  ")
        lines.append(
            f"**Trade:** {p['tradeCategory']} · **City:** {p['city']} · "
            f"**ZIP:** {p['zip']} · **Fit:** {p['fitScore']}/10"
        )
        lines.append("")
        lines.append(f"**Subject:** {p['subject']}")
        lines.append("")
        lines.append("```")
        lines.append(p["body"].rstrip())
        lines.append("```")
        lines.append("")
        lines.append(f"**Follow-up subject:** {p['followUpSubject']}")
        lines.append("")
        lines.append("```")
        lines.append(p["followUpBody"].rstrip())
        lines.append("```")
        lines.append("")
        lines.append("---")
        lines.append("")
    return "\n".join(lines)


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    pool = load_pool()
    selected = select_50(pool)

    for p in selected:
        p["subject"] = build_subject(p)
        p["body"] = build_body(p)
        p["followUpSubject"] = f"re: {p['subject']}"
        p["followUpBody"] = build_followup(p)

    payload = {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "campaign": "rfq_pilot_50",
        "agentName": AGENT_NAME,
        "portalUrl": PORTAL_URL,
        "estimateUrl": ESTIMATE_URL,
        "pitch": (
            "Homeowners run estimate wizard → DMV ballpark → submit RFQ; "
            "onboarded contractors receive trade/ZIP RFQs to bid."
        ),
        "totalDrafts": len(selected),
        "byTrade": dict(Counter(d["tradeCategory"] for d in selected)),
        "byZip": dict(Counter(d["zip"] for d in selected)),
        "drafts": selected,
    }

    (OUT_DIR / "rfq_pilot_50_email_drafts.json").write_text(
        json.dumps(payload, indent=2, ensure_ascii=False), encoding="utf-8"
    )
    (OUT_DIR / "rfq_pilot_50_strategy.md").write_text(strategy_md(selected), encoding="utf-8")
    (OUT_DIR / "rfq_pilot_50_email_drafts.md").write_text(drafts_md(selected), encoding="utf-8")

    write_csv(
        OUT_DIR / "rfq_pilot_50_email_drafts.csv",
        selected,
        [
            "pilotRank",
            "email",
            "altEmails",
            "company",
            "licensedName",
            "greetingName",
            "tradeCategory",
            "tradeLabel",
            "city",
            "zip",
            "fitScore",
            "fitTier",
            "licenseRegNumber",
            "phones",
            "website",
            "subject",
            "body",
            "followUpSubject",
            "followUpBody",
        ],
    )

    print(f"Selected {len(selected)} contractors")
    print("byTrade:", dict(Counter(d["tradeCategory"] for d in selected)))
    print("byZip:", dict(Counter(d["zip"] for d in selected)))
    print("Wrote:")
    for name in [
        "rfq_pilot_50_strategy.md",
        "rfq_pilot_50_email_drafts.md",
        "rfq_pilot_50_email_drafts.json",
        "rfq_pilot_50_email_drafts.csv",
    ]:
        print(" ", OUT_DIR / name)


if __name__ == "__main__":
    main()
