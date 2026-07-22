# API Contracts

## Implemented public intake contracts (2026-07-23)

- `POST /api/project-requests` creates a `NEW` RFQ. It requires `termsAccepted: true` and `privacyAcknowledged: true`; `tcpaConsent` defaults false. A public request never creates, links, or resets an account and never returns credentials.
- `POST /api/advisor/book` is a legacy route name. It creates an unassigned RFQ after clickwrap and does not book, assign, or mutate an account.
- `GET /api/unsubscribe?token=...` validates a signed one-click token, suppresses the email, and records revocation evidence.
- `POST /api/webhooks/twilio/sms` validates the Twilio signature; STOP-family keywords suppress SMS and phone contact and append revocation evidence.


> **Status:** Planned — no API implemented. Base path assumed `/api`.

## Conventions (Planned)

- JSON request/response bodies
- `Content-Type: application/json`
- Errors: `{ "error": { "code": "...", "message": "..." } }`
- Auth: HTTP-only cookie or `Authorization: Bearer` (TBD)
- Pagination (later): `?page=1&limit=20`

## Auth

### POST /api/auth/register

**Status:** Planned

**Auth:** Public

**Request:**
```json
{
  "email": "user@example.com",
  "password": "string",
  "name": "string"
}
```

**Response:** `201` + user object (no password)

---

### POST /api/auth/login

**Status:** Planned

**Auth:** Public

**Request:**
```json
{
  "email": "user@example.com",
  "password": "string"
}
```

**Response:** `200` + sets session cookie or returns token

---

### POST /api/auth/logout

**Status:** Planned

**Auth:** Required

**Response:** `204`

---

### GET /api/auth/me

**Status:** Planned

**Auth:** Required

**Response:** `200` + current user

---

## Projects

### GET /api/projects

**Status:** Planned

**Auth:** Required

**Response:** `200` + array of projects user can access

---

### POST /api/projects

**Status:** Planned

**Auth:** Required

**Request:**
```json
{
  "name": "Kitchen remodel",
  "description": "optional",
  "address": "optional"
}
```

**Response:** `201` + project

---

### GET /api/projects/:id

**Status:** Planned

**Auth:** Required (member or owner)

**Response:** `200` + project detail

---

### PATCH /api/projects/:id

**Status:** Planned

**Auth:** Required (editor+)

---

### DELETE /api/projects/:id

**Status:** Planned

**Auth:** Required (owner)

**Response:** `204`

---

## Tasks

### GET /api/projects/:projectId/tasks

**Status:** Planned

### POST /api/projects/:projectId/tasks

**Status:** Planned

**Request:**
```json
{
  "title": "Install cabinets",
  "dueDate": "2026-07-01"
}
```

### PATCH /api/tasks/:id

**Status:** Planned

### DELETE /api/tasks/:id

**Status:** Planned

---

## Files (Phase 2+)

### GET /api/projects/:projectId/files

**Status:** Planned

### POST /api/projects/:projectId/files

**Status:** Planned — multipart or presigned URL flow TBD

---

## Related Frontend Screens

| Endpoint | Screen |
|----------|--------|
| Auth | `/login`, `/register` |
| Projects | `/dashboard`, `/projects/[id]` |
| Tasks | `/projects/[id]` (embedded) |

See `docs/frontend/ROUTES_AND_SCREENS.md`.

## Related Backend Modules

Planned: `auth`, `projects`, `tasks`, `files` — see `docs/backend/MODULE_MAP.md`.
