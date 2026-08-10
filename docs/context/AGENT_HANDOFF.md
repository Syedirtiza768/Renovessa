# Agent Handoff

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
