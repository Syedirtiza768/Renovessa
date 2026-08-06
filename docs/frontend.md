# docs/frontend — index

**Last reviewed:** 2026-08-06

| File | Status | Notes |
|---|---|---|
| [[../docs/frontend/ROUTES_AND_SCREENS.md]] | **Current** (last reviewed 2026-07-23 per the file itself) | Real, detailed route table: public/SEO routes, indexing status per route, and the three authenticated portal trees (`/portal/homeowner`, `/portal/contractor`, `/portal/admin`). Trustworthy. |
| [[../docs/frontend/COMPONENT_MAP.md]] | **STALE** | Says "Planned — no components exist yet." False — `src/components/` has ~15 top-level components plus `admin/`, `bathroom/`, `contractor/`, `editor/`, `landing/`, `marketing/`, `proposal/` subfolders. |
| [[../docs/frontend/STATE_MANAGEMENT.md]] | **STALE** | Generic "Planned" template, not written against the real app (which is mostly server components + route handlers, with client state for things like the multi-step estimate wizard and the bathroom planner's autosave/localStorage flow — see `docs/planning/BATHROOM_REMODELING_IMPLEMENTATION_NOTE.md`). |
| [[../docs/frontend/UI_UX_GUIDELINES.md]] | **STALE** | Says "Planned — no design system implemented." The live site has an actual visual system (warm bone/charcoal/copper-CTA/muted-green-trust palette, DM Serif Display + Inter type) referenced consistently across `docs/context/CURRENT_STATE.md` and the marketing docs, but never written down here. |

## Open questions / TODO

- `COMPONENT_MAP.md`, `STATE_MANAGEMENT.md`, and `UI_UX_GUIDELINES.md` should be rewritten from the real `src/components/` tree and the actual palette/type system in use — right now none of them are usable as reference.
- `ROUTES_AND_SCREENS.md` is the one file in this folder worth reading as-is; re-verify it against `src/app/` next time bathroom-remodeling or portal routes change significantly (it doesn't currently enumerate `/bathroom-remodeling/*` sub-routes, which do exist per `CURRENT_STATE.md`).
