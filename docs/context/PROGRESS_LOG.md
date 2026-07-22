
## 2026-07-23 - SEO P0 implementation and production release preparation

- Repositioned all public acquisition copy around DMV estimate -> scoped RFQ -> available contractor bid options
- Removed unsupported volume, success-rate, ZIP-coverage, vetting, and fixed-response-time claims from public pages and confirmation messaging
- Added crawlable estimator, service/HVAC, location/Northern Virginia/Fairfax County, cost-guide, resources, methodology, about/contact, editorial, privacy, terms, accessibility, TCPA, and honest case-study foundation pages
- Added public navigation/footer architecture, unique metadata and canonicals, Organization/WebSite/Service/Breadcrumb JSON-LD, XML sitemap, robots policy, noindex controls for login/portal/confirmation/case-study placeholders, and a custom 404
- Changed call/text consent from pre-checked to affirmative opt-in with a dedicated disclosure
- Verified with `npx tsc --noEmit`, a successful Next.js production build (94 routes), and local production HTTP/metadata checks

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
