"""
Generate personalized Renovessa onboarding email drafts for every contractor
with an email address in the enriched prospects catalog.

Outputs (under data/contractor_enrichment/):
  - email_drafts.json      full structured drafts + merge context
  - email_drafts.csv       review spreadsheet (subject + body)
  - contacts_import.csv    Bulk Import format for Admin → Contacts
  - email_drafts_preview.md sample of 8 rendered emails

Usage:
  python scripts/generate_onboarding_email_drafts.py
"""
from __future__ import annotations

import csv
import json
import re
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PROSPECTS = ROOT / "data" / "contractor_enrichment" / "prospects.json"
OUT_DIR = ROOT / "data" / "contractor_enrichment"

AGENT_NAME = "Ray Cooper"
PORTAL_URL = "https://renovessa.com/for-contractors"
APP_URL = "https://renovessa.com"

# Skip these - enrichment said don't outreach / closed / no real contact path
SKIP_CHANNELS = {"skip"}


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


def greeting_name(licensed_name: str, role: str) -> str:
    first = title_case_name(licensed_name).split()[0] if licensed_name else ""
    if not first or first.lower() in {"llc", "inc", "corp"}:
        return "there"
    return first


def trade_label(category: str, trades: list[str]) -> str:
    """Prefer classified category; fall back to first enriched trade string."""
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
        "Unclassified": "home improvement",
    }
    if category in mapping and category not in {"Specialty", "Unclassified"}:
        return mapping[category]
    if trades:
        primary = trades[0].strip()
        if primary:
            return primary.lower()
    return mapping.get(category, (category or "home improvement").lower())


def title_case_company(name: str) -> str:
    """Title-case company names but keep LLC/INC/DBA tokens uppercase."""
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


def trade_jobs_phrase(label: str) -> str:
    """Natural phrasing: 'remodeling jobs' vs 'HVAC jobs'."""
    if label.lower() in {"hvac", "electrical", "plumbing"}:
        return f"{label} jobs"
    if label.endswith("ing"):
        return f"{label} jobs"
    return f"{label} work"


def rating_math(rating: float | None, review_count: int | None) -> str:
    if rating is None or review_count is None:
        return ""
    if rating <= 0 or rating >= 4.9 or review_count <= 0:
        return ""
    n = int(((4.9 - rating) * review_count) / 0.1 + 0.999999)
    if n <= 0 or n > 100_000:
        return ""
    return (
        f"With a {rating:g} average across {review_count} reviews, you'd need roughly "
        f"{n} consecutive 5-star reviews - without a bad one interrupting - to reach a 4.9. "
        f"That rarely happens by accident."
    )


def presence_hook(p: dict) -> str:
    """One customized observation based on online presence variables."""
    company = p["company"]
    city = p["city"]
    vis = (p.get("googleVisibility") or "unknown").lower()
    rating = p.get("googleRating")
    reviews = p.get("googleReviewCount")
    has_web = p.get("hasWebsite")
    has_phone = p.get("hasPhone")
    bbb = p.get("bbbRating")

    bits = []

    if rating and reviews:
        bits.append(
            f"I came across {company} while looking at {city} contractors - "
            f"a {rating:g}-star profile with {reviews} reviews stood out."
        )
    elif vis == "high":
        bits.append(
            f"{company} already shows up when homeowners search in {city} - "
            f"that's a strong base to build from."
        )
    elif vis in {"low", "none"}:
        bits.append(
            f"When homeowners in {city} search for the work you do, {company} "
            f"isn't showing up the way a licensed local pro should."
        )
    else:
        bits.append(
            f"I've been reviewing licensed {city} contractors, and {company} "
            f"looks like a fit for the homeowners we send."
        )

    gaps = []
    if not has_web:
        gaps.append("no clear website")
    if vis in {"low", "none"}:
        gaps.append("thin Google visibility")
    if rating is None and vis != "high":
        gaps.append("limited public review footprint")
    if gaps:
        bits.append(
            f"From the outside, a few gaps stood out: {', '.join(gaps)}. "
            f"Renovessa is built to fix that while putting real jobs in front of you."
        )
    elif rating and rating >= 4.5:
        bits.append(
            "Your reputation is already an asset - the missing piece is a steady "
            "pipeline of homeowners who are ready to start, not just browsing quotes."
        )

    if bbb:
        bits.append(f"(I also saw your BBB profile at {bbb} - good signal.)")

    if has_phone and not has_web:
        bits.append(
            "You've got a phone line but homeowners increasingly decide online first - "
            "we help close that gap."
        )

    return " ".join(bits)


