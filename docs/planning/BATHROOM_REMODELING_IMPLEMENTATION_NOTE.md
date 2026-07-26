# Bathroom Remodeling Experience — Pre-Implementation Note

> Created: 2026-07-26. Required by PRD §2.3 before any code changes.

## 1. Existing modules that will be reused

| Module | Path | Reuse |
|--------|------|-------|
| Auth (JWT cookie) | `src/lib/auth.ts` | Session, role checks, portal routing |
| Authorization helpers | `src/lib/authorization.ts` | Resource ownership pattern (extend for `BathroomProject`) |
| Prisma client | `src/lib/db.ts` | Single shared client |
| Audit logging | `src/lib/audit.ts` | `logAuditEvent` for all privileged actions |
| Compliance / consent | `src/lib/compliance.ts`, `compliance-versions.ts` | Clickwrap + communication consent for RFQ submission |
| SEO helpers | `src/lib/seo.ts` | `pageMetadata`, `absoluteUrl`, canonical |
| Public page shell | `src/components/marketing/PublicPage.tsx` | `PublicPage`, `InfoCard`, `PageCta`, breadcrumbs |
| Site header/footer | `src/components/SiteHeader.tsx`, `SiteFooter.tsx` | Reused on landing route |
| Portal shell | `src/components/PortalShell.tsx` | Homeowner/admin portal chrome |
| Estimate pricing engine | `src/lib/estimate-pricing.ts` | Reference pattern only; bathroom estimator is separate |
| Estimate substantiation | `src/lib/estimate-substantiation.ts` | Versioned claim-record pattern reused for `BathroomEstimatorConfiguration` |
| Project intake helpers | `src/lib/project-intake.ts` | Name split, urgency mapping |
| Reference number generator | `src/lib/utils.ts` `generateReferenceNumber` | Reused for `BathroomProject.referenceNumber` |
| SendGrid sender | `src/lib/sendgrid.ts`, `confirmationEmails.ts` | Confirmation emails (brief ready, RFQ submitted) |
| Lead state machine | `src/lib/lead-state-machine.ts` | Reused when a bathroom project is promoted to a `ProjectRequest` RFQ |
| RFQ submission API | `src/app/api/project-requests/route.ts` | Reused as the bid-request exit path |
| Appointments API | `src/app/api/appointments/route.ts` | Reused for contractor offer/accept/release flow |
| Sitemap / robots | `src/app/sitemap.ts`, `src/app/robots.ts` | Extend with new public routes |
| Tailwind design tokens | `src/app/globals.css` | `landing-*` and `btn-*` classes reused |

## 2. Existing modules that require extension

| Module | Change |
|--------|--------|
| `prisma/schema.prisma` | Add new models (see §4). No changes to existing models. |
| `src/app/sitemap.ts` | Append `/bathroom-remodeling/rockville-md` and sub-routes |
| `src/lib/auth.ts` `getAdminNavItems` | Add "Bathroom Estimator" admin nav entry |
| `src/app/portal/homeowner/layout.tsx` | Add "My Bathroom Projects" nav entry |
| `src/app/portal/admin/layout.tsx` | No structural change (PortalShell handles nav) |
| `src/lib/first-job-config.ts` | Add `BATHROOM_ROCKVILLE_ENABLED` flag check helper (env-driven) |
| `docs/context/*` | Update CURRENT_STATE, FEATURE_REGISTRY, PROGRESS_LOG, AGENT_HANDOFF, NEXT_STEPS, DECISION_LOG, KNOWN_ISSUES |

## 3. New modules required

