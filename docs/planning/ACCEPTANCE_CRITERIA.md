# Acceptance Criteria

> MVP criteria are **draft** until product scope is confirmed.

## Phase 0 — Documentation

- [x] `AGENTS.md` exists and describes agent workflow
- [x] `docs/context/` files exist and reflect honest current state
- [x] Planned vs implemented clearly separated
- [ ] Stakeholder reviewed and confirmed INITIAL_BRIEF

## Phase 1 — Foundation

- [ ] App runs locally with documented commands
- [ ] `.env.example` documents required variables (no real secrets)
- [ ] Database connects successfully
- [ ] Health check or root endpoint responds
- [ ] Basic layout renders (header, nav shell)

## MVP — Authentication

- [ ] User can register with valid email/password
- [ ] Duplicate email rejected
- [ ] User can log in and log out
- [ ] Protected routes redirect unauthenticated users
- [ ] Passwords stored hashed (never plain text)

## MVP — Projects

- [ ] User can create project with required fields
- [ ] User sees only their projects (or shared projects when collaboration exists)
- [ ] User can edit and delete own project
- [ ] Validation errors shown clearly in UI

## MVP — Tasks

- [ ] User can add task to project
- [ ] User can toggle task complete
- [ ] User can delete task
- [ ] Tasks deleted when project deleted (or cascade documented)

## Non-Functional (MVP)

- [ ] Works on mobile viewport width (responsive)
- [ ] API returns consistent error shape
- [ ] No secrets committed to repository

## Out of MVP Scope (Do Not Block MVP On)

- Payments
- Real-time chat
- Native apps
- Advanced analytics
