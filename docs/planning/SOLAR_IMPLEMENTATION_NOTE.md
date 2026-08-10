# Renovessa Solar — pre-implementation note

> Status: **Phase 1 implemented** · Last reviewed: 2026-08-10
> Companion to `docs/planning/BATHROOM_REMODELING_IMPLEMENTATION_NOTE.md`.
> Read `docs/context/CURRENT_STATE.md` first.

This note is the required pre-implementation output (audit → gap analysis → architecture →
data-source matrix → methodology → AI matrix → UX → fallback matrix → plan) for the
specialized Solar experience. It records what was reused, what was changed, what was added,
and — importantly — **what was deliberately not built and why**.

---

## A. Current-state audit — what Renovessa already has

Audited: `/bathroom-remodeling`, `/bathroom-remodeling/rockville-md/planner`, the estimator
architecture, anonymous drafts, RFQ workflow, contractor matching, admin config, design
system, auth, uploads, analytics, DB, API conventions, component library.

| Area | What exists | Verdict for solar |
|---|---|---|
| **Anonymous draft persistence** | `BathroomProject.clientGeneratedId` + localStorage draft (`planner-types.ts`), server `POST /api/bathroom-projects` de-dupes on `clientGeneratedId`, debounced `PATCH` autosave with visible save-failed + retry (`BathroomPlanner.tsx:171-238`) | **Reuse the pattern verbatim.** It is genuinely good: idempotent creation, resumed-draft validation (`GET` on resume, drop dead id), offline-tolerant. Copied structurally into `SolarProject` / `SolarPlanner`. |
| **Estimator architecture** | Pure deterministic function `generateEstimate(inputs, config, confidence)` → versioned line items + assumptions/unknowns/exclusions/costDrivers, persisted with `inputSnapshotJson` and `configurationId` (`src/lib/bathroom/estimator.ts`, `api/bathroom-projects/[id]/estimates/route.ts`) | **Reuse the shape, not the code.** Solar cost drivers are $/W-based, not $/sqft-based. New `src/lib/solar/cost-engine.ts` follows the same contract: pure fn, versioned config, immutable input snapshot, line items with `calculationReference`. |
| **Versioned admin config** | `EstimatorConfiguration` (version unique, `validFrom/validTo`, `status DRAFT/PUBLISHED/RETIRED`, `configurationJson`, `methodology`, `approvedBy`), admin screens at `/portal/admin/bathroom/estimator-config` | **Reuse the model design**, new table `SolarEstimatorConfiguration` (solar config shape is entirely different; overloading one JSON blob across two trades would make both unreadable). |
| **Fail-closed public numbers** | `NEXT_PUBLIC_APPROVED_ESTIMATE_MODEL_VERSION` — public estimator ranges are withheld until the exact claim-evidence model version is approved (`src/lib/estimate-substantiation.ts`) | **Reuse directly.** This is the single most important existing pattern for solar: it is the mechanism that stops us shipping invented $/W as local fact. Solar adds `NEXT_PUBLIC_APPROVED_SOLAR_PRICING_VERSION`. |
| **Confidence scoring** | `scoreConfidence()` pure fn → HIGH/MEDIUM/LOW + reasons + improvements (`src/lib/bathroom/confidence.ts`) | **Reuse the shape.** Solar needs *dimensional* confidence (roof / energy / production / pricing / incentive) that rolls up, so `src/lib/solar/confidence.ts` extends the idea rather than importing it. |
| **RFQ promotion** | `POST /api/bathroom-projects/[id]/rfp` → requires a persisted brief, creates `ProjectRequest` with `trade`, TCPA/consent evidence via `recordProjectCompliance`, atomic `updateMany` claim to prevent double-submit, SendGrid confirmation | **Reuse wholesale.** Solar RFP route is the same transaction shape with `trade: "Solar Installation"` and `source: "solar_rfp"`. Consent/compliance machinery is untouched. |
| **Contractor matching / dispatch** | `POST /api/bathroom-projects/[id]/dispatch` (admin), `ContractorProfile`, capacity cells | **Reuse.** Solar projects promote into the *same* `ProjectRequest` pipeline, so existing lead routing, dispatch, appointments, and billing work unchanged. |
| **Project brief + PDF** | `src/lib/bathroom/project-brief.ts` → `ProjectBrief.briefJson`, `brief-pdf.ts` via `pdfkit`, `GET .../brief/pdf` | **Reuse the pattern**, new `src/lib/solar/brief.ts` (solar brief content is disjoint from bathroom). PDF renderer deferred to Phase 2 — noted below. |
| **Uploads** | Local FS under `UPLOAD_ROOT`, `BathroomMedia`, path-traversal guarded, 10 MB cap, allow-listed MIME (`media-storage.ts`) | **Reuse the storage helper design.** Solar needs PDF (utility bills) in addition to images — Phase 2. |
| **Auth / anonymous** | JWT cookie `getSession()`, anonymous planner allowed, ownership on `homeownerId` | **Reuse.** No change. |
| **Design system** | Bone/ink/accent tokens + `landing-*` component classes in `globals.css`, `PublicPage` shell, `SiteHeader`/`SiteFooter`, `JsonLd`, `pageMetadata()` | **Reuse.** Solar landing uses `PublicPage`/`pageMetadata`/`JsonLd`; the planner uses the same tokens but its own full-bleed shell because the roof canvas must dominate. |
| **Analytics** | `AuditEvent` + `logAuditEvent()` with typed `AuditEventType` enum; bathroom analytics endpoint aggregates | **Reuse.** New `SOLAR_*` audit event types added to the same enum. |
| **API conventions** | Route handlers, zod schemas in `lib/<domain>/schemas.ts`, `assert…Access` authorization helpers, in-memory rate limit, `{ error }` JSON + status | **Reuse verbatim.** |
| **Testing** | vitest, `@/` alias, `src/**/*.test.ts`, pure-function unit tests | **Reuse.** |
| **Feature flags** | `src/lib/feature-flags.ts`, env-driven, default OFF, `*_DEMO_MODE` force-on | **Reuse.** Added `SOLAR_*` flags in the same file. |

