# Testing

> **Status:** Planned — no tests exist.

## Testing Strategy (Proposed)

| Layer | Tool (Needs Decision) | Scope |
|-------|----------------------|-------|
| Unit | Vitest or Jest | Services, utilities |
| Integration | Supertest or similar | API routes + DB |
| E2E | Playwright | Critical user flows |

## Critical Flows to Cover (MVP)

1. Register → login → create project → add task → complete task
2. Unauthorized access returns 401/403
3. User cannot access another user's project

## Commands (Planned)

```bash
# Placeholder
npm test
npm run test:e2e
npm run test:coverage
```

## CI (Planned)

- Run lint + unit tests on pull request
- Optional E2E on main branch

## Implementation Status

No test framework configured.
