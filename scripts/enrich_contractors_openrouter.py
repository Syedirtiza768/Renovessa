"""
Batch-enrich Gaithersburg + Rockville contractors via OpenRouter.

Config (bake-off winner):
  model: google/gemini-3.1-flash-lite
  plugins: web / exa / max_results 8
  temperature: 0
  response_format: json_object

Usage:
  python scripts/enrich_contractors_openrouter.py
  python scripts/enrich_contractors_openrouter.py --concurrency 4 --limit 20
"""
from __future__ import annotations

import argparse
import csv
import json
import re
import threading
import time
import urllib.error
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
from pathlib import Path

import openpyxl

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_XLSX = Path(r"C:\Users\Irtaza Hassan\Downloads\Gaithersburg and Rockville.xlsx")
OUT_DIR = ROOT / "data" / "contractor_enrichment"
PROGRESS_PATH = OUT_DIR / "progress.jsonl"
RESULTS_JSON = OUT_DIR / "enriched.json"
RESULTS_CSV = OUT_DIR / "enriched.csv"
FAILED_PATH = OUT_DIR / "failed.jsonl"
SUMMARY_PATH = OUT_DIR / "summary.json"

MODEL = "google/gemini-3.1-flash-lite"
WEB_PLUGIN = {"id": "web", "engine": "exa", "max_results": 8}

SYSTEM = """You are a contractor intelligence extractor for Renovessa.
Use web search results. Never invent phones, emails, or websites.
If a field is not supported by sources, return null and lower confidence.
Prefer the operating brand over the license trade name when both appear.
Distinguish licensed individual vs company vs Google Business Profile entity.
Return ONLY a single valid JSON object. No markdown. No array wrapper."""

print_lock = threading.Lock()
write_lock = threading.Lock()


def load_api_key() -> str:
    for line in (ROOT / ".env").read_text(encoding="utf-8").splitlines():
        if line.startswith("OPENROUTER_API_KEY="):
            return line.split("=", 1)[1].strip().strip('"')
    raise SystemExit("OPENROUTER_API_KEY not found in .env")


def clean_address(raw: str | None) -> str:
    if not raw:
        return ""
    text = str(raw).replace("\r\n", "\n").replace("\r", "\n")
    lines = [ln.strip() for ln in text.split("\n") if ln.strip()]
    # Drop leading county/MHIC-style codes like 05-136655
    filtered = []
    for ln in lines:
        if re.fullmatch(r"05[-\s]?\d{2,}", ln, flags=re.I):
            continue
        if re.fullmatch(r"MONTGOMERY COUNTY\s+05[-\s]?\d+", ln, flags=re.I):
            continue
        filtered.append(ln)
    return ", ".join(filtered) if filtered else text.strip()


def load_rows(xlsx: Path) -> list[dict]:
    wb = openpyxl.load_workbook(xlsx, read_only=True, data_only=True)
    rows: list[dict] = []
    for sheet in ("Gaithersburg", "Rockville"):
        ws = wb[sheet]
        for i, row in enumerate(ws.iter_rows(values_only=True)):
            if i == 0 or not row or not row[0]:
                continue
            zip_val = row[5]
            reg_val = row[8]
            zip_s = str(zip_val).replace(".0", "") if zip_val is not None else ""
            reg_s = str(reg_val).replace(".0", "") if reg_val is not None else ""
            exp = row[6]
            if hasattr(exp, "date"):
                exp_s = exp.date().isoformat()
            else:
                exp_s = str(exp) if exp is not None else ""
            city = str(row[3] or "").strip().rstrip(",").replace(", MD.", "").strip()
            licensed_name = str(row[0] or "").strip()
            trade_name = str(row[1] or "").strip()
            # Same person can appear under multiple trade names with one reg #.
            record = {
                "id": f"{sheet}:{reg_s or i}:{licensed_name}:{trade_name}",
                "source_sheet": sheet,
                "licensed_name": licensed_name,
                "trade_name": trade_name,
                "address_raw": str(row[2] or "").strip(),
                "address": clean_address(row[2]),
                "city": city.upper(),
                "state": str(row[4] or "MD").strip(),
                "zip": zip_s,
                "license_expiration": exp_s,
                "category": str(row[7] or "").strip(),
                "license_reg_number": reg_s,
                "suffix": str(row[9] or "").strip() if len(row) > 9 else "",
            }
            rows.append(record)
    wb.close()
    return rows