**Anti-pattern found and deliberately not copied:** the bathroom estimates route builds its
confidence input from placeholder values (`estimates/route.ts` — `measurement_method: inputs.objective`,
`has_diagram: "yes"` hardcoded). Solar computes confidence from the real project record.

---

## B. Gap analysis — what solar specifically requires

Nothing in the existing stack addresses these; all are new:

1. **Geospatial roof truth.** Bathroom geometry comes from the homeowner's tape measure. Solar
   geometry must come from an authoritative provider (roof segments, pitch, azimuth, sunshine
   quantiles, candidate panel positions) or be explicitly downgraded to a manual fallback.
2. **Building disambiguation.** A bathroom is unambiguous. A geocode is not — it can land on a
   neighbour, a garage, or an apartment block. Requires an explicit homeowner confirmation gate.
3. **Two independent production models + reconciliation.** No analogue in bathroom.
4. **Per-segment physical modelling.** Tilt/azimuth vary across roof planes; averaging them
   into one PVWatts call is a real accuracy loss, so segments are modelled separately and aggregated.
5. **Consumption model.** Bathroom has no "how much do you use" axis at all.
6. **Utility tariffs and export compensation.** New external data class, and one where "first
   result returned" is frequently the wrong tariff.
7. **Incentives with legal exposure.** Bathroom has none. Solar incentives expire, change, and
   have eligibility conditions — hardcoding is a compliance risk, not just an accuracy risk.
8. **Provenance on every displayed number.** Bathroom tracks assumptions per *estimate*. Solar
   needs it per *value*, because a single results page mixes API-derived, calculated, assumed,
   and homeowner-supplied numbers side by side.
9. **Interactive geospatial visualization.** `DiagramBuilder.tsx` is an SVG editor on a
   homeowner-drawn rectangle; the roof visualizer renders projected real-world geometry.
10. **$/W pricing with adders**, not $/sqft with tier factors.

---

## C. Architecture

