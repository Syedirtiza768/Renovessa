# Agent Handoff

> Session: 2026-06-19 — Portal UX gap fixes

## Completed This Session

- Homeowner: settings page, in-portal submit, project detail view
- Contractor: settings page (password off dashboard)
- Admin: My Leads for ops agents, Team CRUD, role-based nav
- API: session-aware project submission, `POST /api/team`

## Run

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build
# → http://localhost:7090
```

Demo accounts (password: `demo1234`):

| Email | Role |
|-------|------|
| admin@renovessa.com | Super Admin |
| agent@renovessa.com | Ops Agent |
| sarah.mitchell@demo.renovessa.com | Homeowner |
| hvac@demo.renovessa.com | Contractor |

## Key Routes Added

- `/portal/homeowner/submit` — submit another project in-portal
- `/portal/homeowner/projects/[id]` — homeowner lead detail
- `/portal/homeowner/settings` — change password
- `/portal/admin/my-leads` — agent assigned leads
- `/portal/admin/team` — manage ops employees

## Next

- Stakeholder UAT on the five fixed gaps
- Forgot-password email flow (still deferred)
- Refactor `LandingProjectForm` to share more code with `PortalProjectForm` if desired
