/**
 * Static reference data for the bathroom remodeling planner.
 * See PRD §5, §11, §12, §13, §16, §17.2, §20.
 * These are immutable catalog values; admin-configurable rates live in
 * EstimatorConfiguration rows, not here.
 */

export const BATHROOM_TYPES = [
  { id: "powder", label: "Powder room", hint: "Toilet + sink only, no shower/tub" },
  { id: "guest", label: "Guest or hall bathroom", hint: "Full bath used by guests/family" },
  { id: "primary", label: "Primary bathroom", hint: "Attached to the main bedroom" },
  { id: "basement", label: "Basement bathroom", hint: "Below grade, may need special drainage" },
  { id: "accessible", label: "Accessible bathroom", hint: "Mobility-focused layout" },
  { id: "new_addition", label: "New bathroom addition", hint: "Creating a bathroom where none exists" },
  { id: "other", label: "Other", hint: "Describe in notes" },
] as const;

export const PROJECT_OBJECTIVES = [
  { id: "fixture_replacement", label: "Replace a single fixture", hint: "Sink/basin, vanity, faucet, or toilet swap — no remodel" },
  { id: "cosmetic_refresh", label: "Cosmetic refresh", hint: "Paint, hardware, fixtures surface update" },
  { id: "replace_fixtures_finishes", label: "Replace fixtures and finishes" },
  { id: "remodel_same_layout", label: "Complete remodel in the same layout" },
  { id: "full_gut", label: "Full gut remodel" },
  { id: "tub_to_shower", label: "Tub-to-shower conversion" },
  { id: "walk_in_shower", label: "Walk-in shower" },
  { id: "curbless_shower", label: "Curbless shower" },
  { id: "layout_redesign", label: "Layout redesign" },
  { id: "accessibility_upgrade", label: "Accessibility upgrade" },
  { id: "repair_damage", label: "Repair damage before remodeling" },
  { id: "add_bathroom", label: "Add a new bathroom" },
  { id: "unsure", label: "Unsure and need guidance" },
] as const;

export const PROPERTY_TYPES = [
  { id: "sfh", label: "Single-family house" },
  { id: "townhouse", label: "Townhouse / row home" },
  { id: "condo", label: "Condominium" },
  { id: "coop", label: "Co-op" },
  { id: "apartment", label: "Apartment" },
  { id: "other", label: "Other" },
] as const;

export const OWNERSHIP_STATUS = [
  { id: "owner", label: "I own it" },
  { id: "decision_maker", label: "I am authorized to hire for it" },
  { id: "renter", label: "I rent (landlord approval needed)" },
] as const;

export const OCCUPANCY_STATUS = [
  { id: "occupied", label: "Occupied during construction" },
  { id: "vacant", label: "Vacant during construction" },
  { id: "partial", label: "Part-time occupancy" },
] as const;

export const MEASUREMENT_METHODS = [
  { id: "simple", label: "Simple dimensions", hint: "Length, width, ceiling height" },
  { id: "guided", label: "Guided measurement", hint: "Step-by-step wall-by-wall" },
  { id: "manual", label: "Manual floor-plan builder", hint: "Draw the room (Phase 2)" },
  { id: "upload", label: "Upload or scan", hint: "Existing plan, sketch, or photos" },
] as const;

export const SHOWER_TUB_CHOICES = [
  "existing_tub_retained",
  "alcove_tub",
  "freestanding_tub",
  "tub_to_shower_conversion",
  "prefab_shower_surround",
  "custom_tiled_shower",
  "curbed_shower",
  "curbless_shower",
  "frameless_enclosure",
  "semi_frameless_enclosure",
  "shower_bench",
  "shower_niche",
  "handheld_shower",
  "rain_shower",
  "multiple_shower_controls",
] as const;

export const VANITY_CHOICES = [
  "pedestal_sink",
  "stock_vanity",
  "semi_custom_vanity",
  "custom_vanity",
  "floating_vanity",
  "single_sink",
  "double_sink",
  "medicine_cabinet",
  "linen_storage",
  "separate_makeup_area",
] as const;

export const FLOORING_CHOICES = [
  "ceramic_tile",
  "porcelain_tile",
  "natural_stone",
  "luxury_vinyl",
  "heated_tile_floor",
  "other",
] as const;

