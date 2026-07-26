# Agent Handoff

> Current session: 2026-07-27 — Proposal Studio share + acceptance (Phase B)

## Done

- Secure tokenized client proposal pages at `/proposal/[token]` (no account required, noindex)
- Contractor **Send client link** / revoke; view count + expiry
- Homeowner can ask questions, request revision, accept (with immutable snapshot), or decline
- Accepted proposals locked from further edits
- Public APIs never return cost/margin/line-item internals
- Schema: share/acceptance fields + `ContractorProposalMessage`; status `REVISION_REQUESTED`
- 48 bathroom unit tests passing

## How to verify

1. `npx prisma db push` when Postgres is up
2. Enable `BATHROOM_CONTRACTOR_STUDIO_ENABLED` (or demo mode)
3. Contractor: estimate → price lines → draft → save → approve → **Send client link**
4. Open share URL in a private window → accept with name/email/terms
5. Confirm studio shows ACCEPTED and further edits are blocked
6. Confirm `/api/public/proposals/:token` has no `directCostTotal` / `grossMarginPercent`

## Next

1. Change orders against accepted proposals
2. Email/SMS notification when proposal viewed / accepted / questioned
3. Structured contractor AI intake with source tags
4. Price book / CSV import
5. RFQ → studio job import
6. Logo + brand colors on letterhead
