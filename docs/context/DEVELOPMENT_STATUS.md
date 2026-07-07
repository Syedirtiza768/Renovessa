# Renovessa — Development Status

> **Last updated:** 2026-06-18
> **Commit:** `433ba70` — Implement First-Job MVP + Gap Fixes
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
| POST | `/api/team` | Admin (manager) | Create ops team member |

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
| `/portal/homeowner` | Homeowner dashboard with project cards and detail links |
| `/portal/homeowner/submit` | In-portal project submission form |
| `/portal/homeowner/projects/[id]` | Homeowner project detail |
| `/portal/homeowner/settings` | Account settings (change password) |
| `/portal/admin/my-leads` | Ops agent assigned leads |
| `/portal/admin/team` | Team member list |
| `/portal/admin/team/new` | Add ops employee |
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

### Phase 7 — Gap Fixes (2026-06-18)

#### State Machine Fixes
- **`lead-state-machine.ts`** — Added missing transitions: `APPOINTMENT_CONFIRMED → CLOSED` (cancelled), `APPOINTMENT_COMPLETED → RECYCLE | CLOSED` (no-show), `APPOINTMENT_OFFERED → QUALIFIED` (back-flow), `APPOINTMENT_CONFIRMED → APPOINTMENT_OFFERED` (reassign)
- **`confirm/route.ts`** — Fixed state machine violation: lead now correctly passes through `HOMEOWNER_CONFIRMED` before advancing to `BILLING_PENDING`
- **`outcome/route.ts`** — Fixed wrong audit event type (`CHECK_IN_RECORDED` → `STATUS_CHANGED` for completion)
- **`appointments/[id]/route.ts`** — Cancelled appointments now set lead status to `CLOSED`; schedule action writes homeowner notification

#### Contractor Assignment
- **`POST /api/appointments/[id]/reassign`** — New admin-only endpoint to swap contractor on `ACCEPTED`, `SCHEDULED`, `REMINDER_SENT`, or `CHECKED_IN` appointments
- **`POST /api/appointments`** — Added capacity check (rejects if contractor is at `appointmentLimit`); rejects `SUSPENDED`/`BANNED` contractors; writes contractor notification on offer
- **`OpportunityPanel`** — Filters dropdown to trade-matched, active, non-suspended contractors only; shows previous offer history; shows SLA response deadline
- **`ReassignContractorPanel`** — New admin component visible on `ACCEPTED+` appointments; select replacement contractor with reason; full audit trail

#### Contractor Portal
- **`AppointmentActions`** — Added outcome recording when status is `CHECKED_IN` (estimate given, notes, follow-up flag, complete/no-show)
- **`contractor/page.tsx`** — Shows full project description, preferred appointment windows, budget, urgency alongside each appointment card; KPI strip includes pending count

#### Notifications
- **`POST /api/notifications`** / **`GET /api/notifications`** / **`PATCH /api/notifications`** — Full notifications API
- **`NotificationBell`** — Client component with unread badge, dropdown list, mark-all-read; wired into contractor and homeowner portal layouts
- Key events that now write notifications: opportunity sent, appointment scheduled, homeowner confirmed (notifies admin)

#### Homeowner Portal
- **`ConfirmAppointmentButton`** — Now gated by `scheduledAt` date — homeowner cannot pre-confirm before the appointment has occurred; `SCHEDULED` status removed from confirmable set
- **`HomeownerFeedbackForm`** — First-party feedback form (rating 1–5, comments, would rebook) added directly to homeowner portal; appears after appointment is `HOMEOWNER_CONFIRMED`
- **`homeowner/page.tsx`** — Shows feedback form, feedback submitted state, pass `scheduledAt` to confirm button

#### Admin / Ops
- **`NoShowPanel`** — New admin component shown when appointment is `NO_SHOW`; gives admin two actions: Recycle Lead (→ `RECYCLE` → `NEW`) or Close Lead (→ `CLOSED`)
- **`leads/[id]/page.tsx`** — Wired in `ReassignContractorPanel`, `NoShowPanel`, offer history prop, SLA display, actor name in audit trail

---

### Phase 8 — Portal UX Gaps (2026-06-19)

