# Project Overview

## What This Project Is

**Renovessa** is intended to be a software product for managing renovation-related work. The exact product shape (B2C homeowner app, B2B contractor platform, internal tool, marketplace, etc.) is **not yet confirmed**.

This repository currently holds **project documentation only** — the permanent memory layer for future development and AI agent handoffs.

## Project Type

**New Project** — greenfield, documentation-first setup.

## Current Status

- **Phase 0** (Project Understanding and Documentation): **In Progress**
- No source code, package manifests, or infrastructure configuration exists yet
- Product requirements and tech stack require stakeholder confirmation

## Business Goal

**Assumption (Needs Verification):** Help users plan, coordinate, and track renovation projects more effectively than spreadsheets, messaging apps, or disconnected tools.

Confirm the real business goal with the project owner before Phase 1.

## Target Users

**Assumed candidates (Needs Decision):**

| User | Possible role |
|------|----------------|
| Homeowner | Creates renovation project, approves scope/budget |
| Contractor / tradesperson | Executes work, updates progress |
| Project manager | Coordinates timeline, vendors, milestones |
| Admin | Platform configuration (if multi-tenant SaaS) |

See `docs/planning/USER_ROLES.md`.

## Core Modules

**Planned (high level, subject to change):**

- Authentication and user accounts
- Projects / jobs (renovation engagements)
- Tasks, milestones, or phases
- Documents / photos (quotes, permits, progress)
- Messaging or activity feed (optional, later phase)
- Reporting / dashboards (later phase)

## Tech Stack

| Layer | Status |
|-------|--------|
| Frontend | **Needs Decision** |
| Backend | **Needs Decision** |
| Database | **Needs Decision** |
| Auth | **Needs Decision** |
| Hosting | **Needs Decision** |
| Integrations | **Planned** — none selected |

See `docs/architecture/ARCHITECTURE.md`.

## Documentation Map

| Document | Purpose |
|----------|---------|
| `AGENTS.md` | Agent workflow and rules |
| `docs/context/CURRENT_STATE.md` | Truth of what exists now |
| `docs/context/SYSTEM_MAP.md` | System structure (planned vs built) |
| `docs/context/FEATURE_REGISTRY.md` | Feature tracking |
| `docs/planning/INITIAL_BRIEF.md` | Assumptions and open questions |
| `docs/planning/DEVELOPMENT_PHASES.md` | Phased delivery plan |
| `docs/architecture/*` | Technical design |
| `docs/context/AGENT_HANDOFF.md` | Latest handoff for next agent |

## Current Priorities

1. Confirm product vision, users, and MVP scope with stakeholder
2. Complete Phase 0 documentation
3. Accept tech stack and architecture decisions
4. Start Phase 1 foundation scaffold

## Main Risks

- Building without confirmed requirements
- Wrong interpretation of "Renovessa" domain
- Over-scoping MVP (marketplace, payments, AI features too early)
- Tech stack chosen before requirements are clear

## How To Continue

1. Review `docs/planning/INITIAL_BRIEF.md` with the project owner
2. Update `PRODUCT_REQUIREMENTS.md` and `USER_ROLES.md` from confirmed answers
3. Mark accepted decisions in `DECISION_LOG.md`
4. Proceed to Phase 1 only after MVP and stack are agreed
