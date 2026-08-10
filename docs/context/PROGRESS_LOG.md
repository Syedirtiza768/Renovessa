
# 2026-08-10 — Bathroom Remodeling: canonical schema, real location, landing + planner UX improvements

- **Canonical answer schema** — Added `src/lib/bathroom/answer-normalization.ts` with canonical keys (`lengthFt`, `widthFt`, `ceilingFt`, `measurementMethod`, `zipCode`, `city`, `locationId`) and bidirectional legacy migration. All ingress points (planner-types on load, preview API, RequirementsPromptStep, estimator input derivation) normalize before use.
- **Location made real** — Replaced hardcoded `inRockville: true` with `locationId` resolution from ZIP code. `estimate-input-derivation.ts` maps ZIP → city/locationId via known-location register. Estimator, preview API, brief builder, and contractor studio route all use `locationId`. Preview fails closed when location missing; unknown ZIPs show a disclaimer in assumptions.
- **Schema cleanup** — `estimateInputsSchema` replaced `inRockville` with `locationId`; `inRockville` fully removed from codebase (verified via grep).
- **Landing page improvements** — Added "What you'll receive" 4-step illustrated flow, example results card with realistic range + scope, and clear homeowner CTAs (planner, cost guide, contractors) to both generic and Rockville landing pages.
- **Planner UX improvements** — Photo labels changed from compass directions to homeowner-friendly fixture-context labels ("Wall with vanity", "Wall with tub/shower", etc.). ZIP collected early in Requirements step. Room-size band chips now show floor area. Draft normalization migrates v1 `measurements_draft` keys on load.
- **Results page improvements** — Location used is displayed prominently; cost drivers, assumptions, and exclusions surfaced; auto-generate brief available; mobile uses stacked cards; contractor count choice (1/2/3) in RFP form.
- **Contractor flow** — Studio estimate route uses `locationId: "rockville-md"`.
- **Tests** — Added `answer-normalization.test.ts` (9 tests). Updated `estimator.test.ts` (10), `confidence.test.ts` (7), `layout-templates.test.ts` (17 including room-size band floor area and estimate impact). Total suite: 167/167. Build clean (Next.js 15.5.21).
- **Files changed** — `answer-normalization.ts`, `estimator.ts`, `estimate-input-derivation.ts`, `layout-templates.ts`, `confidence.ts`, `schemas.ts`, `brief-pdf.ts`, `project-brief.ts`, `preview/route.ts`, `brief/route.ts`, `estimates/route.ts`, `contractor/bathroom-jobs/[id]/estimate/route.ts`, `planner-types.ts`, `RequirementsPromptStep.tsx`, `EstimateStep.tsx`, `MeasurementsStep.tsx`, `BathroomRemodelingPage.tsx`, `RockvilleBathroomPage.tsx`, plus test files.

# 2026-08-10 — Renovessa Solar phase 1: built, deployed, landing live

- Audited the existing bathroom planner, estimator, anonymous-draft, RFQ, admin-config and design-system architecture before writing any solar code; reused the *shape* (pure versioned engines, immutable input snapshots, fail-closed public numbers, `clientGeneratedId` drafts, shared `ProjectRequest` pipeline) while isolating solar domain logic in `src/lib/solar/`.
- Built the provider-adapter layer (Google Geocoding, Google Solar buildingInsights, PVWatts v8, OpenEI URDB, reviewed incentive register) so third-party JSON never escapes `providers/`, plus timeout/bounded-retry/typed-failure HTTP plumbing.
- Built the deterministic engines: panel layout, system sizing, **two-model production reconciliation** (per-roof-segment PVWatts, never "pick the larger"), consumption hierarchy, $/W cost engine with objective adder triggers, five-dimension confidence, plan composer, contractor brief, manual-roof fallback.
- Added the `Tracked<T>` provenance system so every displayed number carries its source, confidence and "Why this number?" text, and unconfirmed AI extraction is structurally barred from financial calculations.
- Schema: 11 models, 6 enums, 16 `SOLAR_*` audit events, `AuditEvent.solarProjectId`. Licensed provider payloads isolated behind `providerDataExpiresAt` so they purge on their own retention clock.
- 74 new tests (numerical identities, no-dead-end fallback matrix, provenance rules, geographic projection). Suite 144/144, `tsc` clean, green build.
- **Deployed to production** (`816d882`). Verified the migration was purely additive *before* applying it (11 CREATE TABLE, 6 CREATE TYPE, one nullable column, zero DROP/TRUNCATE/DELETE) rather than trusting `db push --accept-data-loss` on a live database.
- Enabled `SOLAR_LANDING_ENABLED` only: `/solar` and `/solar/methodology` are live and fully functional without API keys; `/solar/planner` stays 404 because without `GOOGLE_MAPS_API_KEY` a homeowner cannot even look up an address and without `NREL_API_KEY` there is no production model at all.
- **Found and fixed two bugs via live verification:** (1) `sitemap.ts` is statically prerendered, so it had frozen the build-time flag values — enabling the landing flag made the pages reachable but never added them to the sitemap; now `force-dynamic`, and the same latent issue on `BATHROOM_*` flags is recorded in `DECISION_LOG`. (2) All three solar page titles appended "| Renovessa" while the root layout already applies that template, producing doubled titles.
- Cost ranges remain withheld by design — the built-in $/W config is `sampleCount: 0` and `NEXT_PUBLIC_APPROVED_SOLAR_PRICING_VERSION` is unset. Incentives show nothing until reviewed register rows exist. Both are correct behaviour, not gaps.

