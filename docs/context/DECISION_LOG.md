# Decision Log

Record product, architecture, and technical decisions here.

---

## 2026-08-10 — Bathroom RFP conversion path unified on `/rfp` with contact capture + compliance parity

### Decision
The planner's Estimate → Request Proposal path now collects homeowner contact details and consent in the planner UI and posts them to `/api/bathroom-projects/[id]/rfp`. The route validates with `rfpSubmissionSchema` (terms/privacy literal-true required, TCPA consent optional-affirmative), records clickwrap evidence via `recordProjectCompliance`, sends the standard RFQ confirmation email, stamps the project `RFQ_SUBMITTED`, and claims the project atomically (`updateMany … WHERE projectRequestId IS NULL` inside the transaction) so double-clicks/retries cannot create duplicate RFPs. `BathroomEstimate.configurationId` is now nullable so estimates persist against the built-in default config when no `EstimatorConfiguration` row is published. Planner drafts persist `projectId`, `referenceNumber`, and a stable `clientGeneratedId` in localStorage; refresh/multi-tab resumes the same server draft instead of creating duplicates, and stale project ids are validated on hydrate.

### Reason
Production audit found three funnel-breaking defects: (1) anonymous RFP submission always failed — the client posted no contact data while the server required first name + email; (2) estimate persistence hard-failed on an FK to a nonexistent `"default-internal"` configuration row (zero `EstimatorConfiguration` rows existed in prod), silently blocking brief → RFP; (3) every browser refresh created a new `BathroomProject` because `projectId` was never written to the local draft.

### Status
Accepted and implemented; verified by `scripts/e2e-bathroom-rfp-local.sh` (9/9). Production deploy pending.

---

## 2026-07-23 — Public intake, consent, and claim publication controls

### Decision
Public RFQs do not create or reset accounts, and the legacy AI booking route creates only an unassigned RFQ. Legal clickwrap and optional communication consent are server-versioned and evidenced in append-only events. Channel opt-outs are durable and enforced at outbound boundaries. Numeric estimator claims are fail-closed unless the exact model version has substantiation approval.

### Reason
Email ownership cannot be inferred from a form submission; preselected consent is not affirmative; opt-outs must remain enforceable; and objective advertising claims require a pre-publication reasonable basis.

### Status
Accepted and implemented.

---

## 2026-06-02 — Documentation-First Project Setup

### Decision
Adopt self-sustaining Markdown documentation as permanent project memory before writing application code.

### Reason
Empty greenfield project; no chat history should be required for future agents or developers to continue work.

### Alternatives Considered
- Start coding immediately with default stack
- Minimal README only

### Impact
All agents must read and update `docs/` per `AGENTS.md`. Implementation deferred until Phase 0 planning is validated.

### Status
Accepted

---

## 2026-06-02 — Assumed Domain: Renovation Project Management

### Decision
**Provisional assumption only** — treat Renovessa as a renovation project management product until stakeholder confirms otherwise.

### Reason
Project name suggests renovation ("Renov-") context; no other requirements provided.

### Alternatives Considered
- Wait with blank product definition
- Generic project management tool

### Impact
Planning docs reference projects, tasks, contractors, homeowners. Must be revised if domain differs.

### Status
Superseded by Product Blueprint (2026-06-02) — verified appointment marketplace for DMV

---

## 2026-06-02 — Tech Stack: Next.js + PostgreSQL + Prisma

### Decision
Use Next.js 15 App Router (TypeScript), PostgreSQL, Prisma ORM, JWT cookie auth, Tailwind CSS 4. Deploy via Docker Compose on port 7090.

### Reason
Blueprint MVP requires full-stack web app with public site + 3 portals + audit trail. Next.js monolith is fastest path to launch.

### Status
Accepted

---

## 2026-06-02 — Product Vision from Blueprint

### Decision
Renovessa is a **verified home improvement appointment marketplace** for DMV (DC, MD, Northern VA). Billing unit is confirmed appointments, not shared leads.

### Status
Accepted (from Renovessa_Product_Blueprint.docx)