def services_line(p: dict) -> str:
    trades = p.get("trades") or []
    area = p.get("serviceArea") or []
    label = p["tradeLabel"]
    if len(trades) >= 2:
        shown = ", ".join(trades[:3])
        extra = f" (including {shown})"
    else:
        extra = ""
    if area:
        area_bit = f" across {', '.join(area[:4])}"
        if len(area) > 4:
            area_bit += ", and nearby"
    else:
        area_bit = f" in {p['city']}"
    return f"Your focus on {label}{extra}{area_bit} lines up with the demand we see on Renovessa."


def onboarding_offer(p: dict) -> str:
    jobs = trade_jobs_phrase(p["tradeLabel"])
    company = p["company"]
    city = p["city"]
    role = (p.get("role") or "unknown").lower()

    owner_bit = ""
    if role in {"owner", "officer"}:
        owner_bit = (
            "Since you're listed as the decision-maker on the license, "
            "I wanted to reach you directly. "
        )
    elif role == "salesperson":
        owner_bit = (
            "If you're not the owner, please forward this - they should see it. "
        )

    math = rating_math(p.get("googleRating"), p.get("googleReviewCount"))
    math_block = f"\n\n{math}" if math else ""

    return f"""{owner_bit}Renovessa matches verified homeowners in {city} and nearby MD/DC suburbs with vetted local pros. We don't sell leads lists - we onboard contractors onto renovessa.com, then route {jobs} to partners who can actually deliver.

For {company}, onboarding means:
1. A contractor profile on Renovessa so homeowners can request you for real projects.
2. Qualified job opportunities in your trade and service area - not tire-kickers collecting five quotes.
3. Optional reputation support (reviews + Google Business cleanup) so your online presence matches the quality of your work.{math_block}

The goal is simple: more of the right jobs on your calendar, with less time chasing ghosts."""


def cta_block(p: dict) -> str:
    return f"""If you're open to it, reply with one word:
- "yes" - I'll send the short onboarding steps for {p['company']}
- "info" - I'll share how the first jobs work
- "later" - I'll follow up after your busy stretch

Or apply directly here: [Apply]({PORTAL_URL})

Either way takes under two minutes. Looking forward to working with you."""


def build_subject(p: dict) -> str:
    company = p["company"]
    city = p["city"]
    label = p["tradeLabel"]
    rating = p.get("googleRating")
    vis = (p.get("googleVisibility") or "").lower()
    greeting = p["greetingName"]

    if rating and rating >= 4.5:
        return f"{company} - {city} {label} with a {rating:g}-star reputation"
    if not p.get("hasWebsite") and vis in {"low", "none", "unknown", ""}:
        return f"{greeting}, homeowners in {city} can't find {company} online"
    if p["fitTier"] == "hot":
        return f"Onboarding {company} for {label} jobs in {city}"
    return f"{greeting} - bring {company} onto Renovessa for {city} {label}"


def build_body(p: dict) -> str:
    greeting = p["greetingName"]
    return f"""Hi {greeting},

{presence_hook(p)}

{services_line(p)}

{onboarding_offer(p)}

{cta_block(p)}

{AGENT_NAME}
[Renovessa]({APP_URL})

P.S. This note is for {p['company']} specifically (MD license {p['licenseRegNumber'] or 'on file'}). If this landed in the wrong inbox, a quick forward to the owner helps both of us."""


def build_followup(p: dict) -> str:
    return f"""Hi {p['greetingName']},

Floating my last note back up - still happy to onboard {p['company']} for {trade_jobs_phrase(p['tradeLabel'])} in {p['city']}.

Reply "yes" and I'll send the steps, or apply at [Apply]({PORTAL_URL}).

{AGENT_NAME}
[Renovessa]({APP_URL})
"""


