# Decision Log

Record product, architecture, and technical decisions here.

---

## 2026-08-10 — Bathroom Remodeling: canonical answer schema, real location, and UX improvements

### Decision
1. **Canonical planner-answer schema** — All planner answers (measurements, layout, selections, conditions) now normalize through `src/lib/bathroom/answer-normalization.ts` on ingress. Canonical keys (`lengthFt`, `widthFt`, `ceilingFt`, `measurementMethod`, `zipCode`, `city`, `locationId`) replace ad-hoc camelCase/snake_case/compass labels. A bidirectional migration layer keeps v1 `measurements_draft` drafts readable.
2. **Location is real** — ZIP code is collected in the Capture step and resolved to a `locationId` via a known-location register (`src/lib/bathroom/estimate-input-derivation.ts`). The estimator no longer hardcodes `inRockville: true`; it uses `locationId` to look up location-aware config. Missing/unknown ZIPs fail closed in the preview API and render a location disclaimer in assumptions.
3. **Landing pages strengthened** — Both generic and Rockville landing pages now show a "What you'll receive" 4-step illustrated flow, an example results card with realistic range + scope, and clear homeowner CTAs.
4. **Planner photo labels made homeowner-friendly** — Compass directions ("North wall") replaced with fixture-context labels ("Wall with vanity", "Wall with tub/shower", etc.).
5. **Results page enriched** — Location used is displayed; cost drivers, assumptions, and exclusions are surfaced; auto-generate brief is available; mobile uses stacked cards; contractor count choice (1/2/3) in the RFP form.

### Reason
The bathroom experience was accumulating data-shape drift: frontend keys didn't match estimator keys, `inRockville` was hardcoded everywhere, photo labels assumed homeowners know compass orientation, and landing pages didn't clearly explain what the planner produces. This created friction for both homeowners (unclear value, confusing labels) and contractors (location assumptions baked in, schema mismatch risk).

### Impact
- Removed all `inRockville` references from estimator, schemas, brief builder, preview API, and contractor studio route.
- `src/lib/bathroom/schemas.ts` `estimateInputsSchema` now uses `locationId`.
- `src/lib/bathroom/estimator.ts`, `estimate-input-derivation.ts`, `layout-templates.ts`, `confidence.ts`, `brief-pdf.ts`, `project-brief.ts` all read canonical keys.
- `src/app/api/bathroom-estimator/preview/route.ts` normalizes answers and fails closed on missing location.
- `src/components/bathroom/steps/RequirementsPromptStep.tsx` collects ZIP early and uses canonical keys.
- `src/components/bathroom/steps/EstimateStep.tsx` shows location, cost drivers, assumptions, exclusions; auto-brief; mobile cards; contractor count.
- Both `BathroomRemodelingPage.tsx` and `RockvilleBathroomPage.tsx` updated with "What you'll receive", example card, CTAs.
- Tests: 9 new normalization tests, updated estimator (10), confidence (7), layout-templates (17). Total suite: 167/167.

### Status
Accepted, implemented, build clean (Next.js 15.5.21).

---

## 2026-08-10 — Flag-dependent routes must be `force-dynamic` (build-time env freeze)

Record product, architecture, and technical decisions here.

---

## 2026-08-10 — Flag-dependent routes must be `force-dynamic` (build-time env freeze)

### Decision
Any route whose output branches on a feature flag is marked `export const dynamic = "force-dynamic"`, and the `SOLAR_*` flag helpers read `process.env` at **call time** rather than as module-level constants. Applied to `/solar`, `/solar/planner`, `/solar/methodology`, and `src/app/sitemap.ts`.

### Reason
Renovessa builds **one** Docker image and supplies env at container start, but Next.js evaluates statically-prerendered routes at `next build` time. A flag-gated page that Next chooses to prerender therefore bakes in whatever the env was *during the image build*, and no amount of runtime env will change it.

This was caught live: after enabling `SOLAR_LANDING_ENABLED=true` on production and recreating the container, `/solar` and `/solar/methodology` correctly returned 200 — but `/sitemap.xml` still omitted them, because the sitemap had been prerendered while the flag was false.

`src/lib/feature-flags.ts` still holds the `BATHROOM_*` flags as module-level constants. They are unaffected today only because every bathroom flag is `false` in production; the same freeze would occur the moment one is enabled without a rebuild. Left as-is rather than refactored blind — noted here so the next person enabling a bathroom flag knows to rebuild or convert them.

### Impact
`/sitemap.xml` is now `ƒ` (dynamic) instead of `○` (static) — a negligible cost for a small, cached-at-the-edge document, and it means the sitemap always reflects what is actually reachable.

### Status
Accepted, implemented, deployed 2026-08-10.

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
