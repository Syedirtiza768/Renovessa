"""OpenRouter model bake-off for contractor enrichment."""
from __future__ import annotations

import json
import os
import re
import time
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ENV_PATH = ROOT / ".env"

GROUND_TRUTH = {
    "canonical_contains": ["centerline"],
    "phones_any": ["2404985567", "3013054356", "2404281177"],
    "website_contains": ["centerlinedesignbuild"],
    "alternate_wma": True,
    "services_any": [
        "remodel",
        "design",
        "build",
        "addition",
        "kitchen",
        "bath",
        "roof",
        "commercial",
    ],
    "address_zip": "20850",
    "license": "98864",
}


def load_key() -> str:
    for line in ENV_PATH.read_text(encoding="utf-8").splitlines():
        if line.startswith("OPENROUTER_API_KEY="):
            return line.split("=", 1)[1].strip().strip('"')
    raise SystemExit("OPENROUTER_API_KEY not found in .env")


SYSTEM = """You are a contractor intelligence extractor for Renovessa.
Use web search results. Never invent contact data.
If unknown, return null and lower confidence.
Prefer the operating brand over the license trade name when both appear.
Return ONLY valid JSON matching the schema. No markdown."""

USER = """Enrich this Maryland licensed contractor/salesman registration.

SOURCE_RECORD:
{
  "licensed_name": "WILLIAM KRAUSE",
  "trade_name": "WMA CONTRACTORS INC",
  "address": "15209 FREDERICK RD",
  "city": "ROCKVILLE",
  "state": "MD",
  "zip": "20850",
  "license_reg_number": "98864",
  "license_expiration": "2027-04-20",
  "category": "CONTRACTOR/SALESMAN",
  "source_sheet": "Rockville"
}

Find: operating brand/DBA, phone, website, email, Google/Maps signals, BBB if any,
primary trades/services, service area. Resolve WMA vs any parent brand.

OUTPUT SCHEMA:
{
  "match": {
    "status": "matched|ambiguous|not_found|likely_closed",
    "confidence": 0.0,
    "canonical_business_name": null,
    "alternate_names": [],
    "licensed_person_role": "owner|officer|salesperson|unknown"
  },
  "contact": {
    "phones": [],
    "emails": [],
    "website": null,
    "primary_address": null
  },
  "google": {
    "business_profile_found": false,
    "maps_url": null,
    "rating": null,
    "review_count": null,
    "estimated_local_visibility": "high|medium|low|none|unknown"
  },
  "directories": {
    "bbb": {"url": null, "rating": null, "accredited": null}
  },
  "services": {
    "primary_trades": [],
    "service_area": [],
    "project_types": []
  },
  "renovessa_fit": {
    "fit_score": 0,
    "outreach_channel": "phone|web_form|email|skip",
    "outreach_caution": null
  },
  "sources": [{"title": "", "url": ""}],
  "data_quality": {"missing_fields": [], "conflicts": []}
}"""

MODELS = [
    "google/gemini-3.1-flash-lite",
    "google/gemini-2.5-flash-lite",
    "google/gemini-2.5-flash",
    "google/gemini-3-flash-preview",
    "openai/gpt-4.1-nano",
    "openai/gpt-4.1-mini",
    "anthropic/claude-haiku-4.5",
]


def digits(s: str) -> str:
    return re.sub(r"\D", "", s or "")


def extract_json(text: str) -> dict | None:
    if not text:
        return None
    text = text.strip()
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?\s*", "", text)
        text = re.sub(r"\s*```$", "", text)
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        m = re.search(r"\{[\s\S]*\}", text)
        if not m:
            return None
        try:
            return json.loads(m.group(0))
        except json.JSONDecodeError:
            return None


def score(payload: dict | None) -> dict:
    if not payload:
        return {
            "score": 0,
            "max": 10,
            "checks": {"parseable_json": False},
            "notes": ["unparseable"],
        }
    checks = {}
    notes = []
    match = payload.get("match") or {}
    contact = payload.get("contact") or {}
    services = payload.get("services") or {}

    canon = (match.get("canonical_business_name") or "").lower()
    checks["centerline_brand"] = any(x in canon for x in GROUND_TRUTH["canonical_contains"])
    if not checks["centerline_brand"]:
        alts = " ".join(match.get("alternate_names") or []).lower()
        checks["centerline_brand"] = "centerline" in alts
        if checks["centerline_brand"]:
            notes.append("centerline only in alternate_names")

    phones = [digits(p) for p in (contact.get("phones") or [])]
    phones += [digits(str(contact.get("primary_address") or ""))]
    flat_phones = "".join(phones)
    checks["correct_phone"] = any(p in flat_phones for p in GROUND_TRUTH["phones_any"])

    website = (contact.get("website") or "").lower()
    checks["correct_website"] = any(x in website for x in GROUND_TRUTH["website_contains"])

    blob = json.dumps(payload).lower()
    checks["mentions_wma"] = "wma" in blob
    checks["has_services"] = any(s in blob for s in GROUND_TRUTH["services_any"])
    checks["rockville_or_20850"] = "rockville" in blob or "20850" in blob
    checks["has_sources"] = bool(payload.get("sources"))
    checks["matched_status"] = (match.get("status") or "") == "matched"
    conf = match.get("confidence")
    checks["confidence_ge_0_6"] = isinstance(conf, (int, float)) and conf >= 0.6

    # hallucination penalty: invented emails that look fake
    emails = contact.get("emails") or []
    checks["no_obvious_fake_email"] = not any(
        e and ("example.com" in e.lower() or e.lower().endswith("@wma.com"))
        for e in emails
    )

    score_val = sum(1 for v in checks.values() if v)
    return {"score": score_val, "max": len(checks), "checks": checks, "notes": notes}