| Module | Path | Purpose |
|--------|------|---------|
| Feature flags | `src/lib/feature-flags.ts` | Single source of truth for `bathroomRockville*` flags (env-driven) |
| Bathroom config | `src/lib/bathroom/config.ts` | Static defaults: bathroom types, objectives, fixtures, finishes, permit rules, cost categories |
| Step machine | `src/lib/bathroom/planner-steps.ts` | Ordered step list, branching rules, completion percentage |
| Geometry engine | `src/lib/bathroom/geometry.ts` | Area, perimeter, paintable wall, wet-wall, tile, baseboard, waste calculations |
| Validation rules | `src/lib/bathroom/validation.ts` | Overlap, boundary, door-collision, narrow-circulation checks |
| Estimator engine | `src/lib/bathroom/estimator.ts` | Deterministic line-item calculation from versioned config + project inputs |
| Confidence scorer | `src/lib/bathroom/confidence.ts` | High/medium/low from input completeness |
| Budget optimizer | `src/lib/bathroom/budget-scenarios.ts` | Essential / Balanced / Premium scenario generation |
| Permit navigator | `src/lib/bathroom/permits.ts` | Rule-based permit category assessment |
| Project brief builder | `src/lib/bathroom/project-brief.ts` | Assemble brief JSON from project + layout + estimate + permit |
| PDF generator | `src/lib/bathroom/pdf.ts` | Print-safe HTML → PDF (server route returns PDF) |
| Bathroom API routes | `src/app/api/bathroom-projects/*` | CRUD, steps, layouts, uploads, estimates, permits, briefs, rfq |
| Public routes | `src/app/bathroom-remodeling/rockville-md/*` | Landing, planner, cost, permits, tub-to-shower, walk-in-showers, primary-bathrooms, small-bathrooms, accessible-bathrooms, contractors, planning-guide |
| Homeowner portal routes | `src/app/portal/homeowner/bathroom-projects/*` | List, detail, layout, estimate, brief, contractors, proposals |
| Admin routes | `src/app/portal/admin/bathroom-estimator/*` | Configurations, content, projects, contractors, analytics |
| Planner UI | `src/components/bathroom/*` | PlannerShell, step components, diagram editor (SVG), estimate display, brief preview, proposal comparison |
| Zod schemas | `src/lib/bathroom/schemas.ts` | All API input validation |
| Audit event types | extend `AuditEventType` enum | `BATHROOM_PROJECT_CREATED`, `BATHROOM_ESTIMATE_GENERATED`, `BATHROOM_BRIEF_GENERATED`, `BATHROOM_CONTACT_RELEASED`, `BATHROOM_PROPOSAL_SUBMITTED` |
| Tests | `src/lib/bathroom/__tests__/*` | Unit tests for geometry, estimator, validation, permits, confidence, scenarios |

## 4. Database changes

All new models are additive. No existing column is renamed or dropped. Migrations are introduced via `prisma db push` (current repo convention — no migration history exists).

New models (see PRD §27 for field lists):

- `BathroomProject` — top-level project (linked to `User` homeowner, optional `ProjectRequest` for RFQ promotion)
- `BathroomMeasurement` — measurement method + ceiling height + confirmed flag
- `BathroomLayout` — versioned geometry JSON (existing / proposed / essential / balanced / premium)
- `BathroomFixture` — per-layout fixture placement
- `BathroomCondition` — existing-condition concerns
- `BathroomSelection` — finish/fixture/material selections
- `EstimatorConfiguration` — versioned, dated, status-controlled JSON config
- `BathroomEstimate` — generated estimate snapshot referencing configuration version
- `BathroomEstimateLineItem` — per-estimate line items
- `PermitAssessment` — permit category assessment
- `ProjectBrief` — versioned brief JSON + share token
- `ContractorProposal` — structured contractor proposal (extends RFQ flow; does not duplicate `Appointment`)
- `BathroomContentVersion` — admin-managed authority content blocks (cost guide, permit guide, FAQ, etc.)

Enum additions:

- `AuditEventType`: add `BATHROOM_PROJECT_CREATED`, `BATHROOM_ESTIMATE_GENERATED`, `BATHROOM_BRIEF_GENERATED`, `BATHROOM_CONTACT_RELEASED`, `BATHROOM_PROPOSAL_SUBMITTED`
- New enum `BathroomProjectStatus`: `DRAFT`, `IN_PROGRESS`, `BRIEF_READY`, `RFQ_SUBMITTED`, `MATCHING`, `CONTRACTOR_INVITED`, `CONTACT_RELEASED`, `PROPOSAL_RECEIVED`, `CLOSED`, `WITHDRAWN`
- New enum `BathroomLayoutType`: `EXISTING`, `PROPOSED`, `ESSENTIAL`, `BALANCED`, `PREMIUM`
- New enum `EstimatorConfigStatus`: `DRAFT`, `PUBLISHED`, `RETIRED`
- New enum `ConfidenceLevel`: `HIGH`, `MEDIUM`, `LOW`
- New enum `PermitLikelihood`: `LIKELY_REQUIRED`, `MAY_BE_REQUIRED`, `CONTRACTOR_VERIFICATION_NEEDED`, `JURISDICTION_REVIEW_NEEDED`, `UNLIKELY`

## 5. API changes

All new APIs live under `/api/bathroom-projects` and `/api/bathroom-estimator` (admin). Existing `/api/project-requests` is reused as the RFQ exit path; a bathroom project is promoted to a `ProjectRequest` when the homeowner submits bids.

