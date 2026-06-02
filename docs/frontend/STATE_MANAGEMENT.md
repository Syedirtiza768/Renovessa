# State Management

> **Status:** Planned

## Approach (Proposed)

**Needs Decision** based on framework:

| Stack | Suggested approach |
|-------|-------------------|
| Next.js App Router | Server Components + client hooks for interactive UI |
| React SPA | React Query (TanStack Query) for server state |
| Global UI state | React Context or Zustand (minimal) |

## Server State

- Projects, tasks, user profile fetched from API
- Cache with stale-while-revalidate pattern (React Query or equivalent)
- Invalidate cache after mutations (create project, complete task)

## Client State

- Form draft state: local component state
- Modal open/close: local state
- Auth session: cookie managed by server; client reads user via `/api/auth/me`

## API Fetching Strategy (Planned)

1. Central API client module (`lib/api.ts` or similar)
2. Attach credentials (cookies) automatically
3. Normalize error handling
4. Type responses when using TypeScript (shared types or generated from OpenAPI later)

## Loading and Error Handling

- Query hooks expose `isLoading`, `isError`, `error`
- Route-level error boundaries for unexpected failures

## Implementation Status

No state management code exists.
