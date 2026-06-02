# Routes and Screens

> **Status:** Planned — route paths are conventions until framework chosen.

## Public Routes

| Route | Screen | Status |
|-------|--------|--------|
| `/` | Landing / marketing (optional) | Planned |
| `/login` | Login form | Planned |
| `/register` | Registration form | Planned |

## Authenticated Routes

| Route | Screen | Status |
|-------|--------|--------|
| `/dashboard` | Project list | Planned |
| `/projects/new` | Create project | Planned |
| `/projects/[id]` | Project detail (tasks) | Planned |
| `/projects/[id]/edit` | Edit project | Planned |
| `/projects/[id]/files` | File list / upload | Planned (Phase 2+) |
| `/projects/[id]/settings` | Members, invites, delete | Planned (Phase 2+) |
| `/profile` | User profile | Planned |

## Admin Routes (If SaaS)

| Route | Screen | Status |
|-------|--------|--------|
| `/admin` | Admin dashboard | Deferred |

## Screen Details

### Dashboard

- Lists user's projects as cards
- CTA: New Project
- Empty state when no projects

### Project Detail

- Project name, status, description
- Task list with add/complete
- Link to files (when available)

### Login / Register

- Minimal fields
- Link between login and register
- Error display for invalid credentials

## Implementation Status

No routes exist — no `app/` or `pages/` directory yet.
