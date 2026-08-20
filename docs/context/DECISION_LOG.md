# Decision Log

Record product, architecture, and technical decisions here.

---

## 2026-08-20 — Railway deployment workflow

### Decision
Support Railway as a first-class deployment target for the Dockerized Next.js app. The app deploys as one Railway service from the root `Dockerfile`; PostgreSQL is a separate Railway service connected through a Railway reference variable such as `${{Postgres.DATABASE_URL}}`. The root `Makefile` wraps the Railway CLI for linking, deployment, health verification, logs, and routine service operations. `railway.json` keeps the Dockerfile builder, `/api/health` deploy healthcheck, and restart policy under version control.

### Reason
Railway does not execute the repository's Docker Compose file directly. The previous Compose and Ubuntu/Nginx workflow therefore needed a platform-native command path while preserving the existing Docker image and runtime entrypoint.

### Impact
- Railway supplies the runtime `PORT`; no Railway port mapping is required.
- `RUN_SEED=false` remains the production default; schema setup continues through the existing container entrypoint.
- Railway project links are ignored via `.railway/` and secrets remain in Railway Variables.

### Status
Accepted and implemented in repository configuration; production cutover remains an operational deployment step.

---

## 2026-08-18 — Cross-estimator submission snapshots and homeowner portal parity

### Decision
1. Every public estimator RFQ stores an immutable, versioned `ProjectRequest.estimatorSnapshotJson` containing all configured estimator answers, shared project context, estimate outputs, contact preferences, notes, and consent state. Existing normalized `ProjectRequest` columns remain the routing/reporting source of truth.
2. Bathroom Remodeling, Solar, and the standard trade wizard use one Bathroom-style contractor-contact form and the same field names/options (`firstName`, `lastName`, `email`, `phone`, ZIP, timeline, preferred contact, contractor count, notes, and compliance fields).
3. Authenticated homeowner and admin project views render the snapshot through one shared summary component. Internal brief, estimate, and database identifiers are not shown to homeowners; legacy standard requests use a qualification-notes fallback until a new submission creates a snapshot.
4. Bathroom homeowner details render saved existing/proposed diagrams as read-only previews and authenticated uploaded photos. Solar homeowner details expose saved plan information through a feature-gated list/detail route.

### Reason
The estimators had different contact fields and persisted answers in different shapes, so the portal could not reliably show the homeowner exactly what they submitted. A versioned display snapshot preserves the submission as it was made, while keeping normalized fields available for matching and operations. Reusing the same contact component reduces compliance and field drift across estimator paths.

### Impact
- Prisma adds nullable `ProjectRequest.estimatorSnapshotJson`; it is additive and keeps old RFQs readable.
- Standard `/api/project-requests`, Bathroom `/rfp`, and Solar `/rfp` persist the snapshot.
- `EstimatorSubmissionSummary` is shared by homeowner and admin views.
- Bathroom visual editing is disabled in the homeowner portal; the existing authenticated media routes remain the source for photo access.
- Local verification: 228/228 tests, TypeScript, and production build passed. `prisma db push` remains pending until the configured local PostgreSQL instance is running.

### Status
Accepted, implemented and deployed to production 2026-08-18 in commit `ef0e28f`; the live app, database column, and HTTPS health endpoint were verified. Authenticated standard/Bathroom/Solar RFQ UAT remains a follow-up.

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

---

## 2026-08-10 — Small-Job Branch in Bathroom Estimator (`fixture_replacement`)

### Decision
Add a `fixture_replacement` project objective that bypasses the per-sqft remodel
baseline in `generateEstimate` and instead prices an itemized small job:
fixture removal/disposal, a per-fixture allowance (sink_basin / faucet / toilet /
vanity_cabinet / shower_head, scaled by finish tier), flat hookup plumbing labor
(+ optional relocation per foot), parts, and site protection — with a separate
`smallJobMinimumCharge` (450) instead of the remodel `minimumCharge` (2500).
No shower/tub, tile, flooring, or permit line items are emitted for this scope.

### Reason
Production E2E on 2026-08-10 showed a powder-room wash-basin swap estimated at
$11,403–$37,150 with full-remodel line items — the estimator emitted the same
line-item list for every objective. Homeowners with single-fixture jobs got
meaningless ranges, which undermines trust in the planning-range → RFP funnel.

