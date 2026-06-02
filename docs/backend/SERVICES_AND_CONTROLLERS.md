# Services and Controllers

> **Status:** Planned

## Auth

### AuthController (Planned)

| Method | Route | Handler |
|--------|-------|---------|
| POST | `/api/auth/register` | `register` |
| POST | `/api/auth/login` | `login` |
| POST | `/api/auth/logout` | `logout` |
| GET | `/api/auth/me` | `me` |

### AuthService (Planned)

- `register(dto)` — create user, hash password
- `login(dto)` — verify credentials, issue session
- `logout(userId)` — invalidate session
- `validateSession(token)` — for guards

---

## Projects

### ProjectsController (Planned)

| Method | Route | Handler |
|--------|-------|---------|
| GET | `/api/projects` | `list` |
| POST | `/api/projects` | `create` |
| GET | `/api/projects/:id` | `getOne` |
| PATCH | `/api/projects/:id` | `update` |
| DELETE | `/api/projects/:id` | `remove` |

### ProjectsService (Planned)

- `listForUser(userId)`
- `create(userId, dto)`
- `findById(userId, projectId)` — with access check
- `update(userId, projectId, dto)`
- `delete(userId, projectId)` — owner only

---

## Tasks

### TasksController (Planned)

| Method | Route | Handler |
|--------|-------|---------|
| GET | `/api/projects/:projectId/tasks` | `list` |
| POST | `/api/projects/:projectId/tasks` | `create` |
| PATCH | `/api/tasks/:id` | `update` |
| DELETE | `/api/tasks/:id` | `remove` |

### TasksService (Planned)

- All methods verify project access via membership

---

## DTOs (Planned)

- `RegisterDto`, `LoginDto`
- `CreateProjectDto`, `UpdateProjectDto`
- `CreateTaskDto`, `UpdateTaskDto`

Validation: class-validator, Zod, or framework equivalent — **Needs Decision**

## Implementation Status

None implemented.
