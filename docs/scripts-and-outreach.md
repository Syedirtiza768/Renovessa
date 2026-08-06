# scripts, scraper, data — contractor outreach tooling

**Last reviewed:** 2026-08-06

No existing doc in `docs/` covers this area — it lives entirely outside `src/`. This note is new; written by walking the directories and the files below, not by reading every line of code, so treat file-level purposes as best-effort and verify before relying on them.

## `scraper/` (gitignored — PII, not deployed)

Python contractor lead-generation scraper. Per `.gitignore`: *"Local outreach scraper — contains scraped third-party contact data (PII). Do NOT commit to this public repo."* Never staged/committed, so it's outside the `check-docs-freshness` hook's reach entirely.

- `run.py` — orchestrator/CLI: `collect` (Phase 1, Google Maps via Playwright), `emails` (Phase 2, extract emails from contractor sites), `status`, `csv` (Phase 3, write final CSV), `all`.
- `maps_collector.py`, `email_extractor.py`, `state.py` — phase implementations and run-state tracking.
- `scrape_review_counts.py`, `import_review_counts.py`, `_rescrape_names.py`, `_test_maps.py` — supporting/one-off scripts.
- `dmv_contractor_emails.csv`, `data/` — scraped output (PII; gitignored).
- `icebreaker_email_template.md` — outreach copy template.

## `scripts/` (tracked)

One-off TypeScript/Python/shell scripts, mostly for contractor enrichment, RFQ pilot email campaigns, and server operations. Referenced from root `package.json` scripts where wired up; run the rest directly with `tsx`/`python`.

| Script | Purpose (best-effort, verify before relying) |
|---|---|
| `enrich_contractors_openrouter.py`, `model_bakeoff_contractor_enrich.py` | Enrich scraped contractor prospects via OpenRouter LLM calls; `model_bakeoff_*` files compare model choices for this task. |
| `generate_onboarding_email_drafts.py`, `generate_rfq_pilot_50_emails.py` | Generate personalized onboarding / RFQ-pilot-50 outreach email drafts from enriched prospect data. |
| `generate-rfq-pilot-15-campaign.ts` (`npm run campaign:generate-pilot15`) | Selects the 15-company Pilot 15 cohort (hardcoded `selectedRanks`) from the Pilot 50 drafts and prospects, renders final campaign copy to `data/contractor_enrichment/rfq_pilot_15_campaign.*`. |
| `verify-rfq-pilot-15-campaign.ts` (`npm run campaign:verify-pilot15`) | Validates the generated Pilot 15 campaign — exact count, trade allocation, unique companies/addresses, active licenses, no outreach cautions, required CTA/disclaimer content, no prohibited claims. Referenced as the real test coverage for this campaign in `docs/operations/TESTING.md`. |
| `prisma/prepare-rfq-pilot-15.ts` (`npm run campaign:prepare-pilot15`) | Loads the verified campaign JSON into the database (`ContactTag`-tagged prospective-contractor contacts) ahead of sending. |
| `import_contacts_from_csv.ts`, `import_contacts_on_server.sh` | Bulk-import contacts (e.g. scraped/enriched prospects) into the DB, including a server-side wrapper. |
| `create-campaign.sql` | Raw SQL for campaign setup — check before running against production. |
| `seed-bathroom-content.ts` (`npm run bathroom:seed-content`) | Seeds bathroom-remodeling authority content (cost/permits/planning-guide articles) — see `docs/planning/BATHROOM_REMODELING_IMPLEMENTATION_NOTE.md`. |
| `reset-pw.js`, `reset-ray-password.ts` | Ad-hoc password reset utilities for specific accounts — look like one-off ops tools, not general-purpose. |
| `remote-deploy.sh`, `remote-redeploy.sh`, `remote-verify.sh` | Server-side deploy helpers (git pull + rebuild, bathroom feature-flag enforcement, verification) — companions to `docs/operations/DEPLOYMENT.md`, but not referenced from that doc. Worth cross-linking. |

## `data/contractor_enrichment/` (tracked, ~13 MB)

Enrichment run artifacts consumed by the scripts above and by `src/lib/bulkEmail.ts` / `src/lib/emailSegments.ts` (per `docs/architecture/INTEGRATIONS.md` and `docs/context/FEATURE_REGISTRY.md`'s Bulk Email Campaigns entry): `prospects.json`, `enriched.json`/`.csv`, `email_drafts.*`, `rfq_pilot_15_campaign.*`, `rfq_pilot_50_email_drafts.*`, `summary.json`. Some run-artifact files (`progress.jsonl`, `failed.jsonl`, `enriched.json`) are gitignored per the repo's `.gitignore` comment ("keep prospects.json + csv for the app").

## Open questions / TODO

- `remote-deploy.sh` / `remote-redeploy.sh` / `remote-verify.sh` aren't mentioned in `docs/operations/DEPLOYMENT.md` — confirm whether they're the actual production deploy path (vs. the manual `git pull` + `docker compose` steps documented there) and cross-link whichever is current.
- None of the enrichment/campaign scripts have documented preconditions (API keys, rate limits, cost) beyond what's inline in the code — worth capturing if this pipeline gets reused for future campaigns beyond Pilot 15/50.
- This note was written from directory structure and file names/headers, not a full code read — verify specifics before depending on them for anything production-sensitive (e.g. `create-campaign.sql`).
