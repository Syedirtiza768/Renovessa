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

### Organic Search Foundation (Implemented)
- Comprehensive DMV organic-search and content blueprint at `docs/marketing/SEO_STRATEGY_DMV.md`
- Public positioning: DMV home-improvement cost estimator + managed RFQ service
- Initial organic wedge: HVAC in Fairfax County / Northern Virginia, expanding only with real contractor capacity and unique local evidence
- Crawlable foundations now include estimator, service/HVAC, location/Northern Virginia/Fairfax County, cost-guide, resource, methodology, trust, and legal pages
- Shared unique metadata/canonical framework, XML sitemap, robots policy, public/private noindex controls, Organization/WebSite/Service/Breadcrumb structured data, and custom 404 are implemented
- Unsupported public metrics and fixed turnaround promises were removed; phone and estimate -> RFQ -> available contractor-options copy are consistent
- Communication consent is affirmative (not pre-checked) and links to a dedicated calls/text disclosure
- Production deployment verified on 2026-07-23: app/database healthy; public HTTPS routes, canonical host, sitemap, robots, positioning, and noindex controls passed

### Portals
- **Homeowner Portal** — RFQ status, verification trail, appointment confirmation; submit via estimate wizard only
- **Contractor Portal** — appointments, accept/check-in, billing, profile
- **Admin Operations Command Center** — KPI dashboard, lead pipeline, operations queues, appointments, contractors, capacity cells, finance, disputes

### Core Workflows
- RFQ / project request submission with audit trail events + confirmation email
- Public RFQs never create/reset accounts; AI advisor submissions create only unassigned RFQs, not appointments
- Required versioned Terms/Privacy clickwrap plus optional, unchecked communication consent with immutable evidence
- Durable email/phone/SMS suppressions enforced before bulk email and outbound calls
- Public estimator numeric ranges fail closed until the exact claim-evidence model version is approved
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
- First evidence-rich HVAC/Fairfax cost and permit articles beyond the foundational hubs
- Search Console verification and privacy-safe organic conversion analytics
- Production-grade user-initiated password-recovery email flow, privacy-request UI, MFA, and public-endpoint rate limiting

## Run

```bash
docker compose up --build
# → http://localhost:7090
```
