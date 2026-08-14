# Next Steps

## Solar — switch on the planner (blocked on API keys)

Deployed to production 2026-08-10. `/solar` and `/solar/methodology` are **live**; `/solar/planner` is deliberately 404 until the three provider keys exist. Full context: `docs/planning/SOLAR_IMPLEMENTATION_NOTE.md`.

1. **Get an NREL key** (free, instant, `developer.nrel.gov/signup`) — one key serves both `NREL_API_KEY` and `OPENEI_API_KEY`. Without it there is **no** production model at all and production is withheld entirely.
2. **Get a Google Maps Platform key** — enable *both* Geocoding API and Solar API, link billing (Solar API will not work without it), then **set a daily quota cap** before going live: `/solar/planner` is public, Building Insights is billed per request, and the in-app rate limiter is per-container, not global. Restrict the key to IP `23.21.67.7` *after* testing.
3. **Run `./scripts/enable-solar.sh` from `/opt/renovessa`.** It prompts for both keys with echo off, validates each against its live API *before* touching `.env` (so an unenabled, unbilled or IP-restricted key fails at the console rather than in front of a homeowner), then writes the keys, flips the six flags, recreates the container with `up -d` (not `restart` — `restart` does not re-read `.env`) and smoke-tests the live routes. It backs up `.env` each run and prints the rollback command on failure. Doing it by hand instead works too; the flags are all present as `false` in `.env` already.
4. **Verify** at `/solar/methodology` — that page reports live provider availability, so all five sources should flip to "Active". The script's smoke test covers the route codes.
5. **Cost ranges stay withheld** until a reviewed pricing configuration built from real solar proposals is published *and* `NEXT_PUBLIC_APPROVED_SOLAR_PRICING_VERSION` is set to its exact version. The built-in default is `sampleCount: 0` and must never be approved. Collect proposals first via `/portal/admin/solar/pricing`.
6. **Incentives** show nothing until reviewed `SolarIncentiveProgram` rows exist (API: `/api/solar/admin/pricing-config` pattern; register CRUD UI is Phase 2). Do not hard-code a federal credit.

## Rockville bathroom campaign — launch preparation

- **Use the public logo where an SVG asset is needed** — `public/renovessa-logo.svg` is the reusable transparent wordmark; retain the existing brand-system variants for campaign-specific exports.

1. **Configure the Google first wave** — use the nine selected images and ready-to-enter copy in `outputs/marketing/renovessa-rockville-bathroom-campaign/04-google-advertising/conversion-launch-2026-08-03/`; retain the full 1,068-asset library as the testing reservoir
2. **Add tracked production destinations** — prepend the canonical production host to each launch-package destination and append its `utm_content` label
3. **Verify event measurement** — confirm landing view, planner start, layout interaction, results, brief generation, and bid-request intent without overstating downstream contractor outcomes; optimize the initial campaign to planner start only after validation
4. **Run native previews** — check Google responsive crops and policy review first, then all relevant Meta/email/LinkedIn/Pinterest/GBP crops before future channel expansion
5. **Approve downloadable content before promotion** — the ten lead-magnet assets are cover concepts only; produce and review companion resources before using download language
6. **Animate from the supplied frames** — build 6/15/20/30-second cuts while retaining the cost/diagram disclaimers and homeowner-control language
7. **Optimize on qualified progress** — judge winners by planner and project-brief progression, not click-through rate alone

## Digital homeowner campaign — launch preparation

1. **Choose the first paid audience and landing page** — umbrella DMV campaign is ready; map each ad set to `/estimate` or a trade/location route only where fulfillment is live
2. **Add UTMs and conversion events** — use channel/campaign/creative identifiers from the manifest and verify estimate-start plus qualified-RFQ measurement
3. **Run native platform previews** — check Instagram Story/Reels safe areas, Facebook/LinkedIn cover crops, and Google Display legibility before publishing
4. **Produce the 15-second motion cut** — animate the included storyboard/script using the supplied master photography and Renovessa end card
5. **Launch with a controlled test matrix** — test “Estimate first” versus “Clearer scope” messaging, then promote winners based on qualified-RFQ outcomes rather than click-through rate alone

## Proposal Studio — immediate follow-up

1. **Push schema** when Postgres is available: `npx prisma db push`
2. **Change orders** — separate ledger against accepted proposals
3. **Notifications** — email contractor on view / question / accept / decline
4. **Contractor AI intake** — structured facts / clarification questions with source tags (reuse `requirements-interpret`)
5. **Price book** — CSV import, assemblies, ZIP adjustments
6. **RFQ → Studio import** — prefill contractor-owned job from Renovessa opportunity without exposing margins

## Bathroom Remodeling Experience — Phase 3

- **Migrate photo storage to S3/R2** — local `UPLOAD_ROOT` / Docker volume is live; move to object storage for multi-instance durability
- **Background job processing** — move brief generation, PDF rendering, and email notifications to a job queue
- **Production-grade rate limiting** — replace in-memory rate limiting with a shared store (Redis) for multi-instance deployments
- **Search Console verification** — submit bathroom sitemap, track organic conversions for bathroom pages
- **Logo upload for contractor letterhead**
- **Client-side analytics funnel events** for the bathroom planner (server-side audit events exist for major transitions)
- **SMS OTP phone verification** at RFP submission (contact capture + consent is live; OTP deferred until SMS provider routing is configured)

