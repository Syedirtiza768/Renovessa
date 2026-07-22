import { FIRST_JOB_MODE, PILOT_TRADE, OPS_PHONE } from "@/lib/first-job-config";

export const LANDING_CATEGORIES = [
  { id: "hvac", ref: "01", label: "HVAC", description: "Furnace, AC, heat pumps, ductwork, tune-ups", houseZone: "hvac" },
  { id: "roofing", ref: "02", label: "Roofing", description: "Repairs, replacements, leak fixes, gutters", houseZone: "roofing" },
  { id: "kitchen", ref: "03", label: "Kitchen Remodeling", description: "Cabinets, countertops, full renovations", houseZone: "kitchen" },
  { id: "bathroom", ref: "04", label: "Bathroom Remodeling", description: "Tile, vanities, walk-in showers, soaking tubs", houseZone: "bathroom" },
  { id: "basement", ref: "05", label: "Basement Finishing", description: "Framing, drywall, flooring, permits", houseZone: "plumbing" },
  { id: "plumbing", ref: "06", label: "Plumbing", description: "Leaks, water heaters, repiping, fixtures", houseZone: "plumbing" },
  { id: "electrical", ref: "07", label: "Electrical", description: "Panels, wiring, outlets, lighting, EV chargers", houseZone: "electrical" },
  { id: "windows", ref: "08", label: "Windows & Doors", description: "Replacements, glass, frames, weather seals", houseZone: "windows" },
  { id: "deck", ref: "09", label: "Deck & Patio", description: "New builds, repairs, staining, permits", houseZone: null },
  { id: "flooring", ref: "10", label: "Flooring", description: "Hardwood, tile, LVP, carpet, refinishing", houseZone: "flooring" },
  { id: "painting", ref: "11", label: "Painting", description: "Interior, exterior, trim, decks, cabinets", houseZone: null },
  { id: "handyman", ref: "12", label: "General Repairs", description: "Drywall, doors, tile, fences, handyman tasks", houseZone: null },
] as const;

export type LandingCategoryId = (typeof LANDING_CATEGORIES)[number]["id"];

export function getVisibleCategories() {
  if (!FIRST_JOB_MODE) return LANDING_CATEGORIES;
  return LANDING_CATEGORIES.filter(
    (c) => c.label.toLowerCase().includes(PILOT_TRADE.toLowerCase())
  );
}

export const HERO_SERVICE_TAGS = FIRST_JOB_MODE
  ? [PILOT_TRADE]
  : [
      "Roofing",
      "HVAC",
      "Kitchens",
      "Bathrooms",
      "Windows",
      "Plumbing",
      "Electrical",
      "Flooring",
      "Painting",
      "Siding",
      "Basement",
      "Decks",
    ];

export const HOW_IT_WORKS_STEPS = [
  {
    step: "I",
    title: "You run the estimate wizard.",
    timing: "About 3–5 minutes.",
    body: "Pick your trade and answer scoped questions — size, materials, condition, timing, and constraints — so we capture the whole picture of the job you expect.",
  },
  {
    step: "II",
    title: "You get a real DMV ballpark.",
    timing: "Instant.",
    body: "Based on your answers, Renovessa shows a planning range grounded in typical DMV labor and material costs. It's a ballpark for decisions — not a binding quote.",
  },
  {
    step: "III",
    title: "You submit an RFQ to Renovessa.",
    timing: "Under a minute.",
    body: "Turn the scoped job into a request for quote. We review it and, where trade and ZIP capacity is available, ask relevant contractors for responses.",
  },
  {
    step: "IV",
    title: "We bring bids back to you.",
    timing: "Timing varies by project and availability.",
    body: "Renovessa organizes the responses it receives and returns the available options. Ask questions, compare the scope, hire who you want, or decide later.",
  },
];

export const TRUST_CARDS = [
  {
    title: "Scoped RFQ, Not a Vague Lead",
    body: "The estimate wizard captures trade, size, materials, constraints, and timing — so contractors bid on a real job description, not a one-line inquiry.",
  },
  {
    title: "Ballpark First, Bids Next",
    body: "See a DMV planning range instantly, then submit an RFQ. Renovessa solicits contractor bids and brings options back to you.",
  },
  {
    title: "Credential Review, Explained",
    body: "Before bid routing, Renovessa reviews the credential information required for the relevant trade. You remain responsible for confirming credentials and contract terms before work begins.",
  },
];