```
                       ┌──────────────────────────────────────────┐
  browser              │  /solar (landing)   /solar/planner       │
                       │  RoofVisualizer (SVG, projected geometry)│
                       │  localStorage draft + debounced autosave │
                       └───────────────┬──────────────────────────┘
                                       │  (no third-party keys ever reach the client)
                       ┌───────────────▼──────────────────────────┐
  route handlers       │  /api/solar/geocode                      │
                       │  /api/solar/building-insights            │
                       │  /api/solar/utility-rates                │
                       │  /api/solar/incentives                   │
                       │  /api/solar-projects[/id][/analysis|     │
                       │      production|estimate|brief|rfp]      │
                       └───────────────┬──────────────────────────┘
                                       │
        ┌──────────────────────────────┼───────────────────────────────┐
        │                              │                               │
┌───────▼─────────┐        ┌───────────▼────────────┐      ┌───────────▼──────────┐
│ provider layer  │        │ deterministic engines  │      │ persistence (Prisma) │
│ (adapters only) │        │ (pure functions)       │      │                      │
│ Geocoding       │        │ layout-engine          │      │ SolarProject         │
│ SolarGeospatial │───────▶│ system-sizing          │─────▶│ SolarRoofAnalysis    │
│ ProductionModel │        │ production (reconcile) │      │ SolarPanelLayout     │
│ UtilityRate     │        │ consumption            │      │ SolarProductionEst.  │
│ Incentive       │        │ cost-engine            │      │ SolarCostEstimate    │
└─────────────────┘        │ economics              │      │ SolarEstimatorConfig │
                           │ confidence             │      │ SolarIncentiveProgram│
                           └────────────────────────┘      │ SolarProjectBrief    │
                                                           │ → ProjectRequest (RFQ)│
                                                           └──────────────────────┘
```

**Key architectural rules**

- **Adapters own third-party JSON.** Raw provider shapes never leave `src/lib/solar/providers/`.
  Everything downstream sees `NormalizedBuildingInsights`, `NormalizedTariff`, etc.
- **Engines are pure and versioned.** No I/O, no `Date.now()` inside the maths, no randomness.
  Every engine stamps a `calculationVersion` so historical estimates stay reproducible.
- **Provenance is a value wrapper**, not a side table: `Tracked<T> = { value, unit, provenance }`.
  It flows through calculation so "Why this number?" is derivable, not authored by hand.
- **Licensed source data is separated from Renovessa-derived data.** `SolarRoofAnalysis.rawProviderPayload`
  is nullable, TTL-stamped (`providerDataExpiresAt`), and purgeable without destroying the
  homeowner's project — which is exactly what a retention obligation requires.
- **Solar is isolated from bathroom.** No shared module except `db`, `auth`, `audit`, `seo`,
  `compliance`, `feature-flags`, and the design tokens. Solar promotes into the shared
  `ProjectRequest` lead pipeline — that is the correct reuse boundary.

---

## D. External data-source matrix