def build_user_prompt(rec: dict) -> str:
    city = rec["city"].title()
    return f"""Enrich this Maryland licensed contractor/salesman registration.

SOURCE_RECORD:
{json.dumps({
    "licensed_name": rec["licensed_name"],
    "trade_name": rec["trade_name"],
    "address": rec["address"],
    "city": rec["city"],
    "state": rec["state"],
    "zip": rec["zip"],
    "license_reg_number": rec["license_reg_number"],
    "license_expiration": rec["license_expiration"],
    "category": rec["category"],
    "source_sheet": rec["source_sheet"],
}, indent=2)}

SEARCH INTENT:
1) Exact company match near {city} MD using trade_name + address + license number
2) Alternate / DBA / parent brand names
3) Official website + phone + email if public
4) Google Business Profile / Maps signals if available
5) BBB / Angi / Yelp presence if any
6) Primary trades/services and service area
7) Whether this is salesman-only vs operating GC/remodeler

LOCAL RANK PROBES:
- "general contractor {city} MD"
- "home remodeling {city} MD"
- "{{best_brand_name}} {city}"

OUTPUT SCHEMA:
{{
  "match": {{
    "status": "matched|ambiguous|not_found|likely_closed",
    "confidence": 0.0,
    "canonical_business_name": null,
    "alternate_names": [],
    "licensed_person_role": "owner|officer|salesperson|unknown",
    "entity_notes": null
  }},
  "contact": {{
    "phones": [],
    "emails": [],
    "website": null,
    "contact_form_only": false,
    "primary_address": null,
    "other_addresses": []
  }},
  "google": {{
    "business_profile_found": false,
    "maps_url": null,
    "rating": null,
    "review_count": null,
    "estimated_local_visibility": "high|medium|low|none|unknown",
    "ranks_for_brand_query": null,
    "ranks_for_category_queries": "strong|weak|none|unknown",
    "evidence": []
  }},
  "directories": {{
    "bbb": {{"url": null, "rating": null, "accredited": null}},
    "angi": null,
    "yelp": null,
    "other": []
  }},
  "services": {{
    "primary_trades": [],
    "service_types": [],
    "service_area": [],
    "project_types": [],
    "naics_guess": null
  }},
  "licensing": {{
    "md_reg_number_confirmed": null,
    "other_licenses": []
  }},
  "renovessa_fit": {{
    "fit_score": 0,
    "fit_reasons": [],
    "outreach_channel": "phone|web_form|email|skip",
    "outreach_caution": null
  }},
  "sources": [{{"title": "", "url": "", "used_for": []}}],
  "data_quality": {{
    "missing_fields": [],
    "conflicts": []
  }}
}}"""


def extract_json(text: str) -> dict | None:
    if not text:
        return None
    text = text.strip()
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?\s*", "", text)
        text = re.sub(r"\s*```$", "", text)
    try:
        payload = json.loads(text)
    except json.JSONDecodeError:
        m = re.search(r"\{[\s\S]*\}", text)
        if not m:
            return None
        try:
            payload = json.loads(m.group(0))
        except json.JSONDecodeError:
            return None
    if isinstance(payload, list):
        payload = payload[0] if payload and isinstance(payload[0], dict) else None
    return payload if isinstance(payload, dict) else None


def call_openrouter(api_key: str, rec: dict, timeout: int = 120) -> dict:
    body = {
        "model": MODEL,
        "temperature": 0,
        "messages": [
            {"role": "system", "content": SYSTEM},
            {"role": "user", "content": build_user_prompt(rec)},
        ],
        "response_format": {"type": "json_object"},
        "plugins": [WEB_PLUGIN],
    }
    req = urllib.request.Request(
        "https://openrouter.ai/api/v1/chat/completions",
        data=json.dumps(body).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": "https://renovessa.local",
            "X-Title": "Renovessa contractor enrichment",
        },
        method="POST",
    )
    t0 = time.perf_counter()
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        raw = json.loads(resp.read().decode("utf-8"))
    latency_ms = int((time.perf_counter() - t0) * 1000)
    message = ((raw.get("choices") or [{}])[0].get("message") or {})
    content = message.get("content") or ""
    usage = raw.get("usage") or {}
    payload = extract_json(content)
    return {
        "ok": payload is not None,
        "latency_ms": latency_ms,
        "prompt_tokens": usage.get("prompt_tokens") or 0,
        "completion_tokens": usage.get("completion_tokens") or 0,
        "reported_cost_usd": usage.get("cost"),
        "enrichment": payload,
        "raw_preview": content[:400] if payload is None else None,
        "response_id": raw.get("id"),
    }


