# Product Requirements

> **Status:** Draft — most sections need stakeholder confirmation.  
> Do not treat planned items as implemented.

## Problem Statement

**Assumption (Needs Verification):** Renovation projects are hard to manage across homeowners, contractors, timelines, budgets, and documents. Users lack a single place to see status, tasks, and deliverables.

**Open question:** Who exactly feels this pain, and what tool do they use today?

## Target Users

See `docs/planning/USER_ROLES.md`. Primary persona not yet selected.

## User Roles

| Role | Status |
|------|--------|
| Homeowner | Planned — needs confirmation |
| Contractor | Planned — needs confirmation |
| Project manager | Planned — needs confirmation |
| Platform admin | Planned — if SaaS |

## Core Features

MVP candidates (all **Planned** until confirmed):

| Feature | Priority | Notes |
|---------|----------|-------|
| User registration / login | MVP | Auth method TBD |
| Create renovation project | MVP | Core entity |
| Project dashboard | MVP | Status overview |
| Tasks or checklist per project | MVP | Simple workflow |
| Upload photos/documents | MVP | Storage TBD |
| Invite collaborator (contractor) | MVP+ | Permissions TBD |
| Budget / estimate tracking | Later | May be Phase 2+ |
| In-app messaging | Later | |
| Payments / invoicing | Later | High complexity |
| Contractor marketplace | Out of scope for now | |

Detailed tracking: `docs/context/FEATURE_REGISTRY.md`.

## Non-Core Features

- Advanced reporting and analytics
- Mobile native apps (web-first assumed)
- Third-party integrations (accounting, CRM)
- AI cost estimation or design suggestions
- Multi-language support

## User Journeys

See `docs/planning/USER_FLOWS.md` — all flows are **Planned** and based on assumptions.

## Business Rules

**Needs Decision.** Examples to confirm:

- Who can create a project?
- Can one project have multiple contractors?
- Who can mark tasks complete?
- Can homeowners delete projects with shared history?
- Data retention policy

## Permissions

RBAC design is **Planned**. See `docs/architecture/AUTH_RBAC.md`.

## Success Criteria

**Needs Decision.** Suggested draft:

- A homeowner can create a project and add tasks within 5 minutes
- A collaborator can view project status after invite (when implemented)
- Core flows work on mobile viewport (responsive web)
- No critical security issues on auth and file upload paths

## Out of Scope (Initial Releases)

- Payment processing
- Public contractor directory / marketplace
- Native iOS/Android apps
- Offline-first mobile
- Enterprise SSO (unless required early)
- Multi-region deployment
