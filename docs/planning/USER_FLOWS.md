# User Flows

> All flows **Planned** — no UI implemented.

## Flow 1 — New User Registration

**Actor:** Homeowner (assumed)

1. Land on marketing/home page
2. Click Sign up
3. Enter email, password, name
4. Submit → account created
5. Redirect to empty dashboard
6. Prompt to create first project

**Status:** Planned

---

## Flow 2 — Create Renovation Project

**Actor:** Authenticated user

1. Dashboard → New Project
2. Enter project name, optional address, notes
3. Save → project detail page
4. Add initial tasks

**Status:** Planned

---

## Flow 3 — Manage Tasks

**Actor:** Project owner or member

1. Open project
2. Add task with title
3. Mark task complete
4. Edit or delete task

**Status:** Planned

---

## Flow 4 — Invite Contractor (Later / MVP TBD)

**Actor:** Project owner

1. Project settings → Invite
2. Enter email, select role (viewer/editor)
3. System sends email with link
4. Contractor accepts → gains access

**Status:** Planned — **Needs Decision** for MVP inclusion

---

## Flow 5 — Upload Progress Photo

**Actor:** Project member

1. Project → Files tab
2. Upload image
3. File appears in list with thumbnail

**Status:** Planned — likely Phase 2/3

---

## Flow 6 — Login (Returning User)

**Actor:** Any registered user

1. Login page
2. Enter credentials
3. Redirect to dashboard with project list

**Status:** Planned

---

## Empty States

| Screen | Empty state message (draft) |
|--------|----------------------------|
| Dashboard | "No projects yet. Create your first renovation project." |
| Project tasks | "No tasks. Add a task to get started." |
| Project files | "No files uploaded." |

**Status:** Planned
