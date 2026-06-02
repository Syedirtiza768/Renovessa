# Environment Variables

> **Status:** Planned — `.env.example` does not exist yet.

## Required (Planned — Phase 1+)

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/renovessa

# Application
NODE_ENV=development
APP_URL=http://localhost:3000
PORT=3000

# Auth (names depend on chosen approach)
JWT_SECRET=
SESSION_SECRET=
```

## Optional (Planned — Later Phases)

```env
# Email
SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASSWORD=
EMAIL_FROM=

# Object storage
S3_BUCKET=
S3_REGION=
S3_ACCESS_KEY=
S3_SECRET_KEY=

# Payments (deferred)
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
```

## Security Rules

- Never commit `.env` to git
- Use `.env.example` with empty placeholders only
- Rotate secrets if leaked
- Different secrets per environment (local, staging, production)

## Local Development

Copy example file when created:

```bash
cp .env.example .env
```

Fill in local PostgreSQL credentials only.