#### Homeowner Portal
- **`/portal/homeowner/settings`** — Change password moved off dashboard
- **`/portal/homeowner/submit`** — In-portal project intake (`PortalProjectForm`); no redirect to public homepage
- **`/portal/homeowner/projects/[id]`** — Full project detail view (submitted fields, appointment, homeowner-safe audit trail)
- **`POST /api/project-requests`** — Session-aware: logged-in homeowners link project without password reset; source `homeowner_portal`
- Homeowner layout nav: My Projects, Submit Project, Account

#### Contractor Portal
- **`/portal/contractor/settings`** — Change password moved off appointments dashboard

#### Admin / Ops
- **`/portal/admin/my-leads`** — Assigned leads view for ops agents
- **`/portal/admin/team`** + **`/portal/admin/team/new`** — Add ops employees (OPS_AGENT, SCHEDULER, OPS_MANAGER)
- **`POST /api/team`** — Create team member with temp password (SUPER_ADMIN, OPS_MANAGER only)
- **Role-based admin nav** — Field agents see My Leads first; managers see Team link
- **Ops login redirect** — OPS_AGENT / SCHEDULER land on `/portal/admin/my-leads`
- **Operations queues** — All / My leads only toggle (`?mine=1`)

### Phase 9 — Browser Softphone (Twilio Voice SDK) (2026-07-07)

Added a WebRTC softphone dock so ops agents call homeowners and contractors from the
browser via `@twilio/voice-sdk`, replacing the click-to-call "ring my cell first" model
as the primary path (click-to-call remains as fallback when the softphone isn't ready).

- **`src/lib/twilio.ts`** — `issueVoiceToken()` issues a JWT access token (Voice grant,
  identity = agent user id) using `TWILIO_API_KEY_SID` / `TWILIO_API_KEY_SECRET` /
  `TWILIO_TWIML_APP_SID`.
- **`GET /api/calls/token`** — Returns the token + the agent's assigned Twilio numbers
  (for caller-ID selection). Admin-only.
- **`POST /api/calls/connect`** — Now dual-mode: serves the existing click-to-call query
  params AND the softphone's TwiML-App form body (`To`, `CallerId`, `AgentId`, `LeadId`,
  `ContractorId`). For softphone calls (no server-side pre-registration), it creates the
  `CallLog` here using the parent `CallSid` and writes a `CALL_MADE` audit event.
- **`GET /api/calls/history`** — Last 25 `CallLog` rows for the agent, with lead/contractor
  names, for the dialer's recent-calls list.
- **`src/components/admin/Softphone.tsx`** — Docked client component in the admin layout.
  Boots the SDK on mount, dynamically imports `@twilio/voice-sdk` (SSR-safe), refreshes the
  token every 50 min, exposes readiness via `window.__renovessaSoftphoneReady`, and listens
  for `renovessa:dial` events. UI: collapsed status pill, expandable keypad, caller-ID
  picker, in-call timer + mute + DTMF + hang up, recent-calls list.
- **`src/components/admin/CallButton.tsx`** — Dispatches `renovessa:dial` when the softphone
  is registered; otherwise falls back to the existing click-to-call POST.
- **Dedicated dialer page** — `Dialer` was refactored out of `Softphone` to support a
  `variant: "dock" | "full"`. `/portal/admin/dialer` renders the full-screen inline dialer
  (larger keypad, always open); the dock self-hides on that route to avoid duplication.
  A "Dialer" nav item was added for all admin roles in `src/lib/auth.ts`.
- **Post-call disposition** — `CallLog` gained `disposition` + `dispositionNote` columns.
  `POST /api/calls/disposition` records an outcome (answered, no_answer, busy, voicemail,
  wrong_number, confirmed, callback_requested) + note on the agent's most recent call and
  writes a `CALL_MADE` audit event linked to the lead/contractor. The softphone pops a
  disposition modal on hang-up so calls are logged into the audit trail without a separate
  manual `CommunicationLogForm` entry. `GET /api/calls/history` now returns disposition.
- **Twilio setup required**: API key, TwiML App with voice URL
  `<NEXT_PUBLIC_APP_URL>/api/calls/connect`, and at least one Voice-enabled number
  assigned to the agent (already managed at `/portal/admin/phone-numbers`). Env vars
  added to `.env.example` and `.env.production.example`.


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
| Contractor scheduling confirmation | Contractor cannot dispute proposed slot |
| Agent workload balancing UI | No per-agent load view |
| Bulk lead operations | Each lead requires individual navigation |
| Forgot-password email flow | Admin can reset contractor; homeowner reset deferred |

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
