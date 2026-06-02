# User Roles

> **Status:** Draft — all roles are **Planned** until product is confirmed.

## Role Summary

| Role | Description | Status |
|------|-------------|--------|
| **Homeowner** | Owns renovation project; creates tasks; invites others | Planned |
| **Contractor** | Executes work; updates task status; uploads progress photos | Planned |
| **Project Manager** | Coordinates timeline and vendors across projects | Planned |
| **Platform Admin** | Manages users/settings (SaaS only) | Planned |

## Homeowner

### Goals
- Track renovation progress in one place
- Share visibility with contractor
- Store documents and photos

### Permissions (Draft)
- Create and own projects
- Full CRUD on own projects and tasks
- Invite collaborators
- Delete own projects (policy TBD)

### Status
Planned — Needs Decision if primary persona

---

## Contractor

### Goals
- See assigned project work
- Mark tasks complete
- Upload proof of work

### Permissions (Draft)
- View projects where member
- Update tasks (not delete project)
- Upload files

### Status
Planned

---

## Project Manager

### Goals
- Oversee multiple projects
- Assign tasks and deadlines

### Permissions (Draft)
- Similar to contractor with broader edit on tasks
- May create projects on behalf of client (TBD)

### Status
Planned — may merge with contractor for MVP

---

## Platform Admin

### Goals
- Support users, moderate abuse, view metrics

### Permissions (Draft)
- Admin-only routes
- User management
- System configuration

### Status
Planned — only if multi-tenant SaaS

---

## Role Model Decision (Open)

**Needs Decision:** Global roles vs per-project roles (recommended: per-project membership with role enum).

See `docs/architecture/AUTH_RBAC.md`.
