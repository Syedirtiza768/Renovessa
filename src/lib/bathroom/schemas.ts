/**
 * Zod schemas for bathroom API input validation (PRD §28, §37).
 * Every server-side input is validated. Geometry payloads are constrained.
 */

import { z } from "zod";

export const bathroomTypeSchema = z.enum([
  "powder", "guest", "primary", "basement", "accessible", "new_addition", "other",
]);

export const projectObjectiveSchema = z.enum([
  "cosmetic_refresh", "replace_fixtures_finishes", "remodel_same_layout", "full_gut",
  "tub_to_shower", "walk_in_shower", "curbless_shower", "layout_redesign",
  "accessibility_upgrade", "repair_damage", "add_bathroom", "unsure",
]);

export const plannerModeSchema = z.enum(["quick", "detailed"]);

export const confidenceLevelSchema = z.enum(["HIGH", "MEDIUM", "LOW"]);

export const createBathroomProjectSchema = z.object({
  clientGeneratedId: z.string().uuid().optional(),
  plannerMode: plannerModeSchema.default("detailed"),
  bathroomType: bathroomTypeSchema.optional(),
  projectObjective: projectObjectiveSchema.optional(),
  propertyType: z.string().max(60).optional(),
  ownershipStatus: z.string().max(60).optional(),
  occupancyStatus: z.string().max(60).optional(),
  budgetMinimum: z.number().int().nonnegative().max(1_000_000).optional(),
  budgetMaximum: z.number().int().nonnegative().max(1_000_000).optional(),
  desiredStartDate: z.string().max(40).optional(),
  timelineCategory: z.string().max(40).optional(),
  answers: z.record(z.string(), z.string()).default({}),
});

export const updateBathroomProjectSchema = createBathroomProjectSchema.partial().extend({
  currentStep: z.string().max(60).optional(),
  completionPercentage: z.number().int().min(0).max(100).optional(),
  status: z.enum([
    "DRAFT", "IN_PROGRESS", "BRIEF_READY", "RFQ_SUBMITTED", "MATCHING",
    "CONTRACTOR_INVITED", "CONTACT_RELEASED", "PROPOSAL_RECEIVED", "CLOSED", "WITHDRAWN",
  ]).optional(),
});

export const wallSegmentSchema = z.object({
  x1: z.number().finite(),
  y1: z.number().finite(),
  x2: z.number().finite(),
  y2: z.number().finite(),
  thickness: z.number().positive().max(36).optional(),
});

export const fixturePlacementSchema = z.object({
  type: z.string().max(40),
  x: z.number().finite(),
  y: z.number().finite(),
  w: z.number().positive().max(120),
  d: z.number().positive().max(120),
  rotation: z.number().min(-360).max(360).default(0),
  existingStatus: z.string().max(40).optional(),
  proposedAction: z.string().max(40).optional(),
  qualityTier: z.string().max(40).optional(),
  brand: z.string().max(80).optional(),
  model: z.string().max(80).optional(),
  metadata: z.any().optional(),
});

export const layoutGeometrySchema = z.object({
  walls: z.array(wallSegmentSchema).max(40),
  fixtures: z.array(fixturePlacementSchema).max(80),
  ceilingHeight: z.number().positive().max(180).optional(),
  unit: z.enum(["in", "cm"]).default("in"),
});

export const createLayoutSchema = z.object({
  layoutType: z.enum(["EXISTING", "PROPOSED", "ESSENTIAL", "BALANCED", "PREMIUM"]),
  name: z.string().max(120).optional(),
  geometry: layoutGeometrySchema,
  isConfirmed: z.boolean().default(false),
});

export const updateLayoutSchema = createLayoutSchema.partial().extend({
  geometry: layoutGeometrySchema.optional(),
});

export const measurementSchema = z.object({
  measurementMethod: z.enum(["simple", "guided", "manual", "upload"]),
  unitSystem: z.enum(["imperial", "metric"]).default("imperial"),
  ceilingHeight: z.number().positive().max(180).optional(),
  isConfirmed: z.boolean().default(false),
  source: z.string().max(120).optional(),
  metadata: z.any().optional(),
});

export const conditionSchema = z.object({
  conditionType: z.string().max(60),
  severity: z.string().max(20).optional(),
  homeownerReported: z.boolean().default(true),
  inspectionRequired: z.boolean().default(false),
  notes: z.string().max(2000).optional(),
  mediaIds: z.array(z.string().max(120)).max(20).default([]),
});