### Alternatives Considered
- Filtering the full line-item list per objective — rejected: keeps remodel
  assumptions (per-sqft base, permit bundle) that don't apply to small jobs
- Routing fixture swaps out of the estimator entirely (`OUT_OF_SCOPE_INDICATORS`)
  — rejected: a basin/vanity replacement is a legitimate contractor job and a
  valid RFP, unlike faucet repair or drain cleaning

### Impact
`config.ts` (new objective + `fixtureReplacement` pricing block +
`FIXTURE_REPLACEMENT_TYPES`), `estimator.ts` (small-job branch + `fixtureType`
input), `budget-scenarios.ts` (fixture-swap scenario copy), `schemas.ts`,
`estimate-input-derivation.ts`, `requirements-interpret.ts`, interpret-route
heuristic, and ScopeStep UI (conditional fixture picker; remodel-only fields
hidden for this objective). Published DB EstimatorConfiguration rows merge over
the default config, so the new pricing block survives a published override
(shallow merge keeps default `fixtureReplacement` unless explicitly overridden).

### Status
Accepted — implemented and tested (199/199 unit tests green, tsc clean);
pending production deploy

---

## 2026-08-14 - RFQ confirmation email and homeowner portal access

### Decision
RFQ confirmation emails now carry only initial request information (reference, project type, and ZIP), a direct link to the generated homeowner request, and portal login instructions. Anonymous RFQ submissions provision a HOMEOWNER account in the same transaction as the request and email a random temporary password for a new account. Existing homeowner accounts are reused without resetting or emailing their password. The shared behavior applies to the standard RFQ, advisor, bathroom, and solar request-promotion paths.

### Reason
The prior confirmation email duplicated the complete request description and public requests had no portal account, so the homeowner could not use the request link or receive portal credentials.

### Impact
Added `src/lib/homeowner-account.ts`; linked `ProjectRequest` (and promoted bathroom/solar projects) to the homeowner account; changed `sendRfqConfirmationEmail` to render the short confirmation, request link, and account access block; plain-text email links now retain their URLs. Temporary passwords are hashed before persistence and existing account passwords are never changed.

### Status
Accepted and implemented. Full suite: 221/221 tests pass; TypeScript clean.

## 2026-08-10 — Share-Based Estimator Decomposition (Consistency Rewrite)

### Decision
Replace the v1 estimator's flat per-category allowances with a calibrated
`categoryShares` decomposition of the per-sqft baseline: every PRD §17.2
category amount = baseline (area × objective rate × bathroom-type factor ×
finish tier × location) × category share, with tier-scaled shares for fixture/
finish categories and the tile multiplier for tile categories. Flat extras
remain where scope-independent (permits) or additive (plumbing relocation per
foot, electrical per modification, curbless structural allowance, minimum
charge, overhead, contingency). Shower-only categories (shower/tub assembly,
glass enclosure, waterproofing) are omitted when `includeShowerWork` is false
(powder rooms, existing tub retained). Explicit `perSqft` rates added for
`repair_damage` (70/160) and `unsure` (110/220 = remodel band).

### Reason
The 2026-08-10 matrix audit showed the v1 estimator was scope-invariant:
flat allowances dominated, so full gut was only ~3% above a cosmetic refresh,
powder ≈ guest despite the 0.55 factor, and every powder room was charged for
a shower assembly, glass enclosure, and waterproofing. `repair_damage` and
`unsure` silently fell back to generic 100/200 rates. Results were neither
consistent nor explainable across the objective × type × tier matrix.

### Alternatives Considered
- Per-objective scope profiles (hand-tuned line-item subsets) — rejected:
  large config surface, easy to drift, duplicates what the rate table says
- Recalibrating the per-sqft rates upward so the base dominates — rejected:
  changes published price meaning without fixing category composition

