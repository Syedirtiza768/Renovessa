# Renovessa

Verified home improvement appointment marketplace for the DMV area (Washington DC, Maryland, Northern Virginia).

Renovessa connects homeowners with vetted contractors through **verified, exclusive appointments** — not shared leads.

## Quick Start (Docker — port 7090)

```bash
docker compose up --build
```

Open [http://localhost:7090](http://localhost:7090)

## Demo Accounts

Password for all demo accounts: `demo1234`

| Email | Portal |
|-------|--------|
| admin@renovessa.com | Admin / Operations Command Center |
| sarah.mitchell@demo.renovessa.com | Homeowner Portal |
| hvac@demo.renovessa.com | Contractor Portal |
| agent@renovessa.com | Ops Agent |
| finance@renovessa.com | Finance Manager |

## Local Development

```bash
cp .env.example .env
npm install
docker compose up db -d
npm run db:push
npm run db:seed
npm run dev
```

App runs at [http://localhost:3000](http://localhost:3000) in dev mode.

## MVP Features (Phase 1)

- Public website with multi-step homeowner intake form (TCPA consent)
- Contractor application page
- Homeowner portal — project status, appointment confirmation
- Contractor portal — accept appointments, check-in, billing view
- Admin Operations Command Center — leads, queues, appointments, contractors, capacity cells, finance, disputes
- Immutable audit trail for billing-sensitive events
- Demo seed data from product blueprint

## Tech Stack

- **Frontend/Backend:** Next.js 15 (App Router), TypeScript
- **Database:** PostgreSQL + Prisma
- **Auth:** JWT session cookies
- **Deploy:** Docker Compose on port **7090**

## GitHub

Repository: [https://github.com/Syedirtiza768/Renovessa.git](https://github.com/Syedirtiza768/Renovessa.git)

```bash
git remote add origin https://github.com/Syedirtiza768/Renovessa.git
git push -u origin main
```

## Documentation

Product blueprint: `docs/Renovessa_Product_Blueprint.docx`

Planning docs: `docs/context/`, `docs/planning/`, `docs/architecture/`