# 2026-08-04 — Public Renovessa SVG logo

- Added `public/renovessa-logo.svg`: a transparent, scalable Renovessa wordmark using the established ascending architectural-bar mark and the existing charcoal brand color.

# 2026-08-03 — Rockville Google conversion launch package

- Reviewed the supplied vertical bathroom-ad concepts and grounded the follow-up in the implemented Rockville planner rather than their unsupported “exact/verified quote” wording.
- Curated a controlled nine-image first-wave Google asset set from the approved full-funnel campaign library: budget planning, planner/project brief, and scope comparison in landscape, square, and portrait.
- Added responsive-search copy, Demand Gen/display copy, destination mapping, UTM labels, conversion-event guidance, and pre-launch claim/crop checks at `outputs/marketing/renovessa-rockville-bathroom-campaign/04-google-advertising/conversion-launch-2026-08-03/`.
- No application code, production configuration, or external ad-account state changed.

# 2026-07-27 — Proposal Studio share + acceptance (Phase B)

- Tokenized public proposal page `/proposal/[token]` with accept / decline / question / revision request
- Contractor send/revoke share link; view tracking; acceptance snapshot locks the version
- `ContractorProposalMessage` + share/acceptance fields on `ContractorProposal`
- Public payload strips internal cost/margin data; robots disallows `/proposal/`
- Tests: 48 bathroom unit tests passing

# 2026-07-27 — Proposal Studio commercial layer (Phase A)

- Contractor pricing engine (`contractor-pricing.ts`): seed line items from baseline estimate, apply markup/overhead/contingency, distinguish markup vs gross margin
- Schema: `studioPricingJson` on `ContractorProfile`; proposal fields for estimate link, version, mode, cost/margin totals, `lineItemsJson`, approval audit; statuses `DRAFT` / `APPROVED` / `SENT`
- APIs: estimate returns priced lines; proposal create as DRAFT; approve endpoint with min-margin override; client PDF gated on approval (`?preview=1` for draft watermark)
- UI: line-item editor, internal profitability panel, approve-before-PDF; letterhead page includes pricing defaults
- Prompt draft no longer invents `$` totals from text — seeds only from estimate mid
- Tests: 44 bathroom unit tests passing (including pricing + draft guardrails)

# 2026-07-27 — Contractor Proposal Studio (white-label)

- Added `BathroomProject.contractorOwnerId`, client/job fields, `ContractorProposal.suggestedChanges`, and letterhead fields on `ContractorProfile`.
- New contractor APIs under `/api/contractor/bathroom-jobs` + letterhead + prompt draft + letterhead PDF.
- UI: `/portal/contractor/proposal-studio` (jobs, workspace, letterhead). Homeowner planner unchanged.
- Flag `BATHROOM_CONTRACTOR_STUDIO_ENABLED`.

# 2026-07-27 — Quick path + unified interactive layout

- Default planner mode is **Quick**: Capture → Layout → Results; skips Basics/Size/Scope/Conditions when Capture already filled them. Detailed mode toggle restores the longer path.
- Unified `LayoutWorkspace` with Existing/Proposed toggle; `layout-templates.ts` bootstraps room templates and generates proposed layouts (e.g. tub→shower) from goals.
- Capture step adds room-size bands + gap chips; permits folded into Results as optional accordion.
- 6 new unit tests for layout templates (33 bathroom tests total).

# 2026-07-27 — Bathroom planner: requirements prompt + photo uploads

- Planner opens on a **Describe** step: free-text requirements prompt, Save / Apply-to-answers (heuristic or OpenRouter when AI flag + key), and photo upload panel.
- `BathroomMedia` model + local filesystem storage (`UPLOAD_ROOT`, Docker volume `bathroom_uploads`).
- APIs: `POST/GET/DELETE .../media`, `GET .../media/[mediaId]`, `POST .../interpret`.
- Photos also on Conditions step; nginx `client_max_body_size 12m`; anonymous draft access for uploads.
- Docs updated: CURRENT_STATE, NEXT_STEPS.

# 2026-07-26 — Bathroom Remodeling Experience Phase 2 implemented

