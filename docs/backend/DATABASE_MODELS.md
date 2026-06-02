# Database Models

> **Status:** Planned — mirrors `docs/architecture/DATABASE_SCHEMA.md`. Update when ORM entities exist.

## Entity List

| Model | Table | Status |
|-------|-------|--------|
| User | `users` | Planned |
| Project | `projects` | Planned |
| ProjectMember | `project_members` | Planned |
| Task | `tasks` | Planned |
| File | `files` | Planned |
| Invite | `invites` | Planned |

## User (Planned)

```ts
// Illustrative — not in codebase
interface User {
  id: string;
  email: string;
  passwordHash: string | null;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}
```

## Project (Planned)

```ts
interface Project {
  id: string;
  ownerId: string;
  name: string;
  description?: string;
  address?: string;
  status: 'planning' | 'active' | 'completed';
  createdAt: Date;
  updatedAt: Date;
}
```

## ProjectMember (Planned)

```ts
interface ProjectMember {
  id: string;
  projectId: string;
  userId: string;
  role: 'owner' | 'editor' | 'viewer';
  createdAt: Date;
}
```

## Task (Planned)

```ts
interface Task {
  id: string;
  projectId: string;
  title: string;
  status: 'todo' | 'done';
  dueDate?: Date;
  sortOrder?: number;
  createdAt: Date;
  updatedAt: Date;
}
```

## File (Planned)

```ts
interface File {
  id: string;
  projectId: string;
  uploadedBy: string;
  filename: string;
  mimeType: string;
  storageKey: string;
  sizeBytes: number;
  createdAt: Date;
}
```

## Relationships

- User 1—N Projects (as owner)
- Project 1—N Tasks
- Project 1—N Files
- Project N—M Users via ProjectMember

## Business Logic Notes

- On project create: auto-create `project_members` row for owner
- On project delete: cascade delete tasks, files metadata, members; delete storage objects async

## Implementation Status

No ORM schema files exist.
