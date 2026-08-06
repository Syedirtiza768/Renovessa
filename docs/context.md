# docs/context — index

**Last reviewed:** 2026-08-06

`docs/context/` is the original "living project state" folder from this project's Phase-0 documentation-first setup. It was kept current for some files and never touched again for others after the MVP shipped. Read the status column before trusting a file.

| File | Status | Notes |
|---|---|---|
| [[../docs/context/CURRENT_STATE.md]] | **Current** (2026-08-03) | The actual source of truth for what's built. Start here. |
| [[../docs/context/SYSTEM_MAP.md]] | **Current** | Accurate architecture-as-implemented, has a working mermaid diagram. |
| [[../docs/context/DECISION_LOG.md]] | **Current, ongoing** | This vault's decision log — see [[Home]]. Keep adding entries here. |
| [[../docs/context/KNOWN_ISSUES.md]] | **Mostly current** | Real, dated operational issues (Twilio Trust Hub block, SendGrid key exposure, SendGrid domain auth) mixed in with two leftover Phase-0 entries ("Product Vision Unconfirmed", "Empty Repository — No CI or Tests") that are stale — there are 27 vitest unit tests (`npm test`) and the product vision has been confirmed and shipped for a while. |
| [[../docs/context/PROGRESS_LOG.md]] | **Current, append-only** | Dated session log. Append here per session per `AGENTS.md`. |
| [[../docs/context/AGENT_HANDOFF.md]] | **Current** | Last-session handoff; overwritten each session, not a history. |
| [[../docs/context/NEXT_STEPS.md]] | **Current** | Real outstanding TODOs (SendGrid key rotation, webhook signing, Pilot 15 follow-up, etc.) |
| [[../docs/context/FEATURE_REGISTRY.md]] | **STALE (partially)** | The Consent/Suppression and Bulk Email Campaigns entries at the top are real and current. Everything below "User Authentication" (Tasks/Checklist, File/Photo Upload, Project Collaboration/Invites) is a generic Phase-0 template for a "renovation project management" app that was never built this way — the real product is an appointment marketplace, not a project/task tracker. Don't trust the bottom two-thirds of this file. |
| [[../docs/context/DEVELOPMENT_STATUS.md]] | **STALE** (dated 2026-06-18) | Snapshot of an earlier commit (`433ba70`, "13 models"). The schema has grown substantially since (bathroom-remodeling models, `ConsentEvent`, `CommunicationSuppression`, `ContactTag`, `EmailMessage`, etc. — see `prisma/schema.prisma`). Superseded by `CURRENT_STATE.md`. |
| [[../docs/context/ROADMAP.md]] | **STALE** | Still framed as "Phase 0: complete documentation, confirm product vision" — all of that happened long ago. Superseded by `NEXT_STEPS.md`. |
| [[../docs/context/PROJECT_OVERVIEW.md]] | **STALE** | Describes "no source code exists yet" and an unconfirmed product domain. False — see `CURRENT_STATE.md`. Kept for history; don't read it as current. |
| [[../docs/context/PRODUCT_REQUIREMENTS.md]] | **STALE** | "Draft — needs stakeholder confirmation" framing from the pre-blueprint phase. The blueprint (`docs/Renovessa_Product_Blueprint.docx`) superseded this. |

## Open questions / TODO

- The stale files above should either be updated to reflect reality or deleted/archived — right now an agent skimming `docs/context/` alphabetically hits `AGENT_HANDOFF` (current) before `CURRENT_STATE` (current) before `DEVELOPMENT_STATUS`/`FEATURE_REGISTRY`/`PROJECT_OVERVIEW` (stale), with no visual signal which is which without opening each file. This index exists to fix that; whoever next has time should consider actually deleting the fully-superseded ones (`PROJECT_OVERVIEW.md`, `ROADMAP.md`) rather than leaving them to rot further.
- `FEATURE_REGISTRY.md`'s generic project/task/file-upload/invite sections should either be rewritten against the real product (RFQs, appointments, bathroom planner, proposal studio) or removed.