def enrich_one(api_key: str, rec: dict, max_retries: int = 3) -> dict:
    last_err = None
    for attempt in range(1, max_retries + 1):
        try:
            result = call_openrouter(api_key, rec)
            return {
                **rec,
                "enriched_at": datetime.now(timezone.utc).isoformat(),
                "attempt": attempt,
                "ok": result["ok"],
                "error": None if result["ok"] else "unparseable_json",
                "latency_ms": result["latency_ms"],
                "prompt_tokens": result["prompt_tokens"],
                "completion_tokens": result["completion_tokens"],
                "reported_cost_usd": result["reported_cost_usd"],
                "response_id": result["response_id"],
                "enrichment": result["enrichment"],
                "raw_preview": result.get("raw_preview"),
            }
        except urllib.error.HTTPError as e:
            body = e.read().decode("utf-8", errors="replace")[:500]
            last_err = f"HTTP {e.code}: {body}"
            # Rate limit / overloaded — backoff
            sleep_s = min(2 ** attempt, 20)
            if e.code in (429, 502, 503, 504):
                time.sleep(sleep_s)
                continue
            if e.code >= 500:
                time.sleep(sleep_s)
                continue
            break
        except Exception as e:
            last_err = str(e)
            time.sleep(min(2 ** attempt, 10))
    return {
        **rec,
        "enriched_at": datetime.now(timezone.utc).isoformat(),
        "attempt": max_retries,
        "ok": False,
        "error": last_err or "unknown_error",
        "latency_ms": None,
        "prompt_tokens": 0,
        "completion_tokens": 0,
        "reported_cost_usd": None,
        "response_id": None,
        "enrichment": None,
        "raw_preview": None,
    }