Public (rate-limited):
- `POST /api/bathroom-projects` — create anonymous (local-id) or authenticated draft
- `GET/PATCH /api/bathroom-projects/:id` — read/update (auth-gated)
- `POST /api/bathroom-projects/:id/layouts` — create layout
- `PATCH/DELETE /api/bathroom-projects/:id/layouts/:layoutId`
- `POST /api/bathroom-projects/:id/layouts/:layoutId/validate`
- `POST /api/bathroom-projects/:id/layouts/:layoutId/calculate`
- `POST /api/bathroom-projects/:id/estimates` — generate from current config version
- `GET /api/bathroom-projects/:id/estimates` — list versions
- `POST /api/bathroom-projects/:id/permits`
- `POST /api/bathroom-projects/:id/brief` — generate
- `GET /api/bathroom-projects/:id/brief/pdf` — download PDF
- `POST /api/bathroom-projects/:id/brief/share` — create revocable share link
- `DELETE /api/bathroom-projects/:id/brief/share/:token`
- `POST /api/bathroom-projects/:id/rfq` — promote to `ProjectRequest` (reuses existing compliance flow)

Contractor:
- `GET /api/bathroom-opportunities` — list opportunities visible to this contractor
- `POST /api/bathroom-opportunities/:id/accept` / `decline`
- `POST /api/bathroom-opportunities/:id/proposal` — submit structured proposal
- `POST /api/bathroom-opportunities/:id/release-contact` — admin-gated contact release with audit

Admin:
- `GET/POST /api/bathroom-estimator/configurations`
- `POST /api/bathroom-estimator/configurations/:id/clone`
- `POST /api/bathroom-estimator/configurations/:id/publish`
- `POST /api/bathroom-estimator/configurations/:id/retire`
- `GET/PUT /api/bathroom-estimator/content/:slug`
- `GET /api/bathroom-estimator/projects`
- `GET /api/bathroom-estimator/analytics`

## 6. UI route changes

Public (all indexable except planner working view):
- `/bathroom-remodeling/rockville-md` (landing)
- `/bathroom-remodeling/rockville-md/planner` (noindex working view; project id via query)
- `/bathroom-remodeling/rockville-md/cost`
- `/bathroom-remodeling/rockville-md/permits`
- `/bathroom-remodeling/rockville-md/tub-to-shower`
- `/bathroom-remodeling/rockville-md/walk-in-showers`
- `/bathroom-remodeling/rockville-md/primary-bathrooms`
- `/bathroom-remodeling/rockville-md/small-bathrooms`
- `/bathroom-remodeling/rockville-md/accessible-bathrooms`
- `/bathroom-remodeling/rockville-md/contractors`
- `/bathroom-remodeling/rockville-md/planning-guide`

Homeowner portal:
- `/portal/homeowner/bathroom-projects`
- `/portal/homeowner/bathroom-projects/:id`
- `/portal/homeowner/bathroom-projects/:id/layout`
- `/portal/homeowner/bathroom-projects/:id/estimate`
- `/portal/homeowner/bathroom-projects/:id/project-brief`
- `/portal/homeowner/bathroom-projects/:id/contractors`
- `/portal/homeowner/bathroom-projects/:id/proposals`

Contractor portal:
- `/portal/contractor/bathroom-opportunities`
- `/portal/contractor/bathroom-opportunities/:id`
- `/portal/contractor/bathroom-opportunities/:id/proposal`

Admin:
- `/portal/admin/bathroom-estimator`
- `/portal/admin/bathroom-estimator/configurations`
- `/portal/admin/bathroom-estimator/content`
- `/portal/admin/bathroom-estimator/projects`
- `/portal/admin/bathroom-estimator/contractors`
- `/portal/admin/bathroom-estimator/analytics`

## 7. Integration risks

