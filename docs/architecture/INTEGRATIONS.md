# Integrations

> **Status:** None implemented or contracted.

## Planned Integrations

| Service | Purpose | Phase | Status |
|---------|---------|-------|--------|
| Email (Resend, SendGrid, SES) | Invites, notifications | 2–3 | Planned |
| S3 / R2 | File storage | 2–3 | Planned |
| Stripe | Payments | Later | Deferred |
| Google OAuth | Social login | Later | Deferred |
| Calendar (Google) | Deadline sync | Later | Deferred |

## Configuration

All integration keys via environment variables — see `docs/operations/ENVIRONMENT_VARIABLES.md`.

Never commit API keys to the repository.

## Webhooks (Future)

If Stripe is added:

- Verify webhook signatures
- Idempotent event processing
- Document endpoints in this file when implemented

## Implementation Status

No integration code exists.