def load_done_ids(path: Path) -> set[str]:
    done: set[str] = set()
    if not path.exists():
        return done
    with path.open(encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                obj = json.loads(line)
            except json.JSONDecodeError:
                continue
            if obj.get("ok") and obj.get("id"):
                done.add(obj["id"])
    return done


def append_jsonl(path: Path, obj: dict) -> None:
    with write_lock:
        with path.open("a", encoding="utf-8") as f:
            f.write(json.dumps(obj, ensure_ascii=False) + "\n")


def flatten_row(obj: dict) -> dict:
    e = obj.get("enrichment") or {}
    match = e.get("match") or {}
    contact = e.get("contact") or {}
    google = e.get("google") or {}
    services = e.get("services") or {}
    fit = e.get("renovessa_fit") or {}
    dirs = e.get("directories") or {}
    bbb = dirs.get("bbb") or {}
    return {
        "id": obj.get("id"),
        "source_sheet": obj.get("source_sheet"),
        "licensed_name": obj.get("licensed_name"),
        "trade_name": obj.get("trade_name"),
        "address": obj.get("address"),
        "city": obj.get("city"),
        "state": obj.get("state"),
        "zip": obj.get("zip"),
        "license_reg_number": obj.get("license_reg_number"),
        "license_expiration": obj.get("license_expiration"),
        "ok": obj.get("ok"),
        "error": obj.get("error"),
        "match_status": match.get("status"),
        "confidence": match.get("confidence"),
        "canonical_business_name": match.get("canonical_business_name"),
        "alternate_names": "; ".join(match.get("alternate_names") or []),
        "licensed_person_role": match.get("licensed_person_role"),
        "phones": "; ".join(contact.get("phones") or []),
        "emails": "; ".join(contact.get("emails") or []),
        "website": contact.get("website"),
        "primary_address": contact.get("primary_address"),
        "google_rating": google.get("rating"),
        "google_review_count": google.get("review_count"),
        "google_visibility": google.get("estimated_local_visibility"),
        "maps_url": google.get("maps_url"),
        "bbb_rating": bbb.get("rating"),
        "bbb_url": bbb.get("url"),
        "primary_trades": "; ".join(services.get("primary_trades") or []),
        "service_area": "; ".join(services.get("service_area") or []),
        "fit_score": fit.get("fit_score"),
        "outreach_channel": fit.get("outreach_channel"),
        "outreach_caution": fit.get("outreach_caution"),
        "prompt_tokens": obj.get("prompt_tokens"),
        "completion_tokens": obj.get("completion_tokens"),
        "reported_cost_usd": obj.get("reported_cost_usd"),
        "latency_ms": obj.get("latency_ms"),
        "enriched_at": obj.get("enriched_at"),
    }


def write_exports(progress_path: Path) -> dict:
    rows: list[dict] = []
    with progress_path.open(encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                rows.append(json.loads(line))
            except json.JSONDecodeError:
                continue

    # Keep latest per id
    latest: dict[str, dict] = {}
    for r in rows:
        rid = r.get("id")
        if rid:
            latest[rid] = r
    items = list(latest.values())

    RESULTS_JSON.write_text(json.dumps(items, indent=2, ensure_ascii=False), encoding="utf-8")

    flat = [flatten_row(r) for r in items]
    if flat:
        with RESULTS_CSV.open("w", encoding="utf-8", newline="") as f:
            writer = csv.DictWriter(f, fieldnames=list(flat[0].keys()))
            writer.writeheader()
            writer.writerows(flat)

    ok_n = sum(1 for r in items if r.get("ok"))
    fail_n = len(items) - ok_n
    phone_n = sum(1 for r in flat if r.get("phones"))
    web_n = sum(1 for r in flat if r.get("website"))
    matched_n = sum(1 for r in flat if r.get("match_status") == "matched")
    costs = [r.get("reported_cost_usd") for r in items if isinstance(r.get("reported_cost_usd"), (int, float))]
    # fallback estimate: token cost + $0.005 web
    est = 0.0
    for r in items:
        pt = r.get("prompt_tokens") or 0
        ct = r.get("completion_tokens") or 0
        est += pt * 0.00000025 + ct * 0.0000015 + (0.005 if r.get("ok") or r.get("prompt_tokens") else 0)

    summary = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "model": MODEL,
        "web_plugin": WEB_PLUGIN,
        "total_unique": len(items),
        "ok": ok_n,
        "failed": fail_n,
        "matched": matched_n,
        "with_phone": phone_n,
        "with_website": web_n,
        "reported_cost_sum_usd": round(sum(costs), 4) if costs else None,
        "estimated_cost_usd": round(est, 4),
        "outputs": {
            "progress": str(PROGRESS_PATH),
            "json": str(RESULTS_JSON),
            "csv": str(RESULTS_CSV),
        },
    }
    SUMMARY_PATH.write_text(json.dumps(summary, indent=2), encoding="utf-8")
    return summary


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--xlsx", type=Path, default=DEFAULT_XLSX)
    parser.add_argument("--concurrency", type=int, default=4)
    parser.add_argument("--limit", type=int, default=0, help="Optional cap for testing")
    parser.add_argument("--sheet", choices=["Gaithersburg", "Rockville", "all"], default="all")
    parser.add_argument("--reset", action="store_true", help="Ignore prior progress")
    args = parser.parse_args()

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    api_key = load_api_key()
    all_rows = load_rows(args.xlsx)
    if args.sheet != "all":
        all_rows = [r for r in all_rows if r["source_sheet"] == args.sheet]
    if args.limit and args.limit > 0:
        all_rows = all_rows[: args.limit]

    if args.reset and PROGRESS_PATH.exists():
        PROGRESS_PATH.unlink()
        if FAILED_PATH.exists():
            FAILED_PATH.unlink()

    done = load_done_ids(PROGRESS_PATH)
    pending = [r for r in all_rows if r["id"] not in done]

    print(f"Total in scope: {len(all_rows)}")
    print(f"Already done:   {len(done)}")
    print(f"Pending:        {len(pending)}")
    print(f"Model:          {MODEL}")
    print(f"Concurrency:    {args.concurrency}")
    print(f"Output dir:     {OUT_DIR}")

    if not pending:
        summary = write_exports(PROGRESS_PATH)
        print("Nothing pending. Exports refreshed.")
        print(json.dumps(summary, indent=2))
        return

    started = time.perf_counter()
    ok_count = 0
    fail_count = 0
    completed = 0

    with ThreadPoolExecutor(max_workers=args.concurrency) as pool:
        futures = {pool.submit(enrich_one, api_key, rec): rec for rec in pending}
        for fut in as_completed(futures):
            rec = futures[fut]
            try:
                result = fut.result()
            except Exception as e:
                result = {
                    **rec,
                    "enriched_at": datetime.now(timezone.utc).isoformat(),
                    "ok": False,
                    "error": str(e),
                    "enrichment": None,
                }
            append_jsonl(PROGRESS_PATH, result)
            if not result.get("ok"):
                append_jsonl(FAILED_PATH, result)
                fail_count += 1
            else:
                ok_count += 1
            completed += 1
            elapsed = time.perf_counter() - started
            rate = completed / elapsed if elapsed else 0
            eta = (len(pending) - completed) / rate if rate else 0
            with print_lock:
                status = "OK" if result.get("ok") else "FAIL"
                name = result.get("trade_name") or result.get("licensed_name")
                print(
                    f"[{completed}/{len(pending)}] {status} {result.get('source_sheet')} "
                    f"{name[:40]!r} {result.get('latency_ms')}ms "
                    f"ok={ok_count} fail={fail_count} eta={eta/60:.1f}m",
                    flush=True,
                )

    summary = write_exports(PROGRESS_PATH)
    print("\nDone.")
    print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    main()
