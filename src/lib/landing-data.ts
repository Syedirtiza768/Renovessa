/** Static content for the marketing landing page */

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

export const HERO_SERVICE_TAGS = [
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

export const APPOINTMENT_LOG = [
  { time: "09:12 EDT", project: "Full bathroom remodel, master suite", zip: "20910", isNew: true },
  { time: "08:47 EDT", project: "Kitchen cabinet replacement + countertops", zip: "22308", isNew: true },
  { time: "08:31 EDT", project: "Roof repair, missing shingles", zip: "20854", isNew: false },
  { time: "07:58 EDT", project: "AC not cooling, two-story townhouse", zip: "22202", isNew: false },
  { time: "07:14 EDT", project: "Replace 12 windows, double-hung", zip: "20815", isNew: false },
  { time: "06:42 EDT", project: "Basement finishing, 800 sq ft", zip: "22101", isNew: false },
];

export const HOW_IT_WORKS_STEPS = [
  {
    step: "I",
    title: "You submit the request.",
    timing: "Avg. 60 seconds.",
    body: "Tell us what's going on — a leak, a remodel, a long-overdue replacement. Select your category, add a brief description, and give us your contact info. No account needed.",
  },
  {
    step: "II",
    title: "Renovessa qualifies your project.",
    timing: "Median 2–4 hours.",
    body: "A Renovessa team member calls to confirm your project details, verify your ZIP is in our service area, and gather any specifics needed to find the right specialty contractor for your job.",
  },
  {
    step: "III",
    title: "Renovessa schedules your appointment.",
    timing: "Same or next business day.",
    body: "Once qualified, Renovessa matches your project to one vetted contractor in your ZIP who handles that exact type of work. You receive an SMS confirmation with the appointment date, time, and contractor details.",
  },
  {
    step: "IV",
    title: "You meet the contractor. No pressure.",
    timing: "Always free.",
    body: "Hire them, hire someone else, or decide later. Renovessa coordinates the scheduling — the contractor arrives for an estimate or site visit. You pay nothing to Renovessa. Ever.",
  },
];

export const STATS = [
  { value: "312", unit: "this month", label: "Verified appointments confirmed in the DMV in the last 30 days.", source: "Updated daily" },
  { value: "2–4 hrs", unit: "", label: "Median time from request submission to qualification call.", source: "Rolling 30-day median" },
  { value: "94%", unit: "", label: "Homeowner confirmation rate on scheduled appointments.", source: "Q1 2025, n=1,847" },
  { value: "412", unit: "", label: "DMV ZIP codes with active vetted contractor coverage.", source: "DC · MD · VA" },
];

export const TRUST_CARDS = [
  {
    title: "One Request, One Contractor",
    body: "Your project is not sold to five companies at once. Renovessa routes your request to one vetted contractor who handles your type of work in your area.",
  },
  {
    title: "An Appointment, Not Just a Lead",
    body: "You get a confirmed appointment date and time — not a flood of sales calls. Renovessa coordinates the scheduling and sends you a calendar confirmation with contractor details.",
  },
  {
    title: "Backed by a Verification Trail",
    body: "Every appointment includes call records, SMS confirmations, and a check-in log. Renovessa's audit trail means you know the process was real — and disputes are resolved with evidence, not guesswork.",
  },
];

export const VERIFICATION_BADGES = [
  "License Verified",
  "Insurance Confirmed",
  "Workers' Comp on File",
  "Appointment Audited",
];

export const FAQ_ITEMS = [
  {
    q: "Is Renovessa free for homeowners?",
    a: "Yes, completely free. Renovessa is paid by contractors only when a verified appointment occurs. You pay nothing.",
  },
  {
    q: "What happens after I submit?",
    a: "A Renovessa team member calls you (within 4 business hours) to confirm your project details and verify your ZIP is in our service area. Once confirmed, we schedule your appointment.",
  },
  {
    q: "Will I get calls from multiple contractors?",
    a: "No. One vetted contractor is matched to your project. Renovessa does not sell your information to multiple companies simultaneously.",
  },
  {
    q: "What areas does Renovessa serve?",
    a: "Washington DC, Maryland, and Northern Virginia. Enter your ZIP in the form — we'll let you know if your area is covered.",
  },
  {
    q: "How are contractors vetted?",
    a: "Renovessa requires a valid state contractor license for the relevant trade, proof of general liability insurance, workers' compensation documentation, and a Google review check before granting network access.",
  },
  {
    q: "What if I need to reschedule?",
    a: "Contact Renovessa through the confirmation link in your SMS or email. We'll handle the rescheduling with the contractor.",
  },
  {
    q: "Is my contact information shared with multiple contractors?",
    a: "No. Your information is shared with one matched contractor after your project is qualified and the appointment is scheduled.",
  },
  {
    q: "What if the contractor doesn't show up?",
    a: "Renovessa's audit trail records every step from scheduling to check-in. If a contractor no-shows, report it through your confirmation link. We review the evidence and take appropriate action, including contractor account review.",
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
