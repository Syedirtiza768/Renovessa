# Deployment Operations

> **Status:** Planned

## Pre-Deploy Checklist

- [ ] All tests pass
- [ ] Environment variables set in hosting provider
- [ ] Database migrations reviewed and applied
- [ ] Demo seed data removed (if any)
- [ ] HTTPS enabled
- [ ] Error logging configured

## Deploy Steps (Generic — TBD)

1. Merge to `main`
2. CI builds and tests
3. Deploy to staging
4. Smoke test staging
5. Deploy to production
6. Run migrations on production DB
7. Verify health endpoint

## Rollback

- Redeploy previous release artifact
- Avoid irreversible migrations without backup

## Hosting

**Needs Decision.** See `docs/architecture/DEPLOYMENT.md`.

## Monitoring (Planned)

- Application errors (Sentry or similar)
- Uptime check on `/api/health` or `/`

## Implementation Status

No deployment pipeline configured.
