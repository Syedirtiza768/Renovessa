# Agent instructions — Renovessa

These rules apply to **any** AI agent or model working in this repo (Claude, Codex, Copilot, Cursor, Gemini, ...) — not just Claude Code. If your tool has its own instructions file (`CLAUDE.md`, `.cursorrules`, `.github/copilot-instructions.md`, ...), it should point back here rather than duplicating this content, so there's one place to keep current.

## What this project actually is

Renovessa is a single Next.js 15 (App Router, TypeScript) app: a verified home-improvement appointment marketplace for the DMV area, with a public estimate/RFQ site, homeowner/contractor/admin portals, and a bathroom-remodeling planner sub-product. PostgreSQL + Prisma, JWT cookie auth, SendGrid email, Twilio voice/SMS, Docker Compose on port 7090.

**A previous version of this file (and several files under `docs/context/`, `docs/architecture/`, `docs/backend/`, `docs/frontend/`, `docs/planning/`) described this repo as "documentation only, Phase 0, no code yet."** That was accurate on 2026-06-02. It has been false for a long time — the app is implemented and has real users/campaigns behind it. Do not trust the "no code exists" framing anywhere you see it; check [[docs/context/CURRENT_STATE.md]] first.

## Before non-trivial work

Read `docs/Home.md`. It's the map-of-content for an Obsidian vault rooted at this repo (`docs/`), which links to the pre-existing (and unevenly maintained) `docs/context/`, `docs/architecture/`, `docs/backend/`, `docs/frontend/`, `docs/operations/`, `docs/planning/`, `docs/marketing/`, and `docs/compliance/` folders, plus new index notes (`docs/context.md`, `docs/architecture.md`, `docs/backend.md`, `docs/frontend.md`, `docs/operations.md`, `docs/planning.md`, `docs/scripts-and-outreach.md`) that tell you which files in each folder are current vs. stale Phase-0 templates. Read the relevant index note before trusting an individual doc file — several of them actively contradict the real code.

`docs/context/CURRENT_STATE.md` and `docs/context/SYSTEM_MAP.md` are the two files in this vault kept genuinely in sync with the code; start there.

## After non-trivial work

If the change is architecturally significant — a new module, a changed data flow, a schema change, a non-obvious workaround — update the matching note (or add an entry to `docs/context/DECISION_LOG.md`, this repo's decision log) **before** considering the task done. Bump that note's status/`Last reviewed` line even if the content didn't need to change. Also keep the long-running per-session files current where relevant: `docs/context/PROGRESS_LOG.md` (append), `docs/context/AGENT_HANDOFF.md`, `docs/context/NEXT_STEPS.md`.

## Enforcement

A git pre-commit hook (`scripts/check-docs-freshness.mjs`, installed via `simple-git-hooks` — runs automatically after `npm install`, for any tool or human committing) checks staged diffs against `src/app`, `src/components`, `src/lib`, `prisma`, and `scripts`. If it judges a docs update is warranted and none was staged, it **blocks the commit**.

- The check calls the local `claude` CLI non-interactively to judge the actual diff (not just path-matching), to keep false positives/negatives low. If that CLI isn't available or isn't authenticated, it fails safe into a blocking generic reminder instead of silently passing.
- Override (only after actually checking): `SKIP_DOCS_CHECK=1 git commit ...`
- This is a local hook, so it can be bypassed with `git commit --no-verify`. There is no scheduled staleness-audit agent configured for this repo yet (unlike some sibling projects) — the pre-commit hook is currently the only automated backstop, so don't skip it casually.

## Commands

```bash
cp .env.example .env
npm install
docker compose up db -d
npm run db:push
npm run db:seed
npm run dev            # http://localhost:3000

# or full stack in Docker, matching production (port 7090)
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build

npm test                # vitest
npm run build           # prisma generate && next build
```

See `README.md` for demo account credentials and `docs/operations/DEPLOYMENT.md` for the real production deploy process (Ubuntu + Docker + Nginx + Certbot).

## Known repo hygiene notes

- `outputs/` (~1.6 GB of generated marketing assets) is currently untracked but **not** gitignored — it shows up in `git status` as untracked rather than being cleanly ignored. Worth a decision (ignore it, or move it out of the repo) rather than leaving it in this state.
- `scraper/` is intentionally gitignored (contains scraped third-party PII) — never force-add it.