export const WALL_FINISH_CHOICES = [
  "paint",
  "partial_height_tile",
  "full_height_shower_tile",
  "full_height_room_tile",
  "large_format_tile",
  "decorative_accent_tile",
  "wall_panels",
] as const;

export const FIXTURE_QUALITY_TIERS = [
  { id: "entry", label: "Entry-level" },
  { id: "standard", label: "Standard" },
  { id: "mid_range", label: "Mid-range" },
  { id: "premium", label: "Premium" },
  { id: "luxury", label: "Luxury" },
  { id: "specific_brand", label: "Specific brand or model selected" },
  { id: "need_recommendations", label: "Need recommendations" },
] as const;

/**
 * Fixture types for the `fixture_replacement` objective (single-fixture swaps).
 */
export const FIXTURE_REPLACEMENT_TYPES = [
  { id: "sink_basin", label: "Sink / wash basin" },
  { id: "faucet", label: "Faucet" },
  { id: "toilet", label: "Toilet" },
  { id: "vanity_cabinet", label: "Vanity cabinet" },
  { id: "shower_head", label: "Shower head / trim" },
] as const;

export const ACCESSIBILITY_FEATURES = [
  "curbless_shower",
  "shower_seat",
  "handheld_shower",
  "grab_bar_blocking",
  "installed_grab_bars",
  "non_slip_flooring",
  "wider_doorway",
  "lever_handles",
  "comfort_height_toilet",
  "improved_lighting",
  "lower_storage",
  "wheelchair_turning_considerations",
  "caregiver_assistance_space",
] as const;

export const DESIGN_STYLES = [
  "warm_contemporary",
  "modern_minimal",
  "transitional",
  "traditional",
  "spa_inspired",
  "accessible_practical",
  "natural_stone",
  "budget_conscious_refresh",
] as const;

/**
 * Existing-condition concerns the homeowner can report (PRD §15).
 * The system must NOT diagnose; it only routes.
 */
export const CONDITION_CONCERNS = [
  { id: "cracked_tile", label: "Cracked tile" },
  { id: "loose_tile", label: "Loose tile" },
  { id: "soft_flooring", label: "Soft flooring" },
  { id: "water_stains", label: "Water stains" },
  { id: "active_leak", label: "Active leak", severity: "high" },
  { id: "past_leak", label: "Past leak" },
  { id: "mildew_concern", label: "Mold or mildew concern" },
  { id: "poor_ventilation", label: "Poor ventilation" },
  { id: "plumbing_noise", label: "Plumbing noise" },
  { id: "low_water_pressure", label: "Low water pressure" },
  { id: "damaged_grout", label: "Damaged grout" },
  { id: "damaged_caulk", label: "Damaged caulk" },
  { id: "peeling_paint", label: "Peeling paint" },
  { id: "ceiling_damage", label: "Ceiling damage" },
  { id: "electrical_concerns", label: "Electrical concerns" },
  { id: "missing_gfci", label: "Missing GFCI protection" },
  { id: "previous_diy", label: "Previous DIY work" },
  { id: "unpermitted_concern", label: "Unpermitted work concern" },
  { id: "asbestos_concern", label: "Asbestos concern", severity: "high" },
  { id: "lead_paint_concern", label: "Lead-paint concern", severity: "high" },
  { id: "structural_concern", label: "Structural concern", severity: "high" },
  { id: "unknown", label: "Unknown condition" },
] as const;

/**
 * Out-of-scope work that must be routed separately (PRD §5.2).
 * If any of these are flagged, the project does NOT enter the standard
 * bathroom contractor flow without review.
 */
export const OUT_OF_SCOPE_INDICATORS = [
  "emergency_plumbing",
  "drain_cleaning",
  "active_major_leak",
  "toilet_repair_only",
  "faucet_repair_only",
  "caulking_only",
  "mold_remediation",
  "asbestos_removal",
  "structural_engineering",
  "foundation_repair",
  "major_insurance_restoration",
  "commercial_restroom_remodeling",
  "diy_only_material_requests",
] as const;

/**
 * Cost categories required in every estimate (PRD §17.2).
 * Order matters for display.
 */
