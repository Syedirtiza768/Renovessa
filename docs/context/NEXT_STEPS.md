# Next Steps

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
9. **UAT RFQ confirmations** - submit test RFQ + contractor application; confirm SendGrid emails arrive after key rotation
