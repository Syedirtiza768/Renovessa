import { FIRST_JOB_MODE, PILOT_TRADE, OPS_PHONE } from "@/lib/first-job-config";

export const LANDING_CATEGORIES = [
  { id: "bathroom", ref: "01", label: "Bathroom Remodeling", description: "Tile, vanities, walk-in showers, soaking tubs", houseZone: "bathroom" },
  { id: "solar", ref: "02", label: "Solar", description: "Roof potential, panels, production, and installer-ready planning", houseZone: "solar" },
  { id: "kitchen", ref: "03", label: "Kitchen Remodeling", description: "Cabinets, countertops, full renovations", houseZone: "kitchen" },
  { id: "roofing", ref: "04", label: "Roofing", description: "Repairs, replacements, leak fixes, gutters", houseZone: "roofing" },
  { id: "siding", ref: "05", label: "Siding", description: "Vinyl, fiber cement, wood, repairs, and replacement", houseZone: "siding" },
  { id: "windows", ref: "06", label: "Windows & Doors", description: "Replacements, glass, frames, weather seals", houseZone: "windows" },
  { id: "flooring", ref: "07", label: "Flooring", description: "Hardwood, tile, LVP, carpet, refinishing", houseZone: "flooring" },
  { id: "hvac", ref: "08", label: "HVAC", description: "Furnace, AC, heat pumps, ductwork, tune-ups", houseZone: "hvac" },
  { id: "electrical", ref: "09", label: "Electrical", description: "Panels, wiring, outlets, lighting, EV chargers", houseZone: "electrical" },
  { id: "plumbing", ref: "10", label: "Plumbing", description: "Leaks, water heaters, repiping, fixtures", houseZone: "plumbing" },
] as const;

export type LandingCategoryId = (typeof LANDING_CATEGORIES)[number]["id"];

export type SpecializedEstimatorId = "bathroom" | "solar";
export type StandardEstimatorId = Exclude<LandingCategoryId, SpecializedEstimatorId>;

export const STANDARD_ESTIMATOR_IDS: StandardEstimatorId[] = [
  "kitchen",
  "roofing",
  "siding",
  "windows",
  "flooring",
  "hvac",
  "electrical",
  "plumbing",
];

export function isSpecializedEstimator(id: LandingCategoryId): id is SpecializedEstimatorId {
  return id === "bathroom" || id === "solar";
}

export function getTradeEstimatorPath(id: LandingCategoryId): string {
  if (id === "bathroom") return "/bathroom-remodeling";
  if (id === "solar") return "/solar";
  return `/estimate/${id}`;
}

export function getVisibleCategories() {
  if (!FIRST_JOB_MODE) return LANDING_CATEGORIES;
  return LANDING_CATEGORIES.filter(
    (c) => c.label.toLowerCase().includes(PILOT_TRADE.toLowerCase())
  );
}

export const HERO_SERVICE_TAGS = FIRST_JOB_MODE
  ? [PILOT_TRADE]
  : [
      "Bathroom Remodeling",
      "Solar",
      "Kitchen Remodeling",
      "Roofing",
      "Siding",
      "Windows & Doors",
      "Flooring",
      "HVAC",
      "Electrical",
      "Plumbing",
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
    body: "Based on your answers, Renovessa can show a versioned internal planning range only after its supporting DMV evidence record is approved. It is never a binding quote.",
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
    a: "Renovessa does not currently charge homeowners to use the estimate wizard or submit an RFQ. Any contractor proposal and payment for project work are separate.",
  },
  {
    q: "How accurate is the ballpark estimate?",
    a: "It is a versioned internal planning model, not a claim that every DMV project falls in the range. Numeric output is withheld unless the matching evidence record and model version have been approved. Contractors determine actual pricing after reviewing the scope and site.",
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
  { id: "solar", marker: "2", label: "Solar", example: "Panels, production" },
  { id: "siding", marker: "3", label: "Siding", example: "Vinyl, fiber cement" },
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
