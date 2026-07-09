# Known Issues

## Product Vision Unconfirmed

### Type
Unclear Requirement

### Severity
High

### Description
The renovation project management domain is an assumption based on the project name. The stakeholder may intend a different product entirely.

### Affected Areas
- All planning docs
- Feature registry
- User roles and flows

### Suggested Fix or Mitigation
- Review `docs/planning/INITIAL_BRIEF.md` with project owner
- Update `PRODUCT_REQUIREMENTS.md` and mark decision **Accepted** or revise domain

### Status
Open

---

## Tech Stack Not Selected

### Type
Risk

### Severity
High

### Description
No framework, database, or hosting choices are locked. Phase 1 cannot start implementation confidently.

### Affected Areas
- Architecture docs
- Setup and operations docs
- Phase 1 deliverables

### Suggested Fix or Mitigation
- Decide stack based on team skills, MVP needs, and deployment target
- Log decision in `DECISION_LOG.md`

### Status
Open

---

## No License File

### Type
Unclear Requirement

### Severity
Low

### Description
Repository has no LICENSE file. Distribution and contribution terms undefined.

### Affected Areas
- Legal / open source posture

### Suggested Fix or Mitigation
- Add appropriate license when project direction confirmed (MIT, proprietary, etc.)

### Status
Open

---

## Empty Repository — No CI or Tests

### Type
Technical Debt

### Severity
Medium

### Description
No linting, testing, or CI pipeline exists. Expected for Phase 0 only.

### Affected Areas
- Quality gates
- Deployment safety

### Suggested Fix or Mitigation
- Add during Phase 1 foundation

### Status
Deferred

---

## Twilio Trial Blocks Outbound Dialer Destinations

### Type
Operational Blocker

### Severity
High

### Description
Twilio blocks **all outbound +1 (US/Canada) calls** with error **21216** until the account has an approved **Business** Primary Customer Profile in Trust Hub. The current profile (`Primary customer profile for individual`, status `twilio-approved`) is not sufficient for +1 calling on accounts created outside the US/Canada after Oct 2025.

Softphone infrastructure is otherwise configured: assigned `+12405708350`, TwiML App voice URL, `TWILIO_WEBHOOK_BASE_URL` tunnel, E.164 normalization.

### Affected Areas
- `/portal/admin/dialer` softphone
- `POST /api/calls` click-to-call
- Twilio Voice webhooks via `TWILIO_WEBHOOK_BASE_URL`

### Suggested Fix or Mitigation
1. Twilio Console → **Trust Hub** → create and submit a **Business** Primary Customer Profile (not Individual)
2. Wait for `Twilio Approved` status, then retry dialing `+12408006040`
3. Keep `TWILIO_WEBHOOK_BASE_URL` pointed at a running cloudflared tunnel while developing locally

### Status
Open