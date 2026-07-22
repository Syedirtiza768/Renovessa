import type { LandingCategoryId } from "@/lib/landing-data";
import { getVisibleCategories } from "@/lib/landing-data";

export type WizardOption = { value: string; label: string; hint?: string };

export type WizardQuestion = {
  id: string;
  label: string;
  help?: string;
  type: "single" | "number";
  options?: WizardOption[];
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
  placeholder?: string;
  required?: boolean;
};

export type TradeWizardConfig = {
  trade: LandingCategoryId;
  intro: string;
  questions: WizardQuestion[];
};

const HOME_SIZE: WizardOption[] = [
  { value: "small", label: "Under 1,500 sq ft" },
  { value: "medium", label: "1,500–2,500 sq ft" },
  { value: "large", label: "2,500–4,000 sq ft" },
  { value: "xlarge", label: "Over 4,000 sq ft" },
];

const FINISH: WizardOption[] = [
  { value: "basic", label: "Budget / builder-grade", hint: "Functional, lowest cost" },
  { value: "standard", label: "Standard / mid-range", hint: "Most common choice" },
  { value: "premium", label: "Premium finishes", hint: "Higher-end materials" },
  { value: "luxury", label: "Luxury / custom", hint: "Top-tier materials & detail" },
];

export const SHARED_CONTEXT_QUESTIONS: WizardQuestion[] = [
  {
    id: "property_type",
    label: "What kind of home is this?",
    type: "single",
    required: true,
    options: [
      { value: "sfh", label: "Single-family house" },
      { value: "townhouse", label: "Townhouse / row home" },
      { value: "condo", label: "Condo / apartment" },
      { value: "other", label: "Other / not sure" },
    ],
  },
  {
    id: "ownership",
    label: "Do you own the home?",
    type: "single",
    required: true,
    options: [
      { value: "owner", label: "Yes — I own it" },
      { value: "decision-maker", label: "I'm authorized to hire for it" },
      { value: "renter", label: "I rent (landlord approval needed)" },
    ],
  },
  {
    id: "urgency",
    label: "When do you want the work done?",
    type: "single",
    required: true,
    options: [
      { value: "As soon as possible", label: "As soon as possible", hint: "Active problem or deadline" },
      { value: "Within 2 weeks", label: "Within 2 weeks" },
      { value: "Within 1 month", label: "Within 1 month" },
      { value: "Just planning", label: "Just planning / comparing options" },
    ],
  },
  {
    id: "access",
    label: "Anything contractors should know about access or constraints?",
    type: "single",
    required: true,
    options: [
      { value: "easy", label: "Easy access — driveway/parking available" },
      { value: "hoa", label: "HOA / condo board rules apply" },
      { value: "tight", label: "Tight access / street parking only" },
      { value: "occupied", label: "Home fully occupied during work" },
      { value: "none", label: "No special constraints" },
    ],
  },
];

