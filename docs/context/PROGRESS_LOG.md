
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
