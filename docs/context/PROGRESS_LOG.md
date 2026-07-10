
## 2026-07-09 — SendGrid email sending enabled (ray@renovessa.com)

- Deployed SendGrid API key + `SENDGRID_FROM_EMAIL=ray@renovessa.com` + `SENDGRID_REPLY_TO=ray@renovessa.com` to production server `/opt/renovessa/.env` (key stored only on the server, NOT in the repo)
- `SENDGRID_FROM_NAME` left unset → code default `Renovessa Ops` (`src/lib/sendgrid.ts`)
- Backed up previous `.env` to `/opt/renovessa/.env.bak.20260709-170259`
- Recreated `app` container to reload `env_file`; stack healthy (app + db)
- Verified: SendGrid key valid (paid account, reputation 100); `ray@renovessa.com` is a verified single-sender identity; test send via SendGrid API returned HTTP 202
- **Caveat (deliverability):** SendGrid domain authentication for `renovessa.com` is misconfigured — the whitelabel domain was entered as `https://renovessa.com/` (malformed) and all DNS CNAME records show `valid:false`. Sending works via single-sender verification, but custom DKIM/SPF is not active → higher spam-folder risk. Fix: re-add the domain as bare `renovessa.com` and add SendGrid's 3 CNAME records (mail CNAME + dkim1 + dkim2).
- **Security note:** the SendGrid API key was shared in plaintext during this session — recommend rotating it in SendGrid and updating the server `.env` if this channel is logged

## 2026-07-08 — Softphone dialer unblock

- Diagnosed dialer failure: no assigned Twilio number in DB, empty TwiML App voice URL, localhost unreachability for webhooks, missing E.164 normalize on softphone path
- Fixed: export `toE164` + `getTwilioWebhookBaseUrl`, normalize on connect webhook + Softphone dial, `TWILIO_WEBHOOK_BASE_URL` support, seed preserves/reassigns Twilio numbers
- Provisioned Twilio number `+12405708350` to admin; TwiML App + cloudflared tunnel wired
- **Remaining blocker:** Twilio Trial error 21219 — cannot dial unverified `+12408006040` until account upgrade

## 2026-06-19 — Portal UX gap fixes

- Homeowner portal: settings, in-portal submit, project detail pages
- Contractor portal: settings page
- Admin: My Leads view, Team CRUD, role-based nav, ops login redirect
- API: session-aware `POST /api/project-requests`, `POST /api/team`

- Completed first-job MVP gap review (~38% readiness; appointment lifecycle is primary blocker)
- Authored comprehensive implementation plan: `docs/planning/FIRST_JOB_MVP_IMPLEMENTATION_PLAN.md`
- Plan covers 7 sprints (Phases 0–6): security, schema, intake wedge, ops spine, appointment lifecycle, proof layer, launch

## 2026-06-02 — MVP implementation from Product Blueprint

- Implemented Next.js 15 + PostgreSQL + Prisma full-stack application
- Built public website, homeowner/contractor/admin portals per blueprint MVP scope
- Added Docker Compose deployment on port 7090 with demo seed data
- Recorded tech stack decisions (Next.js, Prisma, JWT auth, Tailwind)
