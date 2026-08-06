# Renovessa — Map of Content

**Last reviewed:** 2026-08-06

Entry point for the vault. Open this folder in Obsidian at the repo root (`F:\apps\renovessa`) for the graph view; any AI agent (Claude, Codex, Copilot, Cursor, Gemini, ...) can also read these as plain Markdown — see [[../AGENTS.md|AGENTS.md]].

## What this actually is

**Renovessa** is a single Next.js 15 (App Router, TypeScript) full-stack app: a verified home-improvement appointment marketplace for the DMV area (DC/MD/Northern VA). Homeowners get DMV cost estimates and submit RFQs; vetted contractors bid/accept appointments; an internal Ops team runs everything through an Admin Operations Command Center. PostgreSQL + Prisma, JWT cookie auth, SendGrid email, Twilio voice/SMS, Docker Compose deploy on port 7090. It is **not** a monorepo — one app, one `src/`, one `prisma/schema.prisma`.

**This does not match what `docs/context/PROJECT_OVERVIEW.md` and the old root `AGENTS.md` said** (they described a "documentation-only, Phase 0, no code yet" project). That was true on 2026-06-02. It has not been true for a long time — `docs/context/CURRENT_STATE.md` and `docs/context/SYSTEM_MAP.md` are the parts of this vault that were actually kept in sync with reality, and are the source of truth. A chunk of the original Phase-0 docs (see the per-folder notes below) were never updated after the MVP shipped and now actively contradict the code. Treat any doc marked **STALE** below as historical, not current.

## Start here

- [[../docs/context/CURRENT_STATE.md|context/CURRENT_STATE]] — what's actually built, right now. Read this first.
- [[../docs/context/SYSTEM_MAP.md|context/SYSTEM_MAP]] — architecture as implemented (accurate, has a mermaid diagram).
- [[../docs/context/FEATURE_REGISTRY.md|context/FEATURE_REGISTRY]] — feature-by-feature status.
- [[../docs/context/DECISION_LOG.md|context/DECISION_LOG]] — the decision log. **Note:** this repo already had a decision log here before this vault existed; rather than fork a second one at `docs/decisions.md` (PartsBazar360's path), this vault points at the existing one. Keep adding to it here.

## Areas

Renovessa's own `docs/` predates this vault and is organized by topic rather than by app/package (there's only one app). Each folder below has a short index note that tells you which files in that folder are current and which are stale Phase-0 templates — read the index before trusting an individual file.

- [[context|docs/context]] — living project state: current state, system map, feature registry, known issues, decision log, roadmap, handoffs
- [[architecture|docs/architecture]] — system design, database schema, auth/RBAC, integrations, security, API contracts
- [[backend|docs/backend]] — modules, services, background jobs (mostly stale — see note)
- [[frontend|docs/frontend]] — routes, components, state, UI/UX
- [[operations|docs/operations]] — setup, env vars, deployment, testing, troubleshooting, vendor management
- [[planning|docs/planning]] — requirements, phases, user roles/flows, the First-Job MVP plan, bathroom-remodeling implementation note
- [[scripts-and-outreach|scripts, scraper, data]] — the contractor-outreach tooling outside `src/` (previously undocumented)

## Other real content in this vault (not re-indexed, linked directly)

- `docs/marketing/SEO_STRATEGY_DMV.md` — large, current DMV organic-search strategy (1,300+ lines; strategy complete, some rollout items still planned)
- `docs/compliance/substantiation/` — advertising-claim substantiation process: `README.md` (the rules), `OBJECTIVE_CLAIM_REGISTER.md`, `ESTIMATE_RANGE_REGISTER.md`, `CHANGE_LOG.md`. This is load-bearing for anything that publishes a number or a claim on the public site — read it before touching `src/lib/estimate-substantiation.ts` or public copy.
- `docs/Renovessa_Product_Blueprint.docx` / `docs/blueprint_extracted.txt` — the original product blueprint the MVP was built from.

## Keeping this vault alive

This map is only useful if it stays synced with the code — which is exactly the failure mode a chunk of the pre-existing `docs/` fell into (see "What this actually is" above). When you (or an AI agent) make an architecturally significant change — new module, new data flow, a non-obvious workaround, a schema change — update the relevant note (bump its `Last reviewed`/status line even if content didn't change) or add an entry to the decision log, **before** considering the task done. See [[../AGENTS.md|AGENTS.md]] for the enforcement hook that checks this on commit.
