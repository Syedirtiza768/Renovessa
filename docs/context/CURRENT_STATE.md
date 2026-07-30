# Current State

> Last updated: 2026-07-30

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
- **RFQ Pilot 15 approval packet** — exact 15-company cohort across 13 trades, rendered copy, CSV/JSON/Markdown review assets, active-license checks, recipient-domain MX checks, and website evidence for phone-first addresses (`rfq_pilot_15_campaign.*`)
- Bulk campaigns support contact-tag targeting plus an `expectedCount` safety lock; sending fails closed if the resolved/suppression-filtered audience drifts from the approved count
- **RFQ Pilot 15 sent** on 2026-07-23 — campaign `cmrws4saz000hmv43jgoh5rmk`, **15/15 delivered to SendGrid**, 0 failures; reply-to `ray@inbound.renovessa.com`; follow up non-responders once after 4–5 business days
- **Pilot 15 contractor call workbook** prepared on 2026-07-24 at `outputs/019f8bec-effb-72c0-9f9b-a2f87ae6196b/Renovessa_Contractor_Call_Sheet.xlsx`; includes the live call queue, existing enriched profiles, personalized hooks, script variants, objections, dropdown outcomes, and follow-up tracking
- The uploaded Google Sheets version now includes a `Pre-Call SMS` tab with 15 personalized messages, six situational alternatives, send-timing guidance, reply notes, and SMS-status validation
- Remaining email hygiene: rotate the previously exposed SendGrid API key; enable the signed SendGrid event webhook for bounce/complaint/unsubscribe tracking

### Organic Search Foundation (Implemented)
- Comprehensive DMV organic-search and content blueprint at `docs/marketing/SEO_STRATEGY_DMV.md`
- Public positioning: DMV home-improvement cost estimator + managed RFQ service
- Initial organic wedge: HVAC in Fairfax County / Northern Virginia, expanding only with real contractor capacity and unique local evidence
- Crawlable foundations now include estimator, service/HVAC, location/Northern Virginia/Fairfax County, cost-guide, resource, methodology, trust, and legal pages
- Shared unique metadata/canonical framework, XML sitemap, robots policy, public/private noindex controls, Organization/WebSite/Service/Breadcrumb structured data, and custom 404 are implemented
- Unsupported public metrics and fixed turnaround promises were removed; phone and estimate -> RFQ -> available contractor-options copy are consistent
- Communication consent is affirmative (not pre-checked) and links to a dedicated calls/text disclosure
- Production deployment verified on 2026-07-23: app/database healthy; public HTTPS routes, canonical host, sitemap, robots, positioning, and noindex controls passed

### Digital Marketing Campaign Kit (Created 2026-07-30)
- Complete homeowner acquisition kit at `outputs/marketing/renovessa-dmv-campaign-2026-07-30/`
- 24 production PNGs for Meta/Instagram, Facebook, LinkedIn, X, YouTube, email, Open Graph, web hero, profile/cover, and standard Google Display placements
- Scalable Renovessa mark/wordmarks, live-site palette board, two campaign master photographs, machine-readable manifests, and editable regeneration sources
- Google responsive-search copy, paid-social copy, email copy, organic caption, and 15-second vertical-video script
- Creative matches the live site: warm bone, charcoal, copper CTA, muted green trust accent, DM Serif Display + Inter
- Messaging stays within approved positioning: local planning range, clearer scope, managed request for quote, contractor bids; concise estimate/availability disclosure included

### Rockville Bathroom Full-Funnel Campaign System (Created 2026-07-30)