### Impact
`categoryShares` in `DEFAULT_ESTIMATOR_CONFIG` (admin-versionable via
EstimatorConfiguration rows like the rest of the config), rewritten main
branch in `estimator.ts` (dead `geometry` param removed), `includeShowerWork`
in EstimateInputs/schema/derivation, electrical mods now 0 when the homeowner
explicitly answers "No". Shares calibrated so `remodel_same_layout` guest
reproduces v1 totals (~$11.5k–$36.3k for 40 sqft); every other scope now
scales consistently (cosmetic ≈ $4.5k–$13.5k, full gut ≈ $16.2k–$52.1k,
add_bathroom ≈ $27.5k–$96.2k at the same reference size).
`scripts/matrix-audit.ts` prints the full matrix; `estimator-consistency.test.ts`
locks ordering/monotonicity/scope rules.

### Status
Accepted — implemented and tested (210/210 unit tests green, tsc clean);
pending production deploy

---

## 2026-08-10 — Default AI Model: openai/gpt-5.6-luna

### Decision
Default OpenRouter model for requirement interpretation and both advisor
routes changed from `google/gemini-2.5-flash` to `openai/gpt-5.6-luna`
(still overridable via `OPENROUTER_MODEL`).

### Reason
Owner direction: use GPT 5.6 Luna as the underlying model so freeform
homeowner descriptions are interpreted into exact planner requirements, which
the deterministic estimator then prices (AI never sets prices — unchanged).
Model id verified present on the OpenRouter model list on 2026-08-10.

### Status
Accepted — code default changed; production env (`OPENROUTER_MODEL`,
`BATHROOM_AI_INTERPRETATION_ENABLED=true`) to be applied at deploy


---

## 2026-08-10 — SREC income shown as a projection, never netted into cost

### Decision
The solar plan computes a 10-year SREC income projection (MD/DC only) from
modeled production and config-driven price brackets, displayed as a separate
"SREC income potential" section with LOW-confidence provenance. It is never
subtracted from installed cost or net cost, and the MD Certified-SREC 1.5×
multiplier appears only as an expiring informational note.

### Reason
With federal §25D terminated (P.L. 119-21), no universally-applicable upfront
incentive exists in MD/DC, so net cost stays null by design. SRECs are the one
remaining dollar-denominated benefit, but they are recurring, market-priced,
and project-specific — netting them into cost would overstate certainty and
confuse "price you pay" with "revenue you may earn". Flat brackets with a
LOW-confidence label are honest; degradation-adjusted totals avoid inflating
the 10-year figure.

### Alternatives Considered
- Netting SREC NPV into net cost — rejected: mixes upfront price with
  speculative market revenue, undermines the "never fabricate savings" rule
- Per-year price curves (SREC markets decay as supply grows) — rejected: no
  verified forward curve available; flat bracket + LOW confidence is more
  honest than a fabricated curve

### Impact
`srec` block in `SolarPricingConfig` (brackets re-verified on the same
~180-day cadence as the incentive register), `srec-income.ts`,
`SolarPlanResult.srecIncome`, ResultsStep section, plan-route `stateCode`
input, version stamp `solar-srec-2026-08-10-v1`.

### Status
Accepted — implemented and tested (216/216 unit tests green, tsc clean);
pending production deploy

## 2026-08-17 — Bathroom planner continuity and post-submit brief access

### Decision
Bathroom type and project objective remain visible as selected chips on the
Capture step. Detailed Basics no longer repeats either answer once Capture has
already supplied it; it shows a compact summary instead. Layout is explicitly
optional through a "Skip layout for now" action and does not block estimates,
briefs, or RFP submission.

After an anonymous bathroom brief is generated, its PDF receives a random,
short-lived download token. The token is download-only and is included in the
RFP success panel and confirmation email. Portal request data remains protected
by homeowner authentication. New homeowner accounts continue to receive a
temporary password by email; existing passwords are never emailed. If email
delivery fails for a newly-created account, the one-time temporary password is
shown only in the immediate success response as a recovery path.

### Reason
The former Capture controls disappeared after selection, Detailed Basics asked
the same questions a second time, and Layout copy promised that users could
skip without providing an explicit control. RFP submission claimed the project
for the newly-created/reused homeowner account before the browser had a session,
which made the immediate brief PDF link fail with an authentication error.