def call_model(api_key: str, model: str, with_web: bool) -> dict:
    body = {
        "model": model,
        "temperature": 0,
        "messages": [
            {"role": "system", "content": SYSTEM},
            {"role": "user", "content": USER},
        ],
        "response_format": {"type": "json_object"},
    }
    if with_web:
        body["plugins"] = [{"id": "web", "max_results": 5}]

    req = urllib.request.Request(
        "https://openrouter.ai/api/v1/chat/completions",
        data=json.dumps(body).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": "https://renovessa.local",
            "X-Title": "Renovessa contractor enrich bakeoff",
        },
        method="POST",
    )
    t0 = time.perf_counter()
    try:
        with urllib.request.urlopen(req, timeout=120) as resp:
            raw = json.loads(resp.read().decode("utf-8"))
        latency_ms = int((time.perf_counter() - t0) * 1000)
        err = None
    except Exception as e:
        latency_ms = int((time.perf_counter() - t0) * 1000)
        return {
            "model": model,
            "with_web": with_web,
            "ok": False,
            "error": str(e),
            "latency_ms": latency_ms,
        }

    choice = (raw.get("choices") or [{}])[0]
    message = choice.get("message") or {}
    content = message.get("content") or ""
    usage = raw.get("usage") or {}
    prompt_tokens = usage.get("prompt_tokens") or 0
    completion_tokens = usage.get("completion_tokens") or 0
    # OpenRouter may include cost in usage
    cost = usage.get("cost")
    if cost is None and isinstance(raw.get("usage"), dict):
        cost = raw["usage"].get("total_cost")

    payload = extract_json(content)
    scored = score(payload)
    annotations = message.get("annotations") or []

    return {
        "model": model,
        "with_web": with_web,
        "ok": True,
        "latency_ms": latency_ms,
        "prompt_tokens": prompt_tokens,
        "completion_tokens": completion_tokens,
        "reported_cost_usd": cost,
        "annotation_count": len(annotations),
        "score": scored["score"],
        "max_score": scored["max"],
        "checks": scored["checks"],
        "notes": scored["notes"],
        "payload": payload,
        "raw_preview": (content or "")[:500],
        "id": raw.get("id"),
    }


def estimate_cost(prompt_t: int, completion_t: int, in_price: float, out_price: float) -> float:
    return prompt_t * in_price + completion_t * out_price


PRICES = {
    # per-token from OpenRouter list
    "google/gemini-3.1-flash-lite": (0.00000025, 0.0000015),
    "google/gemini-2.5-flash-lite": (0.0000001, 0.0000004),
    "google/gemini-2.5-flash": (0.0000003, 0.0000025),
    "google/gemini-3-flash-preview": (0.0000005, 0.000003),
    "openai/gpt-4.1-nano": (0.0000001, 0.0000004),
    "openai/gpt-4.1-mini": (0.0000004, 0.0000016),
    "anthropic/claude-haiku-4.5": (0.000001, 0.000005),
}


def main() -> None:
    api_key = load_key()
    results = []
    # Primary: with web (required for this task)
    for model in MODELS:
        print(f"Calling {model} + web ...", flush=True)
        row = call_model(api_key, model, with_web=True)
        if row.get("ok"):
            pin, pout = PRICES[model]
            row["est_token_cost_usd"] = round(
                estimate_cost(row["prompt_tokens"], row["completion_tokens"], pin, pout),
                6,
            )
            # web plugin approx Exa $0.005 if non-native; native may differ — flag separately
            row["est_web_addon_usd"] = 0.005
            row["est_total_usd"] = round(row["est_token_cost_usd"] + row["est_web_addon_usd"], 6)
            row["est_1096_usd"] = round(row["est_total_usd"] * 1096, 2)
        results.append(row)
        time.sleep(0.4)

    # Control: best cheap model WITHOUT web to show grounding necessity
    control_model = "google/gemini-3.1-flash-lite"
    print(f"Calling {control_model} WITHOUT web (control) ...", flush=True)
    control = call_model(api_key, control_model, with_web=False)
    if control.get("ok"):
        pin, pout = PRICES[control_model]
        control["est_token_cost_usd"] = round(
            estimate_cost(control["prompt_tokens"], control["completion_tokens"], pin, pout),
            6,
        )
        control["est_web_addon_usd"] = 0.0
        control["est_total_usd"] = control["est_token_cost_usd"]
        control["est_1096_usd"] = round(control["est_total_usd"] * 1096, 2)
    results.append(control)

    out = ROOT / "scripts" / "model_bakeoff_results.json"
    out.write_text(json.dumps(results, indent=2), encoding="utf-8")
    print(f"\nWrote {out}")

    # Compact table
    print("\nMODEL\tWEB\tSCORE\tLAT_MS\tTOK_IN\tTOK_OUT\tEST_$/row\tEST_$/1096")
    for r in results:
        if not r.get("ok"):
            print(f"{r['model']}\t{r['with_web']}\tERR\t{r.get('latency_ms')}\t{r.get('error')}")
            continue
        print(
            f"{r['model']}\t{r['with_web']}\t{r['score']}/{r['max_score']}\t{r['latency_ms']}\t"
            f"{r['prompt_tokens']}\t{r['completion_tokens']}\t{r['est_total_usd']}\t{r['est_1096_usd']}"
        )


if __name__ == "__main__":
    main()
