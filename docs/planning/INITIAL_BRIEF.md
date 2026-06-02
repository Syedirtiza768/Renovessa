# Initial Brief

> Created from limited available information. **Most items need stakeholder confirmation.**

## Project Name

**Renovessa**

## Working Hypothesis

Renovessa is a **renovation project management** application that helps users organize renovation work — projects, tasks, documents, and (eventually) collaboration with contractors or team members.

**Confidence:** Low — based on name only.

## What We Know

- Greenfield repository at `f:\apps\renovessa`
- No existing code or prior documentation
- User requested self-sustaining AI project documentation structure
- Date of setup: 2026-06-02

## What We Do Not Know (Needs Decision)

Please confirm or correct:

1. **Product type** — Web app? Mobile? Internal tool? SaaS? Client project?
2. **Primary user** — Homeowner, contractor, PM, agency, or other?
3. **Geography / market** — Local trades, US, EU, global?
4. **MVP scope** — Minimum features for first usable version?
5. **Monetization** — Free, subscription, per-project fee, N/A?
6. **Brand / design** — Existing brand assets? Style preferences?
7. **Timeline** — Target launch or milestone dates?
8. **Team** — Solo dev, agency, stack preferences?
9. **Integrations** — Required day-one (email, calendar, payments)?
10. **Compliance** — GDPR, housing regulations, insurance docs?

## Assumptions (Until Confirmed)

| # | Assumption | If wrong, update |
|---|------------|------------------|
| A1 | Web-first responsive application | Architecture, frontend docs |
| A2 | Single product, not a monorepo of multiple apps | SYSTEM_MAP |
| A3 | MVP = auth + projects + tasks | FEATURE_REGISTRY, phases |
| A4 | English-only UI initially | PRODUCT_REQUIREMENTS |
| A5 | Cloud-hosted SaaS-style deployment | DEPLOYMENT docs |

## Suggested MVP (Draft — Not Approved)

1. Register / login
2. Create and list renovation projects
3. Add and complete tasks per project
4. Basic project dashboard

**Defer:** payments, marketplace, chat, native apps, advanced reporting.

## Open Questions for Stakeholder

Copy answers here when available:

```md
### Product one-liner
[Your answer]

### Primary users
[Your answer]

### Must-have MVP features
[Your answer]

### Out of scope for v1
[Your answer]

### Tech preferences
[Your answer]

### Design references
[Your answer]
```

## Next Action

Stakeholder completes open questions → agent updates `PRODUCT_REQUIREMENTS.md`, `USER_ROLES.md`, `DECISION_LOG.md`, and marks Phase 0 complete.