export const COST_CATEGORIES = [
  "design_and_planning",
  "permits_and_inspections",
  "demolition",
  "debris_removal",
  "framing",
  "structural_allowance",
  "subfloor_allowance",
  "plumbing_labor",
  "plumbing_fixtures",
  "electrical_labor",
  "lighting",
  "ventilation",
  "waterproofing",
  "shower_or_tub",
  "glass_enclosure",
  "tile_materials",
  "tile_labor",
  "flooring",
  "vanity_and_cabinetry",
  "countertop",
  "toilet",
  "mirrors_and_accessories",
  "painting",
  "trim_and_finish_carpentry",
  "site_protection",
  "project_management",
  "general_contractor_overhead",
  "contingency",
] as const;

/**
 * Permit navigator questions (PRD §20). Each maps to a permit category.
 */
export const PERMIT_QUESTIONS = [
  { id: "fixtures_moving", label: "Are fixtures moving?", category: "plumbing" },
  { id: "plumbing_changing", label: "Is plumbing changing?", category: "plumbing" },
  { id: "electrical_wiring_changing", label: "Is electrical wiring changing?", category: "electrical" },
  { id: "lighting_added_relocated", label: "Is lighting being added or relocated?", category: "electrical" },
  { id: "ventilation_modified", label: "Is ventilation being modified?", category: "mechanical" },
  { id: "wall_changing", label: "Is a wall being changed?", category: "building" },
  { id: "structural_framing_affected", label: "Is structural framing affected?", category: "building" },
  { id: "new_bathroom_created", label: "Is a new bathroom being created?", category: "building" },
  { id: "in_condominium", label: "Is the project in a condominium?", category: "hoa" },
  { id: "hoa_approval_potentially_required", label: "Is HOA approval potentially required?", category: "hoa" },
] as const;

/**
 * Service area for the initial pilot (PRD §1).
 * Rockville, MD — Montgomery County. ZIPs are a subset; jurisdiction is
 * verified server-side, not from the mailing address string.
 */
export const ROCKVILLE_SERVICE_AREA = {
  city: "Rockville",
  state: "MD",
  county: "Montgomery County",
  country: "US",
  supportedZips: [
    "20847", "20848", "20849", "20850", "20851", "20852", "20853", "20854", "20855",
    "20877", "20878", "20879", "20882",
  ],
  jurisdictionNotes:
    "City of Rockville and Montgomery County permit rules may both apply. Confirm jurisdiction by address, not mailing city.",
} as const;

export function isRockvilleZip(zip: string): boolean {
  return (ROCKVILLE_SERVICE_AREA.supportedZips as readonly string[]).includes(zip);
}

/**
 * Default estimator configuration (Phase 1 baseline).
 * This is the seed for EstimatorConfiguration rows; admins can clone and
 * publish versioned overrides. All amounts are USD integers.
 * Values are conservative internal baselines pending evidence review —
 * NOT published as public claims until a configuration is PUBLISHED.
 */
