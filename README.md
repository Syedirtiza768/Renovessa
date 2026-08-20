# Renovessa

Verified home improvement appointment marketplace for the DMV area (Washington DC, Maryland, Northern Virginia).

Renovessa connects homeowners with vetted contractors through **verified, exclusive appointments** — not shared leads.

## Quick Start (Docker — port 7090)

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build
```

Open [http://localhost:7090](http://localhost:7090)

## Production (Railway)

The repository includes a Railway deployment config and Makefile. Create an app service and a PostgreSQL service in the same Railway project, then set the app service's `DATABASE_URL` to the PostgreSQL service reference (for example, `${{Postgres.DATABASE_URL}}`) and configure the secrets from `.env.production.example` in Railway Variables.

```bash
make railway-check
make railway-link
make railway-add-db              # one-time: creates the PostgreSQL service
make deploy RAILWAY_SERVICE=renovessa-web RAILWAY_ENVIRONMENT=production
make health APP_URL=https://your-railway-domain
```

`railway.json` configures the Dockerfile builder, `/api/health` deploy healthcheck, and restart policy. Railway supplies the runtime `PORT`; the app already listens on that variable.

Full Railway and legacy server steps: [docs/operations/DEPLOYMENT.md](docs/operations/DEPLOYMENT.md)

## Production (Ubuntu + Docker + Nginx + Certbot)

Deploy at **https://renovessa.com** with Docker on the server, Nginx as reverse proxy, and Let's Encrypt via Certbot.

```bash
cp .env.production.example .env   # edit secrets on the server
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
# then install deploy/nginx/renovessa.com.conf and run certbot --nginx
```

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
- **Deploy:** Docker Compose (dev port **7090**; production behind Nginx + TLS on **renovessa.com**)

## GitHub

Repository: [https://github.com/Syedirtiza768/Renovessa.git](https://github.com/Syedirtiza768/Renovessa.git)

```bash
git remote add origin https://github.com/Syedirtiza768/Renovessa.git
git push -u origin main
```

## Documentation

Product blueprint: `docs/Renovessa_Product_Blueprint.docx`

Planning docs: `docs/context/`, `docs/planning/`, `docs/architecture/`
