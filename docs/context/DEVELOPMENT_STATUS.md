# Renovessa — Development Status

> **Last updated:** 2026-06-11
> **Commit:** `433ba70` — Implement First-Job MVP
> **Deployment:** Docker Compose on port **7090**

---

## What This Is

Renovessa is a renovation project management platform that connects homeowners with vetted contractors through a verified appointment workflow. The platform is built for a Pakistan-based ops team acting as a US-facing appointment desk.

**Current phase:** First-Job MVP — one contractor, one service cell, one verified appointment.

---

## Tech Stack

| Layer | Choice | Status |
|-------|--------|--------|
| Framework | Next.js 15 (App Router), TypeScript | Implemented |
| Database | PostgreSQL 16 + Prisma 6 | Implemented |
| Auth | JWT session cookies (jose) | Implemented |
| Styling | Tailwind CSS 4 | Implemented |
| Deploy | Docker Compose, port 7090 | Implemented |

---

## Architecture Overview

### Data Models (13 models)

| Model | Purpose |
|-------|---------|
| `User` | Homeowners, contractors, admins (9 roles) |
| `ContractorProfile` | Contractor details, pilot terms, SLA |
| `CapacityCell` | Trade + ZIP cluster capacity slots |
| `ProjectRequest` | Homeowner lead with qualification fields |
| `Appointment` | Full lifecycle from offer to billing |
| `AuditEvent` | Append-only verification trail (18 event types) |
| `Invoice` | Pilot billing proof records |
| `Feedback` | Per-appointment rating + comments |
| `CaseStudy` | Post-job case study drafts |
| `Dispute` | Dispute tracking with resolution |
| `ContractorInquiry` | Contractor self-service applications |
| `Notification` | In-app notifications |

### State Machines

**Lead Status** (16 states): `NEW → ASSIGNED → CALLING → QUALIFICATION_IN_PROGRESS → QUALIFIED → APPOINTMENT_OFFERED → APPOINTMENT_CONFIRMED → APPOINTMENT_COMPLETED → HOMEOWNER_CONFIRMED → BILLING_PENDING → BILLING_APPROVED → CLOSED`

**Appointment Status** (13 states): `OFFERED → ACCEPTED → SCHEDULED → REMINDER_SENT → CHECKED_IN → COMPLETED → HOMEOWNER_CONFIRMED → BILLED`

Both state machines enforce valid transitions at the API level — the UI cannot skip gates.

---

## What's Implemented

### Phase 0 — Foundation & Security

- **`GET /api/project-requests`** locked to admin-only (was public, PII leak)
- **`src/lib/authorization.ts`** — `assertLeadAccess`, `assertAppointmentAccess`, `assertContractorOwnsAppointment`
- **`src/lib/first-job-config.ts`** — Env-driven pilot wedge (`FIRST_JOB_MODE`, `PILOT_TRADE`, `PILOT_ZIP_CLUSTERS`)
- **`src/lib/lead-state-machine.ts`** — Valid transition guards for lead status
- **`src/lib/appointment-state-machine.ts`** — Valid transition guards for appointment status
- Appointment accept/check-in/confirm APIs verify ownership

### Phase 1 — Schema Extensions

**Extended `ProjectRequest`** with: `address`, `ownershipAuthority`, `preferredAppointmentWindows`, `photoUrls`, `serviceCellMatch`, `invalidReason`, `reachable`

**Extended `ContractorProfile`** with: `contactPerson`, `availabilityNotes`, `pilotTerms`, `firstAppointmentPricing`, `pilotPriceAmount`, `responseTimeHours`, `googleBusinessUrl`, `internalNotes`

**Extended `Appointment`** with: `location`, `homeownerPreConfirmed`, `contractorPreConfirmed`, `estimateGiven`, `contractorOutcomeNotes`, `homeownerOutcomeNotes`, `followUpRequired`, `opportunitySentAt`, `declineReason`, `pilotBillableReason`

**Extended `Invoice`** with: `pilotProof`, `waivedReason`, `approvedById`, `approvedAt`

**New models:** `Feedback`, `CaseStudy`

### Phase 2 — Public Intake Wedge

- Landing page adapts in `FIRST_JOB_MODE`: hides fake stats, filters to pilot trade, removes appointment log
- Form collects: address, ownership authority, preferred appointment windows
- `POST /api/project-requests` persists new fields + `serviceCellMatch` flag
- Header uses `NEXT_PUBLIC_OPS_PHONE` from env (replaces hardcoded `(202) 555-0100`)
- ZIP validation against `PILOT_ZIP_CLUSTERS` with soft/hard block
- Categories filtered to pilot trade only