1. **FIRST_JOB_MODE wedge** — currently restricts the platform to HVAC / Fairfax ZIPs. The bathroom experience is a separate wedge (Rockville bathroom). Must not be blocked by `matchesPilotTrade`/`matchesPilotCell`. New feature flags gate the experience independently.
2. **Estimate model approval gate** — existing `NEXT_PUBLIC_APPROVED_ESTIMATE_MODEL_VERSION` controls HVAC/general numeric ranges. The bathroom estimator uses its own `EstimatorConfiguration` versioning; do not couple to the legacy gate.
3. **SendGrid deliverability** — known open issue (API key rotation, event webhook disabled). Bathroom confirmation emails reuse the same sender; failures must be non-fatal (audit + return `confirmationEmailSent: false`), matching existing pattern.
4. **No object storage** — photo uploads are a PRD requirement. Phase 1 falls back to base64-in-DB for small images with a strict size cap and MIME whitelist, behind a feature flag, until S3/R2 is configured. No production fake claims.
5. **No background jobs** — PDF generation and AI interpretation run synchronously in route handlers in Phase 1. PDF is HTML-to-print via a server route; AI interpretation is deferred to Phase 5.
6. **Twilio trial block** — does not affect the bathroom flow (no outbound calling required for MVP).
7. **Demo identities** — must remain functional; bathroom feature flags default off in production, on for demo.

## 8. Migration risks

1. **No migration history** — repo uses `prisma db push`. New models are additive only; no destructive changes. `db:push` is safe.
2. **Enum additions** — Prisma extends enums in place; existing rows are unaffected.
3. **Backward compatibility** — no existing model is altered; existing RFQ, appointment, and audit flows continue to work.
4. **Rollback** — if the feature must be disabled, set all `BATHROOM_*` feature flags to false. The new routes return 404 when disabled (middleware-level gate). Database models can remain; no data is lost.

## 9. Security risks

1. **Project ID enumeration** — every bathroom API route must verify ownership (homeowner) or admin role via `assertBathroomProjectAccess`, mirroring `assertLeadAccess`. Project IDs are cuid (non-sequential) but not authorization.
2. **Diagram payload validation** — `geometryJson` is user-controlled. Zod schema validates structure; geometry engine rejects negative dimensions, NaN, and impossibly large values. Render-time SVG uses only validated numeric fields (no `dangerouslySetInnerHTML`).
3. **Photo upload abuse** — server-side MIME sniff + extension whitelist (jpg/png/webp/heic) + size cap (5 MB Phase 1). No execution path; stored as binary in DB until object storage exists.
4. **Share-link revocation** — `ProjectBrief.shareToken` is a random 32-byte URL-safe string; `shareExpiresAt` enforced on read; explicit revoke endpoint.
5. **Contact release** — homeowner contact is never exposed to contractors until: (a) homeowner reconfirms, (b) contractor has accepted, (c) admin releases. Every release writes an audit event with actor, contractor, project, and IP.
6. **AI output guardrails** — AI never sets prices, dimensions, permit determinations, or contractor qualifications. All AI output is marked and editable. (Phase 5.)
7. **Rate limiting** — public create/estimate endpoints get in-memory rate limits (same pattern as `/api/advisor`).
8. **Privacy** — precise address never sent to contractors pre-release; brief PDF redacts contact details in share-link context.

## 10. Recommended implementation order

**Phase 1 — Foundation (this iteration)**
1. Feature flags module + env wiring
2. Prisma schema additions + `db:push`
3. Audit enum additions
4. Bathroom config (types, objectives, fixtures, finishes, cost categories, permit rules)
5. Planner step machine
6. Geometry + validation + confidence + estimator + budget scenarios + permit navigator (pure functions, fully unit-tested)
7. Project brief builder
8. API: project CRUD + autosave + layouts + estimates + permits + brief + rfq promotion
9. Public landing route + sub-routes (cost, permits, planning-guide, etc.)
10. Planner UI shell + step components (no diagram editor yet — Phase 2)
11. Homeowner portal bathroom-projects routes
12. Admin estimator configurations + content screens
13. PDF generation (server route, HTML → print)
14. Analytics events (server-side audit; no third-party PII)
15. Unit tests for all pure functions; integration tests for project lifecycle
16. Sitemap + docs + context files update

**Phase 2 — Diagram and quantity engine** (next iteration)
- SVG layout builder, existing + proposed layouts, fixture library, geometry validation, diagram export, PDF integration

**Phase 3 — Advanced estimating** — versioned config UI, line-item breakdown, dynamic cost explanations, scenario comparison.

**Phase 4 — Marketplace integration** — RFQ submission reuses existing flow; contractor matching, controlled contact release, proposal submission, comparison.

**Phase 5 — AI assistance** — sketch interpretation, photo categorization, narrative scope (all guarded).

**Phase 6 — Calibration and expansion** — bid feedback, calibration reports, abstraction for Gaithersburg + other trades.

---

This note is the implementation contract. Code changes follow this order. No existing functionality is broken; all new work is behind feature flags until approved.