export const selectionSchema = z.object({
  category: z.string().max(60),
  selectionType: z.string().max(60).optional(),
  qualityTier: z.string().max(40).optional(),
  brand: z.string().max(80).optional(),
  model: z.string().max(80).optional(),
  quantity: z.number().nonnegative().optional(),
  unit: z.string().max(20).optional(),
  metadata: z.any().optional(),
});

export const estimateInputsSchema = z.object({
  objective: z.string().max(60),
  bathroomType: z.string().max(40),
  finishTier: z.string().max(40).default("standard"),
  floorAreaSqft: z.number().positive().max(2000),
  plumbingRelocationFt: z.number().nonnegative().max(50).default(0),
  electricalModifications: z.number().int().nonnegative().max(40).default(0),
  tileFullHeightRoom: z.boolean().default(false),
  curblessShower: z.boolean().default(false),
  condoHighFloor: z.boolean().default(false),
  homeAgeYears: z.number().int().nonnegative().max(300).default(20),
  waterDamageReported: z.boolean().default(false),
  inRockville: z.boolean().default(true),
});

export const permitAnswersSchema = z.object({
  fixtures_moving: z.boolean().optional(),
  plumbing_changing: z.boolean().optional(),
  electrical_wiring_changing: z.boolean().optional(),
  lighting_added_relocated: z.boolean().optional(),
  ventilation_modified: z.boolean().optional(),
  wall_changing: z.boolean().optional(),
  structural_framing_affected: z.boolean().optional(),
  new_bathroom_created: z.boolean().optional(),
  in_condominium: z.boolean().optional(),
  hoa_approval_potentially_required: z.boolean().optional(),
});

export const rfqPromotionSchema = z.object({
  firstName: z.string().min(1).max(60),
  lastName: z.string().min(1).max(60),
  email: z.string().email(),
  phone: z.string().regex(/^\d{10}$/, "Valid 10-digit US phone number is required"),
  zipCode: z.string().regex(/^\d{5}$/, "ZIP code must be 5 digits"),
  preferredContact: z.string().max(40).optional(),
  tcpaConsent: z.boolean().default(false),
  termsAccepted: z.literal(true),
  privacyAcknowledged: z.literal(true),
  maxContractors: z.number().int().min(1).max(5).default(3),
  notes: z.string().max(4000).optional(),
});

export const proposalSchema = z.object({
  totalPrice: z.number().int().nonnegative().max(1_000_000),
  includedScope: z.string().max(8000),
  exclusions: z.string().max(4000),
  materialAllowances: z.string().max(2000).optional(),
  fixtureAllowances: z.string().max(2000).optional(),
  permitHandling: z.string().max(500).optional(),
  estimatedStartDate: z.string().max(40).optional(),
  estimatedDuration: z.string().max(60).optional(),
  paymentSchedule: z.string().max(500).optional(),
  warranty: z.string().max(500).optional(),
  changeOrderProcess: z.string().max(500).optional(),
  optionalUpgrades: z.string().max(2000).optional(),
  expirationDate: z.string().datetime().optional(),
  proposalDocumentUrl: z.string().url().optional(),
});

export const estimatorConfigSchema = z.object({
  name: z.string().min(1).max(120),
  version: z.string().min(1).max(80),
  validFrom: z.string().datetime(),
  validTo: z.string().datetime().optional(),
  configurationJson: z.record(z.string(), z.any()),
  methodology: z.string().max(4000).optional(),
  locationId: z.string().max(60).optional(),
  tradeId: z.string().max(60).optional(),
});

export const contentVersionSchema = z.object({
  slug: z.string().min(1).max(120),
  title: z.string().min(1).max(200),
  bodyHtml: z.string().max(200_000),
  bodyText: z.string().max(200_000),
  author: z.string().max(120).optional(),
  reviewer: z.string().max(120).optional(),
  methodology: z.string().max(4000).optional(),
  sourceLinks: z.array(z.string().url()).max(40).default([]),
  editorialNotes: z.string().max(4000).optional(),
  applicableLocation: z.string().max(120).optional(),
  applicableTrade: z.string().max(60).optional(),
  status: z.enum(["draft", "published", "retired"]).default("draft"),
});