- Added audit event types: `BATHROOM_LAYOUT_SAVED`, `BATHROOM_PERMIT_ASSESSED`, `BATHROOM_SHARE_LINK_CREATED`, `BATHROOM_SHARE_LINK_REVOKED`, `BATHROOM_PHOTO_UPLOADED`, `BATHROOM_DIAGRAM_SAVED`. Wired anonymous project creation logging and permit/share-link audit events.
- Enhanced `/api/bathroom-estimator/analytics` with bathroom type distribution and recent audit events.
- Installed `pdfkit`; added `src/lib/bathroom/brief-pdf.ts` and `GET /api/bathroom-projects/[id]/brief/pdf` endpoint. Added "Generate brief + Download PDF" to planner estimate step.
- Added admin screens under `/portal/admin/bathroom/`: projects list, estimator config (publish/retire/clone/seed), content version CRUD, analytics dashboard. Nav items gated by `bathroomRockvilleEnabled()`.
- Built `src/components/bathroom/DiagramBuilder.tsx` — 2D SVG diagram builder with fixture palette, position editing, live geometry calculations, validation issues, save to layouts API. Integrated as existing/proposed layout steps in planner (gated by `diagramBuilder` flag).
- Added homeowner portal pages: `/portal/homeowner/bathroom-projects` (list) and `/[id]` (detail with proposal comparison table, price spread, credential badges). Updated homeowner nav.
- Added `src/lib/bathroom/advisor-prompt.ts` with strict bathroom advisor system prompt and output sanitization (detects/replaces price, dimension, and permit-determination claims). Added `POST /api/bathroom-projects/[id]/advisor` endpoint with out-of-scope routing and audit logging. Gated by `BATHROOM_AI_INTERPRETATION_ENABLED`.
- Added `src/lib/bathroom/content-templates.ts` with full article bodies for cost, permits, planning-guide, tub-to-shower, accessible-bathrooms. Added seed script `scripts/seed-bathroom-content.ts` (`npm run bathroom:seed-content`).
- Installed `vitest`; added `vitest.config.ts` with `@/` path alias. Added 27 unit tests covering geometry, confidence, estimator, and advisor guardrails. Run with `npm test`.
- Updated `docs/context/CURRENT_STATE.md` with Phase 2 status.

# 2026-07-26 — Bathroom Remodeling Experience Phase 1 implemented

- Wrote pre-implementation note (`docs/planning/BATHROOM_REMODELING_IMPLEMENTATION_NOTE.md`) covering reused modules, extensions, new modules, DB changes, API/UI routes, integration/migration/security risks, and recommended order.
- Added Prisma models and enums for the full bathroom experience; regenerated Prisma client. Added `answersJson` to `BathroomProject` for autosave.
- Added `src/lib/feature-flags.ts` with env-driven `BATHROOM_*` flags + `BATHROOM_DEMO_MODE`; defaults OFF in production.
- Added pure-function core in `src/lib/bathroom/`: config, planner-steps, geometry, validation, confidence, estimator, budget-scenarios, permits, project-brief, schemas, authorization.
- Added APIs: `POST/GET /api/bathroom-projects`, `GET/PATCH /api/bathroom-projects/[id]`, layouts, estimates, permits, brief, RFQ promotion; `GET/POST /api/bathroom-estimator/configurations[/[id]]`, content, projects, analytics, and live `POST /api/bathroom-estimator/preview`.
- Added public routes under `/bathroom-remodeling/rockville-md` (landing + cost, permits, planning-guide, tub-to-shower, walk-in-showers, primary-bathrooms, small-bathrooms, accessible-bathrooms, contractors) reusing `PublicPage` shell.
- Added planner UI at `/bathroom-remodeling/rockville-md/planner` with step state machine, localStorage + server autosave, intro/measurements/scope/conditions/permits/estimate steps, live estimate preview with confidence and Essential/Balanced/Premium scenarios.
- Updated `src/app/sitemap.ts` to include bathroom routes when the landing flag is on.
- Updated `docs/context/CURRENT_STATE.md` with bathroom experience status.

# 2026-07-23 — RFQ Pilot 15 sent

- Pushed and deployed commit `d6736b3` (fail-closed Pilot 15 tooling) to production
- Ran `prepare-rfq-pilot-15` on production: draft `cmrws4saz000hmv43jgoh5rmk`, tag `RFQ Pilot 15 — July 2026`, exactly 15 `pilot15_ready` recipients
- Sent campaign: **15/15 accepted by SendGrid, 0 failures**; owner display name set to Ray Cooper
- Reply-to on the campaign is `ray@inbound.renovessa.com`
- Still outstanding: rotate previously exposed SendGrid API key; enable signed event webhook for bounce/complaint tracking

# 2026-07-23 — RFQ Pilot 15 campaign preparation and send-safety controls