### Impact
No schema change is required: the existing `ProjectBrief.shareToken` and
`shareExpiresAt` fields back the download-only brief link. Planner autosave is
also suppressed after RFP promotion because the anonymous browser must not
attempt to PATCH an account-owned project.

### Status
Implemented and locally verified: 225/225 unit tests green; `tsc --noEmit`
clean. Pending production deploy and live smoke test.

Superseded by the account-gated brief decision below: automatic public brief
links are no longer issued or shown in the planner.

## 2026-08-17 — Bathroom brief requires homeowner portal sign-in

### Decision

The anonymous bathroom planner and RFP confirmation email must not expose a
project-brief download link. Results may confirm that the brief is ready and
offer the contractor-proposal action, but the brief PDF is accessed through the
authenticated homeowner portal after sign-in. The confirmation email contains
the portal URL and account credentials (new temporary password or existing
account-password instruction), not a direct brief URL.

Explicit share links created from an authenticated portal remain a separate,
intentional sharing feature.

### Reason

The prior tokenized-link change conflicted with the agreed account-gated
experience and left a "Download project brief" control at the end of Results.

### Impact

Planner brief-generation responses and bathroom RFP responses no longer return
an automatic brief URL or mint an automatic share token. Existing portal PDF
authorization remains unchanged.

### Status

Implemented locally; pending validation and production deployment.

---

## 2026-08-19 — Unified SEO content template system for four verticals

### Decision

Created a unified authority-content template system spanning Bathroom Remodeling, Solar, Roofing, and HVAC:

1. **Shared interface** — `src/lib/content-templates/types.ts` defines `ContentTemplate` (slug, title, bodyText, author, reviewer, methodology, applicableLocation, applicableTrade, status). All verticals use the same shape.

2. **Vertical-specific template files** — Each vertical exports its own `*_CONTENT_TEMPLATES` array:
   - `src/lib/content-templates/bathroom.ts` — 7 templates (DMV cost, permits, process, tub-to-shower, small bath, aging-in-place, compare bids)
   - `src/lib/content-templates/solar.ts` — 6 templates (cost/payback, equipment, roof readiness, compare quotes, HOA rules, battery backup)
   - `src/lib/content-templates/roofing.ts` — 6 templates (replacement cost, repair vs replace, storm/insurance, flat roofs, compare bids, historic districts)
   - `src/lib/content-templates/hvac.ts` — 9 templates (DMV cost, Fairfax AC cost, NOVA heat pump, repair vs replace, Fairfax permits, compare quotes, AC warm air, heat pump cold weather, DMV permit comparison)

3. **Unified seed script** — `scripts/seed-content-templates.ts` imports all four arrays and upserts into `BathroomContentVersion` (the existing content table, which has generic `applicableTrade`/`applicableLocation` fields). Added `npm run content:seed-all`.

4. **Content quality rules enforced in authoring** — Every template includes required disclaimers, distinguishes planning estimates from contractor quotes, references jurisdiction-specific permit sources, and avoids unverified claims. All templates are seeded as `draft` pending editorial review.

5. **Strategy document** — `docs/marketing/CONTENT_STRATEGY_BATHROOM_SOLAR_ROOFING_HVAC.md` documents market understanding, keyword clusters by vertical, 6-month production roadmap, content tier architecture (Hub/Pillar/Cluster), cross-vertical bridge topics, and measurement framework.

### Reason

The 2026-07-23 SEO strategy identified HVAC as the first wedge and outlined a 12-month editorial program, but no content production system existed beyond the 5 Rockville bathroom templates. Creating templates for all four priority verticals at once ensures consistent voice, quality gates, and seedability. Using the existing `BathroomContentVersion` table avoids schema changes; the generic `applicableTrade`/`applicableLocation` fields already support multi-vertical content.

### Impact

- 28 new content templates ready for editorial review and database seeding.
- `BathroomContentVersion` now serves as the cross-vertical authority content table.
- `docs/marketing/SEO_STRATEGY_DMV.md` has a companion execution document.
- Next step: build Next.js public routes that read these templates and render them with `Article` JSON-LD, unique metadata, and estimator CTAs.

### Status

Accepted — templates authored and seed script ready. Pending editorial review, database seed, and public page implementation.