def wave_for(p: dict) -> str:
    if p["fitTier"] == "hot" and p["tradeCategory"] in {
        "Remodeling",
        "General Contracting",
        "Roofing",
        "Design-Build",
    }:
        return "A"
    if p["fitTier"] == "hot":
        return "B"
    if p["fitTier"] == "warm":
        return "C"
    return "D"


def prepare_person(raw: dict, email: str, alt_emails: list[str]) -> dict:
    licensed = title_case_name(raw.get("licensedName") or "")
    company = title_case_company(raw.get("canonicalName") or raw.get("tradeName") or "your company")
    city = (raw.get("city") or raw.get("market") or "your area").title()
    trades = raw.get("trades") or []
    category = raw.get("tradeCategory") or "Specialty"
    label = trade_label(category, trades)

    person = {
        "prospectId": raw.get("id"),
        "email": email,
        "altEmails": alt_emails,
        "company": company,
        "licensedName": licensed,
        "greetingName": greeting_name(licensed, raw.get("role") or ""),
        "role": raw.get("role") or "unknown",
        "tradeName": raw.get("tradeName") or "",
        "tradeCategory": category,
        "tradeLabel": label,
        "trades": trades,
        "city": city,
        "state": raw.get("state") or "MD",
        "zip": raw.get("zip") or "",
        "address": raw.get("address") or "",
        "licenseRegNumber": raw.get("licenseRegNumber") or "",
        "licenseExpiration": raw.get("licenseExpiration") or "",
        "phones": raw.get("phones") or [],
        "website": raw.get("website"),
        "hasPhone": bool(raw.get("hasPhone")),
        "hasWebsite": bool(raw.get("hasWebsite")),
        "hasEmail": True,
        "googleRating": raw.get("googleRating"),
        "googleReviewCount": raw.get("googleReviewCount"),
        "googleVisibility": raw.get("googleVisibility") or "unknown",
        "mapsUrl": raw.get("mapsUrl"),
        "bbbRating": raw.get("bbbRating"),
        "bbbUrl": raw.get("bbbUrl"),
        "serviceArea": raw.get("serviceArea") or [],
        "fitScore": raw.get("fitScore") or 0,
        "fitTier": raw.get("fitTier") or "cold",
        "matchStatus": raw.get("matchStatus") or "",
        "confidence": raw.get("confidence"),
        "outreachChannel": raw.get("outreachChannel") or "",
        "outreachCaution": raw.get("outreachCaution"),
        "market": raw.get("market") or city,
    }
    person["wave"] = wave_for(person)
    person["subject"] = build_subject(person)
    person["body"] = build_body(person)
    person["followUpSubject"] = f"re: {person['subject']}"
    person["followUpBody"] = build_followup(person)
    # Collapse accidental blank lines from optional blocks
    person["body"] = re.sub(r"\n{3,}", "\n\n", person["body"]).strip() + "\n"
    person["followUpBody"] = re.sub(r"\n{3,}", "\n\n", person["followUpBody"]).strip() + "\n"
    return person