- Selected 15 unique, high-fit, matched contractor prospects across all 13 represented trades; every selected license is active and no selected record has an outreach caution
- Replaced two weak addresses with email-first alternatives; all 15 domains publish MX records and the four phone-first addresses are published on their company websites
- Added exact contact-tag campaign targeting, expected-recipient count locking, preview mismatch warnings, and a server-side refusal to send when the resolved count differs from 15
- Added Ray Cooper as the actual bulk-email display sender when he owns the campaign, plus a shorter RFQ-first template with truthful variable-availability language
- Added repeatable generate/verify/production-prepare commands and the pre-send approval packet at `data/contractor_enrichment/rfq_pilot_15_campaign.{json,csv,md}`
- Verified all 15 production records are currently `new`, unsuppressed, and have zero prior outbound messages
- Confirmed a valid SendGrid domain-authentication entry now exists for `renovessa.com`; the older malformed/invalid entries remain but are not the active valid entry
- Found the SendGrid event webhook disabled and the production signature-verification key unset
- A diagnostic command unintentionally surfaced the active SendGrid API key in tool output; rotate/revoke that key before any further email send
- `npm run campaign:verify-pilot15`, `npx tsc --noEmit`, and the full production build pass; the build reports expected database-unreachable logs during static collection when local PostgreSQL is not running
- No contractor email was sent

## 2026-07-23 — Account integrity and compliance controls

- Removed unauthenticated email-based password resets/account creation from public RFQ endpoints and deleted obsolete temporary-password UI
- Repaired AI submission so it creates only an unassigned RFQ after explicit legal review; it cannot book, assign, or mutate accounts
- Made every communication checkbox unchecked/optional and added required versioned Terms/Privacy clickwrap
- Added append-only consent/acknowledgment/revocation evidence and durable EMAIL/PHONE/SMS suppression state
- Enforced suppression in bulk email and both Twilio outbound call paths; added signed inbound STOP webhook
- Expanded the public Privacy Policy and added retention/deletion, vendor, privacy-request, and incident-response procedures
- Added a code-linked register for every estimator branch and an objective-claim register; numeric publication now fails closed until exact model approval
- Updated Next.js to 15.5.21 and pinned patched PostCSS 8.5.22 / Sharp 0.35.3 transitive versions; `npm install` reports zero known vulnerabilities and the production build passes

## 2026-07-23 - SEO P0 implementation and production release preparation

- Repositioned all public acquisition copy around DMV estimate -> scoped RFQ -> available contractor bid options
- Removed unsupported volume, success-rate, ZIP-coverage, vetting, and fixed-response-time claims from public pages and confirmation messaging
- Added crawlable estimator, service/HVAC, location/Northern Virginia/Fairfax County, cost-guide, resources, methodology, about/contact, editorial, privacy, terms, accessibility, TCPA, and honest case-study foundation pages
- Added public navigation/footer architecture, unique metadata and canonicals, Organization/WebSite/Service/Breadcrumb JSON-LD, XML sitemap, robots policy, noindex controls for login/portal/confirmation/case-study placeholders, and a custom 404
- Changed call/text consent from pre-checked to affirmative opt-in with a dedicated disclosure
- Verified with `npx tsc --noEmit`, a successful Next.js production build (94 routes), and local production HTTP/metadata checks
- Published application release commit `12f0a74` to `main`, rebuilt/recreated the production app container, and verified healthy internal and external HTTPS responses
- Confirmed 22 sitemap URLs, production canonical `https://renovessa.com`, updated homepage positioning, and noindex directives for login and case-study placeholder routes

## 2026-07-23 - DMV organic search and content strategy

- Audited the implemented and deployed public site, positioning, metadata, routes, crawl foundations, and estimate-to-RFQ conversion path
- Researched current Google Search/Business Profile guidance, the DMV search landscape, and official DC/MD/VA permit and contractor-license sources
- Authored `docs/marketing/SEO_STRATEGY_DMV.md`: positioning, keyword architecture, site hierarchy, location quality gates, page templates, 48-topic editorial roadmap, original-data methodology, technical SEO, authority, measurement, and 12-month rollout
- Flagged P0 trust issues: production/repository copy drift, stale phone/content, unsupported public performance/coverage claims, and no page-level SEO/crawl framework
- The strategy was subsequently implemented through the P0 trust, architecture, and crawl foundation described above

## 2026-07-23 — Mobile fullscreen RFQ wizard

- Estimate wizard opens as fullscreen immersive sheet on viewports &lt;768px (sticky progress/footer, safe-area, scroll/focus on step change)
- Mobile scope/context use one-question sub-steps + single-choice auto-advance; sessionStorage draft resume
- Landing `openEstimate` wires hero/header/CTA/house/categories; hides MobileCTABar + header while sheet open
- Desktop in-page card behavior preserved

## 2026-07-22 — Contractor signup confirmation emails

- Welcome/confirmation email with portal credentials on admin contractor create (`sendContractorWelcomeEmail`)
- Admin Add Contractor UI shows credentials + email delivery status
- Contractor application form surfaces confirmation email sent/failed accurately

## 2026-07-22 — RFQ-only path + confirmation emails

- Homeowner RFQ confirmation email on `POST /api/project-requests` (`confirmationEmails.ts`)
- Contractor application confirmation email on `POST /api/contractor-inquiries`
- Estimate wizard: review/preview step before submit + rich success screen with full RFQ summary
- Removed landing short-form request; `/for-homeowners` and portal submit rebuilt around the wizard
- Public/portal CTAs point to `#estimate` / Submit RFQ