export const TRADE_WIZARDS: Record<LandingCategoryId, TradeWizardConfig> = {
  hvac: {
    trade: "hvac",
    intro: "We'll size the HVAC job the way a dispatcher would — what's broken, how big the home is, and whether you need a repair or a replacement.",
    questions: [
      {
        id: "job_type",
        label: "What do you need?",
        type: "single",
        required: true,
        options: [
          { value: "repair", label: "Repair / diagnostic", hint: "Not cooling, strange noise, no heat" },
          { value: "tuneup", label: "Tune-up / maintenance" },
          { value: "ac_replace", label: "Replace the AC" },
          { value: "furnace_replace", label: "Replace the furnace" },
          { value: "full_system", label: "Replace the full system" },
        ],
      },
      {
        id: "symptoms",
        label: "What's going on?",
        type: "single",
        required: true,
        options: [
          { value: "warm_air", label: "AC blowing warm / not cooling" },
          { value: "no_heat", label: "No heat / furnace issue" },
          { value: "noise", label: "Loud noise / vibration" },
          { value: "leak", label: "Water leak near unit" },
          { value: "high_bills", label: "High bills / inefficient" },
          { value: "planned", label: "Planning ahead — no active failure" },
        ],
      },
      {
        id: "system_age",
        label: "About how old is the current system?",
        type: "single",
        required: true,
        options: [
          { value: "0-5", label: "Under 5 years" },
          { value: "5-10", label: "5–10 years" },
          { value: "10-15", label: "10–15 years" },
          { value: "15+", label: "15+ years" },
          { value: "unknown", label: "Not sure" },
        ],
      },
      {
        id: "home_size",
        label: "Home size",
        type: "single",
        required: true,
        options: HOME_SIZE,
      },
      {
        id: "quality",
        label: "If replacing equipment, what finish/efficiency tier?",
        type: "single",
        required: true,
        options: FINISH,
      },
    ],
  },
  roofing: {
    trade: "roofing",
    intro: "Roof pricing hinges on size, pitch, stories, and material. Answer as best you can — we'll refine with contractor bids.",
    questions: [
      {
        id: "job_type",
        label: "What kind of roofing work?",
        type: "single",
        required: true,
        options: [
          { value: "leak", label: "Active leak / emergency patch" },
          { value: "repair", label: "Repair (shingles, flashing, valley)" },
          { value: "full_replace", label: "Full roof replacement" },
          { value: "gutters", label: "Gutters / downspouts" },
        ],
      },
      {
        id: "roof_squares",
        label: "Approximate roof size (squares)",
        help: "1 square = 100 sq ft of roof. A typical DMV colonial is 20–30 squares. Guess is fine.",
        type: "number",
        min: 5,
        max: 60,
        step: 1,
        suffix: "squares",
        placeholder: "24",
        required: true,
      },
      {
        id: "stories",
        label: "How many stories?",
        type: "single",
        required: true,
        options: [
          { value: "1", label: "1 story" },
          { value: "2", label: "2 stories" },
          { value: "3+", label: "3+ stories" },
        ],
      },
      {
        id: "pitch",
        label: "Roof pitch / steepness",
        type: "single",
        required: true,
        options: [
          { value: "low", label: "Low / walkable" },
          { value: "moderate", label: "Moderate" },
          { value: "steep", label: "Steep (needs harnesses)" },
          { value: "unknown", label: "Not sure" },
        ],
      },
      {
        id: "material",
        label: "Preferred roofing material",
        type: "single",
        required: true,
        options: [
          { value: "asphalt", label: "3-tab asphalt" },
          { value: "architectural", label: "Architectural asphalt" },
          { value: "metal", label: "Metal" },
          { value: "cedar", label: "Cedar / wood" },
          { value: "slate", label: "Slate" },
          { value: "match", label: "Match existing / undecided" },
        ],
      },
    ],
  },
  kitchen: {
    trade: "kitchen",
    intro: "Kitchen budgets swing with scope — cosmetic refresh vs full gut. We'll capture layout, size, and finish level.",
    questions: [
      {
        id: "scope",
        label: "How deep is the remodel?",
        type: "single",
        required: true,
        options: [
          { value: "refresh", label: "Refresh", hint: "Paint, hardware, counters, maybe appliances" },
          { value: "mid", label: "Mid-range remodel", hint: "New cabinets + counters, same layout" },
          { value: "full", label: "Full gut / layout change", hint: "Walls, plumbing, electrical may move" },
        ],
      },
      {
        id: "kitchen_size",
        label: "Kitchen size / layout",
        type: "single",
        required: true,
        options: [
          { value: "galley", label: "Galley / small" },
          { value: "medium", label: "Medium U/L shape" },
          { value: "large", label: "Large kitchen" },
          { value: "open", label: "Open concept / eat-in" },
        ],
      },
      {
        id: "cabinets",
        label: "Cabinets",
        type: "single",
        required: true,
        options: [
          { value: "keep", label: "Keep / refinish existing" },
          { value: "replace", label: "Replace cabinets" },
          { value: "custom", label: "Custom cabinetry" },
        ],
      },
      {
        id: "counters",
        label: "Countertops",
        type: "single",
        required: true,
        options: [
          { value: "laminate", label: "Laminate / budget" },
          { value: "quartz", label: "Quartz" },
          { value: "granite", label: "Granite" },
          { value: "marble", label: "Marble / premium stone" },
          { value: "undecided", label: "Undecided" },
        ],
      },
      {
        id: "finish_level",
        label: "Overall finish level",
        type: "single",
        required: true,
        options: FINISH,
      },
    ],
  },
  bathroom: {
    trade: "bathroom",
    intro: "Bathroom cost is driven by wet-area work — waterproofing, tile, and whether it's a powder room or primary suite.",
    questions: [
      {
        id: "bath_type",
        label: "Which bathroom?",
        type: "single",
        required: true,
        options: [
          { value: "half", label: "Powder room / half bath" },
          { value: "full", label: "Full hall bath" },
          { value: "master", label: "Primary / master bath" },
        ],
      },
      {
        id: "scope",
        label: "Scope of work",
        type: "single",
        required: true,
        options: [
          { value: "update", label: "Cosmetic update", hint: "Vanity, fixtures, paint" },
          { value: "shower", label: "Shower / tub focus", hint: "Rebuild wet area" },
          { value: "full", label: "Full remodel", hint: "Gut to studs" },
        ],
      },
      {
        id: "wet_area",
        label: "Tub / shower plan",
        type: "single",
        required: true,
        options: [
          { value: "keep", label: "Keep existing tub/shower" },
          { value: "tub_to_shower", label: "Convert tub → walk-in shower" },
          { value: "new_tub", label: "New tub / soaking tub" },
          { value: "both", label: "Separate tub + shower" },
        ],
      },
      {
        id: "finish_level",
        label: "Finish level",
        type: "single",
        required: true,
        options: FINISH,
      },
    ],
  },
  basement: {
    trade: "basement",
    intro: "Basement finishing is usually priced per square foot, plus wet rooms and egress if needed.",
    questions: [
      {
        id: "sqft",
        label: "About how many sq ft will be finished?",
        type: "number",
        min: 200,
        max: 2500,
        step: 50,
        suffix: "sq ft",
        placeholder: "600",
        required: true,
      },
      {
        id: "finish_level",
        label: "Finish level",
        type: "single",
        required: true,
        options: FINISH,
      },
      {
        id: "add_bath",
        label: "Adding a bathroom?",
        type: "single",
        required: true,
        options: [
          { value: "no", label: "No bathroom" },
          { value: "yes", label: "Yes — add a bath" },
        ],
      },
      {
        id: "use_case",
        label: "Primary use",
        type: "single",
        required: true,
        options: [
          { value: "family", label: "Family / rec room" },
          { value: "office", label: "Office / guest suite" },
          { value: "rental", label: "Possible rental / ADU path" },
          { value: "storage_mix", label: "Mix of living + storage" },
        ],
      },
      {
        id: "moisture",
        label: "Any moisture / waterproofing concerns?",
        type: "single",
        required: true,
        options: [
          { value: "dry", label: "Stays dry" },
          { value: "damp", label: "Occasionally damp" },
          { value: "water", label: "Has taken on water" },
          { value: "unknown", label: "Not sure" },
        ],
      },
    ],
  },
  plumbing: {
    trade: "plumbing",
    intro: "Tell us the symptom and the fixture — that usually separates a service call from a multi-day job.",
    questions: [
      {
        id: "job_type",
        label: "What do you need?",
        type: "single",
        required: true,
        options: [
          { value: "clog", label: "Clogged drain" },
          { value: "fixture", label: "Fixture repair / replace" },
          { value: "leak", label: "Active leak" },
          { value: "water_heater", label: "Water heater" },
          { value: "repiping", label: "Repiping / major rework" },
        ],
      },
      {
        id: "location",
        label: "Where in the home?",
        type: "single",
        required: true,
        options: [
          { value: "kitchen", label: "Kitchen" },
          { value: "bath", label: "Bathroom" },
          { value: "basement", label: "Basement / utility" },
          { value: "whole", label: "Whole-house / multiple areas" },
          { value: "outdoor", label: "Outdoor / hose bib / irrigation" },
        ],
      },
      {
        id: "heater_type",
        label: "If water heater — which type?",
        type: "single",
        required: true,
        options: [
          { value: "tank", label: "Tank" },
          { value: "tankless", label: "Tankless" },
          { value: "na", label: "Not a water heater job" },
        ],
      },
      {
        id: "home_size",
        label: "Home size (matters for repiping)",
        type: "single",
        required: true,
        options: HOME_SIZE,
      },
    ],
  },
  electrical: {
    trade: "electrical",
    intro: "Electrical work ranges from a single outlet to a panel upgrade. Safety and load capacity matter — bids will confirm.",
    questions: [
      {
        id: "job_type",
        label: "What do you need?",
        type: "single",
        required: true,
        options: [
          { value: "outlet", label: "Outlets / switches / lighting" },
          { value: "panel", label: "Panel upgrade" },
          { value: "ev", label: "EV charger circuit" },
          { value: "rewire", label: "Rewire / major upgrade" },
          { value: "other", label: "Other / not sure" },
        ],
      },
      {
        id: "panel_amps",
        label: "Current panel (if known)",
        type: "single",
        required: true,
        options: [
          { value: "100", label: "100 amp" },
          { value: "150", label: "150 amp" },
          { value: "200", label: "200 amp" },
          { value: "unknown", label: "Not sure" },
        ],
      },
      {
        id: "home_size",
        label: "Home size",
        type: "single",
        required: true,
        options: HOME_SIZE,
      },
      {
        id: "permits",
        label: "Do you need this permitted / inspected?",
        type: "single",
        required: true,
        options: [
          { value: "yes", label: "Yes — want it done to code with permits" },
          { value: "unsure", label: "Not sure — advise me" },
          { value: "no", label: "Minor work only" },
        ],
      },
    ],
  },
  windows: {
    trade: "windows",
    intro: "Window pricing is mostly count × quality tier, plus any doors and install complexity (brick, historic, high stories).",
    questions: [
      {
        id: "window_count",
        label: "How many windows?",
        type: "number",
        min: 1,
        max: 40,
        step: 1,
        suffix: "windows",
        placeholder: "8",
        required: true,
      },
      {
        id: "window_type",
        label: "Window quality tier",
        type: "single",
        required: true,
        options: [
          { value: "basic", label: "Builder-grade / budget vinyl" },
          { value: "double", label: "Standard double-pane vinyl/fiberglass" },
          { value: "premium", label: "Premium / energy-star / wood clad" },
        ],
      },
      {
        id: "include_doors",
        label: "Include exterior doors?",
        type: "single",
        required: true,
        options: [
          { value: "no", label: "Windows only" },
          { value: "yes", label: "Yes — entry and/or patio door" },
        ],
      },
      {
        id: "stories",
        label: "Install height",
        type: "single",
        required: true,
        options: [
          { value: "1", label: "Mostly 1st floor" },
          { value: "2", label: "Includes 2nd floor" },
          { value: "3+", label: "3+ stories / hard access" },
        ],
      },
      {
        id: "quality",
        label: "Overall project finish",
        type: "single",
        required: true,
        options: FINISH,
      },
    ],
  },
  deck: {
    trade: "deck",
    intro: "Deck cost is sq footage × material, plus railing, stairs, and whether you're repairing or building new.",
    questions: [
      {
        id: "job_type",
        label: "Project type",
        type: "single",
        required: true,
        options: [
          { value: "new", label: "New deck" },
          { value: "rebuild", label: "Tear out & rebuild" },
          { value: "repair", label: "Repair / reboard" },
          { value: "stain", label: "Stain / seal only" },
        ],
      },
      {
        id: "sqft",
        label: "Approximate deck size",
        type: "number",
        min: 80,
        max: 1200,
        step: 20,
        suffix: "sq ft",
        placeholder: "300",
        required: true,
      },
      {
        id: "material",
        label: "Decking material",
        type: "single",
        required: true,
        options: [
          { value: "pressure_treated", label: "Pressure-treated wood" },
          { value: "cedar", label: "Cedar / hardwood" },
          { value: "composite", label: "Composite / PVC" },
        ],
      },
      {
        id: "railing",
        label: "New railing system?",
        type: "single",
        required: true,
        options: [
          { value: "yes", label: "Yes" },
          { value: "no", label: "No / existing OK" },
        ],
      },
      {
        id: "quality",
        label: "Finish level",
        type: "single",
        required: true,
        options: FINISH,
      },
    ],
  },
  flooring: {
    trade: "flooring",
    intro: "Flooring is mostly area × material, plus tear-out and subfloor surprises.",
    questions: [
      {
        id: "material",
        label: "Flooring type",
        type: "single",
        required: true,
        options: [
          { value: "lvp", label: "LVP / vinyl plank" },
          { value: "hardwood", label: "Hardwood (new)" },
          { value: "refinish", label: "Hardwood refinish" },
          { value: "tile", label: "Tile" },
          { value: "carpet", label: "Carpet" },
        ],
      },
      {
        id: "sqft",
        label: "Area to cover",
        type: "number",
        min: 50,
        max: 4000,
        step: 50,
        suffix: "sq ft",
        placeholder: "800",
        required: true,
      },
      {
        id: "remove_old",
        label: "Remove existing flooring?",
        type: "single",
        required: true,
        options: [
          { value: "yes", label: "Yes — tear out old floors" },
          { value: "no", label: "No — install over / already cleared" },
        ],
      },
      {
        id: "rooms",
        label: "Where?",
        type: "single",
        required: true,
        options: [
          { value: "one", label: "One room" },
          { value: "main", label: "Main living areas" },
          { value: "whole", label: "Most / whole home" },
          { value: "stairs", label: "Includes stairs" },
        ],
      },
      {
        id: "quality",
        label: "Material quality tier",
        type: "single",
        required: true,
        options: FINISH,
      },
    ],
  },
  painting: {
    trade: "painting",
    intro: "Painting bids need area, interior vs exterior, and whether cabinets or repairs are included.",
    questions: [
      {
        id: "scope",
        label: "What are you painting?",
        type: "single",
        required: true,
        options: [
          { value: "interior", label: "Interior walls / ceilings" },
          { value: "exterior", label: "Exterior" },
          { value: "cabinets", label: "Cabinets" },
          { value: "both", label: "Interior + exterior" },
        ],
      },
      {
        id: "sqft",
        label: "Approximate area",
        help: "For interiors, heated living area is a fine proxy. For exteriors, rough house footprint × stories.",
        type: "number",
        min: 200,
        max: 6000,
        step: 100,
        suffix: "sq ft",
        placeholder: "1500",
        required: true,
      },
      {
        id: "prep",
        label: "Surface condition",
        type: "single",
        required: true,
        options: [
          { value: "good", label: "Good — mostly clean paint" },
          { value: "repairs", label: "Needs patching / drywall repair" },
          { value: "peeling", label: "Peeling / heavy prep" },
        ],
      },
      {
        id: "colors",
        label: "Color plan",
        type: "single",
        required: true,
        options: [
          { value: "same", label: "Same / similar colors" },
          { value: "new", label: "New colors throughout" },
          { value: "accent", label: "Mostly same + accent walls" },
        ],
      },
      {
        id: "quality",
        label: "Paint / finish tier",
        type: "single",
        required: true,
        options: FINISH,
      },
    ],
  },
  handyman: {
    trade: "handyman",
    intro: "General repairs are hard to price until the punch list is clear — sketch the size of the job and the main tasks.",
    questions: [
      {
        id: "job_size",
        label: "How big is the job?",
        type: "single",
        required: true,
        options: [
          { value: "small", label: "Small — under a few hours", hint: "Door, drywall patch, fixture" },
          { value: "medium", label: "Medium — half to full day", hint: "Several fixes in one visit" },
          { value: "large", label: "Large — multi-day punch list" },
        ],
      },
      {
        id: "tasks",
        label: "Main task category",
        type: "single",
        required: true,
        options: [
          { value: "drywall", label: "Drywall / patching" },
          { value: "doors", label: "Doors / trim" },
          { value: "tile", label: "Tile / caulk" },
          { value: "fence", label: "Fence / outdoor" },
          { value: "mounting", label: "Mounting / assembly" },
          { value: "mixed", label: "Mixed punch list" },
        ],
      },
      {
        id: "materials",
        label: "Materials",
        type: "single",
        required: true,
        options: [
          { value: "pro_supplies", label: "Contractor should supply" },
          { value: "homeowner", label: "I'll supply materials" },
          { value: "mixed", label: "Mix of both" },
        ],
      },
    ],
  },
};

export function getTradeWizard(trade: LandingCategoryId): TradeWizardConfig {
  return TRADE_WIZARDS[trade];
}

export function getWizardCategories() {
  return getVisibleCategories();
}

/** Flat label map for RFQ text (question id → human label). */
export function buildQuestionLabelMap(trade: LandingCategoryId): Record<string, string> {
  const map: Record<string, string> = {};
  for (const q of TRADE_WIZARDS[trade].questions) map[q.id] = q.label;
  for (const q of SHARED_CONTEXT_QUESTIONS) map[q.id] = q.label;
  return map;
}

export function optionLabel(question: WizardQuestion, value: string): string {
  const opt = question.options?.find((o) => o.value === value);
  return opt?.label ?? value;
}
