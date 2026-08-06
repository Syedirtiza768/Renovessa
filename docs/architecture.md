# docs/architecture — index

**Last reviewed:** 2026-08-06

| File | Status | Notes |
|---|---|---|
| [[../docs/architecture/ARCHITECTURE.md]] | **Current** | Correctly describes the real shape: modular monolith, Next.js App Router + Route Handlers, PostgreSQL/Prisma, JWT cookie auth, Docker Compose on 7090, no queues/background jobs. |
| [[../docs/architecture/INTEGRATIONS.md]] | **Current** | Twilio (voice + SMS) and SendGrid (transactional + bulk) are implemented and documented in real detail, including webhook setup and current deliverability caveats. Matches `src/lib/sendgrid.ts`, `src/lib/bulkEmail.ts`, `src/lib/twilio.ts`. |
| [[../docs/architecture/SECURITY.md]] | **Current** (updated 2026-07-23) | Real implemented controls plus operating requirements — read before touching auth or public-facing forms. |
| [[../docs/architecture/AUTH_RBAC.md]] | **STALE** | Says "Planned" — contradicted by `SYSTEM_MAP.md` (JWT auth + 9-role RBAC implemented, `src/lib/auth.ts` + `src/lib/authorization.ts`) and by `FEATURE_REGISTRY.md`'s Auth entry. Needs a rewrite against the real role list and `src/lib/authorization.ts`. |
| [[../docs/architecture/DATABASE_SCHEMA.md]] | **STALE (mixed)** | Opens with a real, current paragraph about the compliance models (`ProjectRequest`, `ConsentEvent`, `CommunicationSuppression`, `EmailSuppression`), then immediately reverts to a generic `users`/`projects`/`tasks`/`files` Phase-0 draft schema that has nothing to do with the actual `prisma/schema.prisma` (which has `User`, `ContractorProfile`, `CapacityCell`, `ProjectRequest`, `Appointment`, `AuditEvent`, `Invoice`, `Feedback`, `Dispute`, `ContractorInquiry`, `Notification`, the full `Bathroom*` model family, `ConsentEvent`, `CommunicationSuppression`, and more). `prisma/schema.prisma` is the actual source of truth — this doc is not. |
| [[../docs/architecture/API_CONTRACTS.md]] | **STALE** | Says "Planned — no API implemented." False — `src/app/api/` has ~196 route/page files across projects, leads, campaigns, bathroom-projects, bathroom-estimator, calls, webhooks, etc. Needs a rewrite enumerating real routes (`docs/frontend/ROUTES_AND_SCREENS.md` and `docs/context/FEATURE_REGISTRY.md`'s top entries list some of them). |
| [[../docs/architecture/DEPLOYMENT.md]] | **STALE / duplicate** | Says "Planned." There is a second, correct, detailed file at `docs/operations/DEPLOYMENT.md` ("Implemented (manual server deploy)") — that one is the real one. This file under `architecture/` should probably be deleted rather than maintained in parallel. |

## Open questions / TODO

- `AUTH_RBAC.md`, `DATABASE_SCHEMA.md`, and `API_CONTRACTS.md` all need a real rewrite against the actual `prisma/schema.prisma` and `src/app/api/` tree — they currently describe a different, generic app.
- Decide whether to delete `docs/architecture/DEPLOYMENT.md` in favor of the accurate `docs/operations/DEPLOYMENT.md`, or turn one into a pointer to the other, so future agents don't get the stale one first alphabetically.
