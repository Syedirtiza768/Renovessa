# Decision Log

Record product, architecture, and technical decisions here.

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
