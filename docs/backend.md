# docs/backend — index

**Last reviewed:** 2026-08-06

| File | Status | Notes |
|---|---|---|
| [[../docs/backend/BACKGROUND_JOBS.md]] | **Accurate** | Correctly says "Planned — none implemented, not required for MVP." This matches `SYSTEM_MAP.md`: no queue infra, everything runs synchronously in Route Handlers. One of the few backend docs that's actually right. |
| [[../docs/backend/MODULE_MAP.md]] | **STALE** | Describes a NestJS-style `auth/users/projects/tasks/files/invites` controller/service/DTO module layout. The real backend is Next.js Route Handlers under `src/app/api/**` plus flat business-logic modules in `src/lib/*` (`auth.ts`, `authorization.ts`, `compliance.ts`, `bulkEmail.ts`, `estimate-pricing.ts`, `lead-state-machine.ts`, `appointment-state-machine.ts`, the `src/lib/bathroom/` folder, etc.) — nothing resembling this doc's structure exists. |
| [[../docs/backend/DATABASE_MODELS.md]] | **STALE** | Explicitly says it "mirrors `docs/architecture/DATABASE_SCHEMA.md`" — which is itself stale/generic (see [[architecture]]). `prisma/schema.prisma` is the real source of truth for models. |
| [[../docs/backend/SERVICES_AND_CONTROLLERS.md]] | **STALE** | Says "Planned," framed around the same NestJS-shaped module list as `MODULE_MAP.md`. Doesn't reflect `src/lib/*` or `src/app/api/*`. |

## What the backend actually is

Next.js Route Handlers under `src/app/api/` (REST-ish JSON, ~196 files across `src/app/` including pages), calling into business logic in `src/lib/*` and `src/lib/bathroom/*`, talking to PostgreSQL via Prisma (`prisma/schema.prisma`, `prisma/seed.ts`). No separate service layer, no DI, no controllers in the NestJS sense — see [[../docs/architecture/ARCHITECTURE.md]] and [[../docs/context/SYSTEM_MAP.md]] for the parts of this that are documented accurately.

## Open questions / TODO

- All four files in this folder need a rewrite against the real `src/app/api/` + `src/lib/` layout, or should be replaced by a generated/maintained route+module list. Nothing here should be trusted as-is.