## 2026-07-22 — RFQ pilot 50 contractor emails

- Combined live Estimates/RFQ homepage insight with existing enrichment + Wave A–D outreach prep
- Selected 50 contractors (few per trade, spread across 16 ZIPs) from Rockville/Gaithersburg pool
- Generated short RFQ-first onboarding drafts: homeowner wizard → ballpark → RFQ → we send RFQs to onboarded pros
- Artifacts: `rfq_pilot_50_strategy.md`, `rfq_pilot_50_email_drafts.{md,csv,json}`, `scripts/generate_rfq_pilot_50_emails.py`

## 2026-07-22 — Estimate wizard + ops phone

- Replaced homepage AI chatbot with multi-step **home improvement estimate wizard** (`EstimateWizard`)
- Trade-specific scoping questions + DMV ballpark engine (`estimate-pricing.ts`, `estimate-wizard-data.ts`)
- RFQ submit creates `ProjectRequest` with `source=estimate_wizard`, rich description, and ballpark notes for ops to solicit contractor bids
- Updated how-it-works / FAQ / CTAs for estimate → RFQ → bids flow
- Ops phone updated to **(571) 460-0006** (header, footer, env defaults)

## 2026-07-09 — SendGrid email sending enabled (ray@renovessa.com)

- Deployed SendGrid API key + `SENDGRID_FROM_EMAIL=ray@renovessa.com` + `SENDGRID_REPLY_TO=ray@renovessa.com` to production server `/opt/renovessa/.env` (key stored only on the server, NOT in the repo)
- `SENDGRID_FROM_NAME` left unset → code default `Renovessa Ops` (`src/lib/sendgrid.ts`)
- Backed up previous `.env` to `/opt/renovessa/.env.bak.20260709-170259`
- Recreated `app` container to reload `env_file`; stack healthy (app + db)
- Verified: SendGrid key valid (paid account, reputation 100); `ray@renovessa.com` is a verified single-sender identity; test send via SendGrid API returned HTTP 202
- **Caveat (deliverability):** SendGrid domain authentication for `renovessa.com` is misconfigured — the whitelabel domain was entered as `https://renovessa.com/` (malformed) and all DNS CNAME records show `valid:false`. Sending works via single-sender verification, but custom DKIM/SPF is not active → higher spam-folder risk. Fix: re-add the domain as bare `renovessa.com` and add SendGrid's 3 CNAME records (mail CNAME + dkim1 + dkim2).
- **Security note:** the SendGrid API key was shared in plaintext during this session — recommend rotating it in SendGrid and updating the server `.env` if this channel is logged

## 2026-07-08 — Softphone dialer unblock

- Diagnosed dialer failure: no assigned Twilio number in DB, empty TwiML App voice URL, localhost unreachability for webhooks, missing E.164 normalize on softphone path
- Fixed: export `toE164` + `getTwilioWebhookBaseUrl`, normalize on connect webhook + Softphone dial, `TWILIO_WEBHOOK_BASE_URL` support, seed preserves/reassigns Twilio numbers
- Provisioned Twilio number `+12405708350` to admin; TwiML App + cloudflared tunnel wired
- **Remaining blocker:** Twilio Trial error 21219 — cannot dial unverified `+12408006040` until account upgrade

## 2026-06-19 — Portal UX gap fixes

- Homeowner portal: settings, in-portal submit, project detail pages
- Contractor portal: settings page
- Admin: My Leads view, Team CRUD, role-based nav, ops login redirect
- API: session-aware `POST /api/project-requests`, `POST /api/team`

- Completed first-job MVP gap review (~38% readiness; appointment lifecycle is primary blocker)
- Authored comprehensive implementation plan: `docs/planning/FIRST_JOB_MVP_IMPLEMENTATION_PLAN.md`
- Plan covers 7 sprints (Phases 0–6): security, schema, intake wedge, ops spine, appointment lifecycle, proof layer, launch

## 2026-06-02 — MVP implementation from Product Blueprint

- Implemented Next.js 15 + PostgreSQL + Prisma full-stack application
- Built public website, homeowner/contractor/admin portals per blueprint MVP scope
- Added Docker Compose deployment on port 7090 with demo seed data
- Recorded tech stack decisions (Next.js, Prisma, JWT auth, Tailwind)

# 2026-07-24 - Pilot 15 contractor calling workspace

- Prepared `outputs/019f8bec-effb-72c0-9f9b-a2f87ae6196b/Renovessa_Contractor_Call_Sheet.xlsx` for post-email contractor calls
- Joined the exact 15-company cohort to existing phone, trade, service-area, reputation, license, and public-source data
- Added a live call queue with status/email/capacity/concern dropdowns, personalized hooks, discovery/follow-up dates, attempt counts, and formula-driven summary metrics
- Added recommended, direct, and owner-operated call-script variants plus voicemail, SMS, and concise objection handling
- Marked the SendGrid campaign record as sent while requiring the caller to recheck bounces, unsubscribes, complaints, suppressions, and DNC status before each call
- Rendered and visually reviewed all four worksheets; formula scan found no Excel error values
# 2026-07-24 - Google Sheets pre-call SMS workspace

