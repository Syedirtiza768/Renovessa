# Decision Log

Record product, architecture, and technical decisions here.

---

## 2026-08-10 — Renovessa Solar: provider-adapter architecture, two-model production reconciliation, fail-closed pricing

### Decision
Added a specialized Solar sub-product at `/solar`, `/solar/planner`, `/solar/methodology`, isolated in `src/lib/solar/` + `src/components/solar/` and gated behind `SOLAR_*` flags (default OFF). Five architectural commitments:

1. **Provider adapters own third-party JSON.** `GeocodingProvider`, `SolarGeospatialProvider`, `ProductionModelProvider`, `UtilityRateProvider`, `IncentiveProvider` (+ Phase-2 `BillExtractionProvider`, `SolarImageryProvider`). Google Solar / PVWatts / OpenEI shapes never leave `src/lib/solar/providers/`; downstream sees only `src/lib/solar/types.ts`.
2. **Every engine is a pure, versioned function** (`layout-engine`, `production`, `consumption`, `cost-engine`, `confidence`, `plan`, `brief`), and every persisted estimate stores `calculationVersionsJson` + `inputSnapshotJson` + `pricingConfigVersion` so a historical result stays reproducible.
3. **Two independent production models, reconciled — never "pick the larger".** Google's per-panel DC output (derated to AC) vs PVWatts v8 run *per roof segment* with that segment's own tilt/azimuth. Difference vs the mean drives range width and confidence; >15% widens beyond both models, drops confidence and logs `SOLAR_PRODUCTION_MODEL_DISCREPANCY`. Thresholds are admin-configurable product rules, not constants.
4. **Provenance is a value wrapper, not a side table.** `Tracked<T> = { value, unit, provenance }` flows through calculation, so "Why this number?" is derivable rather than authored, and an unconfirmed AI extraction is structurally barred from financial use (`isUsableForFinance`).
5. **Fail-closed pricing and incentives.** The built-in `$/W` config is `dataBasis: "unvalidated_planning_default"`, `sampleCount: 0`; public dollar display requires `NEXT_PUBLIC_APPROVED_SOLAR_PRICING_VERSION` to match a published config exactly, mirroring `NEXT_PUBLIC_APPROVED_ESTIMATE_MODEL_VERSION`. Incentives come only from the reviewed `SolarIncentiveProgram` register — empty renders as "could not be verified", never as "none exist", and never reduces a net cost.

Solar promotes into the **existing** `ProjectRequest` pipeline (`trade: "Solar Installation"`, `source: "solar_rfp"`), reusing lead routing, consent evidence, dispatch and billing unchanged.

### Reason
Solar's failure mode is a confidently-presented wrong number, and its three highest-risk surfaces (roof geometry, incentives, local pricing) are exactly where we have least authority. Reusing the bathroom estimator's *shape* (pure fn + versioned config + immutable input snapshot + fail-closed public numbers) while isolating the domain logic gives accuracy guarantees without a second competing architecture. Reusing `ProjectRequest` rather than forking contractor matching was the correct reuse boundary — the lead pipeline is trade-agnostic already.

Deliberate deviations, documented rather than silent: the Phase-1 roof visualizer renders projected provider geometry (real segment bounding boxes, real candidate panel centres, real sunshine quantiles) as SVG rather than licensed raster imagery — geometrically faithful to the data the estimate uses, no retention/attribution exposure, fully keyboard-accessible, and impossible to mistake for an engineered plan. A `basemap` slot and `SolarImageryProvider` exist for the Phase-2 imagery upgrade.

Also fixed while here: solar feature flags are read at **call time**, not module load, because Next inlines module-level constants when prerendering and Renovessa builds one Docker image with runtime env — a statically-prerendered gate would freeze the flag at image-build time. The three solar pages are `force-dynamic` for the same reason.

### Impact
Prisma: 11 new models (`SolarProject`, `SolarRoofAnalysis`, `SolarPanelLayout`, `SolarProductionEstimate`, `SolarEnergyProfile`, `SolarTariffSnapshot`, `SolarCostEstimate`, `SolarEstimatorConfiguration`, `SolarIncentiveProgram`, `SolarDocument`, `SolarProjectBrief`), 6 enums, 16 `SOLAR_*` audit event types, `AuditEvent.solarProjectId`. Licensed provider payloads live in `SolarRoofAnalysis.rawProviderPayload` with `providerDataExpiresAt` so they purge on their own retention clock without destroying homeowner project data.

