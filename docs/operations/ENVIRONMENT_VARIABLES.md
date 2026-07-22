# Environment Variables

## Claim-publication gate (implemented)

`NEXT_PUBLIC_APPROVED_ESTIMATE_MODEL_VERSION` must remain blank unless the claim reviewer has approved every applicable record for that exact version. A blank or mismatched value causes the public estimator to withhold numeric ranges. Current review candidate: `dmv-estimator-2026-07-23-v1`.

Twilio inbound messaging must be configured to post to `/api/webhooks/twilio/sms`; `TWILIO_AUTH_TOKEN` is required for signature verification. `UNSUBSCRIBE_SECRET` signs durable email unsubscribe links.

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