| # | Purpose | Provider / API | Availability | Cost | Caching / storage | Reliability | Fallback | Freshness surfaced | Attribution |
|---|---|---|---|---|---|---|---|---|---|
| 1 | Address → coordinates, normalized address | **Google Geocoding API** (`GOOGLE_MAPS_API_KEY`, server-side) | Global | Per-request billing | Geocode result cached on `SolarProject` (Renovessa-owned derived data: lat/lng/formatted address only) | High | Manual lat/lng entry; planner continues at lowered confidence | n/a | Google terms apply; no map display in Phase 1 |
| 2 | Roof geometry, segments, pitch, azimuth, sunshine, candidate panel positions | **Google Solar API — buildingInsights:findClosest** | US/EU/partial; **no coverage in many places** | Per-request billing | `rawProviderPayload` stored **with TTL** (`SOLAR_PROVIDER_CACHE_DAYS`, default 30) and purgeable; derived normalized fields retained as Renovessa data | High where covered; 404 `NOT_FOUND` common | **Manual roof mode** — homeowner enters roof faces/tilt/azimuth/area; PVWatts still runs; confidence drops to PRELIMINARY | `imageryDate`, `imageryProcessedDate`, `imageryQuality` shown in UI | Attribution required on any Google imagery display — Phase 2 gate |
| 3 | Imagery / flux / shade rasters | **Google Solar API — dataLayers** | Same as #2 | Per-request | **Not implemented in Phase 1** (see §I deviation) | — | Geometric SVG visualizer (implemented) | — | Would require Google attribution + retention controls |
| 4 | Independent AC production model | **NREL PVWatts v8** (`NREL_API_KEY`) | US + intl TMY | Free, rate-limited (1,000/hr with key) | Results are model outputs, freely storable | High | Google `yearlyEnergyDcKwh` alone, range widened, confidence lowered | Model version pinned (`pvwatts-v8`) | NREL attribution in methodology page |
| 5 | Utility tariffs | **OpenEI URDB** (`OPENEI_API_KEY`) | US, uneven coverage/staleness | Free | Tariff snapshot stored with `retrievedAt` + `effectiveDate` + `homeownerConfirmed` | Medium — often stale or ambiguous | Homeowner-confirmed blended $/kWh; economics falls back to the **simple** model | `startdate` + `retrievedAt` recorded; stale tariffs flagged | OpenEI attribution in methodology page |
| 6 | Incentives | **DSIRE API** (requires commercial licence Renovessa does **not** currently hold) | — | Subscription | — | — | **`ConfiguredIncentiveProvider`** — admin-curated `SolarIncentiveProgram` rows with source URL, effective/expiry, `lastVerifiedAt`, reviewer. **Empty by default ⇒ zero incentives displayed and none applied to net cost.** | `lastVerifiedAt`, `effectiveFrom/To` shown per program | Source URL displayed per program |
| 7 | Local installed pricing | **Renovessa proposal data** (does not exist yet — no solar proposals collected) | — | — | `SolarEstimatorConfiguration` versioned rows | — | Built-in **planning default** config, explicitly `sampleCount: 0`, `dataBasis: "unvalidated_planning_default"`. **Public dollar display is fail-closed** behind `NEXT_PUBLIC_APPROVED_SOLAR_PRICING_VERSION`. | `effectiveFrom`, `sampleCount`, `reviewedBy` | n/a |
| 8 | Bill OCR / photo classification | OpenRouter vision (`OPENROUTER_API_KEY`) | — | Per-token | — | — | **Not implemented in Phase 1**; manual entry is the primary path and remains so | — | — |

---

## E. Calculation methodology

All equations live in `src/lib/solar/` and are unit-tested. `CALC_VERSION` constants are in
`src/lib/solar/versions.ts`.

**E1. System size**
```
dcSystemSizeWatts = panelCount × panelCapacityWatts
dcSystemSizeKw    = dcSystemSizeWatts / 1000
```
`panelCapacityWatts` comes from the provider's `panelCapacityWatts` (Google's layout model) or
from the selected catalog module — **never assumed to be 400 W**. If the homeowner switches to a
catalog module whose dimensions differ from the layout model's, the panel count is invalidated
and the layout is recomputed rather than silently rescaled.

**E2. Panel selection (deterministic)**
Candidate panels come from the provider (`solarPanels[]`, each with centre, `segmentIndex`,
`orientation`, `yearlyEnergyDcKwh`). Selection is a stable sort — never an optimizer with hidden state:
- `MAXIMIZE_PRODUCTION` → sort by `yearlyEnergyDcKwh` desc, take N.
- `TARGET_OFFSET` → same sort; take the smallest N where `annualProduction ≥ target × annualConsumption`.
- `MAXIMIZE_COUNT` → all candidates on enabled segments.
Ties break on `(segmentIndex, latitude, longitude)` so results are reproducible.
Segment exclusion is applied *before* selection.

**E3. Production — Model A (provider)**
`googleAnnualDcKwh = Σ yearlyEnergyDcKwh` over selected panels.
Converted to AC with the configured DC→AC derate (`config.production.dcToAcDerate`, default 0.85,
labelled an assumption) because Google's figure is **DC** and PVWatts' is **AC** — comparing them
directly would be an apples-to-oranges error.

