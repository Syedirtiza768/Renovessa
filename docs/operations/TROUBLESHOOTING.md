# Troubleshooting

> **Status:** Planned — will grow as implementation adds real failure modes.

## Documentation-Only Project

**Symptom:** `npm run dev` fails or command not found.

**Cause:** Application not scaffolded yet.

**Fix:** Complete Phase 1 per `docs/planning/DEVELOPMENT_PHASES.md`.

---

## Database Connection (Future)

**Symptom:** `ECONNREFUSED` or authentication failed.

**Checks:**
- PostgreSQL running locally or container up
- `DATABASE_URL` correct in `.env`
- Database created
- Migrations applied

---

## Auth / Session (Future)

**Symptom:** Logged out immediately after login.

**Checks:**
- Cookie `Secure` flag not set on local HTTP (if applicable)
- `APP_URL` matches browser origin
- Session secret configured

---

## File Upload (Future)

**Symptom:** Upload fails with 403 or 500.

**Checks:**
- S3 credentials and bucket policy
- File size under limit
- MIME type allowed

---

## Adding New Issues

When bugs are discovered, also log in `docs/context/KNOWN_ISSUES.md` with reproduction steps.
