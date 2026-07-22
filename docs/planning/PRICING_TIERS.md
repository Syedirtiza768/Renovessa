# Contractor Pricing Tiers

> Business model: pay-per-qualified-appointment (concierge), not a multi-contractor bid marketplace.
> Homeowners never pay — RFQ submission via the estimate wizard is free. All revenue comes from
> contractors, billed only for appointments ops actually schedules and homeowners confirm happened.
> This reuses the existing schema — `ContractorProfile.tier`, `firstAppointmentPricing`,
> `pilotPriceAmount`, `CapacityCell`, `Appointment`/`Invoice`, `Dispute` — no new models required.

## Why not a bid marketplace

`AGENT_HANDOFF.md` previously listed "ops bid workflow for `source=estimate_wizard` RFQs" as next
up. That would mean sending one RFQ to several contractors to bid, which is a different business
model (commodity lead-gen, à la Angi/HomeAdvisor) than what's built: one ops-matched contractor per
RFQ, billed post-completion, protected by disputes and tier-gated capacity. Splitting into two
models dilutes the quality moat this schema is designed around. The estimate wizard is a better
**intake** for the same exclusive-appointment funnel, not a reason to add bidding.

## Tier ladder

Maps directly onto `ContractorTier` (`TRIAL → STANDARD → PREFERRED`, with `WATCH`/`SUSPENDED`/
`BANNED` as quality-gate demotions, all already in `schema.prisma`).

### TRIAL — proof phase

- `firstAppointmentPricing = "free"`, `pilotPriceAmount = 0`
- First **3 appointments or 30 days**, whichever comes first
- Standard `CapacityCell` slot (shares rotation with other contractors in the same trade/zip cluster)
- No monthly fee
- Purpose: build `showRate` / `acceptanceRate` / `disputeRate` history before either side commits to
  paid billing. Mirrors the current pilot billing-proof flow (`Invoice.pilotProof`), just time-boxed
  instead of indefinite.
- Auto-advance to STANDARD when the trial window closes, unless the contractor fails the quality
  gate below (→ `WATCH`) or opts out.

### STANDARD — pay-per-appointment

- Billed only when `Appointment.status = HOMEOWNER_CONFIRMED` (existing `billing/proof` flow), net-15
  via the existing `Invoice` approval path — no change to that mechanism, just turning real amounts
  on instead of `$0` pilot proofs.
- Price set per trade/job-size band, not a flat rate (`pilotPriceAmount` already models this as a
  per-contractor `Float`):

  | Band | Example trades | Price per confirmed appointment |
  |---|---|---|
  | Small repair | handyman, appliance repair, minor plumbing/electrical | $95–125 |
  | Core trade | HVAC, roofing repair, painting, flooring | $150–200 |
  | Large project | kitchen/bath remodel, additions, whole-roof replacement | $225–300 |

  ($175, the value already used as the `pilotPriceAmount` example in the MVP plan, sits inside the
  core-trade band — use it as the default until real conversion data says otherwise.)
- No monthly fee. No cap on appointments — capacity is limited by `CapacityCell.maxSlots`, not price.
- Dispute-protected: `Dispute` → `DisputeOutcome` (`FULL_CREDIT` / `PARTIAL_CREDIT`) already covers
  no-shows and misrepresented leads; no separate refund process needed.

### PREFERRED — priority + volume

- Monthly platform fee, **$149–299/mo** depending on trade demand and market size, *on top of* the
  STANDARD per-appointment price (this is priority access, not a discount).
- In return:
  - First look on new RFQs in their `CapacityCell` before STANDARD-tier contractors are offered the
    same slot
  - Higher `maxSlots` / `appointmentLimit` ceiling in their cells
  - Tighter required `responseTimeHours` (≤2h vs ≤6h default) — already a schema field, just needs
    to be enforced as an SLA for this tier
  - "Renovessa Preferred Pro" badge + inclusion in `CaseStudy` marketing content
- Eligibility: `showRate ≥ 90%`, `disputeRate ≤ 5%` sustained for the prior 60 days. Auto-review
  monthly; falling below the bar demotes to STANDARD (not `WATCH` — that's reserved for active
  quality problems, see below).

### WATCH / SUSPENDED / BANNED — quality gate, not pricing

Not price points — automatic demotion triggers off the metrics already tracked on
`ContractorProfile` (`showRate`, `acceptanceRate`, `disputeRate`):

- `WATCH`: `disputeRate > 15%` or `showRate < 70%` over trailing 30 days — still billed at STANDARD
  rate, but capacity-cell priority drops below STANDARD tier and ops reviews each dispute manually
- `SUSPENDED`: repeat `WATCH` violation or single severe dispute (`CONTRACTOR_WARNING` outcome
  twice) — no new RFQs routed, existing appointments honored, billing paused
- `BANNED`: fraud, safety complaint, or repeated `SUSPENDED` — removed from all capacity cells

## Rollout sequence

1. Keep TRIAL exactly as today (`$0` pilot proof) for the current RFQ-pilot-50 cohort — no change.
2. Turn on real STANDARD billing for contractors who complete their TRIAL window, starting with the
   core-trade band ($175 default) where the pilot has the most data.
3. Introduce PREFERRED once at least one `CapacityCell` per major trade has ≥3 STANDARD contractors
   competing for slots — priority access only matters once there's contention.
4. Do not build a bid/quote-comparison workflow for `source=estimate_wizard` RFQs; route them
   through the same single-contractor-match flow as other sources.
