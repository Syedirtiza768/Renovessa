# AGENTS.md — Instructions for AI Agents

Read this file **before** making any changes to the Renovessa project.

## What This Project Is

**Renovessa** is a new software project in early planning. The repository currently contains **documentation only** — no application code, dependencies, or runtime configuration yet.

The working hypothesis (needs product confirmation) is a platform related to **renovation project management** — helping homeowners, contractors, or teams plan, track, and deliver renovation work. Treat all product details as **assumptions** until confirmed in `docs/planning/INITIAL_BRIEF.md` and `docs/context/PRODUCT_REQUIREMENTS.md`.

## Project Type

**New Project** — Phase 0 (documentation and planning foundation).

## Current Development Status

| Area | Status |
|------|--------|
| Documentation structure | Complete |
| Product requirements | Blueprint-driven MVP |
| Architecture | Implemented (Next.js + PostgreSQL) |
| Frontend | MVP implemented |
| Backend | MVP implemented |
| Database | Prisma schema + seed data |
| Deployment | Docker Compose on port 7090 |

## Tech Stack

| Layer | Choice | Status |
|-------|--------|--------|
| Frontend/Backend | Next.js 15 (App Router), TypeScript | **Accepted** — 2026-06-02 |
| Database | PostgreSQL + Prisma | **Accepted** |
| Auth | JWT session cookies (jose) | **Accepted** |
| Styling | Tailwind CSS 4 (blueprint design system) | **Accepted** |
| Deploy | Docker Compose, port **7090** | **Accepted** |

## Important Commands

```bash
# Docker (production-like, port 7090)
docker compose up --build

# Local development
cp .env.example .env
npm install
docker compose up db -d
npm run db:push
npm run db:seed
npm run dev

# Database
npm run db:push
npm run db:seed
```

```txt
/docs/context/       — Current state, features, roadmap, handoff (read first)
/docs/planning/      — Requirements, phases, user roles, flows
/docs/architecture/  — System design, schema, APIs, security
/docs/frontend/      — UI/UX, routes, components, state
/docs/backend/       — Modules, services, models, jobs
/docs/operations/    — Setup, env, testing, deployment
```

## Required Reading Order

1. `AGENTS.md` (this file)
2. `docs/context/CURRENT_STATE.md`
3. `docs/context/SYSTEM_MAP.md`
4. `docs/context/FEATURE_REGISTRY.md`
5. Task-specific docs (architecture, planning, frontend, backend, operations)

## Important Commands

No application commands exist yet. When implementation begins, update this section with real install, dev, build, test, and database commands.

## Documentation Update Rules

After **every meaningful session**, update:

- `docs/context/CURRENT_STATE.md`
- `docs/context/PROGRESS_LOG.md` (append dated entry)
- `docs/context/AGENT_HANDOFF.md`
- `docs/context/NEXT_STEPS.md`

Also update feature, architecture, API, or operations docs when those areas change.

**Rule:** The codebase is the source of truth when code exists. Until then, documentation must clearly separate **Planned** from **Implemented**. Never describe planned work as completed.

## Coding Conventions

Not established yet. When stack is chosen:

1. Record conventions in this file
2. Add lint/format config to the repo
3. Match patterns in existing code

## Testing Expectations

Not applicable until Phase 1+. See `docs/operations/TESTING.md`.

## Known Risks

- Product scope undefined — risk of building the wrong product
- Tech stack not chosen — risk of rework
- Name-based assumptions about renovation domain may be wrong

See `docs/context/KNOWN_ISSUES.md`.

## What Not To Change Without Review

- Accepted decisions in `docs/context/DECISION_LOG.md`
- Product scope in `docs/context/PRODUCT_REQUIREMENTS.md` (confirm with stakeholder first)
- Security-related architecture in `docs/architecture/SECURITY.md`

## Current Priorities

1. Confirm product vision and target users with stakeholder
2. Complete Phase 0 documentation
3. Accept tech stack decision
4. Begin Phase 1 foundation (scaffold only after decisions)

## Handoff Process

Before ending a session:

1. Update `CURRENT_STATE.md`, `PROGRESS_LOG.md`, `AGENT_HANDOFF.md`, `NEXT_STEPS.md`
2. Log decisions in `DECISION_LOG.md`
3. Log new risks in `KNOWN_ISSUES.md`
4. Use the session summary format in the project context prompt

## How To Continue (Next Agent)

1. Read `docs/context/AGENT_HANDOFF.md` and `docs/context/NEXT_STEPS.md`
2. Ask the user to confirm or correct assumptions in `docs/planning/INITIAL_BRIEF.md`
3. Do not implement features until Phase 0 is **Complete** and Phase 1 decisions are **Accepted**
