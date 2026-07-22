# Agent Handoff

> Session: 2026-07-22 — Estimate wizard replaces AI chatbot

## Completed This Session

- Phone number → **(571) 460-0006** across landing + env defaults
- New **Estimate & RFQ wizard** on homepage (`#estimate`)
  - Per-trade scoping questions (HVAC, roofing, kitchen, bath, etc.)
  - Property/timing context + free-text notes
  - Instant DMV ballpark range
  - RFQ submit → `POST /api/project-requests` with `source: estimate_wizard`
- Landing copy updated: estimate → RFQ → contractor bids → get back to homeowner
- AI advisor removed from hero (API/components remain unused)

## Run

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build
# → http://localhost:7090
# or: npm run dev
```

Ensure `NEXT_PUBLIC_OPS_PHONE=(571) 460-0006` in `.env`.

## Key Files

- `src/components/landing/EstimateWizard.tsx`
- `src/lib/estimate-pricing.ts`
- `src/lib/estimate-wizard-data.ts`
- `src/app/api/project-requests/route.ts` (longer description, source, qualificationNotes)

## Next

- Ops workflow to solicit/return bids from RFQs (`estimate_wizard` source)
- Optionally show ballpark + RFQ fields on admin lead detail
- Tune pricing tables with real DMV bid data as jobs close