export const VERIFICATION_BADGES = [
  "Published verification criteria",
  "Official license-source checks",
  "Credential review dates",
  "Homeowner re-check encouraged",
];

export const FAQ_ITEMS = [
  {
    q: "Is Renovessa free for homeowners?",
    a: "Yes, completely free. The estimate wizard, ballpark, and RFQ submission cost you nothing. Renovessa is paid by contractors when work is successfully coordinated — you pay nothing to us.",
  },
  {
    q: "How accurate is the ballpark estimate?",
    a: "It's a planning range based on typical DMV labor and materials for the scope you described. Final bids can move with site conditions, permits, material choices, and access. Contractors confirm pricing after reviewing your RFQ (and often a site visit).",
  },
  {
    q: "What happens after I submit an RFQ?",
    a: "Renovessa reviews your scoped request and checks current trade and ZIP availability. When relevant contractors are available, we request responses and organize the options received. Timing depends on project complexity and contractor availability.",
  },
  {
    q: "Will I get calls from multiple contractors?",
    a: "Renovessa runs the bid process for you. You hear from us with consolidated options rather than an uncontrolled blast of cold sales calls. We'll only connect you with contractors relevant to your RFQ.",
  },
  {
    q: "What areas does Renovessa serve?",
    a: FIRST_JOB_MODE
      ? `Currently serving the DMV area for ${PILOT_TRADE} projects. Enter your ZIP in the estimate wizard to check coverage.`
      : "Washington DC, Maryland, and Northern Virginia. Enter your ZIP in the estimate wizard — we'll let you know if your area is covered.",
  },
  {
    q: "How are contractors vetted?",
    a: "Renovessa reviews the credential information required for the relevant trade and jurisdiction before routing bids. Our verification methodology explains what is checked and when. Credential status can change, so homeowners should verify it again with the official state source before signing a contract.",
  },
  {
    q: "Do I have to accept a bid?",
    a: "No. The RFQ and bids are informational. Hire who you want, negotiate, or walk away. There is no obligation to Renovessa.",
  },
  {
    q: "Is my contact information shared broadly?",
    a: "Your RFQ is shared only as needed to solicit relevant contractor bids through Renovessa. We don't sell lead lists.",
  },
];

export const HOUSE_ZONES = [
  { id: "roofing", marker: "1", label: "Roofing", example: "Shingles, leaks, gutters" },
  { id: "solar", marker: "2", label: "Solar", example: "Panels, inverters", mapsTo: "roofing" as const },
  { id: "siding", marker: "3", label: "Siding", example: "Vinyl, fiber cement", mapsTo: "handyman" as const },
  { id: "windows", marker: "4", label: "Windows & Doors", example: "Replacements, seals" },
  { id: "kitchen", marker: "5", label: "Kitchen", example: "Cabinets, counters" },
  { id: "bathroom", marker: "6", label: "Bathroom", example: "Tile, vanities" },
  { id: "flooring", marker: "7", label: "Flooring", example: "Hardwood, tile, LVP" },
  { id: "hvac", marker: "8", label: "HVAC", example: "AC, furnace, ducts" },
  { id: "electrical", marker: "9", label: "Electrical", example: "Panel, outlets" },
  { id: "plumbing", marker: "10", label: "Plumbing", example: "Leaks, water heater" },
] as const;

export const BUDGET_OPTIONS = [
  "Under $1,000",
  "$1,000–$5,000",
  "$5,000–$15,000",
  "$15,000–$50,000",
  "$50,000+",
];

export const URGENCY_OPTIONS_LANDING = [
  "As soon as possible",
  "Within 2 weeks",
  "Within 1 month",
  "Just planning",
];

export const CONTACT_WINDOW_OPTIONS = [
  { value: "morning", label: "Morning (8am–12pm)" },
  { value: "afternoon", label: "Afternoon (12pm–5pm)" },
  { value: "evening", label: "Evening (5pm–8pm)" },
  { value: "any", label: "Any time" },
];

export const OWNERSHIP_OPTIONS = [
  { value: "owner", label: "I own the home" },
  { value: "renter", label: "I rent the home" },
  { value: "decision-maker", label: "I'm the decision-maker" },
];