- Added a dedicated `Pre-Call SMS` tab to the live contractor calling Google Sheet
- Added 15 personalized, ready-to-edit messages that reference the email and set up a brief later call without attempting to sell by text
- Added recommended, short/busy, warm, capacity-sensitive, unread-email, and day-before variants
- Added timing guidance, reply notes, SMS-status dropdowns, conditional status colors, and explicit STOP/DNC/suppression safeguards
- Verified the new ranges, formatting, frozen headers, validation rules, and conditional formatting through the live Sheets API

# 2026-07-30 — Rockville bathroom full-funnel campaign system

- Audited the live Rockville bathroom landing page and Quick planner route; recorded product language, planner stages, published ranges, visual tokens, and compliance guardrails
- Built 13 campaign concepts from the requested A–L families, separating Guest Bath and Powder Room as independent project types
- Produced 1,068 approved sRGB PNGs across 27 exact sizes, including the 624-asset core Meta matrix, four eight-slide carousels, 13 five-frame story sets, six dedicated retargeting segments, and four complete motion-ready duration sets
- Added Google Display, Performance companions, website, email, Facebook, Instagram, LinkedIn, Pinterest, Google Business Profile, 20×3 infographics, and 10×4 lead-magnet cover concepts
- Created six new text-free campaign photo masters and reused two compatible Renovessa masters; all image-generation prompts and provenance are documented
- Added exact nested delivery folders, 22-column CSV/JSON manifests, copy and channel-content libraries, editable render and QA sources, approved/web-optimized hard-linked views, contact sheet, rejection/regeneration log, and export index
- Final automated QA passed 1,068/1,068 files for existence, PNG format, manifest dimensions, sRGB color space, naming, metadata completeness, and core-matrix coverage
- No application code, runtime configuration, database schema, or production page content changed

# 2026-07-30 - Full-funnel homeowner digital campaign asset kit

- Audited the live `renovessa.com` visual system and approved acquisition positioning, using the supplied concept boards as layout references
- Created two clean campaign master photographs: a warm remodeled bathroom and a homeowner planning a project before requesting bids
- Produced 24 exact-dimension PNG assets covering Meta/Instagram feed and stories, Facebook/LinkedIn/X, YouTube, email, Open Graph, web hero, social profile/covers, and common Google Display formats
- Added scalable Renovessa mark and wordmark SVGs, a brand-palette board, CSV/JSON manifests, a campaign overview preview, and editable local regeneration sources
- Added Google responsive-search headlines/descriptions, sitelinks, callouts, three Meta copy variants, LinkedIn/Facebook and X copy, email subject/preheader/body, organic caption, and a 15-second vertical-video script
- Verified all 24 PNG dimensions against the manifest and kept claims within the approved estimate → scoped request → contractor bids model

# 2026-08-10 — Bathroom planner UX/RFP conversion audit + funnel fixes

- Ran the full bathroom-planner audit brief against the production deployment (SSH access to EC2, `/opt/renovessa`, containers `renovessa-app-1`/`renovessa-db-1`, nginx `renovessa.com`); local repo matches prod code at `0a1de6d`
- Found and fixed a hard dead end at the main conversion CTA: anonymous RFP submission always 400'd (client posted no contact data); `POST /api/bathroom-projects/[id]/rfp` now takes a validated contact+consent payload (`rfpSubmissionSchema`), records clickwrap evidence, sends the RFQ confirmation email, sets `RFQ_SUBMITTED`, and claims the project atomically to prevent duplicate RFPs
- Found and fixed live-broken estimate persistence: FK to nonexistent `"default-internal"` EstimatorConfiguration (zero config rows in prod) — `BathroomEstimate.configurationId` is now nullable; schema pushed to prod DB
- Found and fixed duplicate-project bug: refresh lost `projectId` (never saved to localStorage draft) and created a new project each load; drafts now persist `projectId`/`referenceNumber`/`clientGeneratedId`, validate the resumed project on hydrate, and server dedupes by `clientGeneratedId`
- Reworked Estimate step UX: estimate retry on failure, persist-status badge, "Request contractor proposals" contact form (first name/email/phone/ZIP/timeline/contact preference/notes + terms/privacy required, TCPA optional), persistent success panel with what-happens-next (survives refresh via `answers.rfp_reference`)
- Fixed Capture-step gating lie: room-size-only selection now satisfies `hasCaptureContent` (error message promised it did); save failures now surface with a Retry action in the planner header; progress label is "Step X of Y" instead of a misleading percentage
- Added 15 unit tests (`__tests__/rfp-conversion.test.ts`); suite 70/70 green; `next build` clean
- Added `scripts/e2e-bathroom-rfp-local.sh` and ran it green (9/9): anonymous journey → draft dedupe → autosave → preview → persisted estimate (27 line items) → brief → RFP (consent versions + 3 ConsentEvents + audit trail verified in prod DB) → duplicate/consent rejections → full test-data cleanup
- Production deploy of the new build is pending; SMS OTP verification and client-side analytics funnel remain open gaps from the audit brief

