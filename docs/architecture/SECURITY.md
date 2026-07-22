# Security Architecture

> **Status:** Implemented controls plus operating requirements, updated 2026-07-23.

## Authentication and account integrity

- Passwords are bcrypt-hashed; JWT sessions use HTTP-only cookies with secure production settings.
- Admin-only password resets require an authenticated admin-capable session.
- Public RFQ endpoints never find a user by submitted email to create, link, or reset an account and never return credentials.
- A submitted RFQ is linked to a homeowner only when that homeowner already has a valid session and the normalized email matches the session.
- Public account recovery remains deferred until a single-use, expiring, hashed-token email flow with rate limits and session invalidation is implemented.

## Authorization

- Route handlers must deny by default and check role or resource ownership server-side.
- Project IDs are not authorization. Every project-scoped read/write must verify membership, homeowner identity, contractor assignment, or an admin permission.
- Privileged operations are recorded in `AuditEvent`; clickwrap and communication choices use immutable `ConsentEvent` entries.

## Public intake and AI

- `POST /api/project-requests` and legacy `POST /api/advisor/book` validate server-side clickwrap acceptance.
- Optional communication consent defaults to false. Clients cannot choose disclosure or policy versions stored as evidence.
- The AI endpoint creates only an unassigned `NEW` RFQ; it cannot confirm an appointment, select a contractor, create an account, or reset a password.
- The AI prompt is prohibited from inventing numeric prices; approved estimator versions are the only public numeric-range source.

## Communication suppression

- Email unsubscribe, SendGrid unsubscribe/complaint, and signed Twilio STOP events create channel-specific `CommunicationSuppression` state.
- Revocations append `ConsentEvent` evidence. Delivery bounces are suppressions, not falsely recorded as consent revocations.
- Bulk email resolution and both Twilio call paths check suppression immediately before outbound contact.

## Secrets and production

- Secrets live only in environment configuration; never commit or print them.
- Production access uses restricted SSH credentials, HTTPS, least privilege, database backups, and controlled deployments.
- Rotate exposed keys and invalidate affected sessions. Follow `docs/operations/INCIDENT_RESPONSE.md` for suspected incidents.

## Review checklist

- [x] Public RFQ/account-takeover regression removed
- [x] AI direct-booking/account mutation removed
- [x] Affirmative, versioned legal and communication evidence
- [x] Email and phone suppression enforcement
- [ ] Rate limiting for public auth/intake endpoints
- [ ] MFA for privileged users
- [ ] Production recovery email flow
- [ ] Automated RBAC/IDOR and consent regression suite
- [ ] Remove or isolate demo identities before a true public launch
