# DMV Estimate Range Register

**Model:** `dmv-estimator-2026-07-23-v1`

**Code:** `src/lib/estimate-pricing.ts`

**Status of every record below:** `INTERNAL_BASELINE_PENDING_REVIEW`
**Review due:** 2026-08-23

Each range is produced from the base values in code plus documented size, material, finish, urgency, and site-complexity factors. The current basis is an internal planning baseline; representative DMV source evidence has not yet been attached. Therefore these records support traceability, but must not be represented as independently validated market research. Attach evidence and reviewer approval per record before changing status to `APPROVED`.

| Claim ID | Scope / base range or formula before selected factors |
|---|---|
| COST-HVAC-REPAIR | HVAC repair, $175–$750 |
| COST-HVAC-TUNEUP | Tune-up, $120–$280 |
| COST-HVAC-AC-REPLACE | Central AC replacement, $4,500–$11,000 |
| COST-HVAC-FURNACE-REPLACE | Furnace replacement, $3,500–$8,500 |
| COST-HVAC-FULL-SYSTEM | Full HVAC system, $8,000–$17,500 |
| COST-ROOFING-REPAIR | Roof repair/leak, $350–$2,200 |
| COST-ROOFING-GUTTERS | Gutters, $800–$3,500 |
| COST-ROOFING-FULL-REPLACE | Roof replacement, $375–$575 per square |
| COST-KITCHEN-REFRESH | Kitchen refresh, $6,000–$18,000 |
| COST-KITCHEN-MID | Mid-range kitchen, $25,000–$65,000 |
| COST-KITCHEN-FULL | Full kitchen, $55,000–$130,000 |
| COST-BATHROOM-UPDATE | Bathroom update, $5,000–$14,000 |
| COST-BATHROOM-SHOWER | Shower/tub remodel, $8,000–$22,000 |
| COST-BATHROOM-FULL | Full bathroom, $15,000–$45,000 |
| COST-BASEMENT-FINISH | Basement finish, $45/$70/$95 per sq ft finish baseline; optional bath $8,000–$22,000 |
| COST-PLUMBING-CLOG | Drain service, $150–$450 |
| COST-PLUMBING-FIXTURE | Fixture work, $250–$1,200 |
| COST-PLUMBING-WATER-HEATER-TANK | Tank water heater, $1,200–$2,800 |
| COST-PLUMBING-WATER-HEATER-TANKLESS | Tankless water heater, $2,800–$5,500 |
| COST-PLUMBING-REPIPING | Repiping, $6,000–$18,000 |
| COST-PLUMBING-REPAIR | General plumbing, $200–$900 |
| COST-ELECTRICAL-OUTLET | Outlet/switch/circuit, $150–$600 |
| COST-ELECTRICAL-PANEL | Panel, $2,000–$5,500 |
| COST-ELECTRICAL-EV | EV circuit, $800–$2,500 |
| COST-ELECTRICAL-REWIRE | Rewire, $8,000–$25,000 |
| COST-ELECTRICAL-REPAIR | General electrical, $200–$800 |
| COST-WINDOWS-REPLACEMENT | $450–$1,400 per window by tier; optional doors $2,500–$7,000 |
| COST-DECK-BUILD | $30/$45/$55 per sq ft material baseline |
| COST-FLOORING-CARPET | $4–$9 per sq ft |
| COST-FLOORING-LVP | $6–$12 per sq ft |
| COST-FLOORING-HARDWOOD | $10–$18 per sq ft |
| COST-FLOORING-TILE | $12–$25 per sq ft |
| COST-FLOORING-REFINISH | $3–$7 per sq ft |
| COST-PAINTING-CABINETS | Cabinets, $2,500–$8,000 |
| COST-PAINTING-EXTERIOR | Exterior, $1.50–$4.00 per sq ft |
| COST-PAINTING-INTERIOR | Interior, $1.80–$4.50 per sq ft |
| COST-HANDYMAN-SMALL | Small visit, $150–$600 |
| COST-HANDYMAN-MEDIUM | General package, $400–$2,000 |
| COST-HANDYMAN-LARGE | Large package, $1,500–$6,000 |
| COST-DESIGN-BUILD-ADDITION | Home addition, $220–$400 per sq ft |
| COST-DESIGN-BUILD-ADU | ADU / in-law suite, $280–$480 per sq ft |
| COST-DESIGN-BUILD-WHOLE-HOME | Whole-home design-build, $180–$350 per sq ft |
| COST-DESIGN-BUILD-OUTDOOR-LIVING | Outdoor living design-build, $90–$220 per sq ft |
| COST-GENERAL-CONTRACTING-SINGLE-TRADE | Single-trade coordination, $1,500–$5,000 per room |
| COST-GENERAL-CONTRACTING-MULTI-TRADE | Multi-trade project, $3,500–$9,000 per room |
| COST-GENERAL-CONTRACTING-FULL-RENO | Whole-house GC, $12,000–$30,000 per room |
| COST-HARDSCAPING-PATIO | Patio / walkway, $14–$32 per sq ft (material-adjusted) |
| COST-HARDSCAPING-RETAINING-WALL | Retaining wall, $35–$75 per sq ft of wall face |
| COST-HARDSCAPING-OUTDOOR-KITCHEN | Outdoor kitchen, $8,000–$35,000 |
| COST-HARDSCAPING-FIRE-PIT | Fire pit / seating area, $1,200–$6,000 |
| COST-HARDSCAPING-FULL-YARD | Full outdoor living package, $14–$32 per sq ft |
| COST-MASONRY-CHIMNEY | Chimney repair/rebuild, $800–$6,500 |
| COST-MASONRY-FOUNDATION-REPAIR | Foundation crack/masonry repair, $2,500–$15,000 |
| COST-MASONRY-BRICK-REPAIR | Brick/block repair or repointing, $600–$4,500 |
| COST-MASONRY-BLOCK-WALL | New masonry/block wall, $25–$55 per sq ft |
| COST-MASONRY-DRIVEWAY | Concrete driveway/walkway, $9–$20 per sq ft |
| COST-REMODELING-SINGLE-ROOM | Single-room remodel, $60–$150 per sq ft |
| COST-REMODELING-MULTI-ROOM | Multi-room remodel, $80–$180 per sq ft |
| COST-REMODELING-WHOLE-HOME | Whole-home remodel, $100–$250 per sq ft |
| COST-REMODELING-ADDITION | Remodel addition, $220–$400 per sq ft |
| COST-RESTORATION-WATER | Water damage restoration, $4–$12 per sq ft (severity-adjusted) |
| COST-RESTORATION-FIRE | Fire/smoke damage restoration, $12–$30 per sq ft (severity-adjusted) |
| COST-RESTORATION-MOLD | Mold remediation, $8–$20 per sq ft (severity-adjusted) |
| COST-RESTORATION-STORM | Storm damage restoration, $6–$18 per sq ft (severity-adjusted) |

For each approval, append: evidence artifact IDs/locations, sample dates and DMV geography, sample size, calculation workbook/hash, exclusions, owner, reviewer, approval UTC, expiration, and exact approved wording.