### Status
Phase 1 accepted and implemented. Not yet deployed — flags default OFF; requires `npm run db:push`, provider keys, and a reviewed pricing config before any public exposure. See `docs/planning/SOLAR_IMPLEMENTATION_NOTE.md`.

---

## 2026-08-10 — Bathroom RFP conversion path unified on `/rfp` with contact capture + compliance parity

### Decision
The planner's Estimate → Request Proposal path now collects homeowner contact details and consent in the planner UI and posts them to `/api/bathroom-projects/[id]/rfp`. The route validates with `rfpSubmissionSchema` (terms/privacy literal-true required, TCPA consent optional-affirmative), records clickwrap evidence via `recordProjectCompliance`, sends the standard RFQ confirmation email, stamps the project `RFQ_SUBMITTED`, and claims the project atomically (`updateMany … WHERE projectRequestId IS NULL` inside the transaction) so double-clicks/retries cannot create duplicate RFPs. `BathroomEstimate.configurationId` is now nullable so estimates persist against the built-in default config when no `EstimatorConfiguration` row is published. Planner drafts persist `projectId`, `referenceNumber`, and a stable `clientGeneratedId` in localStorage; refresh/multi-tab resumes the same server draft instead of creating duplicates, and stale project ids are validated on hydrate.

### Reason
Production audit found three funnel-breaking defects: (1) anonymous RFP submission always failed — the client posted no contact data while the server required first name + email; (2) estimate persistence hard-failed on an FK to a nonexistent `"default-internal"` configuration row (zero `EstimatorConfiguration` rows existed in prod), silently blocking brief → RFP; (3) every browser refresh created a new `BathroomProject` because `projectId` was never written to the local draft.

### Status
Accepted, implemented, and deployed to production 2026-08-10 (commit `e43b921`); live verification via `scripts/e2e-bathroom-rfp-live.sh` (9/9, incl. real confirmation email).

---

## 2026-07-23 — Public intake, consent, and claim publication controls

### Decision
Public RFQs do not create or reset accounts, and the legacy AI booking route creates only an unassigned RFQ. Legal clickwrap and optional communication consent are server-versioned and evidenced in append-only events. Channel opt-outs are durable and enforced at outbound boundaries. Numeric estimator claims are fail-closed unless the exact model version has substantiation approval.

### Reason
Email ownership cannot be inferred from a form submission; preselected consent is not affirmative; opt-outs must remain enforceable; and objective advertising claims require a pre-publication reasonable basis.

### Status
Accepted and implemented.

---

## 2026-06-02 — Documentation-First Project Setup

### Decision
Adopt self-sustaining Markdown documentation as permanent project memory before writing application code.

### Reason
Empty greenfield project; no chat history should be required for future agents or developers to continue work.

### Alternatives Considered
- Start coding immediately with default stack
- Minimal README only

### Impact
All agents must read and update `docs/` per `AGENTS.md`. Implementation deferred until Phase 0 planning is validated.

### Status
Accepted

---

## 2026-06-02 — Assumed Domain: Renovation Project Management

### Decision
**Provisional assumption only** — treat Renovessa as a renovation project management product until stakeholder confirms otherwise.

### Reason
Project name suggests renovation ("Renov-") context; no other requirements provided.

### Alternatives Considered
- Wait with blank product definition
- Generic project management tool

### Impact
Planning docs reference projects, tasks, contractors, homeowners. Must be revised if domain differs.

### Status
Superseded by Product Blueprint (2026-06-02) — verified appointment marketplace for DMV

---

## 2026-06-02 — Tech Stack: Next.js + PostgreSQL + Prisma

### Decision
Use Next.js 15 App Router (TypeScript), PostgreSQL, Prisma ORM, JWT cookie auth, Tailwind CSS 4. Deploy via Docker Compose on port 7090.

### Reason
Blueprint MVP requires full-stack web app with public site + 3 portals + audit trail. Next.js monolith is fastest path to launch.

### Status
Accepted

---

## 2026-06-02 — Product Vision from Blueprint

### Decision
Renovessa is a **verified home improvement appointment marketplace** for DMV (DC, MD, Northern VA). Billing unit is confirmed appointments, not shared leads.

### Status
Accepted (from Renovessa_Product_Blueprint.docx)