def load_candidates() -> list[dict]:
    rows = json.loads(PROSPECTS.read_text(encoding="utf-8"))
    # Group by normalized email → keep highest fitScore / hot first
    by_email: dict[str, list[tuple[dict, str, list[str]]]] = {}

    for raw in rows:
        emails = [normalize_email(e) for e in (raw.get("emails") or []) if normalize_email(e)]
        if not emails:
            continue
        if (raw.get("outreachChannel") or "").lower() in SKIP_CHANNELS:
            continue
        if raw.get("matchStatus") == "likely_closed":
            continue
        primary = emails[0]
        alts = emails[1:]
        by_email.setdefault(primary, []).append((raw, primary, alts))

    chosen: list[dict] = []
    for email, group in by_email.items():
        # Prefer hot + higher fit + matched
        def score(item: tuple[dict, str, list[str]]) -> tuple:
            r = item[0]
            tier = {"hot": 3, "warm": 2, "cold": 1}.get(r.get("fitTier") or "cold", 0)
            matched = 1 if r.get("matchStatus") == "matched" else 0
            return (tier, matched, r.get("fitScore") or 0)

        raw, primary, alts = sorted(group, key=score, reverse=True)[0]
        # Merge alt emails from all group members
        all_alts = set(alts)
        for r, _, a in group:
            all_alts.update(a)
        all_alts.discard(primary)
        chosen.append(prepare_person(raw, primary, sorted(all_alts)))

    chosen.sort(key=lambda p: ({"A": 0, "B": 1, "C": 2, "D": 3}[p["wave"]], -p["fitScore"], p["company"]))
    return chosen


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


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    drafts = load_candidates()

    # Full JSON
    payload = {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "agentName": AGENT_NAME,
        "portalUrl": PORTAL_URL,
        "totalDrafts": len(drafts),
        "waves": dict(Counter(d["wave"] for d in drafts)),
        "byTrade": dict(Counter(d["tradeCategory"] for d in drafts)),
        "drafts": drafts,
    }
    (OUT_DIR / "email_drafts.json").write_text(
        json.dumps(payload, indent=2, ensure_ascii=False), encoding="utf-8"
    )

    # Review CSV
    write_csv(
        OUT_DIR / "email_drafts.csv",
        drafts,
        [
            "wave",
            "email",
            "altEmails",
            "company",
            "licensedName",
            "greetingName",
            "tradeCategory",
            "tradeLabel",
            "city",
            "fitTier",
            "fitScore",
            "googleRating",
            "googleReviewCount",
            "googleVisibility",
            "hasWebsite",
            "hasPhone",
            "licenseRegNumber",
            "subject",
            "body",
            "followUpSubject",
            "followUpBody",
            "prospectId",
        ],
    )

    # Contacts import CSV (Admin → Contacts → Import CSV)
    import_rows = []
    for d in drafts:
        import_rows.append(
            {
                "company_name": d["company"],
                "contact_person": d["licensedName"],
                "email": d["email"],
                "phone": (d["phones"][0] if d["phones"] else ""),
                "trade": d["tradeCategory"],
                "city": d["city"],
                "state": d["state"],
                "website": d["website"] or "",
                "service_zips": d["zip"],
                "source": "md-enriched-onboarding-2026-07",
                "rating": d["googleRating"] if d["googleRating"] is not None else "",
                "review_count": d["googleReviewCount"] if d["googleReviewCount"] is not None else "",
            }
        )
    write_csv(
        OUT_DIR / "contacts_import.csv",
        import_rows,
        [
            "company_name",
            "contact_person",
            "email",
            "phone",
            "trade",
            "city",
            "state",
            "website",
            "service_zips",
            "source",
            "rating",
            "review_count",
        ],
    )

    # Markdown preview (first of each wave + a few hot)
    lines = [
        "# Renovessa onboarding email drafts - preview",
        "",
        f"Generated: {payload['generatedAt']}",
        f"Total drafts: **{len(drafts)}**",
        f"Waves: {payload['waves']}",
        "",
    ]
    seen_waves = set()
    preview_ids = []
    for d in drafts:
        if d["wave"] not in seen_waves:
            preview_ids.append(d)
            seen_waves.add(d["wave"])
        if len(preview_ids) >= 8:
            break
    # add 2 with rating math if available
    for d in drafts:
        if d.get("googleRating") and d.get("googleReviewCount") and d not in preview_ids:
            preview_ids.append(d)
            if len(preview_ids) >= 10:
                break

    for i, d in enumerate(preview_ids, 1):
        lines += [
            f"## {i}. Wave {d['wave']} - {d['company']}",
            f"**To:** {d['email']}  ",
            f"**Trade:** {d['tradeCategory']} · **City:** {d['city']} · **Fit:** {d['fitScore']}/10",
            "",
            f"**Subject:** {d['subject']}",
            "",
            "```",
            d["body"].rstrip(),
            "```",
            "",
            "---",
            "",
        ]
    (OUT_DIR / "email_drafts_preview.md").write_text("\n".join(lines), encoding="utf-8")

    print(f"Drafts: {len(drafts)}")
    print(f"Waves: {payload['waves']}")
    print(f"Wrote:")
    print(f"  {OUT_DIR / 'email_drafts.json'}")
    print(f"  {OUT_DIR / 'email_drafts.csv'}")
    print(f"  {OUT_DIR / 'contacts_import.csv'}")
    print(f"  {OUT_DIR / 'email_drafts_preview.md'}")


if __name__ == "__main__":
    main()
