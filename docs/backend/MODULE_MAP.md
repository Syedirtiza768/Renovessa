# Backend Module Map

> **Status:** Planned — no backend code exists.

## Intended Module Structure

```txt
src/                          # Path TBD when stack chosen
  auth/
    auth.controller
    auth.service
    auth.dto
  users/
    users.service
  projects/
    projects.controller
    projects.service
    projects.dto
  tasks/
    tasks.controller
    tasks.service
  files/                      # Phase 2+
    files.controller
    files.service
  invites/                    # Phase 2+
  common/
    guards/
    filters/
    pipes/
```

## Module Responsibilities

| Module | Responsibility | Status |
|--------|----------------|--------|
| `auth` | Register, login, logout, session | Planned |
| `users` | User lookup, profile | Planned |
| `projects` | Project CRUD, access control | Planned |
| `tasks` | Task CRUD scoped to project | Planned |
| `files` | Upload metadata, storage integration | Planned |
| `invites` | Invite tokens and acceptance | Planned |

## Cross-Cutting

- Validation pipe / middleware
- Auth guard on protected routes
- Project membership guard for scoped resources
- Exception filter for consistent API errors

## Implementation Status

No modules implemented.