**E4. Production — Model B (PVWatts v8, per segment)**
For each roof segment `s` carrying selected panels:
```
capacity_s = panels_s × panelCapacityWatts / 1000        (kW DC)
tilt_s     = segment.pitchDegrees
azimuth_s  = segment.azimuthDegrees
losses     = config.production.systemLossesPercent       (default 14.08 = PVWatts default)
array_type = 1 (fixed roof mount)
```
One PVWatts call per segment; `ac_annual` and `ac_monthly[12]` are summed element-wise.
**No averaged tilt/azimuth is ever sent.** Flat segments (`pitch < 5°`) are submitted at the
configured minimum tilt with an explicit assumption recorded.

**E5. Reconciliation**
```
diffPct = |A − B| / mean(A, B)
```
Thresholds are **admin-configurable** (`config.production.agreementThresholds`), initial product
rules — not scientific truth:
| diffPct | Agreement | Effect |
|---|---|---|
| < 5 % | HIGH | Point estimate = mean; narrow band ±5 % |
| 5–10 % | NORMAL | Point = mean; band = [min, max] |
| 10–15 % | MODERATE | Band = [min, max]; production confidence → MEDIUM |
| > 15 % | INVESTIGATE | Band widened to [min×0.9, max×1.1]; confidence → PRELIMINARY; discrepancy logged with both input sets |
The larger figure is never chosen. If only one model succeeded, its value is used with a ±15 %
band and `MODELS_DISAGREE` replaced by `SINGLE_MODEL`.

**E6. Consumption** — strict preference order (`src/lib/solar/consumption.ts`), each step
recording a distinct provenance:
1. 12 months actual kWh (sum) — `homeowner_input`, HIGH
2. Utility-provided annual kWh — HIGH
3. Partial months → `annual = Σ observed × (12 / monthsObserved)` — MEDIUM, extrapolation labelled
4. Homeowner annual kWh — MEDIUM
5. Homeowner monthly kWh × 12 — MEDIUM
6. **Bill dollars** → `annualKwh = (monthly$ − fixedCharge) × 12 / blendedRate` — LOW, and the UI
   states the blended rate used. Never presented as an exact kWh figure.
7. No input → **no consumption figure is produced at all**; offset is withheld rather than assumed.

**E7. Offset**
```
offsetPct = min(100, annualProductionAcKwh / annualConsumptionKwh × 100)
```
Withheld entirely when consumption is unknown (rule 7). Capped at 100 % for display; the
uncapped ratio is retained for the brief.

**E8. Installed cost**
```
baseLow  = dcWatts × band.dollarsPerWattLow
baseHigh = dcWatts × band.dollarsPerWattHigh
adders   = Σ applicable adders (each with a trigger that is API-derived, homeowner-answered,
           or explicitly assumed — never AI-inferred)
total    = base + adders, rounded to the configured display step ($500)
```
Bands are keyed by market × system-size band. **No net cost is computed unless at least one
verified incentive applies**; with zero verified incentives the UI shows gross planning cost and
says incentives could not be verified.

**E9. Confidence** — five dimensions each scored HIGH/MEDIUM/PRELIMINARY (roof, energy,
production, pricing, incentive); overall = worst of the weighted set, with an explicit
`improvements[]` list that drives the "improve your estimate" UI.

**E10. Rounding** — display rounding is applied at the **presentation boundary only**
(`formatters.ts`). Engines pass full-precision numbers between each other; a rounded value is
never fed back into a subsequent calculation.

---

## F. AI responsibility matrix

