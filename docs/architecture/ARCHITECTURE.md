# Architecture

> **Status:** Implemented (First-Job MVP)

## Overall Architecture

**Pattern:** Modular monolith full-stack app (Next.js) with separate frontend and API route layers.

```mermaid
flowchart LR
    Browser[Browser] --> FE[Frontend App (Next.js)]
    FE --> API[Backend API (Route Handlers)]
    API --> PG[(PostgreSQL)]
    API --> Twilio[Twilio Voice]
    API --> SendGrid[Email Provider]
```

## Frontend Framework

**Accepted:** Next.js 15 (App Router) with React and Tailwind CSS.
Provides full-stack capabilities, server-side rendering, and a robust ecosystem suitable for our MVP.

## Backend Framework

**Accepted:** Next.js Route Handlers (`src/app/api/`).
Co-located with the frontend for rapid MVP development. 

## Database

**Accepted:** PostgreSQL 16
Relational data fits projects, tasks, and complex state machines perfectly.

**ORM (Accepted):** Prisma 6.

## Authentication Method

**Accepted:** JWT in HTTP-only cookies using `jose`.
Ensures secure session handling without the overhead of a dedicated session store (like Redis) for the MVP.
See `AUTH_RBAC.md`.

## Authorization / RBAC

Role assigned per user globally (e.g. SUPER_ADMIN, OPS_AGENT, HOMEOWNER, CONTRACTOR). Enforced in API layer middleware and reflected in UI.

**Status:** Implemented

## API Communication

**Accepted:** REST JSON via Next.js Route Handlers.
Selected for MVP simplicity.

## File Storage

**Proposed:** S3-compatible object storage (AWS S3, Cloudflare R2, etc.)
*Currently deferred for MVP. Photo URLs are pasted into qualification forms instead of direct uploads.*

## Queues / Background Jobs

**Deferred for MVP.** Actions (like sending emails or state machine transitions) are processed synchronously in Next.js Route Handlers.

## Deployment Structure

**Accepted:** Docker Compose
Runs Next.js app and PostgreSQL database on port 7090.
See `DEPLOYMENT.md` and `docs/operations/DEPLOYMENT.md`.

## Major Constraints

- No microservices for MVP.
- Security: auth must be robustly tested (currently enforced via `src/lib/auth.ts` and `src/lib/authorization.ts`).

## Reasoning

Started simple: one deployable app, one database, clear module boundaries in code so extraction later is possible without premature distributed complexity.
