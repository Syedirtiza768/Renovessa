# Integrations

> **Status:** Twilio (voice) and SendGrid (email) are implemented.

## Implemented Integrations

| Service  | Purpose                                             | Status      |
|----------|-----------------------------------------------------|-------------|
| Twilio   | Agent calling (browser softphone) + call logging    | Implemented |
| SendGrid | Transactional agent email + bulk email campaigns    | Implemented |

## Planned Integrations

| Service            | Purpose            | Status   |
|--------------------|--------------------|----------|
| S3 / R2            | File storage       | Planned  |
| Stripe             | Payments           | Deferred |
| Google OAuth       | Social login       | Deferred |
| Calendar (Google)  | Deadline sync      | Deferred |

## Configuration

All integration keys are provided via environment variables — see `.env.example`
and `.env.production.example`. Never commit API keys to the repository.

## SendGrid

### Transactional email
`src/lib/sendgrid.ts` sends 1:1 agent email (reply-to = the agent's own address)
and logs each send as an `EmailMessage`. Requires `SENDGRID_API_KEY`,
`SENDGRID_FROM_EMAIL`, `SENDGRID_FROM_NAME`.

### Bulk email campaigns
`src/lib/bulkEmail.ts` (+ `src/lib/emailSegments.ts`) sends bulk outreach to
resolved audience segments (homeowners, active contractors, prospective
contractors). Each recipient gets a personalized message with a CAN-SPAM footer
(mailing address + one-click unsubscribe) and its own `EmailMessage` row linked
back to the campaign. Managed from **Ops → Campaigns**.

Prospective-contractor campaigns can target an exact `ContactTag`. An optional
`expectedCount` safety lock is re-checked after current suppressions are applied;
the sender refuses to run if the count differs. The RFQ Pilot 15 uses both
controls so a broad `new` segment cannot be sent accidentally.

Additional env vars: `SENDGRID_REPLY_TO` (shared inbox for campaign replies),
`MAILING_ADDRESS` (footer), `UNSUBSCRIBE_SECRET` (signs unsubscribe tokens),
`SENDGRID_WEBHOOK_VERIFICATION_KEY` (webhook signature).

### Deliverability — required before cold sends
Bulk cold outreach will damage sender reputation without proper domain
authentication. In SendGrid: **Settings → Sender Authentication → Authenticate
Your Domain**, then add the generated **SPF** and **DKIM** DNS records. Add a
**DMARC** record (`v=DMARC1; p=none; rua=mailto:dmarc@renovessa.com`) and tighten
the policy once aligned. Warm up volume gradually on a new domain/IP.

As of 2026-07-23, SendGrid reports one valid `renovessa.com` domain-authentication
entry (including mail CNAME and both DKIM records). Two older invalid entries
remain in the account and may be removed during credential cleanup.

## Webhooks

### SendGrid Event Webhook — `POST /api/webhooks/sendgrid/events`
Ingests delivery events (delivered, open, click, bounce, dropped, spamreport,
unsubscribe) and:
- stamps the matching `EmailMessage` lifecycle timestamps + status
  (matched via `sg_message_id` → stored `sendgridMessageId`), and
- auto-adds bounced / complained / unsubscribed addresses to `EmailSuppression`
  so future segments and sends skip them.

**Setup:** SendGrid → **Settings → Mail Settings → Event Webhook**. Set the HTTP
POST URL to `https://<host>/api/webhooks/sendgrid/events`, select the events
above, enable **Signed Event Webhook**, and copy the verification key into
`SENDGRID_WEBHOOK_VERIFICATION_KEY`. Processing is idempotent (suppression is an
upsert; timestamps are set-once), so SendGrid retries are safe.

If `SENDGRID_WEBHOOK_VERIFICATION_KEY` is unset, signature verification is
skipped — acceptable in local dev, not in production.

**Current production preflight (2026-07-23):** the event webhook is disabled and
the verification key is unset. Bulk contractor sends remain blocked until the
webhook is enabled, signature verification is configured, and a test event is
accepted by the production endpoint.

## Twilio

Browser softphone + call disposition logging. See `src/lib/*` Twilio helpers and
the `/api/calls/*` routes. Requires the `TWILIO_*` env vars documented in
`.env.example`.