| Operation | Input | Output | Provider abstraction | Confidence | Homeowner confirmation | Failure behaviour | Prohibited |
|---|---|---|---|---|---|---|---|
| Natural-language project capture (Phase 2) | Homeowner free text | Candidate structured answers | `OpenRouter` behind `SolarNlpProvider` | Per-field | **Required** — pre-fills a form, never commits | Manual entry (already the primary path) | Must not produce kWh, prices, panel counts, or roof geometry |
| Utility-bill extraction (Phase 2) | Uploaded bill | `{utility, period, kWh, total, rate plan}` draft | `SolarBillExtractionProvider` | Per-field, stored alongside homeowner-confirmed value | **Required** before any financial use | Manual entry | Must not be used unconfirmed in any calculation |
| Photo classification (Phase 2) | Roof/panel/meter photo | Likely material / component, with confidence | `SolarImageClassifierProvider` | Per-label | **Required** ("appears to be…, please confirm") | Homeowner selects manually | Must not certify roof condition or remaining life |
| Result explanation (Phase 2) | Deterministic results + provenance | Plain-language explanation | Any | n/a | n/a | Static explanatory copy (**implemented today** — the "Why this number?" strings are deterministic, not generated) | Must not restate numbers not present in the input |
| RFQ summarization (Phase 2) | Structured brief | Contractor-readable scope prose | Any | n/a | Homeowner reviews brief | Structured brief renders without prose (**implemented today**) | Must not add scope not in the brief |

**Phase 1 ships with zero AI in the solar path.** Every number on the results page is from an
authoritative API, a deterministic calculation, a labelled assumption, or the homeowner.
AI is prohibited from: roof dimensions, panel counts, sun exposure, pitch, azimuth, electricity
rates, incentives, permit requirements, structural adequacy, roof condition, code compliance,
licensing, pricing, contractor availability, savings, and payback.

---

## G. UX flow

**Quick path** (default): `Address → Confirm your roof → Electricity → Goal → Roof & panels → Results → Request proposals`
Steps auto-skip when already satisfied (same `when()` predicate pattern as `BathroomPlanner`).

**Detailed path**: adds Property, Roof condition, Utility & tariff, Future loads, Battery goals,
Electrical system, Documents. Switching paths never loses answers (single `answers` map, superset).

The roof canvas is present from step 2 onward and dominates the layout on desktop
(canvas above the fold, metric strip beneath, detail panels below). On mobile the canvas is a
full-width interactive surface with a bottom sheet for controls and a persistent Continue CTA.
A complete **non-map textual equivalent** of every roof result is rendered for keyboard/screen-reader
users and is not a second-class summary — it carries the same numbers.

---

## H. Error / fallback matrix

Every external dependency has a defined non-dead-end path. Enforced by
`src/lib/solar/__tests__/fallbacks.test.ts`.

| Failure | Detection | Homeowner-visible behaviour | Recovery | Data preserved |
|---|---|---|---|---|
| Geocode no result | empty candidates | "We couldn't find that address" + manual entry | Re-enter, or enter coordinates | yes |
| Geocode ambiguous | >1 candidate | Candidate picker | Choose | yes |
| Solar API `NOT_FOUND` (no coverage) | 404 from provider | "This property isn't in the solar imagery dataset" | **Manual roof mode**: faces, tilt, azimuth, area → PVWatts still runs | yes |
| Solar API timeout / 5xx | `AbortController` at `SOLAR_PROVIDER_TIMEOUT_MS` | Retry affordance, then manual roof mode | Retry (max 2, backoff) | yes |
| Wrong building returned | homeowner rejects on confirm step | "Not my home" → manual roof mode + note in brief | — | yes |
| Imagery older than `imageryStaleYears` | `imageryDate` vs now | Date shown + "has anything changed?" prompt (new roof/addition/trees/existing solar) | Answers recorded, roof confidence lowered | yes |
| Zero suitable panels | `maxArrayPanelsCount === 0` | Honest "no suitable roof area found in this dataset" + manual roof mode + explanation | — | yes |
| Apartment/condo detected | homeowner property-type answer | Routed to a "shared roof" explanation + contact path, not a fake estimate | — | yes |
| PVWatts error | non-200 / missing outputs | Single-model production, wider band, confidence lowered, banner explains | Retry | yes |
| Both production models fail | — | **No production figure shown.** Roof analysis and layout still shown. | Retry | yes |
| No tariff match | empty URDB result | Blended-rate input, simple economics model, labelled | Homeowner enters rate | yes |
| Tariff ambiguous | >1 residential tariff | Homeowner picks; unconfirmed tariff is marked | Confirm | yes |
| No incentive data | provider returns none | "Incentive information could not currently be verified and has been excluded from this estimate." No net cost shown. | — | yes |
| Pricing not approved | `NEXT_PUBLIC_APPROVED_SOLAR_PRICING_VERSION` unset/mismatched | Dollar ranges withheld; everything else (roof, size, production, offset) still shown; brief still generates | Admin publishes a reviewed config | yes |
| Draft project deleted server-side | `GET` 404 on resume | Silent: stale id dropped, fresh draft created, answers kept | automatic | yes |
| Autosave fails | non-OK PATCH | Visible "couldn't save · Retry" | Retry button | yes (localStorage) |
| RFQ submission error | non-2xx | Inline error, form state kept, idempotent retry (atomic claim prevents doubles) | Retry | yes |