### Phase 3 — Admin Operations Spine

- **`POST /api/leads/[id]/assign`** — Agent assignment
- **`POST /api/leads/[id]/communications`** — Communication logging (call, SMS, email, note)
- **`PATCH /api/leads/[id]`** — Accepts qualification fields + enforces state machine transitions
- **`QualificationPanel`** — Ownership, reachable, notes, disposition, qualify/unqualify buttons with gating
- **`CommunicationLogForm`** — Call/SMS/email/note logging with outcome
- Operations queues expanded to 9 statuses with links to lead detail

### Phase 4 — Contractor CRUD + Opportunity Sending

- **`POST /api/contractors`** — Create contractor (User + ContractorProfile + capacity cell)
- **`PATCH /api/contractors/[id]`** — Update all contractor fields
- **`POST /api/appointments`** — Create opportunity (sets `OFFERED`, transitions lead)
- **Contractor list page** with create link, detail/edit page
- **`OpportunityPanel`** — Send opportunity from qualified lead, with manual WhatsApp flag

### Phase 5 — Appointment Lifecycle

- **`POST /api/appointments/[id]/decline`** — Returns lead to `QUALIFIED` with reason
- **`PATCH /api/appointments/[id]`** — Schedule/reschedule/cancel/mark_reminder_sent
- **`POST /api/appointments/[id]/outcome`** — Record completion or no-show
- **`ScheduleAppointmentForm`** — Date/time + location
- **`AppointmentDayPanel`** — Estimate given, outcome notes, follow-up flag
- Homeowner confirm gate fixed: allows `SCHEDULED`, `REMINDER_SENT`, `CHECKED_IN`, `COMPLETED`

### Phase 6 — Post-Appointment Proof

- **`PATCH /api/billing/proof/[id]`** — Approve/waive with reason
- **`BillingProofPanel`** — Pilot proof approve/waive UI
- **`POST /api/disputes`** + **`PATCH /api/disputes/[id]`** — Open/resolve disputes
- **`POST /api/feedback`** — Rating + comments per appointment
- **`POST /api/case-studies`** — Create/update case study draft
- **`FeedbackForm`** + **`CaseStudyForm`** wired into lead detail page

---

## API Endpoints

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| POST | `/api/project-requests` | Public | Submit homeowner request |
| GET | `/api/project-requests` | Admin | List all leads |
| PATCH | `/api/leads/[id]` | Admin | Update lead (status, qualification fields) |
| POST | `/api/leads/[id]/assign` | Admin | Assign agent to lead |
| POST | `/api/leads/[id]/communications` | Admin | Log call/SMS/note |
| POST | `/api/appointments` | Admin | Create opportunity |
| PATCH | `/api/appointments/[id]` | Admin | Schedule/reschedule/cancel/reminder |
| POST | `/api/appointments/[id]/accept` | Contractor | Accept opportunity |
| POST | `/api/appointments/[id]/decline` | Contractor/Admin | Decline opportunity |
| POST | `/api/appointments/[id]/checkin` | Contractor | Check in at location |
| POST | `/api/appointments/[id]/confirm` | Homeowner/Admin | Confirm appointment occurred |
| POST | `/api/appointments/[id]/outcome` | Contractor/Admin | Record day-of outcome |
| POST | `/api/contractors` | Admin | Onboard contractor |
| PATCH | `/api/contractors/[id]` | Admin | Update contractor |
| PATCH | `/api/billing/proof/[id]` | Admin | Approve/waive billing proof |
| POST | `/api/disputes` | Admin | Open dispute |
| PATCH | `/api/disputes/[id]` | Admin | Resolve dispute |
| POST | `/api/feedback` | Auth | Record feedback |
| POST | `/api/case-studies` | Admin | Create/update case study |

---

## UI Pages

| Page | Description |
|------|-------------|
| `/` | Landing page — first-job mode, honest copy, single trade |
| `/portal/admin` | Operations command center with KPIs |
| `/portal/admin/operations` | Operations queues (9 status lanes) |
| `/portal/admin/leads` | Lead pipeline table |
| `/portal/admin/leads/[id]` | Lead detail — qualification, comms, opportunity, schedule, day-of, billing, feedback, case study |
| `/portal/admin/contractors` | Contractor list with create link |
| `/portal/admin/contractors/new` | Add contractor form |
| `/portal/admin/contractors/[id]` | Edit contractor |
| `/portal/homeowner` | Homeowner dashboard with confirm gate fix |
| `/portal/contractor` | Contractor portal with accept/check-in |

