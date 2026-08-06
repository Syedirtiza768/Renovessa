# docs/planning — index

**Last reviewed:** 2026-08-06

| File | Status | Notes |
|---|---|---|
| [[../docs/planning/FIRST_JOB_MVP_IMPLEMENTATION_PLAN.md]] | **Current** ("Accepted for implementation") | The real, large (900+ line) implementation plan the current MVP was built from. |
| [[../docs/planning/BATHROOM_REMODELING_IMPLEMENTATION_NOTE.md]] | **Current** | Pre-implementation note for the Rockville bathroom-remodeling planner/estimator/proposal-studio feature set, referenced directly from `docs/context/CURRENT_STATE.md`. |
| [[../docs/planning/PRICING_TIERS.md]] | **Current** | Real business model doc: pay-per-qualified-appointment, contractor-billed, homeowner-free. Maps to `ContractorProfile.tier` / `firstAppointmentPricing` in the schema. |
| [[../docs/planning/DEVELOPMENT_PHASES.md]] | **STALE** | Still shows Phase 1-4 as entirely "Planned" (frontend scaffold, backend scaffold, basic layout, etc.) — all of that shipped long ago. Superseded by `docs/context/CURRENT_STATE.md`. |
| [[../docs/planning/INITIAL_BRIEF.md]] | **STALE** | Pre-blueprint brief, "most items need stakeholder confirmation." Superseded by the actual `docs/Renovessa_Product_Blueprint.docx`. |
| `docs/context/PRODUCT_REQUIREMENTS.md` (not in this folder — listed here because it's planning content) | **STALE** | See [[context]]. |
| [[../docs/planning/REQUIREMENTS_BACKLOG.md]] | **STALE** | "P0 — Must Decide Before Phase 1" framing; those decisions were made and implemented. |
| [[../docs/planning/USER_FLOWS.md]] | **STALE** | "All flows Planned — no UI implemented." False — see [[frontend]] / `docs/frontend/ROUTES_AND_SCREENS.md` for the real, live routes. |
| [[../docs/planning/USER_ROLES.md]] | **STALE** | "Draft — all roles are Planned." The real role list (9 roles: SUPER_ADMIN, OPS_AGENT, HOMEOWNER, CONTRACTOR, etc.) is implemented — see `docs/context/SYSTEM_MAP.md` and `docs/context/DEVELOPMENT_STATUS.md`'s `User` model entry. |
| [[../docs/planning/ACCEPTANCE_CRITERIA.md]] | **STALE** | "MVP criteria are draft until product scope is confirmed" — scope has been confirmed and shipped for a long time. |

## Open questions / TODO

- Same pattern as the other folders: a real, current plan (`FIRST_JOB_MVP_IMPLEMENTATION_PLAN.md`) and a real business doc (`PRICING_TIERS.md`) sit next to five files that are pure Phase-0 scaffolding nobody updated. `USER_ROLES.md` in particular is worth fixing soon — the real 9-role list only exists today as a one-line mention in `DEVELOPMENT_STATUS.md`, with no dedicated accurate doc.
