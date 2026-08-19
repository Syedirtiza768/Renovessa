import { ContentTemplate } from "./types";

/**
 * Solar authority content templates — DMV-wide.
 * Solar is unique: it's an investment decision, not a repair/replace decision.
 * Content must address financial analysis alongside technical scope.
 */

export const SOLAR_CONTENT_TEMPLATES: ContentTemplate[] = [
  // === PILLAR: SOLAR COST & PAYBACK ===
  {
    slug: "dmv/solar-cost-payback",
    title: "Solar Panel Costs and Payback in the DMV — Homeowner's Planning Guide",
    bodyText: `Solar panel costs and payback for Washington, DC, Maryland, and Northern Virginia homeowners

Solar is a significant home improvement investment. Understanding costs, incentives, and payback dynamics helps you decide whether solar makes sense for your property and how to compare installer quotes.

What drives solar costs

System size: Measured in kilowatts (kW). A typical DMV home needs 6–12 kW depending on electricity usage, roof space, and shading.

Panel efficiency and type: Monocrystalline panels are more efficient and more expensive than polycrystalline. Premium brands (SunPower, LG, Panasonic) cost more but may offer better warranties and degradation rates.

Inverter type: String inverters are less expensive but affect the entire system if one panel underperforms. Microinverters and power optimizers cost more but optimize each panel individually — valuable for partially shaded roofs common in DC's tree-covered neighborhoods.

Roof complexity: Steep pitches, multiple facets, dormers, and obstructions (skylights, vents) increase labor time and cost. Flat roofs common in DC rowhouses require specialized mounting systems.

Electrical work: Panel upgrades, trenching for ground mounts, and main service panel modifications add cost.

Battery storage: Adding a battery (Tesla Powerwall, Enphase IQ Battery, etc.) increases upfront cost but provides backup power and can improve financial returns in markets with time-of-use rates.

DMV incentive stack

Federal Investment Tax Credit (ITC): 30% of system cost through 2032. This applies to the entire system cost including installation, inverters, and batteries. Requires sufficient tax liability to use the credit.

Maryland:
- Solar Renewable Energy Credits (SRECs): Maryland has an active SREC market. One SREC is earned per 1,000 kWh produced. Prices fluctuate based on market supply and demand.
- Residential Clean Energy Rebate Program: State rebates may be available depending on program funding.
- Property tax exemption: Solar systems are exempt from state property tax assessments.

Washington, DC:
- Some of the most valuable SREC markets in the country due to aggressive renewable portfolio standards.
- Solar for All program provides free solar to income-qualified residents.
- Property tax exemption for residential solar.

Northern Virginia:
- Net metering is available through Dominion Energy and NOVEC.
- Fewer state-level incentives than Maryland or DC, but the 30% federal ITC still applies.
- Some local utility rebates may be available — check with your specific provider.

Payback considerations

A typical solar payback period in the DMV ranges from 7–12 years depending on:
- System size and cost
- Electricity rates (higher rates = faster payback)
- Incentive stack (DC and Maryland generally faster than Virginia due to SRECs)
- Shading and system orientation
- Future electricity rate increases

After payback, the system continues producing free electricity for 15–25+ years.

Financing options

Cash purchase: Highest lifetime savings. You own the system and receive all incentives.

Solar loan: Many homeowners use a home equity loan, HELOC, or solar-specific loan. Monthly loan payments are often less than previous electricity bills.

Lease / Power Purchase Agreement (PPA): No upfront cost, but you do not own the system or receive tax credits. Generally lower lifetime savings than purchase or loan.

What solar does not fix

Solar reduces your electricity bill but does not eliminate it entirely in most cases. You will still have a connection fee and may pay for electricity used when the system is not producing (night, heavy cloud cover). Battery storage can reduce but not eliminate this.

How Renovessa helps

The Renovessa solar planner estimates your roof's solar potential, shows panel placement, estimates annual production, and helps you understand your options. When you're ready, Renovessa can coordinate quotes from qualified local installers.

Important disclaimers

Solar savings estimates depend on many variables including future electricity rates, SREC market prices, shading, roof condition, and system performance. This guide provides planning context, not a financial guarantee. Consult a tax professional regarding ITC eligibility. Renovessa does not install solar; we coordinate quotes from independent installers.`,
    author: "Renovessa editorial team",
    reviewer: "Renovessa operations",
    methodology: "Cost modeling based on regional installed-cost averages, incentive schedules from published sources, and production estimates from NREL PVWatts methodology.",
    applicableLocation: "dmv",
    applicableTrade: "solar",
    status: "draft",
  },

  // === PILLAR: SOLAR EQUIPMENT & TECHNOLOGY ===
  {
    slug: "dmv/solar-equipment-guide",
    title: "Solar Panels, Inverters, and Batteries — Equipment Guide for DMV Homes",
    bodyText: `Solar equipment options for Washington, DC, Maryland, and Northern Virginia homeowners

Understanding solar equipment helps you compare installer quotes and choose a system that matches your property, budget, and goals.

Solar panel types

Monocrystalline: Made from a single silicon crystal. Higher efficiency (18–22%), better performance in low light, smaller footprint for the same output, and longer lifespan. Higher cost. Best for space-constrained roofs common in DC and Arlington.

Polycrystalline: Made from multiple silicon fragments. Lower efficiency (15–17%), larger footprint, lower cost. Less common in residential installations today as monocrystalline prices have dropped.

Thin-film: Lightweight and flexible but lower efficiency. Rarely used for residential rooftop systems. Occasionally used for flat commercial roofs or building-integrated applications.

Panel efficiency matters in the DMV because:
- DC rowhouses often have limited roof area
- Tree shading is common in established neighborhoods
- Higher efficiency means more production from the same roof space

Key panel specifications to compare

Efficiency rating: Percentage of sunlight converted to electricity. Higher is better, especially for space-constrained roofs.

Temperature coefficient: How much output drops as panels heat up. Lower (more negative) numbers mean better hot-weather performance. This matters for DMV summers.

Degradation rate: How much output declines each year. Premium panels degrade at 0.25–0.35% annually; budget panels at 0.5–0.8%.

Warranty: Most panels carry 25-year performance warranties and 10–12 year product warranties. Premium brands offer 25-year product warranties.

Inverter options

String inverter: One central inverter for the entire array. Lower cost, but the entire system operates at the level of the worst-performing panel. If one panel is shaded, all panels suffer.

Power optimizers: Devices attached to each panel that optimize output individually, with a central inverter. Better performance than string alone, especially with shading.

Microinverters: Small inverters attached to each panel. Each panel operates independently. Best for complex roofs with shading, but highest cost.

Inverter warranties range from 10–25 years. Microinverters and premium string inverters often have longer warranties.

Battery storage

Tesla Powerwall: 13.5 kWh capacity, integrated with Tesla solar systems. Popular but has had availability constraints.

Enphase IQ Battery: Modular system (3.36 kWh per unit), integrates with Enphase microinverters.

Generac PWRcell: Modular system with 8.6 kWh base capacity, expandable.

Battery considerations for the DMV:
- Backup power during summer storms and winter ice events
- Time-of-use rate optimization (if your utility offers time-varying rates)
- Additional cost: $10,000–$20,000+ depending on capacity

Roof considerations

Before installing solar, assess:
- Roof age and condition (solar panels last 25–30 years; your roof should too)
- Remaining roof life (if less than 10 years, consider replacing the roof first)
- Structural capacity (most roofs can handle solar, but older homes may need assessment)
- HOA rules (common in Northern Virginia and Montgomery County)

Flat roofs (common in DC rowhouses and some condos) require tilted racking or ballasted systems, which add complexity and cost.

How to compare equipment in quotes

Every quote should specify:
- Panel manufacturer, model, wattage, and quantity
- Inverter manufacturer, model, and type
- Battery manufacturer, model, and capacity (if applicable)
- Total system size in kW
- Estimated first-year production in kWh
- Warranty terms for all major components

Be wary of quotes that list "premium panels" without naming the manufacturer.

How Renovessa helps

The Renovessa solar planner helps you understand your roof's potential and what size system makes sense. When you request quotes through Renovessa, we help you compare equipment specifications across proposals.`,
    author: "Renovessa editorial team",
    reviewer: "Renovessa operations",
    applicableLocation: "dmv",
    applicableTrade: "solar",
    status: "draft",
  },

  // === PILLAR: ROOF READINESS ===
  {
    slug: "dmv/solar-roof-readiness",
    title: "Is Your Roof Ready for Solar? — DMV Homeowner's Assessment Guide",
    bodyText: `Roof readiness for solar panels in Washington, DC, Maryland, and Northern Virginia

One of the most common questions homeowners ask before going solar: "Should I replace my roof first?" This guide helps you assess your roof's readiness and understand the implications.

Roof age rule of thumb

If your roof has less than 10 years of remaining life, you should strongly consider replacing it before installing solar. Removing and reinstalling solar panels to replace a roof later costs $3,000–$6,000+ and may void panel warranties.

Asphalt shingles: 20–30 year lifespan. If your shingles are 15+ years old, have a roofer assess remaining life before solar installation.

Metal roofs: 40–70 year lifespan. Generally do not need replacement before solar.

Slate or tile: 50–100 year lifespan. Usually fine for solar, but mounting requires specialized expertise.

Flat roofs (DC rowhouses, some condos): 15–25 year lifespan for membrane roofs. Require specialized ballasted or attached mounting. Assess membrane condition before solar.

Signs your roof needs attention before solar

- Curling, cracking, or missing shingles
- Granule loss (check gutters for shingle sand)
- Sagging or uneven roof planes
- Active leaks or water stains
- Soft spots when walking on the roof
- Previous repairs that are failing

If any of these are present, have a qualified roofer inspect before solar installation.

DMV-specific roof considerations

Tree coverage: DC, Takoma Park, and parts of Arlington have mature tree canopy that causes shading. A shade analysis is essential before solar design.

Historic districts: Georgetown, Capitol Hill, Old Town Alexandria, and others may have restrictions on visible roof modifications. Check with your historic preservation office.

HOA restrictions: Common in Fairfax County, Loudoun County, and Montgomery County. Some HOAs have aesthetic requirements for panel placement.

Flat roofs: Many DC rowhouses have flat or low-slope roofs. Solar is still viable but requires tilted racking or specialized flat-roof mounting. Wind uplift is a consideration.

Complex rooflines: Dormers, multiple facets, and steep pitches increase installation complexity and cost.

The roof-solar coordination strategy

If your roof needs replacement soon:
1. Get a roofing assessment first
2. If replacement is recommended, coordinate roof replacement and solar installation
3. Many solar installers partner with roofers or can recommend one
4. Some installers offer roof replacement as part of the solar project

If your roof is in good condition:
1. Proceed with solar design and installation
2. Plan for roof inspection every 3–5 years after solar installation
3. Keep solar installer contact information for any future roof work

Important: Solar installers are not roofers. While they assess roof condition for mounting, they may not identify all roofing issues. An independent roofing inspection is advisable for roofs over 10 years old.

How Renovessa helps

The Renovessa solar planner includes a roof condition assessment step. If your roof may need replacement, we can help coordinate both roofing and solar quotes so the projects are sequenced correctly.`,
    author: "Renovessa editorial team",
    reviewer: "Renovessa operations",
    applicableLocation: "dmv",
    applicableTrade: "solar",
    status: "draft",
  },

  // === CLUSTER: COMPARING SOLAR QUOTES ===
  {
    slug: "dmv/compare-solar-quotes",
    title: "How to Compare Solar Quotes in the DMV — A Homeowner's Checklist",
    bodyText: `Comparing solar installation quotes in Washington, DC, Maryland, and Northern Virginia

Solar quotes can look similar at first glance but vary significantly in equipment, warranties, financing, and what's actually included. This checklist helps you compare apples to apples.

System specifications to compare

System size (kW): Total panel wattage divided by 1,000. A 10 kW system with 400W panels uses 25 panels.

Estimated annual production (kWh): How much electricity the system is expected to generate in year one. Compare this to your actual usage from utility bills.

Production estimate methodology: Is it based on site-specific shading analysis or a generic assumption? Site-specific is more accurate.

Equipment list: Specific panel manufacturer, model, and wattage. Specific inverter manufacturer and model. Battery if applicable.

Design layout: Where will panels be placed? Which roof facets will be used? How will conduit be routed?

Financial terms to compare

Total gross cost: Before incentives. This is the number to compare across quotes.

Cost per watt: Gross cost divided by system size in watts. In the DMV, $2.50–$4.00 per watt is typical depending on equipment and complexity.

Net cost after ITC: Total cost minus the 30% federal tax credit. Remember: you must have sufficient tax liability to use the full credit.

Financing terms: If using a loan, compare interest rate, loan term, monthly payment, and total interest paid. Some solar loans have dealer fees that increase the effective interest rate.

Escalator clauses (leases/PPAs): If the payment increases over time, what is the annual escalator percentage?

What's included

Permits and inspections: Who handles permits? Which jurisdictions?

Interconnection application: Who submits the utility interconnection request?

Monitoring: Is production monitoring included? For how long?

Warranty and service

Equipment warranties: Panel performance warranty (typically 25 years), panel product warranty (10–25 years), inverter warranty (10–25 years).

Workmanship warranty: Installer's warranty on labor and roof penetrations. 5–10 years is typical; 10–25 years from premium installers.

Production guarantee: Some installers guarantee a minimum production level and compensate you if the system underperforms.

Response time for service calls: What happens if something breaks? How quickly will they respond?

Red flags to watch for

- Pressure to sign immediately
- Quotes significantly lower than others (may indicate corners cut or equipment differences)
- Vague equipment descriptions ("premium panels" without naming the brand)
- No mention of permits or interconnection
- Lease/PPA presented as clearly better without explaining ownership trade-offs
- Installer cannot provide proof of insurance or license

DMV-specific verification

Verify the installer holds a valid Virginia, Maryland, or DC contractor license as applicable. Check for:
- MHIC license (Maryland)
- Class A, B, or C contractor license (Virginia)
- Basic Business License (DC)

Confirm the installer has experience with your jurisdiction's permitting and interconnection processes.

How Renovessa helps

When you use Renovessa to request solar quotes, we help organize proposals from multiple installers in a standardized format. This makes equipment, pricing, and warranty comparisons straightforward.`,
    author: "Renovessa editorial team",
    reviewer: "Renovessa operations",
    applicableLocation: "dmv",
    applicableTrade: "solar",
    status: "draft",
  },

  // === CLUSTER: HOA & REGULATORY ===
  {
    slug: "dmv/solar-hoa-rules",
    title: "Solar Panels and HOA Rules in the DMV — What Homeowners Need to Know",
    bodyText: `Solar panels and HOA rules in Washington, DC, Maryland, and Northern Virginia

Homeowners associations (HOAs) and condo boards can affect solar installation plans. Understanding your rights and restrictions before starting helps avoid delays and disputes.

Federal and state protections

Federal law: The Solar Rights Act does not exist at the federal level, but several states have solar access laws that limit HOA restrictions.

Maryland: Maryland law (Real Property Code §2-119) prohibits HOAs from banning solar panels outright. However, HOAs may still impose reasonable restrictions on placement and aesthetics. The law applies to HOAs formed after 2010; older HOAs may have different rules.

Virginia: Virginia law (Code §67-701 et seq.) states that HOA covenants cannot prohibit solar panels unless the restriction was recorded before July 1, 2008. Even then, the restriction must be explicit about solar. HOAs may impose reasonable aesthetic requirements.

Washington, DC: DC does not have a specific solar access statute equivalent to Maryland's or Virginia's, but the Clean Energy DC Act supports residential solar adoption.

What "reasonable restrictions" mean

HOAs may be able to require:
- Panels installed parallel to the roofline where possible
- Panels on rear-facing roof facets rather than front-facing
- Neutral-colored frames or skirts to conceal railings
- No ground-mounted panels in front yards

HOAs generally cannot:
- Prohibit solar panels entirely (in MD and VA)
- Require panels to be invisible from the street
- Impose restrictions that significantly increase cost or reduce production

Condo and co-op considerations

Condos and co-ops are more complex than single-family HOAs:
- You typically own only your unit interior; the roof is common property
- Board approval is usually required for any roof modifications
- Shared solar (community solar) may be an alternative if individual installation is not permitted
- Some DC and Maryland condos have installed building-wide solar systems

If you live in a condo, review your bylaws and CC&Rs. Talk to your board or property manager early in the process.

Common HOA scenarios in the DMV

Northern Virginia townhouses (Fairfax, Loudoun, Prince William): Many newer communities have active HOAs. Review CC&Rs before getting solar quotes. Most allow solar with design review.

Montgomery County condos (Bethesda, Silver Spring, Rockville): High-rise and mid-rise buildings typically do not allow individual rooftop solar. Ground-floor townhouses in condo complexes may have different rules.

Arlington and Alexandria townhouses: Mix of HOA and non-HOA properties. Check your deed and association documents.

DC rowhouses and condos: Most DC rowhouses are not in HOAs. Condos follow the same common-property rules as Maryland.

How to navigate HOA approval

1. Review your CC&Rs and bylaws before contacting installers
2. Contact your HOA board or management company to understand the approval process
3. Request a formal approval in writing before signing an installation contract
4. Provide the HOA with the proposed system design, including panel placement and visibility
5. Keep records of all communications

If your HOA denies a reasonable solar installation, consult an attorney familiar with Maryland or Virginia solar access law.

How Renovessa helps

The Renovessa solar planner asks about HOA and property type constraints. If your property is in an HOA, we can help you understand your rights and connect you with installers experienced in HOA approvals.`,
    author: "Renovessa editorial team",
    reviewer: "Renovessa operations",
    applicableLocation: "dmv",
    applicableTrade: "solar",
    status: "draft",
  },

  // === CLUSTER: BATTERY BACKUP ===
  {
    slug: "dmv/solar-battery-backup",
    title: "Solar Battery Backup for DMV Homes — Costs, Benefits, and Sizing",
    bodyText: `Solar battery backup in Washington, DC, Maryland, and Northern Virginia

Battery storage adds backup power capability to a solar system, providing electricity during grid outages and potentially improving financial returns. This guide covers when batteries make sense for DMV homeowners.

How solar batteries work

A battery stores excess solar production during the day for use at night or during outages. Without a battery, excess solar production is sent to the grid (net metering), and you draw from the grid when solar is not producing.

During a grid outage:
- Without a battery: Solar systems automatically shut off for safety. You have no power.
- With a battery: The battery powers essential circuits. Solar continues charging the battery during daylight.

Battery capacity and what it powers

Battery capacity is measured in kilowatt-hours (kWh). Typical residential batteries:
- Tesla Powerwall: 13.5 kWh
- Enphase IQ Battery 5P: 5.0 kWh (stackable)
- Generac PWRcell: 8.6 kWh base (expandable)

What 13.5 kWh can power during an outage:
- Refrigerator: 1–2 kWh per day
- Lights (LED): 0.5–1 kWh per day
- WiFi/router: 0.2 kWh per day
- Phone charging: minimal
- Sump pump: 0.5–1 kWh per day (critical in basement homes)
- Microwave or coffee maker: brief usage, ~1 kWh per use

A single Powerwall can typically power essential loads for 1–2 days without solar input, longer with sunny days.

DMV outage considerations

Summer storms: Thunderstorms and derechos (like the 2012 derecho) can cause multi-day outages, especially in Montgomery County, Fairfax County, and Loudoun County.

Winter ice storms: Ice accumulation on power lines causes outages in Northern Virginia and Maryland suburbs.

Hurricane remnants: Tropical systems can bring high winds and flooding, causing extended outages.

Basement sump pumps: Many DMV homes have basements with sump pumps. A battery can keep the pump running during outages, preventing flooding.

Medical equipment: Homes with medical devices that require electricity should consider battery backup or a generator.

Financial considerations

Battery cost: $10,000–$20,000+ installed, depending on capacity and brand.

Federal tax credit: Batteries installed with solar qualify for the 30% ITC. Standalone batteries (not paired with solar) have different tax treatment — consult a tax professional.

Time-of-use optimization: If your utility offers time-of-use rates, you can charge the battery during low-rate periods and discharge during peak rates. This is more relevant in some markets than others.

Backup vs. daily cycling: Using the battery daily for time-of-use optimization may reduce its lifespan compared to keeping it charged primarily for backup.

Battery alternatives

Portable power stations: Jackery, EcoFlow, and similar brands offer 1–3 kWh portable units. Good for short outages and essential devices, but not whole-home backup.

Generators: Propane or natural gas generators can power the whole home but require fuel storage, maintenance, and produce noise and emissions.

Whole-home batteries vs. partial backup

Some installations power only "essential loads" (refrigerator, lights, outlets) through a critical load panel. Others can power the entire home if the battery and inverter are sized appropriately. Whole-home backup costs significantly more.

How to decide if a battery is right for you

Consider a battery if:
- You experience frequent or extended outages
- You have medical equipment requiring power
- You have a basement sump pump
- You work from home and cannot afford downtime
- Your utility has time-of-use rates that favor storage

A battery may not be worth it if:
- Your outages are rare and brief
- You have a reliable backup generator
- Your budget is tight (solar alone still provides significant savings)

How Renovessa helps

The Renovessa solar planner includes battery sizing and cost options. We help you understand whether battery backup makes sense for your specific situation and coordinate quotes that include battery options if desired.`,
    author: "Renovessa editorial team",
    reviewer: "Renovessa operations",
    applicableLocation: "dmv",
    applicableTrade: "solar",
    status: "draft",
  },
];
