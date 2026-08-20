import { ContentTemplate } from "./types";

/**
 * Bathroom Remodeling authority content templates — DMV-wide expansion.
 * These extend the original Rockville-only templates to cover the full DMV market.
 */

export const BATHROOM_CONTENT_TEMPLATES: ContentTemplate[] = [
  // === PILLAR: DMV-WIDE COST GUIDE ===
  {
    slug: "dmv/bathroom-remodel-cost",
    title: "Bathroom Remodeling Costs in the DMV — Local Planning Guide",
    bodyText: `What drives bathroom remodeling costs in Washington, DC, Maryland, and Northern Virginia

A bathroom remodel in the DMV can range widely depending on scope, bathroom size, finish tier, property type, and site conditions. This guide explains the main cost drivers and how to think about a planning range before requesting contractor bids.

Main cost drivers

Project objective: A cosmetic refresh (paint, hardware, fixture swaps) costs far less than a full gut remodel that opens walls and relocates plumbing.

Bathroom type and size: Powder rooms and small guest baths cost less than primary bathrooms. Floor area drives tile, flooring, and demolition quantities.

Finish tier: Entry-level stock vanities and standard fixtures cost less than premium or luxury selections. Tile choice, countertop material, and fixture brands widen the range significantly.

Plumbing and electrical relocation: Moving a toilet, shower, or vanity requires new drain, supply, and vent runs. Each foot of relocated plumbing adds labor and material cost.

Tile coverage: Floor-to-ceiling tile increases both material and installation quantities compared to tile limited to the wet area.

Permits and inspections: Building, plumbing, electrical, and mechanical permits may apply depending on scope. Requirements vary by jurisdiction — Washington, DC, Montgomery County, Prince George's County, Fairfax County, Arlington County, and Alexandria each have distinct permit processes.

Property type constraints:
- DC rowhouses often have narrow bathrooms with shared walls, limiting layout changes.
- Northern Virginia townhouses may have HOA or condo board review requirements.
- Maryland condos in high-rise buildings require additional labor for material transport and debris disposal.
- Historic districts (Georgetown, Old Town Alexandria, Capitol Hill) may have additional design-review requirements.

Older homes: Homes over 60 years old — common in DC, Alexandria, and parts of Montgomery County — often hide conditions behind walls that increase contingency needs.

Jurisdiction-specific cost considerations

Washington, DC: Higher labor rates than suburban Maryland. Historic district properties may require LPC (Historic Preservation Office) review for visible exterior changes if windows are involved.

Montgomery County, MD: Strong building code enforcement. Permit turnaround times are generally predictable. Condo and HOA regulations in Bethesda, Chevy Chase, and Silver Spring add complexity.

Northern Virginia: Fairfax County and Arlington have robust permit systems. Loudoun County and Prince William are growing markets with varying contractor availability.

How to get a project-specific range

The Renovessa bathroom planner asks structured questions about your bathroom, measurements, finishes, property type, and conditions, then produces a localized DMV planning range. The estimate is deterministic — it uses a versioned configuration, not AI-generated pricing.

Important disclaimers

Planning ranges are illustrative and depend on final material selections, site conditions, and contractor bids. They are not binding quotes. Renovessa does not perform construction. Contractors are independent businesses; verify credentials and contract terms before signing.

Methodology

The estimator uses a per-square-foot baseline by project objective, multiplied by bathroom type, finish tier, and a location factor specific to the DMV sub-market. Complexity multipliers add for plumbing relocation, electrical modifications, full-height tile, curbless shower structural allowance, condominium high-floor access, historic district constraints, and older-home conditions. Contingency and general contractor overhead are applied as percentages.`,
    author: "Renovessa editorial team",
    reviewer: "Renovessa operations",
    methodology: "Deterministic per-square-foot baseline by objective, adjusted for type, finish, DMV sub-market location, and complexity. Contingency and overhead applied as percentages.",
    applicableLocation: "dmv",
    applicableTrade: "bathroom",
    status: "draft",
  },

  // === PILLAR: PERMIT GUIDE ===
  {
    slug: "dmv/bathroom-remodel-permits",
    title: "Bathroom Remodeling Permits in DC, Maryland, and Northern Virginia",
    bodyText: `Bathroom remodeling permits across the DMV

Permit requirements for a bathroom remodel depend on the exact scope of work and your jurisdiction. This guide summarizes the common permit categories and where they are likely required in Washington, DC, suburban Maryland, and Northern Virginia.

Common permit categories

Building permit: Likely required when creating a new bathroom, changing walls, affecting structural framing, or modifying exterior-facing elements.

Plumbing permit: Likely required when relocating fixtures, changing drain lines, or modifying supply and vent piping.

Electrical permit: Likely required when adding or relocating lighting circuits, outlets, switches, or exhaust fans.

Mechanical permit: May be required when modifying ventilation or exhaust fan ducting.

HOA or condo board review: If you live in a condominium or a community with an HOA, architectural review may be required before construction begins. This is common in Northern Virginia townhouse communities and Bethesda/Chevy Chase condos.

Historic district review: Properties in DC historic districts (Georgetown, Capitol Hill, Dupont Circle), Old Town Alexandria, and certain Montgomery County historic areas may require additional design review for visible changes.

Jurisdiction-specific guidance

Washington, DC: Permits are managed through the DC Department of Buildings (DOB). Most bathroom remodels require a building permit if walls are moved or plumbing is relocated. The DOB offers a "Homeowner's Center" for owner-occupants pulling their own permits. Historic Preservation Office review may apply in designated historic districts.

Montgomery County, MD: The Department of Permitting Services (DPS) handles residential permits. Plumbing and electrical permits are typically required for fixture relocation. The permitting process is generally straightforward for interior bathroom work not affecting structural elements.

Fairfax County, VA: Fairfax County's Land Development Services manages permits. Interior bathroom remodels often require building permits when plumbing is relocated or walls are modified. Electrical work requires a separate permit or must be performed by a licensed electrician.

Arlington County, VA: The Department of Community Planning, Housing and Development (CPHD) processes permits. Arlington has active code enforcement and requires permits for most bathroom work beyond cosmetic updates.

Alexandria, VA: The Department of Code Administration handles permits. Old Town historic properties may have additional requirements through the Board of Architectural Review.

When a permit is likely not required

Surface-level cosmetic updates — painting, swapping a like-for-like faucet, replacing a toilet with a similar model, changing hardware, or replacing a vanity without moving plumbing — typically do not require permits. However, the final determination always depends on your specific jurisdiction and scope.

Who should pull the permit

In most DMV jurisdictions, the licensed contractor performing the work should pull the permit. This ensures the permit is tied to the responsible party and inspections are coordinated correctly. Some jurisdictions allow homeowner-owner-occupants to pull permits for their own primary residence, but this makes the homeowner responsible for code compliance.

Important disclaimers

Permit rules can change. Confirm current requirements with your local building department before construction. This guide is informational and not legal advice. Your contractor should confirm exact permit requirements for your scope.

Methodology

Permit guidance is based on published jurisdiction requirements reviewed against homeowner scope descriptions. Rules are confirmed against official sources as of the review date.`,
    author: "Renovessa editorial team",
    reviewer: "Renovessa operations",
    methodology: "Rule-based likelihood assessment from homeowner answers and jurisdiction research. Not a legal determination.",
    applicableLocation: "dmv",
    applicableTrade: "bathroom",
    status: "draft",
  },

  // === PILLAR: PLANNING GUIDE ===
  {
    slug: "dmv/bathroom-remodel-process",
    title: "The Bathroom Remodeling Process in the DMV — A Homeowner's Guide",
    bodyText: `The bathroom remodeling process in Washington, DC, Maryland, and Northern Virginia

A typical bathroom remodel moves through six stages. Understanding each stage helps you compare contractor proposals, set realistic expectations, and avoid surprises common in DMV projects.

Stage 1 — Plan

Define the scope, measurements, layout, finishes, budget, and timeline. Consider:
- Property type constraints (rowhouse narrow bath, condo HOA rules, townhouse shared walls)
- Historic district requirements if applicable
- Whether you need to relocate plumbing or electrical
- Finish tier and material selections
- Whether you will remain in the home during construction

The Renovessa planner helps you capture all of this in a structured way and produces a contractor-ready brief.

Stage 2 — Demo

Protect the home with dust barriers and floor protection. Remove existing fixtures, tile, drywall, and cabinetry. Dispose of debris responsibly. In DC rowhouses and condos, debris removal logistics require advance planning.

Stage 3 — Rough-in

Framing adjustments, plumbing rough-in (drain, supply, vent), electrical rough-in (wiring, boxes), and ventilation ducting. This is when hidden conditions behind walls are discovered — especially common in DC homes built before 1950.

Stage 4 — Waterproofing

Shower pan, waterproofing membrane, and slope before any tile is installed. This is safety-critical work — never skip or reduce waterproofing to save cost. DMV building inspectors in Montgomery County and Fairfax County are particularly attentive to shower waterproofing.

Stage 5 — Finishes

Tile, vanity, countertop, toilet, lighting, paint, trim, mirrors, and accessories. Fixture and finish installation brings the design to life. Order materials with lead times in mind — custom vanities and imported tile can take 6–10 weeks.

Stage 6 — Closeout

Final inspections, punch list walkthrough, and final payment. Confirm all permit inspections are signed off before final payment. In DC and Arlington, scheduling final inspections can take 1–2 weeks during busy seasons.

DMV-specific timeline considerations

- Permit approval: 2–6 weeks depending on jurisdiction
- Material lead times: 4–10 weeks for custom or imported items
- Construction duration: 3–6 weeks for a typical full bathroom remodel
- Historic district review: Add 2–4 weeks if applicable
- Condo/HOA approval: Add 1–3 weeks if required

How to use this guide

Use the Renovessa planner to capture your scope and generate a brief. Share the brief with reviewed DMV contractors to get comparable proposals. Ask each contractor how they handle each stage, including permits, waterproofing, inspections, and debris disposal.`,
    author: "Renovessa editorial team",
    reviewer: "Renovessa operations",
    applicableLocation: "dmv",
    applicableTrade: "bathroom",
    status: "draft",
  },

  // === CLUSTER: TUB-TO-SHOWER ===
  {
    slug: "dmv/tub-to-shower-conversion",
    title: "Tub-to-Shower Conversions in the DMV — Planning and Cost Guide",
    bodyText: `Tub-to-shower conversions in Washington, DC, Maryland, and Northern Virginia

Removing an alcove tub and adding a walk-in or curbless shower is one of the most common bathroom remodels in the DMV. This guide explains the key decisions, cost drivers, and what to expect.

Key decisions

Shower type: A curbed shower is simpler and less expensive. A curbless shower requires floor recessing and a linear drain, which adds structural and plumbing work — particularly complex in concrete-slab condos common in Arlington and Bethesda.

Drain relocation: If the new shower drain location differs from the tub drain, plumbing relocation adds labor and material cost. Keeping the drain in the same location reduces complexity.

Tile and waterproofing: Custom tiled showers require a waterproofing system (membrane, slope, and proper drainage). Never reduce waterproofing to save cost. Fairfax County and Montgomery County inspectors are particularly attentive to this detail.

Glass enclosure: Frameless enclosures cost more than framed or semi-frameless options. In narrow DC rowhouse bathrooms, sliding or pivot doors may be necessary due to space constraints.

Shower features: Benches, niches, handheld showers, and rain showerheads each add to the scope. Consider which features you will actually use.

Aging-in-place considerations: If accessibility is a goal, a curbless entry with grab-bar blocking and a handheld shower is worth the additional investment.

Cost factors specific to the DMV

- Labor rates in DC proper are typically higher than suburban Maryland or Prince William County
- Condo buildings in Bethesda, Arlington, and DC may require additional labor for material transport and debris removal
- Historic district properties may have restrictions on visible exterior changes if windows are modified
- Older homes in DC, Alexandria, and Takoma Park may have galvanized plumbing that requires replacement

Permit considerations

Tub-to-shower conversions usually involve plumbing changes, which often require a plumbing permit. If the shower is curbless and the floor is modified, a building permit may also apply. Your contractor confirms with your local jurisdiction.

How to plan

Use the Renovessa planner to capture your bathroom dimensions, select tub-to-shower conversion as the objective, and choose your finish tier. The planner produces a localized planning range and a contractor-ready brief.`,
    author: "Renovessa editorial team",
    reviewer: "Renovessa operations",
    applicableLocation: "dmv",
    applicableTrade: "bathroom",
    status: "draft",
  },

  // === CLUSTER: SMALL BATHROOM ===
  {
    slug: "dmv/small-bathroom-remodel",
    title: "Small Bathroom Remodel Ideas for DMV Homes — Space and Budget Guide",
    bodyText: `Small bathroom remodels in Washington, DC, Maryland, and Northern Virginia

Small bathrooms are common in DMV homes — especially DC rowhouses, older Arlington and Alexandria properties, and condo units throughout the metro area. A well-planned small bathroom remodel can dramatically improve functionality without expanding the footprint.

Space-maximizing strategies

Wall-hung fixtures: A wall-hung vanity and toilet create visual floor space and make cleaning easier. They work particularly well in narrow DC rowhouse bathrooms.

Large-format tile: Fewer grout lines create a cleaner, more expansive look. Large-format tile on both floor and walls works well in small spaces.

Glass shower enclosure: A clear glass shower door or panel makes the room feel larger than a curtain or frosted enclosure.

Recessed storage: Built-in niches in shower walls and medicine cabinets with interior storage reduce visual clutter.

Lighting layers: Combine overhead lighting with sconces at face height. Good lighting makes a small bathroom feel more open.

Light color palette: White, cream, and soft gray palettes reflect light and create visual space. Contrast with darker floors for grounding.

Pocket or barn doors: In tight layouts where a swinging door blocks fixtures, a pocket or barn door can reclaim usable space.

DMV-specific small bathroom considerations

DC rowhouses: Often 5–6 feet wide. Consider a wet-room layout or a compact corner shower to maximize function.

Condos (Bethesda, Arlington, Silver Spring): Check HOA rules before changing plumbing locations. Space is at a premium — every inch matters.

Basement bathrooms (Montgomery County, Fairfax County): May require pumps for below-grade plumbing. Egress windows may be required if the basement is habitable.

Historic homes: Preserve original features where possible — pedestal sinks, subway tile, and classic fixtures can honor the home's character while improving function.

Budget considerations for small bathrooms

Small does not always mean cheap. Custom cabinetry, high-end fixtures, and complex tile layouts can make a small bathroom as expensive as a larger one. The savings from less square footage are often offset by the precision required in tight spaces.

How to plan

Use the Renovessa planner to enter your exact bathroom dimensions and select the small bathroom layout options. The planner accounts for space constraints in its cost model and produces a brief tailored to compact bathrooms.`,
    author: "Renovessa editorial team",
    reviewer: "Renovessa operations",
    applicableLocation: "dmv",
    applicableTrade: "bathroom",
    status: "draft",
  },

  // === CLUSTER: AGING IN PLACE ===
  {
    slug: "dmv/accessible-bathroom-aging-in-place",
    title: "Accessible Bathrooms and Aging-in-Place Remodeling in the DMV",
    bodyText: `Accessible and aging-in-place bathrooms in Washington, DC, Maryland, and Northern Virginia

Accessibility upgrades improve safety, independence, and quality of life. With the DMV's aging homeowner population — particularly in Montgomery County, Fairfax County, and established DC neighborhoods — aging-in-place bathroom remodels are an increasingly important category.

Common accessibility features

Curbless shower with bench: Eliminates the step-over and allows wheelchair or walker access. Requires floor recessing and a linear drain. In concrete-slab buildings common in Arlington and Bethesda, this requires careful structural assessment.

Grab-bar blocking: Install wood blocking behind walls during framing so grab bars can be securely anchored later. Blocking at 33–36 inches height is standard for horizontal bars.

Non-slip flooring: Reduces fall risk, especially in wet areas. Porcelain tile with a COF (coefficient of friction) rating of 0.42 or higher is recommended.

Wider doorways and lever handles: Easier access for walkers or wheelchairs. A 32-inch clear opening is the minimum for wheelchair access; 36 inches is preferable.

Comfort-height toilet: Taller seat height (17–19 inches) reduces strain on knees and back.

Improved lighting and lower storage: Better visibility reduces fall risk. Storage at accessible heights eliminates the need to reach or bend.

Handheld showerhead: Allows seated showering and easier cleaning.

Tempurature-limiting valves: Prevents scalding by capping maximum water temperature.

Important note on ADA compliance

Do not label a residential bathroom design as "ADA compliant" unless it has been professionally reviewed against ADA standards. The planner flags accessibility features and includes them in the contractor brief, but compliance verification requires a qualified design professional or occupational therapist assessment.

DMV-specific considerations

Montgomery County: Has active aging-in-place initiatives. Some programs offer property tax credits for accessibility improvements.

Fairfax County: The Fairfax Area Agency on Aging provides resources for home modifications. Check for county-specific programs before planning.

DC: Rowhouse bathrooms are often narrow, making wheelchair turning radius (60-inch diameter) difficult to achieve without expanding the footprint.

Condos: HOA architectural review may be required. Some HOAs have restrictions on visible modifications.

Permit considerations

Accessibility remodels often involve plumbing and electrical changes, which may require permits. Your contractor confirms with your local jurisdiction. Some accessibility modifications may qualify for expedited permitting.

How to plan

Use the Renovessa planner, select accessibility upgrade as the objective, and check the accessibility features that apply. The planner includes them in the contractor-ready brief and adjusts the planning range for accessibility-specific costs.`,
    author: "Renovessa editorial team",
    reviewer: "Renovessa operations",
    applicableLocation: "dmv",
    applicableTrade: "bathroom",
    status: "draft",
  },

  // === CLUSTER: COMPARING BIDS ===
  {
    slug: "dmv/compare-bathroom-contractor-bids",
    title: "How to Compare Bathroom Remodeling Bids in the DMV",
    bodyText: `Comparing bathroom remodeling bids in Washington, DC, Maryland, and Northern Virginia

Bathroom remodel bids can vary dramatically — not just in total price, but in what is actually included. This guide helps you compare bids fairly and avoid costly scope gaps.

What should be in every bid

Scope description: Exactly what work will be performed — demolition, framing, plumbing, electrical, waterproofing, tile, fixtures, paint, and cleanup.

Fixture and material specifications: Brand, model, size, and finish for every fixture. "Vanity" is not enough — specify the manufacturer, dimensions, and finish.

Tile specification: Type, size, brand, pattern, and grout. Include floor, wall, and accent tile separately.

Plumbing work: What is being relocated versus replaced in place. New drain lines, supply lines, and venting should be described.

Electrical work: Circuits being added or modified, outlet and switch locations, lighting plan, and exhaust fan specification.

Waterproofing: Method and materials for shower waterproofing. This should never be vague.

Permits: Who is responsible for pulling permits and scheduling inspections.

Warranty: Workmanship warranty length and what it covers.

Payment schedule: Milestones tied to progress, not just dates. Never pay 100% upfront.

Common scope omissions that create surprises

- Debris disposal and dumpster rental
- Protection of adjacent rooms and hallways
- Temporary bathroom facilities during construction
- Plumbing discovery contingency (what happens when they open the walls)
- Permit fees
- Final cleaning
- Paint touch-ups after fixture installation

DMV-specific bid considerations

Jurisdiction-specific permits: Confirm the contractor is pricing permits for your specific jurisdiction, not a generic estimate. DC, Montgomery County, and Fairfax County have different fee structures.

Historic district compliance: If applicable, confirm the contractor has experience with your district's requirements.

Condo/HOA coordination: Who coordinates with building management for elevator access, parking, and work hours?

Insurance requirements: Some condo buildings require certificates of insurance with specific coverage amounts. Confirm your contractor can provide these.

The Renovessa approach

When you use the Renovessa planner, your scope is structured and specific. Share the same brief with each contractor to get apples-to-apples bids. Renovessa can help organize and compare the responses.

Important disclaimer

This guide is for educational purposes. Renovessa does not endorse any specific contractor. Always verify licenses, insurance, and references before signing a contract.`,
    author: "Renovessa editorial team",
    reviewer: "Renovessa operations",
    applicableLocation: "dmv",
    applicableTrade: "bathroom",
    status: "draft",
  },
];