---

## I. Implementation plan and what shipped

### Phase 1 — shipped in this change
Schema, feature flags, provenance system, provider layer (geocoding, Google Solar, PVWatts,
OpenEI, configured incentives), all deterministic engines, API routes, `/solar` landing,
`/solar/planner` with the roof visualizer and interactive panel editing, results, brief,
RFQ promotion, methodology page, admin pricing config surface, audit events, sitemap/SEO,
and the test suite.

### Deliberate deviations from the specification (per §69 — documented, not silent)

1. **Roof visualizer renders projected geometry, not satellite imagery (Phase 1).**
   *Requirement:* display actual roof imagery with flux/shade raster layers.
   *Shipped:* an SVG renderer that projects the provider's real roof-segment bounding boxes and
   real candidate panel centres/orientations into a local planar frame (equirectangular
   projection at site latitude), colour-coded by each segment's actual sunshine quantiles.
   *Why this is better right now:* it is geometrically faithful to the same data the estimate
   uses, needs no raster licence/retention handling, renders in milliseconds, is fully
   keyboard-accessible, and cannot be mistaken for an engineered plan. Shipping GeoTIFF
   decoding plus Maps attribution/caching compliance in Phase 1 would have meant either a
   licensing shortcut or a much thinner estimate engine.
   *Cost:* lower emotional "that's my house" impact.
   *Recommendation:* Phase 2 adds an imagery layer behind `SolarImageryProvider` with Google
   attribution and TTL-bound caching; the visualizer already accepts a basemap slot.

2. **Incentives ship empty rather than with a federal-credit default.**
   Renovessa does not hold a DSIRE licence and §27 forbids hardcoding tax rules. The engine,
   schema, admin surface, and UI all work; the dataset is empty until a reviewer enters
   sourced programs. This is the accurate behaviour, not a stub.

3. **Cost ranges are computed but fail closed for public display.**
   The default $/W band is an internal planning default with `sampleCount: 0`. Displaying it as
   a local market fact would violate §23 and the repo's own substantiation policy. Everything
   else on the results page works without it.

4. **Battery, bill ingestion, tariff-detailed economics, AI, and PDF export are Phase 2/3.**
   Interfaces, schema columns, and UI affordances exist; the logic is not faked.

### Phase 2 (next)
Imagery layer + attribution/retention; utility-bill upload + AI extraction with confirmation;
detailed tariff economics; battery planner; solar brief PDF; incentive admin CRUD; roof/electrical photos.

### Phase 3
Future loads, financing, 25-year projections with explicit assumptions, richer installer brief,
equipment catalogs, structured contractor proposals, location pages.

### Phase 4
Pricing calibration from real proposals, tariff sophistication, advanced roof analysis, bid comparison.

---

## Related notes

- `docs/context/DECISION_LOG.md` — DEC-2026-08-10-01 … -05
- `docs/context/SYSTEM_MAP.md` — solar module map
- `docs/planning/BATHROOM_REMODELING_IMPLEMENTATION_NOTE.md` — the sibling sub-product