export const DEFAULT_ESTIMATOR_CONFIG = {
  version: "bathroom-rockville-2026-07-26-v1",
  locationId: "rockville-md",
  tradeId: "bathroom",
  validFrom: "2026-07-26",
  baseRates: {
    // Per-square-foot of bathroom floor area, by objective
    perSqft: {
      cosmetic_refresh: { low: 35, high: 75 },
      replace_fixtures_finishes: { low: 60, high: 140 },
      remodel_same_layout: { low: 110, high: 220 },
      full_gut: { low: 160, high: 320 },
      tub_to_shower: { low: 90, high: 180 },
      walk_in_shower: { low: 100, high: 220 },
      curbless_shower: { low: 130, high: 280 },
      layout_redesign: { low: 180, high: 360 },
      accessibility_upgrade: { low: 120, high: 260 },
      repair_damage: { low: 70, high: 160 },
      add_bathroom: { low: 280, high: 600 },
      // "unsure" prices like a same-layout remodel until the scope is clarified
      unsure: { low: 110, high: 220 },
    },
  },
  /**
   * Decomposition of the per-sqft baseline into PRD §17.2 cost categories.
   * Each share is a fraction of the objective baseline (area × per-sqft rate ×
   * type × tier × location). Shares are calibrated so a `remodel_same_layout`
   * guest bathroom reproduces the v1 flat-allowance totals, while every other
   * objective/type/tier/area scales consistently. Categories marked tier:true
   * are additionally multiplied by the finish-tier factor; showerOnly
   * categories are omitted when the scope has no shower/tub work (e.g. powder
   * rooms, existing tub retained).
   */
  categoryShares: {
    designAndPlanning: { low: 0.05, high: 0.05 },
    demolition: { low: 0.03, high: 0.03 },
    debrisRemoval: { low: 0.07, high: 0.08 },
    framing: { low: 0.05, high: 0.14 },
    subfloorAllowance: { low: 0.015, high: 0.02 },
    plumbingLabor: { low: 0.27, high: 0.32 },
    plumbingFixtures: { low: 0.14, high: 0.20, tier: true },
    electricalLabor: { low: 0.06, high: 0.06 },
    lighting: { low: 0.045, high: 0.09, tier: true },
    ventilation: { low: 0.045, high: 0.055 },
    waterproofing: { low: 0.08, high: 0.09, showerOnly: true },
    showerOrTub: { low: 0.23, high: 0.40, tier: true, showerOnly: true },
    glassEnclosure: { low: 0.14, high: 0.23, tier: true, showerOnly: true },
    tileMaterials: { low: 0.09, high: 0.20, tier: true },
    tileLabor: { low: 0.14, high: 0.20 },
    flooring: { low: 0.045, high: 0.07, tier: true },
    vanityAndCabinetry: { low: 0.11, high: 0.40, tier: true },
    countertop: { low: 0.06, high: 0.14, tier: true },
    toilet: { low: 0.045, high: 0.09, tier: true },
    mirrorsAndAccessories: { low: 0.02, high: 0.055, tier: true },
    painting: { low: 0.07, high: 0.10 },
    trimAndFinishCarpentry: { low: 0.055, high: 0.10 },
    siteProtection: { low: 0.045, high: 0.07 },
    projectManagement: { low: 0.06, high: 0.10 },
  },
  bathroomTypeFactor: {
    powder: 0.55,
    guest: 0.9,
    primary: 1.25,
    basement: 1.15,
    accessible: 1.2,
    new_addition: 1.8,
    other: 1,
  },
  qualityTierFactor: {
    entry: 0.82,
    standard: 1,
    mid_range: 1.18,
    premium: 1.4,
    luxury: 1.75,
    specific_brand: 1.3,
    need_recommendations: 1.1,
  },
  locationFactor: 1.0, // Rockville baseline = 1.0
  complexityMultipliers: {
    plumbingRelocationPerFt: 45,
    electricalModificationEach: 180,
    tileFullHeightRoomFactor: 1.25,
    curblessShowerStructuralAllowance: 1200,
    condoHighFloorFactor: 1.12,
    homeAgeOver60YearsFactor: 1.08,
    waterDamageContingencyAdd: 1500,
  },
  minimumCharge: 2500,
  /**
   * Single-fixture replacement (small-job) pricing. Used when the objective is
   * `fixture_replacement` instead of the per-sqft remodel baseline.
   * All amounts USD integers; fixture allowances are scaled by qualityTierFactor.
   */
  fixtureReplacement: {
    removalDisposal: { low: 100, high: 250 },
    plumbingLabor: { low: 250, high: 600 },
    partsAndMaterials: { low: 50, high: 150 },
    siteProtectionCleanup: { low: 50, high: 150 },
    fixtures: {
      sink_basin: { label: "Sink / wash basin fixture", low: 200, high: 600 },
      faucet: { label: "Faucet fixture", low: 120, high: 450 },
      toilet: { label: "Toilet fixture", low: 250, high: 700 },
      vanity_cabinet: { label: "Vanity cabinet", low: 500, high: 2500 },
      shower_head: { label: "Shower head / trim kit", low: 150, high: 600 },
    },
    smallJobMinimumCharge: 450,
  },
  contingencyPercent: 0.15,
  overheadPercent: 0.18,
  permitAllowance: {
    building: 350,
    plumbing: 180,
    electrical: 180,
    mechanical: 120,
  },
  methodology:
    "Deterministic per-square-foot baseline by project objective, multiplied by bathroom type, finish tier, and location factor. The baseline is decomposed into PRD cost categories via calibrated category shares (tier-scaled where noted); shower-only categories are omitted when the scope has no shower/tub work. Complexity multipliers add for plumbing relocation, electrical modifications, full-height tile, curbless shower structural allowance, condominium high-floor access, and older-home conditions. Single-fixture replacements use the itemized small-job branch (fixtureReplacement block). Contingency and GC overhead applied as percentages. Not a binding quote.",
  dataSourceNotes:
    "Internal baseline pending DMV evidence review. Numeric ranges are withheld from public display until a reviewer approves this configuration version.",
} as const;