- Complete niche campaign system at `outputs/marketing/renovessa-rockville-bathroom-campaign/`
- 1,068 approved sRGB PNG exports in 27 exact pixel sizes; complete 22-column CSV/JSON asset manifest
- Core paid-social matrix: 13 bathroom concepts × 4 funnel stages × 3 visual/copy directions × 4 universal formats = 624 assets
- Supporting delivery includes four 8-slide carousels, 13 five-frame story sets, six dedicated retargeting segments, nine Google Display sizes, responsive performance companions, website, email, LinkedIn, Pinterest, Google Business Profile, 20 infographic topics, 10 lead-cover concepts, and 6/15/20/30-second motion-ready sets
- Visual system follows the live Rockville landing page and planner: warm bone, ink/slate, copper CTA, trust green, DM Serif Display + Inter, quiet cards, Quick path Capture → Layout → Results
- Eight text-free photo masters, editable deterministic renderer, prompt provenance, copy/caption/email/motion libraries, source audit, rejection log, contact sheet, and automated QA are included
- Published Rockville ranges and exact site disclaimers are preserved; no fake customer work, testimonials, ratings, savings, contractor outcomes, permit determinations, or binding quotes were introduced
- Lead-magnet deliverables are deliberately labeled as cover concepts until companion editorial downloads are produced and approved

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
- File photo uploads to object storage (bathroom planner uses local Docker volume for now)
- Payment processing
- First evidence-rich HVAC/Fairfax cost and permit articles beyond the foundational hubs
- Search Console verification and privacy-safe organic conversion analytics
- Production-grade user-initiated password-recovery email flow, privacy-request UI, MFA, and public-endpoint rate limiting

## Bathroom Remodeling Experience (Phase 1 + Phase 2 — Implemented 2026-07-26)

A specialized Rockville, MD bathroom remodeling planner layered on the existing Renovessa stack. Gated behind environment feature flags (`BATHROOM_*`); defaults OFF in production. See `docs/planning/BATHROOM_REMODELING_IMPLEMENTATION_NOTE.md` for the full pre-implementation note.

### Implemented (Phase 1)
- **Prisma schema** — `BathroomProject`, `BathroomMeasurement`, `BathroomLayout`, `BathroomFixture`, `BathroomCondition`, `BathroomSelection`, `EstimatorConfiguration`, `BathroomEstimate`, `BathroomEstimateLineItem`, `PermitAssessment`, `ProjectBrief`, `ContractorProposal`, `BathroomContactRelease`, `BathroomContentVersion` + new enums. `answersJson` blob on `BathroomProject` for autosave.
- **Feature flags** — `src/lib/feature-flags.ts` with `bathroomRockvilleEnabled`, `bathroomPlannerUsable`, `bathroomEstimatorEnabled`, `bathroomFlagSnapshot`, and `BATHROOM_DEMO_MODE`.
- **Core logic (pure functions)** — `src/lib/bathroom/`: config, planner-steps, geometry, validation, confidence, estimator, budget-scenarios, permits, project-brief, schemas, authorization.
- **APIs** — `POST/GET /api/bathroom-projects`, `GET/PATCH /api/bathroom-projects/[id]`, layouts, estimates, permits, brief, RFQ promotion; `GET/POST /api/bathroom-estimator/configurations`, `GET/POST /api/bathroom-estimator/content`, `GET /api/bathroom-estimator/projects`, `GET /api/bathroom-estimator/analytics`, `POST /api/bathroom-estimator/preview` (live planner estimate).
- **Public routes** — `/bathroom-remodeling/rockville-md` (landing) + sub-routes: `/cost`, `/permits`, `/planning-guide`, `/tub-to-shower`, `/walk-in-showers`, `/primary-bathrooms`, `/small-bathrooms`, `/accessible-bathrooms`, `/contractors`. All reuse `PublicPage` shell and `pageMetadata`.
- **Planner UI** — `/bathroom-remodeling/rockville-md/planner` with step state machine, autosave to localStorage + server, intro/measurements/scope/conditions/permits/estimate steps, live estimate preview with confidence and budget scenarios.
- **Sitemap** — bathroom routes added conditionally when `BATHROOM_ROCKVILLE_LANDING_ENABLED` is on.

