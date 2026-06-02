# Setup

> **Status:** Planned — no application to install yet.

## Prerequisites (Expected for Phase 1)

**Needs Decision** based on stack. Typical:

- Node.js 20+ LTS
- Package manager: npm, pnpm, or yarn
- PostgreSQL 15+ (local or Docker)
- Git

## Installation (Future)

When Phase 1 scaffold exists, update this section with real steps:

```bash
# Placeholder — not yet valid
git clone <repository-url>
cd renovessa
cp .env.example .env
# Edit .env with local values
npm install
npm run db:migrate
npm run dev
```

## Database Setup (Planned)

1. Create PostgreSQL database
2. Set `DATABASE_URL` in `.env`
3. Run migrations: `npm run db:migrate` (command TBD)
4. Optional seed: `npm run db:seed` (command TBD)

## Seed Data

**None exists.**

When demo seed is added:

- Document accounts here
- Mark **Demo Only — Remove or Replace Before Production**
- Document reset command

## Reset Local Database (Planned)

```bash
# TBD when tooling exists
npm run db:reset
```

## Current State

Documentation-only repository. Follow `docs/context/NEXT_STEPS.md` before expecting install steps to work.