## Bathroom Remodeling Experience — Recently shipped (2026-08-10)

- **Canonical answer schema + real location** — `answer-normalization.ts` with canonical keys and legacy migration; ZIP → `locationId` resolution; `inRockville` fully removed; preview API fails closed on missing location
- **Landing page improvements** — "What you'll receive" 4-step flow, example results card, homeowner CTAs on both generic and Rockville pages
- **Planner UX improvements** — Homeowner-friendly photo labels (fixture-context instead of compass), ZIP collected early, room-size floor-area chips, draft v1 migration
- **Results page improvements** — Location displayed, cost drivers/assumptions/exclusions surfaced, auto-brief, mobile stacked cards, contractor count choice (1/2/3)
- **Build + tests** — 167/167 tests pass, Next.js 15.5.21 build clean

## Bathroom Remodeling Experience — Previously shipped

- **RFP conversion path + funnel fixes (2026-08-10)** — contact capture, compliance evidence, atomic claim, draft dedupe, estimate retry, success panel
- **Proposal Studio share + acceptance (2026-07-27)** — `/proposal/[token]`, accept/decline/questions, version lock
- **Proposal Studio commercial layer (2026-07-27)** — priced line items, markup vs margin, approve-before-PDF
- **Quick path + unified layout (2026-07-27)** — Capture → Layout → Results; templates + proposed generation
- **Requirements prompt + photo uploads (2026-07-27)** — Describe step, interpret API, `BathroomMedia`, Docker upload volume
- **Interactive diagram builder** — drag/drop, resize, rotate fixtures on existing/proposed layouts

- **Migrate photo storage to S3/R2** — local `UPLOAD_ROOT` / Docker volume is live; move to object storage for multi-instance durability
- **Background job processing** — move brief generation, PDF rendering, and email notifications to a job queue
- **Production-grade rate limiting** — replace in-memory rate limiting with a shared store (Redis) for multi-instance deployments
- **Search Console verification** — submit bathroom sitemap, track organic conversions for bathroom pages
- **Logo upload for contractor letterhead**

## Bathroom Remodeling Experience — Recently shipped

- **Proposal Studio share + acceptance (2026-07-27)** — `/proposal/[token]`, accept/decline/questions, version lock
- **Proposal Studio commercial layer (2026-07-27)** — priced line items, markup vs margin, approve-before-PDF
- **Quick path + unified layout (2026-07-27)** — Capture → Layout → Results; templates + proposed generation
- **Requirements prompt + photo uploads (2026-07-27)** — Describe step, interpret API, `BathroomMedia`, Docker upload volume
- **Interactive diagram builder** — drag/drop, resize, rotate fixtures on existing/proposed layouts

## SEO next phase

- **Connect measurement** - verify Search Console, submit `/sitemap.xml`, and add privacy-safe organic estimate/RFQ/qualified-RFQ attribution
- **Publish the first evidence-rich cluster** - Northern Virginia HVAC cost guide, Fairfax HVAC permit guide, and bid-comparison tool linked to the implemented HVAC and Fairfax hubs
- **Earn proof before case studies** - keep `/case-studies` noindexed until real, consented, specific project evidence is available
- **Expand only with fulfillment** - add trades and ZIP clusters only when contractor capacity and unique local evidence meet the strategy quality gate

## Product and operations

- **Run the Pilot 15 calling pass** - use the live Google Sheet and its `Pre-Call SMS` tab where messaging is permitted; verify bounce/unsubscribe/complaint/suppression/DNC status before each outreach and record every outcome in the queue

1. **Complete estimator evidence review** — attach representative, dated DMV bids/invoices or defensible datasets to every range record; reviewer approves the exact model version before configuring `NEXT_PUBLIC_APPROVED_ESTIMATE_MODEL_VERSION`
2. **Operationalize privacy** — name privacy/security owners, complete the vendor register, run the first incident tabletop, and create the restricted privacy-request register
3. **Harden authentication** — add rate limiting, MFA for privileged users, automated IDOR/consent tests, and a single-use expiring-token recovery email flow
4. **Configure Twilio opt-out webhook when SMS is enabled** — point inbound messaging to `/api/webhooks/twilio/sms` and retain signature validation

5. **Monitor RFQ Pilot 15 replies** — campaign `cmrws4saz000hmv43jgoh5rmk` sent 15/15 on 2026-07-23; track yes/info/later and one follow-up to non-responders after 4–5 business days
6. **Rotate the previously exposed SendGrid API key** — create a replacement key, update production without printing it, restart the app, then revoke the exposed key
7. **Enable the signed SendGrid event webhook** — point it to `https://renovessa.com/api/webhooks/sendgrid/events`, enable delivery/bounce/drop/spam/unsubscribe events, enable signature verification, store the public verification key, and test the endpoint
8. **Ops bid workflow for estimate-wizard RFQs** - review `source=estimate_wizard` leads, solicit contractor bids, return options to homeowner
9. **UAT RFQ confirmations** - submit a standard anonymous RFQ and an existing-homeowner RFQ; confirm SendGrid emails contain only initial information, the generated-request URL, and the appropriate portal credentials after key rotation