### Implemented (Phase 2)
- **Analytics + audit logging** — anonymous project creation logged; `BATHROOM_LAYOUT_SAVED`, `BATHROOM_PERMIT_ASSESSED`, `BATHROOM_SHARE_LINK_CREATED`, `BATHROOM_SHARE_LINK_REVOKED`, `BATHROOM_PHOTO_UPLOADED`, `BATHROOM_DIAGRAM_SAVED` event types added; enhanced analytics endpoint with bathroom type distribution and recent audit events.
- **Project brief PDF** — `src/lib/bathroom/brief-pdf.ts` renders structured brief to PDF via `pdfkit`; `GET /api/bathroom-projects/[id]/brief/pdf` endpoint; "Generate brief + Download PDF" in planner estimate step.
- **Admin screens** — `/portal/admin/bathroom/projects` (project list), `/portal/admin/bathroom/estimator-config` (publish/retire/clone/seed), `/portal/admin/bathroom/content` (content version CRUD), `/portal/admin/bathroom/analytics` (funnel + distributions + audit events). Nav items gated by feature flag.
- **2D diagram builder** — `src/components/bathroom/DiagramBuilder.tsx` with SVG preview, fixture palette, position editing, live geometry calculations, validation issues, save to layouts API. Integrated as existing/proposed layout steps in planner (gated by `diagramBuilder` flag).
- **Contractor proposal comparison** — `/portal/homeowner/bathroom-projects` (list) + `/[id]` (detail with proposal table, price spread, credential badges). Homeowner nav updated.
- **AI advisor with guardrails** — `src/lib/bathroom/advisor-prompt.ts` with strict system prompt (no prices, dimensions, permit determinations, diagnoses, contractor guarantees) and output sanitization (detects/replaces prohibited claims). `POST /api/bathroom-projects/[id]/advisor` endpoint with out-of-scope routing and audit logging. Gated by `BATHROOM_AI_INTERPRETATION_ENABLED`.
- **Authority content templates** — `src/lib/bathroom/content-templates.ts` with full article bodies for cost, permits, planning-guide, tub-to-shower, accessible-bathrooms. Seed script at `scripts/seed-bathroom-content.ts` (`npm run bathroom:seed-content`).
- **Tests** — vitest configured with `@/` path alias; 27 unit tests covering geometry, confidence, estimator, and advisor guardrails. Run with `npm test`.
- **Requirements prompt + photo uploads (2026-07-27)** — planner opens on a Describe step (`RequirementsPromptStep`) with free-text requirements, heuristic/AI interpret into answers (`POST .../interpret`), and photo upload (`BathroomMedia` + local `UPLOAD_ROOT` / Docker volume). Photos also available on Conditions. Nginx `client_max_body_size 12m`.
- **Quick path + unified layout (2026-07-27)** — default Quick mode is Capture → Layout → Results. Skips Basics/Size/Scope/Conditions when Capture already filled them. Single Layout workspace with Existing/Proposed toggle, room templates, and auto-generated proposed layouts. Permits folded into Results.
- **Contractor Proposal Studio (2026-07-27)** — white-label tool at `/portal/contractor/proposal-studio`. `BathroomProject.contractorOwnerId`, letterhead + `studioPricingJson` on `ContractorProfile`, prompt-drafted proposal language (no AI price invention), contractor-letterhead PDF. **Commercial layer:** deterministic estimate seeds editable line items; contractor markup/overhead/contingency; internal cost vs customer price + gross margin; approve-before-client-PDF gate; draft PDF preview with watermark. **Share + acceptance:** tokenized `/proposal/[token]` client page; questions / revision requests; accept locks version with immutable snapshot; decline; view tracking. Homeowner planner unchanged. Flag: `BATHROOM_CONTRACTOR_STUDIO_ENABLED`.

### Not Yet Implemented (Phase 3+)
- Object storage migration (S3/R2) for uploads beyond local Docker volume
- Vision-assisted fixture placement from photos
- Logo upload for contractor letterhead
- Change orders against accepted studio proposals
- Email/SMS notifications for proposal engagement
- Full contractor price book (CSV import / assemblies)
- Background job processing
- Production-grade rate limiting on bathroom endpoints
- Search Console verification and privacy-safe organic conversion analytics for bathroom pages

## Run

```bash
docker compose up --build
# → http://localhost:7090
```
