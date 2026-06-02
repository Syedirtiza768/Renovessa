# Security

> **Status:** Planned — apply during Phase 1+ implementation.

## Authentication Security

- Password minimum length and complexity rules (define in implementation)
- Hash passwords with bcrypt/argon2
- HTTP-only cookies if session-based
- Secure flag in production
- Logout invalidates session

## Authorization

- Deny by default on API routes
- Verify project membership on every project-scoped resource
- Prevent IDOR: never return project by ID without access check

## Public vs Private

Document actual routes in `AUTH_RBAC.md` as implemented.

## Sensitive Environment Variables

```env
DATABASE_URL=
JWT_SECRET=
SESSION_SECRET=
SMTP_API_KEY=
S3_ACCESS_KEY=
S3_SECRET_KEY=
STRIPE_SECRET_KEY=
```

Never commit real values. Use `docs/operations/ENVIRONMENT_VARIABLES.md`.

## File Upload Risks

- Validate MIME type and extension
- Enforce max file size
- Store outside web root; serve via signed URLs
- Scan for malware (optional, later)

## Data Deletion

- User account deletion policy: Needs Decision
- Project deletion cascades tasks and file metadata; remove objects from storage

## Payment / Finance

Not in MVP. When added, PCI scope minimized via Stripe hosted flows.

## Production Risks

| Risk | Mitigation |
|------|------------|
| SQL injection | ORM parameterized queries |
| XSS | Framework defaults + sanitize rich text if added |
| CSRF | SameSite cookies + tokens if needed |
| Secret leak | Pre-commit hooks, env-only secrets |
| Broken auth | Tests on protected routes |

## Security Review Checklist (Pre-Production)

- [ ] Auth flows tested
- [ ] RBAC tested per role
- [ ] Dependencies audited (`npm audit`)
- [ ] HTTPS enforced
- [ ] Rate limiting on auth endpoints
- [ ] Demo seed data removed
