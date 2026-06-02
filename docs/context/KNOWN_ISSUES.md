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
