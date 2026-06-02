# Feature Registry

> Features below are **Planned** unless status says otherwise. No features are implemented yet.

---

## User Authentication

### Status
Planned

### Purpose
Allow users to create accounts, log in, and access their projects securely.

### User Flow
1. User visits sign-up page
2. Enters email and password (or OAuth — TBD)
3. Verifies account if required
4. Logs in and reaches dashboard

### Technical Flow
- Frontend: auth forms, session/token handling
- Backend: auth module, password hashing, JWT or session cookies
- Database: `users` table

### Important Files
- Planned — none exist

### API Endpoints
- `POST /api/auth/register` — Planned
- `POST /api/auth/login` — Planned
- `POST /api/auth/logout` — Planned
- `GET /api/auth/me` — Planned

### Database Tables / Models
- `users` — Planned

### Permissions / Roles
- Public: register, login
- Authenticated: profile, logout

### Acceptance Criteria
- User can register and log in
- Invalid credentials rejected
- Protected routes require auth

### Known Issues
- Auth method not decided

### Future Improvements
- OAuth (Google, Apple)
- MFA
- Password reset email flow

---

## Renovation Project Management

### Status
Planned

### Purpose
Core entity: a renovation job with title, description, status, and timeline.

### User Flow
1. User creates new project from dashboard
2. Fills name, address (optional), start date, notes
3. Views project detail page with tasks and files

### Technical Flow
- Frontend: project list, create/edit forms, detail view
- Backend: projects CRUD, ownership checks
- Database: `projects`, `project_members` (if collaboration)

### Important Files
- Planned — none exist

### API Endpoints
- `GET /api/projects` — Planned
- `POST /api/projects` — Planned
- `GET /api/projects/:id` — Planned
- `PATCH /api/projects/:id` — Planned
- `DELETE /api/projects/:id` — Planned

### Database Tables / Models
- `projects` — Planned
- `project_members` — Planned

### Permissions / Roles
- Owner: full CRUD
- Member: read/update per role rules (TBD)
- Non-member: no access

### Acceptance Criteria
- Authenticated user can CRUD own projects
- Project list shows only accessible projects

### Known Issues
- Collaboration model not finalized

### Future Improvements
- Project templates
- Budget field and tracking
- Gantt/timeline view

---

## Tasks / Checklist

### Status
Planned

### Purpose
Break renovation work into trackable tasks with status.

### User Flow
1. User opens project
2. Adds tasks with title, optional due date
3. Marks tasks complete

### Technical Flow
- Frontend: task list component on project page
- Backend: tasks nested under project
- Database: `tasks`

### Important Files
- Planned — none exist

### API Endpoints
- `GET /api/projects/:id/tasks` — Planned
- `POST /api/projects/:id/tasks` — Planned
- `PATCH /api/tasks/:id` — Planned
- `DELETE /api/tasks/:id` — Planned

### Database Tables / Models
- `tasks` — Planned

### Permissions / Roles
- Project members with edit permission

### Acceptance Criteria
- Tasks belong to one project
- Status transitions (todo → done) work

### Known Issues
- None

### Future Improvements
- Assignee per task
- Dependencies between tasks
- Comments on tasks

---

## File / Photo Upload

### Status
Planned

### Purpose
Attach quotes, permits, and progress photos to a project.

### User Flow
1. User opens project files section
2. Uploads image or PDF
3. Views list of attachments

### Technical Flow
- Frontend: upload UI, preview
- Backend: signed upload URL or direct upload, metadata in DB
- Storage: object storage (S3-compatible) — Planned
- Database: `attachments` or `files`

### Important Files
- Planned — none exist

### API Endpoints
- `GET /api/projects/:id/files` — Planned
- `POST /api/projects/:id/files` — Planned
- `DELETE /api/files/:id` — Planned

### Database Tables / Models
- `files` — Planned

### Permissions / Roles
- Project members with upload permission

### Acceptance Criteria
- Allowed MIME types enforced
- Size limits enforced
- Files scoped to project

### Known Issues
- Storage provider not chosen

### Future Improvements
- Image thumbnails
- Version history

---

## Project Collaboration / Invites

### Status
Planned

### Purpose
Invite contractor or collaborator to a project with limited permissions.

### User Flow
1. Owner sends invite by email
2. Invitee accepts and gains project access

### Technical Flow
- Backend: invite tokens, membership records
- Email integration — Planned

### Important Files
- Planned — none exist

### API Endpoints
- `POST /api/projects/:id/invites` — Planned
- `POST /api/invites/:token/accept` — Planned

### Database Tables / Models
- `project_members` — Planned
- `invites` — Planned

### Permissions / Roles
- Owner: invite and revoke
- Member: per-role capabilities

### Acceptance Criteria
- Invite expires after configured period
- Only invited user can accept

### Known Issues
- May be Phase 2, not MVP — Needs Decision

### Future Improvements
- Role picker on invite (viewer, editor)