# 2026-08-10 — Bathroom funnel fixes deployed to production

- Committed `e43b921` (15 files) and pushed to `origin/main`; server pulled and rebuilt via `docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build`
- New `renovessa-app-1` container healthy; entrypoint confirmed DB already in sync (nullable `configurationId` applied earlier via tunnel)
- Live E2E (`scripts/e2e-bathroom-rfp-live.sh`) 9/9 against `https://renovessa.com`: anonymous draft → dedupe → autosave → estimate preview → persisted estimate (27 line items) → brief → RFP `RNV-2026-20247` with real SendGrid confirmation (`emailSent=true`), consent versions + 3 ConsentEvents verified, duplicates/consent-less submissions rejected, all test data removed
- `/`, `/bathroom-remodeling`, and `/bathroom-remodeling/rockville-md/planner` all return 200 on production

# 2026-08-10 — Production E2E audit of powder-room basin swap + fixes

- Ran the bathroom planner end-to-end against production (SSH to EC2, `renovessa-app-1` on :7090) for the scenario "change the wash basin in the powder room": anonymous project `RNV-2026-65405` → interpret → estimate → brief → RFP `RNV-2026-69061` (`emailSent=true`, duplicate RFP correctly rejected with 409, DB records verified)
- Found the flow's plumbing works but the estimate was wrong for the scenario ($11,403–$37,150 full-remodel line items for a basin swap), the heuristic interpret defaulted to `remodel_same_layout` (AI interpretation disabled, no OPENROUTER_API_KEY), `/brief/pdf` 500'd on missing pdfkit AFM fonts, and saved estimates used placeholder HIGH confidence
- Fixed `/brief/pdf` ENOENT: `serverExternalPackages: ["pdfkit"]` in `next.config.ts` (pdfkit was webpack-bundled so `__dirname/data/*.afm` was unreachable in the standalone image)
- Added scope-aware `fixture_replacement` objective: itemized small-job branch in the estimator (per-fixture allowance × finish tier, flat hookup labor, small-job minimum charge 450; no shower/tile/permit items), fixture-swap budget-scenario copy, conditional "which fixture?" picker in ScopeStep (remodel-only fields hidden), `fixtureType` plumbed through schemas/derivation/interpret (both heuristic keywords and the AI prompt)
- Documented all findings in `docs/context/KNOWN_ISSUES.md` (3 new entries) and the pricing decision in `docs/context/DECISION_LOG.md`
- 6 new estimator unit tests; full suite 199/199 green; `tsc --noEmit` clean
- Production deploy pending; test records `RNV-2026-65405` / `RNV-2026-69061` still in prod DB awaiting cleanup decision

# 2026-08-10 — Estimator consistency rewrite + GPT 5.6 Luna as AI model

- Matrix audit (`scripts/matrix-audit.ts`) proved the v1 estimator was scope-invariant: full gut only ~3% above cosmetic refresh, powder ≈ guest, shower items charged in powder rooms, `repair_damage`/`unsure` on silent fallback rates
- Rewrote the estimator main branch to calibrated `categoryShares` decomposition of the per-sqft baseline (reference scenario `remodel_same_layout` guest reproduces v1 totals; everything else now scales consistently); shower-only categories skipped via `includeShowerWork` (powder rooms, retained tub); explicit `repair_damage`/`unsure` rates; electrical mods 0 on explicit "No"
- Switched default OpenRouter model to `openai/gpt-5.6-luna` in interpret + both advisor routes (model id verified on OpenRouter; prod already has an API key)
- Added `estimator-consistency.test.ts` (11 tests: full-matrix validity, monotonic objective/type/tier/area ordering, shower-scope rules, electrical handling); full suite 210/210 green, `tsc --noEmit` clean
- Post-fix matrix: fixture swap $865–$2.3k · cosmetic $4.5k–$13.5k · remodel $11.5k–$36.3k · full gut $16.2k–$52.1k · add bathroom $27.5k–$96.2k (40 sqft guest, standard tier)
- Pending: production deploy incl. env changes (`OPENROUTER_MODEL=openai/gpt-5.6-luna`, `BATHROOM_AI_INTERPRETATION_ENABLED=true`) and live re-verification

# 2026-08-10 — Deployed: consistent estimator + Luna interpretation + PDF fix; solar pass

