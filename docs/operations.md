# docs/operations — index

**Last reviewed:** 2026-08-06

| File | Status | Notes |
|---|---|---|
| [[../docs/operations/DEPLOYMENT.md]] | **Current** | Real, detailed Ubuntu + Docker + Nginx + Certbot production deploy guide for `renovessa.com`, matching `docker-compose.prod.yml`, `docker-entrypoint.sh`, and `deploy/nginx/`. Use this one, not `docs/architecture/DEPLOYMENT.md` (stale, see [[architecture]]). |
| [[../docs/operations/ENVIRONMENT_VARIABLES.md]] | **STALE (mixed)** | Opens with two real, current paragraphs (the `NEXT_PUBLIC_APPROVED_ESTIMATE_MODEL_VERSION` claim-publication gate, Twilio SMS webhook, `UNSUBSCRIBE_SECRET`), then says "`.env.example` does not exist yet" and lists a generic placeholder env block. `.env.example` and `.env.production.example` both exist at the repo root with real variables — read those directly instead of the placeholder list here. |
| [[../docs/operations/VENDOR_MANAGEMENT.md]] | **Current** (2026-07-23) | Real vendor-review procedure naming the actual integrations (SendGrid, Twilio, OpenRouter, hosting/Postgres). |
| [[../docs/operations/DATA_RETENTION_AND_DELETION.md]] | **Current** (2026-07-23) | Real retention schedule and deletion procedure, including the compliance models (`ConsentEvent`, `CommunicationSuppression`). |
| [[../docs/operations/INCIDENT_RESPONSE.md]] | **Current** (2026-07-23) | Real incident-response procedure. |
| [[../docs/operations/PRIVACY_REQUEST_REGISTER_TEMPLATE.md]] | **Current** (template, intentionally blank) | Register template referenced by `DATA_RETENTION_AND_DELETION.md`. |
| [[../docs/operations/SETUP.md]] | **STALE** | Says "Planned — no application to install yet." False — see the root `README.md` for the real `npm install` / `docker compose up db -d` / `npm run db:push` / `npm run db:seed` / `npm run dev` steps, which work today. |
| [[../docs/operations/TESTING.md]] | **STALE (mixed)** | Top says "no tests exist" and proposes choosing Vitest/Jest — Vitest is already configured (`vitest.config.ts`) with 27 real unit tests per `docs/context/CURRENT_STATE.md` (`npm test`). The bottom section on Pilot-15 campaign verification (`npm run campaign:verify-pilot15`) is real and current. |
| [[../docs/operations/TROUBLESHOOTING.md]] | **STALE** | Entirely "Documentation-Only Project" / "(Future)" placeholders. Real troubleshooting content exists in `docs/operations/DEPLOYMENT.md`'s "Troubleshooting" section (502 Bad Gateway, port conflicts, etc.) instead. |
| [[../docs/operations/RELEASE_NOTES.md]] | **STALE** | "No releases yet" — the app has shipped substantially since. Root `CHANGELOG.md` is equally stale (last entry 2026-06-02, "Repository initialized with documentation-only foundation"). Neither is being kept up to date; don't rely on either for release history — use `git log` and `docs/context/PROGRESS_LOG.md` instead. |

## Open questions / TODO

- `SETUP.md` and `TROUBLESHOOTING.md` should be rewritten from the real README/DEPLOYMENT content — trivial to fix, just needs someone to do it.
- `TESTING.md` should mention the actual Vitest suite and `npm test` up front instead of burying real content under a stale "no tests exist" banner.
- Nobody is updating `CHANGELOG.md` or `RELEASE_NOTES.md` as features ship — worth deciding whether to revive that habit or explicitly drop these files.