---

## Admin Components (8 new)

| Component | Purpose |
|-----------|---------|
| `QualificationPanel` | Qualification checklist, notes, disposition, qualify/unqualify |
| `CommunicationLogForm` | Log calls, SMS, emails, internal notes |
| `OpportunityPanel` | Send opportunity to contractor |
| `ScheduleAppointmentForm` | Set date, time, location |
| `AppointmentDayPanel` | Mark reminder sent, record outcome |
| `BillingProofPanel` | Approve/waive pilot billing proof |
| `FeedbackForm` | Collect homeowner/contractor feedback |
| `CaseStudyForm` | Create/update case study draft |

---

## First-Job Config

Environment variables in `.env.example`:

```bash
FIRST_JOB_MODE=true
PILOT_TRADE=HVAC
PILOT_ZIP_CLUSTERS=22030,22031,22032,22033
PILOT_MIN_BUDGET=1000
PILOT_CONTRACTOR_ID=
NEXT_PUBLIC_OPS_PHONE=+1-XXX-XXX-XXXX
NEXT_PUBLIC_LANDING_HEADLINE=Need HVAC help in Fairfax?
```

When `FIRST_JOB_MODE=true`:
- Landing page shows only pilot trade
- Fake stats and appointment log are hidden
- ZIP validation against pilot cluster
- Categories filtered to pilot trade

---

## Seed Data

Updated `prisma/seed.ts` with:
- 1 pilot contractor (Capital Comfort HVAC) with full profile, pilot terms, capacity cell
- 1 complete demo flow (Sarah Mitchell — HVAC lead through scheduled appointment)
- 1 new lead (Marcus Webb — in NEW status)
- 10 audit events covering the full lifecycle
- Demo accounts for admin, ops agent, homeowner, contractor

**Demo accounts** (password: `demo1234`):

| Account | Role |
|---------|------|
| `admin@renovessa.com` | Super Admin |
| `agent@renovessa.com` | Ops Agent |
| `sarah.mitchell@demo.renovessa.com` | Homeowner |
| `hvac@demo.renovessa.com` | Contractor |

---

## How to Run

```bash
# Docker (recommended)
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build

# Local development
cp .env.example .env
npm install
docker compose up db -d
npm run db:push
npm run db:seed
npm run dev
```

App runs at **http://localhost:7090**

---

## What's NOT Implemented (Deferred)

| Feature | Reason |
|---------|--------|
| Real SMS/email integrations | Manual logging supported for pilot |
| Calendar ICS generation | External calendar links supported |
| Magic-link homeowner confirm | Portal-based confirm works |
| Photo upload to storage | URLs pasted in qualification |
| Payment processing | $0 pilot proof only |
| Multi-contractor matching | Single contractor pilot |
| 12 trade categories | Hidden in FIRST_JOB_MODE |
| Contractor scorecard KPIs | Hidden for pilot |
| Notifications UI | Model exists, no UI |
| Homeowner self-registration | Portal accounts provisioned manually |

---

## Definition of Done (from Implementation Plan)

The First-Job MVP is complete when an ops agent can, without touching the database:

1. Create a pilot contractor and lock a capacity cell
2. Receive a real homeowner request on a single-service landing page
3. Qualify the homeowner with notes and required fields
4. Send an opportunity to the contractor
5. Record contractor accept/decline
6. Schedule the appointment with date, time, and location
7. Log calls, SMS, and reminders
8. Record contractor check-in and outcome
9. Record homeowner post-appointment confirmation
10. See a complete audit trail for the lead
11. Create/approve a $0 pilot billing proof record
12. Open and resolve a dispute if needed
13. Enter feedback and a case study draft

**All 13 steps are now supported in-app.**

---

## Key Risks to Monitor

| Risk | Mitigation |
|------|-----------|
| Ops bypasses app for WhatsApp/Sheets | In-app steps faster; state gates block progress |
| Incomplete audit trail | State machine auto-logs every transition |
| Wrong demand (12 trades) | `FIRST_JOB_MODE` hides other categories |
| PII leak | Phase 0 locked down public endpoints |
| Demo false confidence | Separate pilot seed; demo banner |