- Committed `e81f112` (16 files) and pushed; server pulled, env updated (`OPENROUTER_MODEL=openai/gpt-5.6-luna`, `BATHROOM_AI_INTERPRETATION_ENABLED=true`), rebuilt via `docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build`; `renovessa-app-1` healthy on the new image
- Live post-deploy verification: Luna interpretation of "change the wash basin in my powder room" → `source: openrouter`, `fixture_replacement` + `sink_basin` with sensible follow-ups; preview $865–$2,328 (7 scope-relevant categories only); estimate save 201; brief 201; **`/brief/pdf` now 200 `application/pdf`**; RFP `RNV-2026-44347` with `emailSent=true`; `/bathroom-remodeling/planner`, `/solar`, `/solar/planner` all 200
- Solar pass (pre-deploy smoke test, code unchanged by this batch): geocode → project → Google roof analysis (HIGH imagery) → plan (316 panels, $292.5k–$423.5k installed for the large test roof) → PVGIS cross-check `agreement: HIGH` (1.36% diff) → brief → RFP `RNV-2026-74258` all green
- Solar gaps are ops/content, not code: `SolarIncentiveProgram` table empty (net cost withheld by design until an admin enters verified programs), `SOLAR_PVWATTS_ENABLED=false` (no NREL key), `SOLAR_UTILITY_RATES_ENABLED=false` (no OpenEI key), zero `EstimatorConfiguration` rows (built-in defaults in use)
- Test records left in prod DB pending cleanup decision: bathroom `RNV-2026-65405`/`RNV-2026-69061`, `cmsnbcc5m0001sz01c79o76pn`/`RNV-2026-44347`; solar `RNV-2026-66990`/`RNV-2026-74258`

# 2026-08-10 — Solar incentive register seeded (9 verified programs)

- Researched current (Aug 2026) program status before writing anything: federal §25D is **terminated** for property placed in service after 2025-12-31 (P.L. 119-21; confirmed on the IRS page) — it is registered as RETIRED so stale "30% federal credit" claims have an authoritative correction
- Inserted 9 rows into prod `SolarIncentiveProgram` via `scripts/seed-solar-incentives-2026-08-10.sql`: PUBLISHED informational — MD SRECs (incl. 1.5× Certified SREC window through 2028-01-01), MD sales-tax exemption, MD property-tax exemption, DC SRECs, DC Solar for All, §48E third-party-owned context; DRAFT — MSAP (FY26 window closed/funding exhausted, republish when FY27 opens), MD Bridge Fund (eligibility window passed)
- Every row carries source URL + `lastVerifiedAt` 2026-08-10; stale filter (180 days) means re-verification is due by ~2027-02-06
- Live-verified on the MD test project: plan now lists 4 applicable programs with honest exclusion reasons; net cost correctly stays hidden because no universally-applicable, calculable upfront incentive exists in Aug 2026 (post-25D) — the register informs, it does not fabricate savings

# 2026-08-10 — Solar SREC income projection (10-year MD/DC revenue ranges)

- Post-25D, the solar plan's "after incentives" story was empty by design (net cost withheld); homeowners in MD/DC have one real monetizable program left — SRECs — so the plan now projects that income instead of leaving the value story blank
- New `src/lib/solar/srec-income.ts`: `projectSrecIncome()` converts modeled annual AC production to SRECs/yr (1 SREC = 1 MWh), applies per-state price brackets from pricing config (MD $50–$90, DC $300–$425), projects 10 years with the array's annual degradation (geometric sum, not flat ×10), and returns LOW-confidence provenance labeled "market-priced, not guaranteed"
- MD Certified SREC 1.5× multiplier shown as an informational note only while `new Date() < certifiedUntil` (2028-01-01) — never baked into the numbers, since certification is project-specific
- SREC income is deliberately never netted into system cost or net cost: it is recurring market revenue, not an upfront incentive; cost-engine/ResultsStep copy now distinguishes "programs listed but not monetizable upfront" from "nothing verified"
- Config-driven (`srec` block in `SolarPricingConfig`, admin-versionable, deep-merged); unknown/no-production states return null; version stamp `solar-srec-2026-08-10-v1` added to the plan snapshot
- 6 new unit tests (`srec-income.test.ts`); full suite 216/216 green, `tsc --noEmit` clean
- Pending: production deploy + live verification on the MD test project `RNV-2026-66990`
- Deployed `a1fc5d9`: server pulled, rebuilt, `renovessa-app-1` healthy; live-verified on MD test project `RNV-2026-66990` (135,561 kWh/yr): 135.6 SRECs/yr, $6,778–$12,200/yr, 10-yr $66,276–$119,296 (degradation-adjusted), Certified-SREC note present, provenance LOW; `/solar/planner` 200

# 2026-08-10 — Fixed stuck "Generating your project brief…" spinner

- Owner-reported on production: planner stuck at the auto-brief spinner after estimate save; prod DB showed the brief WAS created (`RNV-2026-19550`, brief + estimate rows present) — pure client-side effect bug
- Root cause: `EstimateStep.tsx` auto-brief `useEffect` had `briefGenerating` in its deps and set it synchronously inside the effect → self-retrigger → cleanup aborted its own in-flight fetch → `finally` skipped the reset → spinner forever; brief POST actually completed server-side
- Fix: `useRef` per-project guard, `briefGenerating` removed from deps, retryable error surfaced on failure (manual button stays as fallback); suite 216/216 green, tsc clean
- Gap noted: all prior E2E drove the API via curl — the browser effect path was never exercised; this class of bug needs a browser-level smoke check
