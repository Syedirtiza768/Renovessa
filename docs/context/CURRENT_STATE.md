# Current State

> Last updated: 2026-07-23

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
- **Estimate wizard** — sole homeowner request path: trade scoping → DMV ballpark → RFQ preview → submit → contractor bids
- **Mobile:** fullscreen immersive RFQ wizard (&lt;768px) with sticky progress/footer, one-question sub-steps, session draft resume
- RFQ submit sends **homeowner confirmation email** (SendGrid); contractor apply sends **application confirmation email**
- Ops phone: **(571) 460-0006**
- For Contractors page with application form
- How It Works, For Homeowners (wizard-based), Trust & Safety pages

### Contractor outreach (prep)
- Enriched MD license prospects + Wave A–D onboarding drafts (`data/contractor_enrichment/`)
- **RFQ pilot 50** — trade/ZIP-balanced customized emails pitching estimate → RFQ → bid routing (`rfq_pilot_50_*`)

### Portals
- **Homeowner Portal** — RFQ status, verification trail, appointment confirmation; submit via estimate wizard only
- **Contractor Portal** — appointments, accept/check-in, billing, profile
- **Admin Operations Command Center** — KPI dashboard, lead pipeline, operations queues, appointments, contractors, capacity cells, finance, disputes

### Core Workflows
- RFQ / project request submission with audit trail events + confirmation email
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

- Real SMS integrations (email confirmations for RFQ + contractor apply are live via SendGrid)
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
