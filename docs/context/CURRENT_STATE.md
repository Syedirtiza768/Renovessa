# Current State

> Last updated: 2026-07-22

## Phase

**Phase 1 — Foundation + MVP** (implemented from Product Blueprint)

## What Exists

### Application Code
- Next.js 15 full-stack app in `src/`
- PostgreSQL schema via Prisma (`prisma/schema.prisma`)
- Demo seed data (`prisma/seed.ts`) aligned with blueprint demo accounts
- Docker deployment on port **7090** (`docker-compose.yml`, `Dockerfile`)

### Public Website
- Home landing page with service selector, how-it-works, trust pillars
- **Estimate wizard** (replaces hero AI chatbot) — trade-specific scoping, DMV ballpark, RFQ submit → contractor bids
- Multi-step homeowner intake form with TCPA consent (short-form fallback)
- Ops phone: **(571) 460-0006**
- For Contractors page with application form
- How It Works, For Homeowners, Trust & Safety pages
- Thank-you page with project reference number

### Portals
- **Homeowner Portal** — project status, verification trail, appointment confirmation
- **Contractor Portal** — appointments, accept/check-in, billing, profile
- **Admin Operations Command Center** — KPI dashboard, lead pipeline, operations queues, appointments, contractors, capacity cells, finance, disputes

### Core Workflows
- Project request submission with audit trail events
- Lead status management (admin)
- Appointment accept / check-in (contractor)
- Homeowner appointment confirmation
- Dispute case files and finance invoicing (demo data)

## Demo Access

Password: `demo1234`

- `admin@renovessa.com` — Admin
- `sarah.mitchell@demo.renovessa.com` — Homeowner
- `hvac@demo.renovessa.com` — Contractor

## Not Yet Implemented (Phase 2+)

- Real SMS/email integrations
- Calendar ICS generation
- Production reset UI
- HR, QA, CRM, Marketing modules (full)
- File photo uploads to object storage
- Payment processing

## Run

```bash
docker compose up --build
# → http://localhost:7090
```
