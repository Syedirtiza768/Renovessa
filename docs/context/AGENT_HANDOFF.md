# Agent Handoff

## 2026-08-18 - Cross-estimator field persistence and homeowner portal parity

### Done

- Added `ProjectRequest.estimatorSnapshotJson` and snapshot helpers for standard, Bathroom, and Solar submissions so all estimator fields are retained exactly at RFQ submission time.
- Unified the final contractor-contact form across all public estimator paths on the Bathroom Remodeling field set and consent rules.
- Added shared estimator-response summaries to homeowner and admin views, hiding internal Brief ID / Estimate ID values from homeowners while retaining operational data server-side.
- Added Bathroom read-only layout previews and authenticated photo gallery rendering to the homeowner project detail; added the gated Solar plans list/detail pages.

### Verification

- `npm test`: 228/228 passing.
- `npx tsc --noEmit`: clean.
- `npm run build`: exit 0; static data pages logged only the expected unavailable-local-PostgreSQL warnings.
- `npx prisma db push`: pending because PostgreSQL is not running at the configured local endpoint.

### Before deployment

- Start the configured PostgreSQL instance and run `npx prisma db push`.
- Submit one standard, Bathroom, and Solar RFQ in UAT; verify the homeowner summary shows every answer, contact field, estimate assumption, layout, and photo without internal IDs.

## 2026-08-14 - Public 10-trade estimator catalog and logo refresh

### Done

- Public catalog narrowed to Bathroom Remodeling, Solar, Kitchen Remodeling, Roofing, Siding, Windows & Doors, Flooring, HVAC, Electrical, and Plumbing.
- Added `/estimate/kitchen`, `/estimate/roofing`, `/estimate/siding`, `/estimate/windows`, `/estimate/flooring`, `/estimate/hvac`, `/estimate/electrical`, and `/estimate/plumbing` dedicated entries.
- Added Siding wizard questions and pricing logic; Bathroom/Solar cards route to their existing dedicated experiences.
- Updated the shared inline wordmark, public SVG logo, and standard public header/footer to the roofline-and-doorway mark.

### Verification

- `npx.cmd tsc --noEmit` clean.
- `npm.cmd test` passes: 223/223.
- Production build compiles and reaches page generation, but the local configured PostgreSQL server is unavailable and the Next build does not complete in this environment.

## 2026-08-14 - RFQ confirmation email and homeowner portal access

### Done

- RFQ confirmations now include only the reference, project type, ZIP, a direct generated-request link, and homeowner portal login details.
- Anonymous standard, advisor, bathroom, and solar RFQ submissions provision a HOMEOWNER account transactionally and send a random temporary password for new accounts. Existing homeowner passwords are not reset or emailed.
- Promoted bathroom and solar planner projects are linked to the homeowner account as well as the shared `ProjectRequest`.
- Tests: 221/221 passing; `tsc --noEmit` clean.

### Key files

- `src/lib/homeowner-account.ts` - transactional account provisioning and temporary-password hashing
- `src/lib/confirmationEmails.ts` - short RFQ confirmation template and request/login links
- `src/app/api/project-requests/route.ts` - standard request account ownership
- `src/app/api/advisor/book/route.ts` - advisor request account ownership
- `src/app/api/bathroom-projects/[id]/rfq/route.ts` and `rfp/route.ts` - bathroom promotion account ownership
- `src/app/api/solar-projects/[id]/rfp/route.ts` - solar promotion account ownership

### Next

- Run production build and UAT one standard anonymous RFQ plus one existing-homeowner RFQ after SendGrid key rotation; confirm the email contains the request URL and appropriate credential wording, and confirm the portal link opens after login.

> Current session: 2026-08-10 — Bathroom Remodeling canonical schema, real location, landing + planner UX improvements

## Done

- **Canonical planner-answer schema** — Added `src/lib/bathroom/answer-normalization.ts` with canonical keys (`lengthFt`, `widthFt`, `ceilingFt`, `measurementMethod`, `zipCode`, `city`, `locationId`) and bidirectional legacy migration. All ingress points normalize before use.
- **Location made real** — Replaced hardcoded `inRockville: true` with `locationId` resolution from ZIP code via known-location register. Estimator, preview API, brief builder, contractor studio route all use `locationId`. Preview fails closed when location missing; unknown ZIPs show disclaimer in assumptions.
- **Landing page improvements** — Both generic (`/bathroom-remodeling`) and Rockville (`/bathroom-remodeling/rockville-md`) landing pages now include a "What you'll receive" 4-step illustrated flow, an example results card with realistic range + scope, and clear homeowner CTAs.
- **Planner UX improvements** — Photo labels changed from compass directions to homeowner-friendly fixture-context labels. ZIP collected early in Requirements step. Room-size band chips show floor area. Draft normalization migrates v1 keys on load.
- **Results page improvements** — Location displayed; cost drivers, assumptions, exclusions surfaced; auto-generate brief; mobile stacked cards; contractor count choice (1/2/3) in RFP form.
- **Schema cleanup** — `estimateInputsSchema` replaced `inRockville` with `locationId`; `inRockville` fully removed from codebase.
- **Tests + build** — 9 new normalization tests, updated estimator (10), confidence (7), layout-templates (17). Total suite: 167/167. Build clean (Next.js 15.5.21).

## Key files

- `src/lib/bathroom/answer-normalization.ts` — canonical schema + migration layer
- `src/lib/bathroom/estimate-input-derivation.ts` — ZIP → location resolution
- `src/lib/bathroom/estimator.ts` — location-aware estimate generation
- `src/lib/bathroom/schemas.ts` — `locationId` in `estimateInputsSchema`
- `src/app/api/bathroom-estimator/preview/route.ts` — normalized ingress, fail-closed location
- `src/components/bathroom/steps/RequirementsPromptStep.tsx` — ZIP collection, canonical keys, friendly photo labels
- `src/components/bathroom/steps/EstimateStep.tsx` — location, cost drivers, brief, mobile cards, contractor count
- `src/components/bathroom/BathroomRemodelingPage.tsx` — generic landing improvements
- `src/components/bathroom/RockvilleBathroomPage.tsx` — Rockville landing improvements
- `src/lib/bathroom/__tests__/answer-normalization.test.ts` — 9 normalization tests

## Next

1. **Deploy the build** — commit and push to `origin/main`, then rebuild/restart the production container (`docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build`).
2. **Verify on production** — test the planner flow end-to-end: anonymous draft → ZIP capture → layout → estimate → brief → RFP, confirming location appears in results and assumptions.
3. **Landing page review** — verify the "What you'll receive" section and example card render correctly on both `/bathroom-remodeling` and `/bathroom-remodeling/rockville-md`.
4. **Remaining gaps** (not addressed in this session):
   - Client-side analytics funnel events for bathroom planner
   - SMS OTP phone verification at RFP submission
   - Object storage migration for photo uploads
   - Background job processing for brief generation / PDF rendering
   - Search Console verification and organic conversion tracking for bathroom pages
