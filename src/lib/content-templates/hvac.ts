import { ContentTemplate } from "./types";

/**
 * HVAC authority content templates — DMV-wide + Fairfax County depth.
 * HVAC is the recommended first wedge per the 2026-07-23 SEO strategy.
 * Fairfax County / Northern Virginia receives the deepest geographic coverage.
 */

export const HVAC_CONTENT_TEMPLATES: ContentTemplate[] = [
  // === PILLAR: HVAC REPLACEMENT COST — DMV WIDE ===
  {
    slug: "dmv/hvac-replacement-cost",
    title: "HVAC Replacement Costs in the DMV — Local Planning Guide",
    bodyText: `HVAC replacement costs in Washington, DC, Maryland, and Northern Virginia

Replacing a furnace, air conditioner, or heat pump is a significant investment. Costs vary by equipment type, size, efficiency, home characteristics, and jurisdiction. This guide explains what drives HVAC replacement costs in the DMV.

Main cost drivers

Equipment type:
- Central AC only: Outdoor condenser unit and indoor evaporator coil
- Furnace only: Gas or propane heating unit
- Heat pump: Single system for both heating and cooling
- Dual-fuel system: Heat pump with gas furnace backup
- Ductless mini-split: Individual room units without ductwork

System size (tonnage): Measured in tons (12,000 BTU per ton). A typical DMV home needs 2–5 tons depending on square footage, insulation, and window quality. Oversizing is common and harmful — a proper Manual J load calculation is essential.

Efficiency rating:
- AC: SEER2 rating (Seasonal Energy Efficiency Ratio). Minimum federal standard is 14.3 SEER2. Higher ratings cost more but reduce operating costs.
- Heat pumps: SEER2 for cooling, HSPF2 for heating. Higher ratings cost more upfront.
- Furnaces: AFUE rating (Annual Fuel Utilization Efficiency). Minimum 80%; high-efficiency units are 90–98.5%.

Ductwork condition: If existing ducts are leaky, undersized, or deteriorated, ductwork modifications or replacement adds cost. Duct sealing alone can improve efficiency significantly.

Electrical work: Panel upgrades, new circuits, or wiring modifications may be needed, especially when switching from AC-only to a heat pump or upgrading to a higher-efficiency unit.

Refrigerant line set: The copper lines connecting indoor and outdoor units. Older homes may have undersized line sets that need replacement when upgrading equipment.

Pad, stand, and platform: Outdoor units need a level, stable surface. Existing pads may need replacement or leveling.

Permits and inspections: Required in most DMV jurisdictions. Fees vary by locality.

Disposal: Removal and disposal of old equipment, refrigerant recovery (legally required), and recycling.

Equipment cost ranges by type

These are planning ranges based on typical DMV projects. Your actual cost depends on specific equipment, home characteristics, and contractor pricing.

Central AC replacement (3-ton, mid-efficiency): Includes outdoor condenser and indoor evaporator coil.

Furnace replacement (80,000 BTU, mid-efficiency): Includes gas furnace only. Does not include AC.

Heat pump replacement (3-ton, mid-efficiency): Includes outdoor unit and indoor air handler. Provides both heating and cooling.

Ductless mini-split (single zone): One outdoor unit and one indoor head. Additional zones increase cost proportionally.

Dual-fuel system: Heat pump plus gas furnace backup. Higher upfront cost but optimized for DMV climate.

Factors that increase cost

- High-efficiency equipment (18+ SEER2, variable-speed compressors)
- Ductwork replacement or significant modification
- Electrical panel upgrade
- Refrigerant line set replacement
- Difficult access (attic, crawl space, tight mechanical room)
- Extended warranties
- Smart thermostat or zoning controls
- Air quality add-ons (UV lights, humidifiers, media filters)

Factors that decrease cost

- Simple like-for-like replacement
- Good existing ductwork
- Easy equipment access
- Standard efficiency equipment
- Off-season installation (fall or spring)

The heat pump transition

Heat pumps are increasingly the recommended choice for DMV homes due to:
- 30% federal tax credit through 2032
- Improved cold-climate performance (modern heat pumps work efficiently below 0°F)
- Single system for heating and cooling
- Lower carbon footprint than gas heating

However, heat pumps may have higher upfront costs than AC-only or furnace-only replacement. In homes with existing gas furnaces, a dual-fuel system provides backup heat during extreme cold.

Refrigerant transition (2025 and beyond)

The HVAC industry is phasing down R-410A refrigerant due to environmental regulations. New equipment uses R-32 or R-454B. This transition affects repair costs:
- R-410A equipment will be manufactured through approximately 2024–2025
- R-410A refrigerant will remain available for repairs for years
- New systems using next-generation refrigerants are entering the market
- If your AC uses R-22 (already phased out), replacement is usually more economical than repair

Permit requirements by jurisdiction

Washington, DC: HVAC permits through DC Department of Buildings. Mechanical permit required for equipment replacement. Electrical permit may be required for wiring modifications.

Montgomery County, MD: Mechanical permit required through Department of Permitting Services. Gas work requires additional permits.

Fairfax County, VA: Mechanical permit through Land Development Services. Gas piping permits may be separate.

Arlington County, VA: Mechanical and electrical permits through CPHD.

Alexandria, VA: Mechanical permits through Department of Code Administration.

How to get a project-specific range

The Renovessa HVAC estimator captures your home size, current system, equipment preferences, and property details to produce a localized planning range. The estimate is deterministic — it uses a versioned configuration, not AI-generated pricing.

Important disclaimers

Planning ranges are illustrative and depend on final equipment selection, site conditions, and contractor bids. They are not binding quotes. Renovessa does not perform HVAC work; we coordinate quotes from independent contractors. Verify licenses, insurance, and references before hiring.

Methodology

The estimator uses equipment-type baselines by tonnage and efficiency tier, adjusted for ductwork condition, electrical requirements, refrigerant line needs, access difficulty, and DMV sub-market labor rates. Permits, disposal, and warranty upgrades are added as line items.`,
    author: "Renovessa editorial team",
    reviewer: "Renovessa operations",
    methodology: "Equipment-type baselines by tonnage and efficiency, adjusted for ductwork, electrical, refrigerant lines, access, and DMV labor rates. Permits and disposal added as line items.",
    applicableLocation: "dmv",
    applicableTrade: "hvac",
    status: "draft",
  },

  // === PILLAR: AC REPLACEMENT COST — FAIRFAX ===
  {
    slug: "fairfax-va/ac-replacement-cost",
    title: "AC Replacement Cost in Fairfax County, VA — Local Planning Guide",
    bodyText: `AC replacement costs in Fairfax County, Virginia

Fairfax County homeowners face hot, humid summers that make reliable air conditioning essential. This guide covers AC replacement costs specific to Fairfax County, including equipment options, permit requirements, and what affects pricing.

Fairfax County climate considerations

Summer design temperature: Approximately 92°F with high humidity. AC systems must handle both sensible cooling (temperature) and latent cooling (humidity removal).

Humidity control: Fairfax County's humid climate makes proper AC sizing critical. An oversized system cools quickly but does not run long enough to remove humidity, leaving the home clammy. A Manual J load calculation is essential.

Seasonal temperature swings: Systems that only cool (not heat) may be used 5–6 months per year. Heat pumps provide both heating and cooling, extending useful months.

AC replacement cost factors

Tonnage: Fairfax County homes range from townhouses needing 2 tons to large single-family homes needing 4–5 tons. Proper sizing through load calculation prevents oversizing.

Efficiency (SEER2): Minimum federal standard is 14.3 SEER2. Options include:
- Standard (14.3–15 SEER2): Lower upfront cost, higher operating cost
- Mid-efficiency (16–17 SEER2): Balanced upfront and operating costs
- High-efficiency (18+ SEER2, variable-speed): Higher upfront cost, lowest operating cost, best humidity control

Humidity control features: Variable-speed compressors and communicating thermostats improve humidity removal — valuable in Fairfax County's climate.

Ductwork: Many Fairfax County homes built in the 1970s–1990s have ductwork in unconditioned attics. Leaky or undersized ducts reduce efficiency and comfort. Duct sealing or replacement may be needed.

Electrical: Older homes may need electrical upgrades for high-efficiency equipment.

Equipment location: Outdoor unit placement affects installation complexity. HOA restrictions in planned communities may limit placement options.

Fairfax County permit requirements

Fairfax County Land Development Services requires a mechanical permit for AC replacement. Key requirements:
- Permit application with equipment specifications
- Load calculation (Manual J) may be required
- Inspection after installation
- Permit fees vary by project scope

Your contractor should handle permitting. Verify they are familiar with Fairfax County's specific requirements.

Fairfax County contractor requirements

Virginia requires a Class A, B, or C contractor license for HVAC work. Verify:
- Active Virginia DPOR license
- HVAC specialization or endorsement
- Liability insurance and workers' compensation
- Fairfax County business license if applicable

When to consider a heat pump instead of AC

If your furnace is also aging (15+ years), consider replacing both with a heat pump:
- Single system for heating and cooling
- 30% federal tax credit
- Improved efficiency over gas furnaces in moderate cold
- Dominion Energy and NOVEC may offer rebates

Heat pumps have improved dramatically and work efficiently in Fairfax County's winter temperatures. Dual-fuel systems with gas backup provide peace of mind during extreme cold snaps.

Timing considerations

Spring (March–May): Best availability, potential pre-season discounts, comfortable temperatures if installation takes multiple days.

Fall (September–November): Good availability, post-season clearances on current-year models.

Summer (June–August): Peak demand, longer wait times, emergency pricing may apply.

Winter (December–February): Lowest demand for AC, but cold weather installation has challenges.

Important disclaimers

Cost ranges are planning estimates based on typical Fairfax County projects. Your actual cost depends on equipment selection, home characteristics, and contractor pricing. This guide is informational. Renovessa does not perform HVAC work; we coordinate quotes from independent contractors.

How Renovessa helps

The Renovessa HVAC estimator is preconfigured for Fairfax County's climate and typical housing stock. Enter your home details to receive a localized planning range, then request quotes from reviewed local HVAC contractors.`,
    author: "Renovessa editorial team",
    reviewer: "Renovessa operations",
    methodology: "AC equipment baselines by tonnage and SEER2 rating, adjusted for Fairfax County climate factors, ductwork condition, electrical requirements, and local labor rates.",
    applicableLocation: "fairfax-va",
    applicableTrade: "hvac",
    status: "draft",
  },

  // === PILLAR: HEAT PUMP REPLACEMENT — NOVA ===
  {
    slug: "northern-virginia/heat-pump-replacement-cost",
    title: "Heat Pump Replacement Costs in Northern Virginia — Planning Guide",
    bodyText: `Heat pump replacement costs in Northern Virginia

Heat pumps are becoming the default choice for heating and cooling in Northern Virginia due to improving technology, federal incentives, and the region's moderate climate. This guide covers heat pump replacement costs, equipment options, and considerations specific to Northern Virginia.

Why heat pumps make sense in Northern Virginia

Climate suitability: Northern Virginia's winter temperatures rarely drop below 10°F for extended periods. Modern cold-climate heat pumps maintain efficiency well below freezing.

Federal tax credit: The 30% Investment Tax Credit applies to heat pump installation through 2032. For a typical system, this can reduce net cost by thousands.

Single system simplicity: One outdoor unit and one indoor air handler replace both a furnace and AC. Fewer components to maintain.

Utility rebates: Dominion Energy and NOVEC periodically offer rebates for high-efficiency heat pump installations. Check current programs before purchasing.

Heat pump types

Air-source heat pump (ducted): The most common type. Replaces a central AC and furnace. Uses existing ductwork. Best for homes with good duct systems.

Air-source heat pump (ductless/mini-split): Individual room units without ductwork. Ideal for homes without ducts, additions, or rooms that are hard to condition. Multiple indoor heads connect to one outdoor unit.

Cold-climate heat pump: Specifically designed for temperatures below 0°F. Higher efficiency at low temperatures than standard heat pumps. Recommended for Northern Virginia.

Dual-fuel heat pump: Heat pump with a gas furnace backup. The heat pump handles heating down to a set temperature (typically 30–40°F), then the gas furnace takes over. Best for homeowners who want backup heat during extreme cold.

Efficiency ratings to understand

SEER2 (cooling efficiency): Minimum 14.3. 16–18 is standard for good units. 20+ is premium with variable-speed compressors.

HSPF2 (heating efficiency): Minimum 7.5. 8.5–9.0 is good. 10+ is premium cold-climate performance.

COP (Coefficient of Performance): Ratio of heat output to electrical input. A COP of 3 means 3 units of heat for every 1 unit of electricity. Cold-climate heat pumps maintain COP above 2 at 5°F.

Cost factors specific to heat pumps

Higher upfront cost than AC-only: Heat pumps cost more than AC-only replacement because they include heating capability and more complex refrigerant circuits.

Lower than furnace + AC combined: If replacing both a furnace and AC, a heat pump is typically less expensive than separate furnace and AC replacements.

Electrical considerations: Heat pumps run on electricity. If your home has an older electrical panel, an upgrade may be needed. Homes previously heated with gas may need electrical capacity assessment.

Ductwork requirements: Heat pumps move more air than furnaces for the same heating output. Undersized ductwork reduces efficiency and comfort. Duct assessment is essential.

Defrost cycles: In cold, humid conditions, outdoor coils frost over. The system periodically defrosts by briefly reversing refrigerant flow. Proper defrost control is important for Northern Virginia's variable winter weather.

Auxiliary heat: Most ducted heat pumps include electric resistance auxiliary heat for extreme cold. This is expensive to run — proper heat pump sizing minimizes auxiliary heat use.

Northern Virginia-specific considerations

Power outages: Unlike gas furnaces, heat pumps require electricity. Consider a generator or battery backup if outages are common in your area.

NOVEC vs. Dominion territories: Different utilities have different rate structures and rebate programs. Check your specific provider.

Townhouse and condo considerations: Many Northern Virginia townhouses have limited outdoor space for heat pump units. Placement must comply with HOA rules and setback requirements.

New construction requirements: Some Northern Virginia jurisdictions are moving toward electrification requirements for new construction, making heat pumps the default choice.

Important disclaimers

Cost ranges are planning estimates. Your actual cost depends on equipment type, size, efficiency, home characteristics, and contractor pricing. Federal tax credit eligibility depends on your tax situation — consult a tax professional. Renovessa does not perform HVAC work; we coordinate quotes from independent contractors.

How Renovessa helps

The Renovessa HVAC estimator includes heat pump-specific options preconfigured for Northern Virginia's climate. Compare standard, cold-climate, and dual-fuel options to find the best fit for your home and budget.`,
    author: "Renovessa editorial team",
    reviewer: "Renovessa operations",
    methodology: "Heat pump baselines by tonnage, SEER2/HSPF2 ratings, and type (ducted/ductless/dual-fuel), adjusted for Northern Virginia climate, electrical requirements, ductwork condition, and local labor rates.",
    applicableLocation: "northern-virginia",
    applicableTrade: "hvac",
    status: "draft",
  },

  // === PILLAR: HVAC REPAIR VS REPLACE ===
  {
    slug: "dmv/hvac-repair-vs-replace",
    title: "HVAC Repair vs. Replacement in the DMV — A Homeowner's Decision Guide",
    bodyText: `HVAC repair vs. replacement in Washington, DC, Maryland, and Northern Virginia

When your furnace or AC breaks down, the first question is usually: "Should I repair it or replace it?" This guide provides a decision framework for DMV homeowners facing this choice.

The age rule of thumb

Furnaces: Expected lifespan 15–20 years. If your furnace is over 15 years old and needs a major repair (over $500), replacement is often the better investment.

Air conditioners: Expected lifespan 12–15 years. If your AC is over 12 years old and needs a major repair, consider replacement — especially if R-22 refrigerant is involved.

Heat pumps: Expected lifespan 12–15 years. Heat pumps work year-round, so they accumulate more runtime hours than AC-only or furnace-only systems.

The $5,000 rule

Multiply the equipment age by the repair cost. If the result exceeds $5,000, replacement is usually recommended.

Example: 10-year-old AC with $600 repair = $6,000 → Consider replacement
Example: 5-year-old furnace with $400 repair = $2,000 → Repair is reasonable

This is a rule of thumb, not an absolute rule. Consider other factors below.

When repair is typically the right choice

- The system is under 10 years old
- The repair is minor (capacitor, contactor, fan motor, thermostat)
- The system has been reliable with minimal previous repairs
- You plan to sell the home within 2–3 years
- Budget constraints make replacement impractical

When replacement is typically the right choice

- The system is over 15 years old
- Repairs are becoming frequent (2+ in the past 2 years)
- The repair involves the compressor (AC/heat pump) or heat exchanger (furnace) — these are the most expensive components
- Energy bills are rising despite normal usage
- The system uses R-22 refrigerant (phased out, expensive to recharge)
- You want to improve efficiency and reduce operating costs
- You're interested in switching from AC/furnace to a heat pump

Refrigerant considerations

R-22 (Freon): Phased out as of January 1, 2020. No new production or import. Reclaimed R-22 is available but expensive ($100+ per pound). If your AC or heat pump uses R-22 and needs refrigerant work, replacement is usually more economical.

R-410A: Currently the standard refrigerant. Being phased down but still widely available. Equipment using R-410A will be manufactured through approximately 2024–2025. R-410A equipment can still be repaired for years.

R-32 / R-454B: Next-generation refrigerants entering the market. Lower global warming potential. New equipment will use these refrigerants going forward.

Efficiency upgrade value

Replacing an older system with a high-efficiency model can reduce energy costs by 20–40%. In the DMV, where systems run heavily in both summer and winter, these savings add up. Factor operating cost savings into your replacement decision.

DMV climate considerations

Summer humidity: An older AC that can't keep up with humidity may need replacement even if it still cools. Proper humidity control requires correctly sized, properly functioning equipment.

Winter cold snaps: A furnace or heat pump that struggles during the coldest weeks is a comfort and safety issue. Northern Virginia and Maryland suburbs see temperatures in the teens regularly.

Shoulder season performance: Heat pumps shine in spring and fall when heating needs are moderate but still necessary. If your current system only has heating or only has cooling, a heat pump replacement provides year-round comfort.

Emergency replacement considerations

If your system fails during extreme weather:
- Get multiple quotes if time permits
- Be wary of contractors who pressure you to decide immediately
- Temporary solutions (portable AC, space heaters) may buy time for careful decision-making
- Emergency installation often costs more — factor this into timing decisions

The Renovessa approach

The Renovessa HVAC estimator asks about system age, repair history, and current issues to help you understand whether repair or replacement is more appropriate. If replacement makes sense, we help you compare equipment options and request quotes.

Important disclaimers

This guide provides general decision frameworks. Only a qualified HVAC professional can assess your specific system condition. Get multiple opinions if recommendations differ. Renovessa does not perform HVAC work; we coordinate assessments and quotes from independent contractors.`,
    author: "Renovessa editorial team",
    reviewer: "Renovessa operations",
    applicableLocation: "dmv",
    applicableTrade: "hvac",
    status: "draft",
  },

  // === PILLAR: FAIRFAX COUNTY HVAC PERMIT GUIDE ===
  {
    slug: "fairfax-va/hvac-permits",
    title: "HVAC Permits in Fairfax County, VA — Homeowner's Guide",
    bodyText: `HVAC permits in Fairfax County, Virginia

Fairfax County requires permits for most HVAC work. Understanding the permit process helps you ensure your project is compliant and your contractor is handling requirements correctly.

When permits are required

Mechanical permit: Required for:
- Installing new HVAC equipment (furnace, AC, heat pump)
- Replacing existing HVAC equipment
- Modifying ductwork
- Adding or modifying ventilation systems

Electrical permit: May be required separately for:
- New electrical circuits for HVAC equipment
- Panel upgrades
- Wiring modifications

Gas piping permit: Required for:
- New gas lines
- Modifying existing gas piping
- Installing gas appliances

When permits may not be required

Minor repairs that do not modify equipment, ductwork, or electrical: Capacitor replacement, contactor replacement, thermostat replacement (like-for-like), filter changes, and routine maintenance typically do not require permits.

However, if you are unsure, contact Fairfax County Land Development Services for confirmation.

The Fairfax County permitting process

1. Application submission: Your contractor submits the permit application with equipment specifications, load calculations, and scope of work.

2. Plan review: Fairfax County reviews the application for code compliance. Simple replacements may be approved quickly. Complex projects or those in certain zoning districts may require detailed review.

3. Permit issuance: Once approved, the permit is issued and must be posted at the job site.

4. Inspections: Fairfax County requires inspections at various stages:
   - Rough-in inspection (before closing up walls)
   - Final inspection (after equipment is installed and operational)
   - Gas inspection (if gas work is involved)

5. Approval: Once all inspections pass, the permit is approved and closed.

Timeline

- Simple equipment replacement: 1–3 business days for permit approval
- Complex projects: 1–2 weeks for plan review
- Inspections: Usually scheduled within a few days of request

Permit fees

Fees vary based on project value and scope. Typical HVAC replacement permits range from $100–$400. Your contractor should include permit fees in their quote.

Who should pull the permit

In Fairfax County, the licensed contractor performing the work should pull the permit. This ensures:
- The permit is tied to the responsible party
- The contractor is accountable for code compliance
- Inspections are coordinated by the party familiar with the work

While Fairfax County allows homeowners to pull permits for work on their own primary residence, doing so makes the homeowner responsible for code compliance and inspection coordination. For HVAC work, this is generally not recommended.

Fairfax County code requirements

Load calculation (Manual J): Fairfax County may require a Manual J load calculation for new installations and some replacements. This ensures proper equipment sizing.

Ductwork: Ducts in unconditioned spaces must be insulated. Leakage testing may be required.

Energy code: Equipment must meet current energy code requirements. As of 2024, this includes minimum SEER2 and HSPF2 ratings.

Combustion safety: Gas furnaces and water heaters require proper venting and combustion air. Carbon monoxide detectors are required near sleeping areas.

Refrigerant handling: Refrigerant recovery during equipment removal is federally required and enforced by Fairfax County.

Verifying your contractor's permit status

You can verify permit status through Fairfax County's online permit system:
- Search by address to see active permits
- Search by permit number if your contractor provides one
- Contact Land Development Services with questions

Important: A contractor who suggests skipping permits to save money or time is a red flag. Unpermitted work can:
- Void homeowner's insurance
- Create liability issues
- Complicate home sales
- Result in fines and required removal

Fairfax County contractor licensing

Virginia requires HVAC contractors to hold a valid Class A, B, or C contractor license from the Virginia Department of Professional and Occupational Regulation (DPOR). Verify:
- Active license status on the DPOR website
- HVAC trade classification
- Liability insurance
- Workers' compensation insurance

Important disclaimers

Permit rules can change. Confirm current requirements with Fairfax County Land Development Services before starting work. This guide is informational and not legal advice. Your contractor should confirm exact permit requirements for your specific scope.

How Renovessa helps

Renovessa works with contractors who understand Fairfax County's permitting requirements. When you request HVAC quotes through Renovessa, we confirm that contractors are licensed and familiar with local permit processes.`,
    author: "Renovessa editorial team",
    reviewer: "Renovessa operations",
    methodology: "Jurisdiction-specific permit guidance based on published Fairfax County Land Development Services requirements. Reviewed against official sources.",
    applicableLocation: "fairfax-va",
    applicableTrade: "hvac",
    status: "draft",
  },

  // === CLUSTER: COMPARE HVAC QUOTES ===
  {
    slug: "dmv/compare-hvac-quotes",
    title: "How to Compare HVAC Quotes in the DMV — A Homeowner's Checklist",
    bodyText: `Comparing HVAC contractor quotes in Washington, DC, Maryland, and Northern Virginia

HVAC quotes can vary by thousands of dollars for the same home. Understanding what should be included and how to identify red flags helps you choose a contractor who will install the right system correctly.

What every HVAC quote should include

Equipment specifications:
- Manufacturer and model number for all components
- Tonnage (size) and efficiency ratings (SEER2, HSPF2, AFUE)
- Type of refrigerant
- Warranty terms (equipment and labor)

Scope of work:
- Equipment removal and disposal (including refrigerant recovery)
- New equipment installation
- Electrical work required
- Ductwork modifications (if any)
- Refrigerant line set work
- Pad/stand/platform for outdoor unit
- Thermostat (type and features)

Permits and inspections:
- Who pulls permits
- Which jurisdictions
- Inspection scheduling

Warranty details:
- Manufacturer's equipment warranty (typically 10 years for parts)
- Contractor's labor warranty (typically 1–10 years)
- Extended warranty options (if offered)
- What voids warranties

Payment terms:
- Deposit amount (typically 10–20%)
- Progress payments
- Final payment timing (after final inspection, not just completion)

Timeline:
- Start date estimate
- Estimated duration
- Weather contingencies

What to verify beyond the quote

License verification:
- Virginia: DPOR license (Class A, B, or C)
- Maryland: MHIC license
- DC: Basic Business License

Insurance:
- General liability (minimum $500,000–$1,000,000)
- Workers' compensation (required if contractor has employees)
- Request certificate of insurance from the insurance company, not the contractor

References:
- Recent local installations
- Similar equipment types
- Willingness to provide references without pressure

Common quote discrepancies

Different equipment efficiency: One quote may use 14.3 SEER2 equipment while another uses 17 SEER2. The lower-efficiency quote will be cheaper but cost more to operate.

Missing load calculation: A contractor who sizes by "rule of thumb" (square footage alone) rather than Manual J calculation may oversize or undersize the system. Proper sizing is critical for comfort and efficiency.

Ductwork assumptions: Some quotes assume no ductwork work is needed; others include duct sealing or modification. Ask each contractor to assess your ductwork and specify what work is included.

Thermostat differences: Basic programmable vs. smart/communicating thermostats can differ by $200–$500.

Refrigerant line set: Older homes may need line set replacement. Some quotes include this; others treat it as an unknown add-on.

Permit fees: Some contractors include permits; others add them later. Clarify upfront.

Red flags

- Pressure to sign immediately
- Quote significantly lower than others (may indicate uninsured labor, used equipment, or missing scope)
- No written contract
- No proof of license or insurance
- Cash-only pricing
- No local references
- Equipment described vaguely ("3-ton AC" without model number)
- No mention of permits
- Requires large upfront payment

The load calculation requirement

Every HVAC replacement should include a Manual J load calculation. This determines the correct equipment size based on:
- Home square footage and layout
- Insulation levels
- Window type and quantity
- Air leakage
- Orientation and shading
- Local climate data

Oversized equipment:
- Costs more upfront
- Cycles on and off frequently (reducing lifespan)
- Does not remove humidity effectively (critical in the DMV)
- Wastes energy

Undersized equipment:
- Cannot maintain comfort during extreme weather
- Runs continuously
- May wear out prematurely

If a contractor does not perform or reference a load calculation, ask why. "I've been doing this 20 years" is not an acceptable substitute.

How Renovessa helps

When you request HVAC quotes through Renovessa, we organize proposals in a standardized format that makes equipment, scope, and pricing comparisons straightforward. We also verify contractor licensing and insurance before bid routing.`,
    author: "Renovessa editorial team",
    reviewer: "Renovessa operations",
    applicableLocation: "dmv",
    applicableTrade: "hvac",
    status: "draft",
  },

  // === CLUSTER: AC BLOWING WARM AIR ===
  {
    slug: "northern-virginia/ac-blowing-warm-air",
    title: "AC Blowing Warm Air in Northern Virginia — Causes and Next Steps",
    bodyText: `AC blowing warm air in Northern Virginia

When your AC blows warm air during a humid Northern Virginia summer, it's urgent. This guide covers safe homeowner checks, likely causes, repair cost considerations, and when to call a professional.

Safety first

If you smell burning, see sparks, or hear unusual noises (grinding, screeching), turn off the system at the thermostat and the breaker. Call a qualified HVAC technician. Do not attempt repairs on electrical or refrigerant components — these require licensed professionals.

Checks you can safely perform

Thermostat settings:
- Confirm the system is set to "Cool" not "Heat"
- Verify the temperature setting is below room temperature
- Check that the fan is set to "Auto" not "On" ("On" circulates air continuously, which may feel warm between cooling cycles)

Circuit breaker:
- Check the electrical panel for tripped breakers
- The outdoor condenser and indoor air handler may be on separate breakers
- If a breaker trips repeatedly, do not keep resetting it — call a technician

Air filter:
- A severely clogged filter restricts airflow, causing the evaporator coil to freeze
- If the coil is frozen, turn off the AC and let it thaw (may take several hours)
- Replace the filter and try again

Outdoor unit:
- Check that the outdoor condenser is running (fan spinning, normal humming sound)
- Clear debris, leaves, and vegetation within 2 feet of the unit
- Ensure the unit is not covered or blocked

Return and supply vents:
- Ensure supply vents are open and unobstructed
- Check that return air grilles are not blocked by furniture or rugs

Likely causes (requiring professional diagnosis)

Refrigerant leak: Low refrigerant prevents proper cooling. Signs include:
- Ice on the refrigerant lines or evaporator coil
- Hissing sound near the indoor or outdoor unit
- System runs constantly but cannot cool the home

Refrigerant leaks require EPA-certified technicians to repair and recharge. If your system uses R-22, the cost of refrigerant may make replacement more economical than repair.

Compressor failure: The compressor is the heart of the AC system. Compressor replacement is expensive ($1,500–$3,000+). If the compressor fails and the system is over 10 years old, replacement is often recommended.

Capacitor or contactor failure: These electrical components start and run the compressor and fan. They are relatively inexpensive to replace ($150–$400) but require a technician.

Frozen evaporator coil: Caused by low refrigerant, restricted airflow, or dirty coils. Requires diagnosis of the root cause.

Ductwork issues: Disconnected or leaking ducts can pull in hot attic air. Ductwork in unconditioned attics is common in Northern Virginia homes.

Thermostat malfunction: A faulty thermostat may not signal the cooling cycle correctly.

Repair cost considerations

Minor repairs ($150–$500):
- Capacitor replacement
- Contactor replacement
- Thermostat replacement
- Condensate drain clearing
- Minor refrigerant recharge (if no major leak)

Moderate repairs ($500–$1,500):
- Fan motor replacement
- Refrigerant leak repair and recharge
- Evaporator coil cleaning or minor repair
- Ductwork sealing

Major repairs ($1,500–$3,500+):
- Compressor replacement
- Evaporator coil replacement
- Major ductwork modification
- Control board replacement

When replacement makes more sense

- The system is over 12 years old
- The repair involves the compressor or major refrigerant work
- The system uses R-22 refrigerant
- Previous repairs have been frequent
- Energy bills are rising

Northern Virginia-specific considerations

Humidity: Even if the AC is cooling somewhat, high humidity makes the home feel uncomfortable. A properly functioning AC should maintain indoor humidity below 60%.

Power outages: After an outage, some systems need to be reset. Check the thermostat and breakers.

Extreme heat: On days over 95°F, even properly sized systems may struggle to maintain the thermostat setpoint. This is normal — the system is running at maximum capacity.

Storm damage: Summer storms can damage outdoor units. Check for visible damage after severe weather.

Preventive maintenance

Annual maintenance prevents many common AC problems:
- Professional tune-up in spring (before peak season)
- Filter changes every 1–3 months
- Keep outdoor unit clear of debris
- Monitor for unusual sounds, smells, or performance changes

How Renovessa helps

If your AC needs repair or replacement, Renovessa can quickly connect you with reviewed Northern Virginia HVAC contractors. For urgent issues, request an emergency assessment. If replacement makes sense, our estimator helps you compare equipment options and request quotes.`,
    author: "Renovessa editorial team",
    reviewer: "Renovessa operations",
    applicableLocation: "northern-virginia",
    applicableTrade: "hvac",
    status: "draft",
  },

  // === CLUSTER: HEAT PUMP NOT HEATING ===
  {
    slug: "dmv/heat-pump-not-heating",
    title: "Heat Pump Not Heating in Cold Weather — DMV Homeowner Troubleshooting",
    bodyText: `Heat pump not heating in cold weather — Washington, DC, Maryland, and Northern Virginia

Heat pumps are increasingly common in DMV homes, but cold-weather performance concerns are the most frequent question homeowners ask. This guide explains why your heat pump may not be heating effectively and what to do.

How heat pumps work in cold weather

Heat pumps extract heat from outdoor air and move it indoors. Even in cold weather, there is heat energy in the air. Modern cold-climate heat pumps can extract usable heat well below 0°F.

However, as outdoor temperature drops, heat pump efficiency and capacity decrease. This is normal and expected. The key question is whether the system is performing within design parameters.

Normal cold-weather behavior

Defrost cycles: In cold, humid conditions, frost builds up on the outdoor coil. The system periodically reverses to defrost mode — briefly blowing cool air indoors while melting frost. This typically lasts 5–15 minutes and occurs every 30–90 minutes depending on conditions.

Auxiliary heat activation: Most ducted heat pumps have electric resistance auxiliary heat (also called supplemental or emergency heat). When the heat pump cannot meet the heating demand alone, auxiliary heat kicks in. You may notice:
- Higher electric bills when auxiliary heat runs frequently
- Warmer air temperature from vents when auxiliary heat is on
- "AUX" or "EM HEAT" indicator on the thermostat

Reduced output at low temperatures: A heat pump's heating output at 17°F is typically 60–70% of its output at 47°F. This is by design and does not indicate a problem if the home maintains temperature.

When to be concerned

The home cannot maintain the thermostat setpoint:
- If the temperature drops steadily despite the system running continuously, there may be an issue.
- Check the thermostat setting and outdoor temperature. If it's below the system's design temperature, auxiliary heat should be supplementing.

The system blows cold air continuously (not just during defrost):
- Brief cool air during defrost is normal
- Continuous cold air indicates a problem

Ice buildup that does not clear:
- Light frost on the outdoor unit is normal
- Heavy ice that persists and grows is not normal
- If ice covers the entire outdoor unit and does not clear during defrost, call a technician

Unusual noises: Grinding, screeching, or loud banging indicates mechanical problems.

Common causes of inadequate heating

Thermostat settings:
- Ensure the system is set to "Heat" not "Cool"
- Check that the temperature setting is reasonable (68–72°F is typical)
- Verify the fan is set to "Auto"
- If the thermostat shows "EM HEAT," the system is running on auxiliary heat only. This is more expensive and indicates the heat pump is not operating.

Dirty air filter: A clogged filter restricts airflow, reducing heating capacity and potentially causing the coil to freeze.

Blocked outdoor unit: Snow, ice, leaves, or debris blocking the outdoor unit reduces airflow and efficiency. Keep the unit clear.

Refrigerant issues: Low refrigerant reduces heating capacity. Signs include:
- Long run times without maintaining temperature
- Ice buildup on refrigerant lines
- Hissing sound

Refrigerant issues require professional repair.

Defrost control failure: If the defrost cycle is not working, ice will build up and block airflow. This requires technician diagnosis.

Reversing valve failure: The reversing valve switches between heating and cooling modes. If stuck, the system may blow cool air in heat mode.

Undersized system: If the heat pump was not properly sized for the home's heating load, it may struggle in cold weather. This is a design/installation issue.

Ductwork problems: Leaky or uninsulated ducts in unconditioned spaces lose heat before it reaches the rooms.

DMV climate-specific considerations

Design temperature: The DMV's winter design temperature is approximately 14–17°F. Properly sized heat pumps are designed to heat the home at this temperature with minimal auxiliary heat use.

Extreme cold events: Occasional temperatures below 10°F (like January 2014 and 2015) may require auxiliary heat. This is normal and does not indicate a system problem.

Humidity: The DMV's humid winters mean more frost accumulation on outdoor coils, increasing defrost frequency. This is normal.

Dual-fuel systems: If you have a dual-fuel system (heat pump with gas furnace backup), the gas furnace should take over below the balance point (typically 30–40°F). If the furnace is not working, the heat pump alone may not maintain comfort.

When to call a professional

Call a qualified HVAC technician if:
- The home temperature drops despite the system running continuously
- Heavy ice persists on the outdoor unit
- The system blows cold air continuously (outside of brief defrost cycles)
- You hear unusual noises
- The thermostat shows error codes
- Energy bills spike unexpectedly

Do not attempt to repair refrigerant or electrical components yourself.

Preventive maintenance

Annual heating tune-up: Have a professional inspect and service the heat pump before each heating season. This includes:
- Refrigerant level check
- Electrical connection inspection
- Defrost control testing
- Air filter replacement
- Outdoor coil cleaning
- Thermostat calibration

Regular homeowner maintenance:
- Change filters every 1–3 months
- Keep outdoor unit clear of snow, ice, and debris
- Monitor performance and note changes

How Renovessa helps

If your heat pump needs repair or you're considering upgrading to a cold-climate heat pump, Renovessa can connect you with reviewed DMV HVAC contractors. Our estimator helps you compare heat pump options designed for our region's winter temperatures.`,
    author: "Renovessa editorial team",
    reviewer: "Renovessa operations",
    applicableLocation: "dmv",
    applicableTrade: "hvac",
    status: "draft",
  },

  // === CLUSTER: HVAC PERMIT COMPARISON ===
  {
    slug: "dmv/hvac-permits-comparison",
    title: "HVAC Permit Requirements — DC vs. Maryland vs. Northern Virginia",
    bodyText: `HVAC permit requirements across Washington, DC, Maryland, and Northern Virginia

Permit requirements for HVAC work vary by jurisdiction. This guide summarizes the key differences for homeowners in Washington, DC, suburban Maryland, and Northern Virginia.

Overview: When HVAC permits are typically required

All three jurisdictions require permits for:
- New HVAC system installation
- HVAC equipment replacement
- Major ductwork modifications
- New gas line installation
- Changes to ventilation systems

Minor repairs (capacitor replacement, thermostat replacement, filter changes, routine maintenance) typically do not require permits in any jurisdiction. When in doubt, check with your local building department.

Washington, DC

Agency: DC Department of Buildings (DOB)

Permit types:
- Mechanical permit: Required for HVAC equipment installation and replacement
- Electrical permit: Required for new circuits, panel upgrades, and wiring modifications
- Plumbing permit: May be required for condensate drain modifications

Process:
- Apply online through the DOB permitting portal
- Provide equipment specifications and scope of work
- Schedule inspections online
- Final inspection required before approval

Notable requirements:
- Load calculations may be required for new systems
- Historic district properties may need additional review
- Homeowner-occupants can pull permits for their own residence

Fees: Based on project value. Typical HVAC replacement: $200–$500.

Timeline: 3–10 business days for approval depending on complexity.

Maryland (Montgomery County example)

Agency: Montgomery County Department of Permitting Services (DPS)

Permit types:
- Mechanical permit: Required for HVAC equipment
- Electrical permit: Required for electrical work
- Gas permit: Required for gas piping work

Process:
- Apply online or in person
- Submit equipment cut sheets and load calculations
- Schedule inspections through the DPS system
- Rough-in and final inspections required

Notable requirements:
- Manual J load calculation typically required
- Energy code compliance documentation
- Gas work must be performed by licensed gas fitters

Fees: Based on project value. Typical HVAC replacement: $150–$400.

Timeline: 3–7 business days for standard replacements.

Northern Virginia (Fairfax County example)

Agency: Fairfax County Land Development Services

Permit types:
- Mechanical permit: Required for HVAC equipment
- Electrical permit: May be required separately
- Gas permit: Required for gas line work

Process:
- Apply online through Fairfax County's permit portal
- Provide equipment specifications
- Schedule rough-in and final inspections
- All inspections must pass before approval

Notable requirements:
- Load calculations may be required
- Energy code compliance
- Refrigerant recovery documentation

Fees: Based on project value. Typical HVAC replacement: $100–$400.

Timeline: 1–3 business days for simple replacements; longer for complex projects.

Key differences summary

| Factor | Washington, DC | Montgomery County, MD | Fairfax County, VA |
|---|---|---|---|
| Primary agency | DC DOB | Montgomery County DPS | Fairfax County LDS |
| Online permitting | Yes | Yes | Yes |
| Load calc required | Often | Typically | Often |
| Historic review | May apply | May apply | May apply |
| Homeowner can pull | Yes | Yes | Yes |
| Gas permit separate | Sometimes | Yes | Yes |
| Typical fees | $200–$500 | $150–$400 | $100–$400 |
| Typical timeline | 3–10 days | 3–7 days | 1–3 days |

Who should pull the permit

Best practice: The licensed contractor performing the work should pull the permit. This ensures:
- Accountability for code compliance
- Proper inspection coordination
- Clear liability chain

While homeowners can pull permits in all three jurisdictions, doing so makes the homeowner responsible for ensuring work meets code. For HVAC work involving refrigerant, gas, and electrical components, this is generally not recommended.

Verifying permit status

You can verify that your contractor pulled the required permit:
- Washington, DC: DOB permit search by address
- Montgomery County: DPS permit search by address
- Fairfax County: LDS permit search by address

If a contractor claims permits are "not needed" or "included in the price" without providing a permit number, ask for clarification. Unpermitted work can create insurance and resale issues.

Important disclaimers

Permit rules change. Confirm current requirements with your local building department before starting work. This guide provides general comparisons; specific requirements vary by municipality within Maryland and Virginia. This guide is informational and not legal advice.

How Renovessa helps

Renovessa works with contractors who understand permitting requirements in their respective jurisdictions. When you request HVAC quotes through Renovessa, we help ensure contractors are licensed and familiar with local permit processes.`,
    author: "Renovessa editorial team",
    reviewer: "Renovessa operations",
    applicableLocation: "dmv",
    applicableTrade: "hvac",
    status: "draft",
  },
];
