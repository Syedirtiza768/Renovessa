/**
 * Server-side validation for every solar endpoint (§58).
 *
 * Frontend state is never trusted: coordinates, kWh, currency, wattage and
 * file metadata are all re-validated here with hard bounds, because a bad
 * number reaching the engines produces a confident wrong answer rather than
 * an error.
 */

import { z } from "zod";

// --- Primitives ------------------------------------------------------------

export const latitudeSchema = z
  .number()
  .finite()
  .min(-90, "Latitude must be between -90 and 90")
  .max(90, "Latitude must be between -90 and 90");

export const longitudeSchema = z
  .number()
  .finite()
  .min(-180, "Longitude must be between -180 and 180")
  .max(180, "Longitude must be between -180 and 180");

export const latLngSchema = z.object({
  latitude: latitudeSchema,
  longitude: longitudeSchema,
});

/** A residential annual figure. The ceiling rejects typos like 1,300,000. */
export const annualKwhSchema = z
  .number()
  .finite()
  .positive("Annual usage must be greater than zero")
  .max(500_000, "That annual usage looks too high for a home — please check it");

export const monthlyKwhSchema = z
  .number()
  .finite()
  .positive()
  .max(50_000, "That monthly usage looks too high for a home — please check it");

export const dollarsSchema = z.number().finite().nonnegative().max(1_000_000);

export const rateDollarsPerKwhSchema = z
  .number()
  .finite()
  .positive("Your electricity rate must be greater than zero")
  .max(2, "That rate looks too high — enter dollars per kWh, e.g. 0.16");

export const panelWattsSchema = z
  .number()
  .finite()
  .min(100, "Panel wattage looks too low")
  .max(1000, "Panel wattage looks too high");

export const azimuthSchema = z.number().finite().min(0).max(360);
export const pitchSchema = z.number().finite().min(0).max(85);

// --- Requests --------------------------------------------------------------

export const geocodeRequestSchema = z.object({
  query: z.string().trim().min(4, "Enter a street address").max(200),
});

export const buildingInsightsRequestSchema = z.object({
  location: latLngSchema,
  projectId: z.string().cuid().optional(),
});

export const createSolarProjectSchema = z.object({
  plannerMode: z.enum(["quick", "detailed"]).default("quick"),
  clientGeneratedId: z.string().uuid().optional(),
  answers: z.record(z.string(), z.string()).optional(),
});

export const updateSolarProjectSchema = z.object({
  plannerMode: z.enum(["quick", "detailed"]).optional(),
  currentStep: z.string().max(60).optional(),
  answers: z.record(z.string(), z.string()).optional(),
  propertyType: z.string().max(60).optional(),
  ownershipStatus: z.string().max(60).optional(),
  occupancyStatus: z.string().max(60).optional(),
  projectGoal: z.string().max(80).optional(),
  timelineCategory: z.string().max(60).optional(),
});

export const setAddressSchema = z.object({
  formattedAddress: z.string().trim().min(4).max(300),
  streetLine: z.string().max(200).optional(),
  city: z.string().max(120).optional(),
  state: z.string().max(60).optional(),
  postalCode: z.string().max(20).optional(),
  county: z.string().max(120).optional(),
  location: latLngSchema,
  geocodeQuality: z.string().max(40).optional(),
});

export const manualRoofFaceSchema = z.object({
  azimuthDegrees: azimuthSchema,
  pitchDegrees: pitchSchema,
  areaSquareFeet: z
    .number()
    .finite()
    .positive("Roof face area must be greater than zero")
    .max(20_000, "That roof face looks too large — please check it"),
});

export const roofAnalysisRequestSchema = z.discriminatedUnion("mode", [
  z.object({
    mode: z.literal("provider"),
    location: latLngSchema,
  }),
  z.object({
    mode: z.literal("manual"),
    location: latLngSchema,
    faces: z.array(manualRoofFaceSchema).min(1, "Add at least one roof face").max(12),
    panelCapacityWatts: panelWattsSchema.optional(),
  }),
]);

export const confirmBuildingSchema = z.object({
  confirmed: z.boolean(),
  /** Set when the homeowner says the property changed since the imagery date. */
  propertyChangedSinceImagery: z.boolean().optional(),
});

export const consumptionInputSchema = z
  .object({
    monthlyKwh: z.array(monthlyKwhSchema.nullable()).max(12).optional(),
    annualKwh: annualKwhSchema.optional(),
    utilityProvidedAnnualKwh: annualKwhSchema.optional(),
    averageMonthlyBillDollars: dollarsSchema.optional(),
    blendedRateDollarsPerKwh: rateDollarsPerKwhSchema.optional(),
    fixedMonthlyChargeDollars: dollarsSchema.optional(),
  })
  .refine(
    (v) => !(v.averageMonthlyBillDollars && !v.blendedRateDollarsPerKwh),
    // Enforce §20's rule at the boundary rather than silently guessing a rate.
    { message: "To use a dollar amount we need your electricity rate in $/kWh", path: ["blendedRateDollarsPerKwh"] },
  );

export const layoutStrategySchema = z.enum([
  "MAXIMIZE_PRODUCTION",
  "TARGET_OFFSET",
  "MAXIMIZE_COUNT",
  "MANUAL",
]);

export const planRequestSchema = z.object({
  strategy: layoutStrategySchema.default("MAXIMIZE_PRODUCTION"),
  panelCount: z.number().int().nonnegative().max(400).optional(),
  targetOffsetFraction: z.number().min(0.1).max(2).optional(),
  excludedSegmentIndices: z.array(z.number().int().nonnegative().max(200)).max(200).optional(),
  explicitPanelIds: z.array(z.string().max(40)).max(400).optional(),
  consumption: consumptionInputSchema.optional(),
  answers: z
    .object({
      mainPanelUpgradeExpected: z.boolean().optional(),
      serviceUpgradeExpected: z.boolean().optional(),
      arrayOnDetachedStructure: z.boolean().optional(),
      reroofPlanned: z.boolean().optional(),
    })
    .optional(),
  electricalInfoComplete: z.boolean().optional(),
  /** Persist the result. False for the live preview while the homeowner drags. */
  persist: z.boolean().default(false),
});

export const tariffSelectionSchema = z.object({
  tariffId: z.string().max(120),
  utilityName: z.string().max(200),
  tariffName: z.string().max(200),
  providerId: z.string().max(60),
  effectiveDate: z.string().max(20).optional(),
  blendedEnergyRateDollarsPerKwh: rateDollarsPerKwhSchema.optional(),
  fixedMonthlyChargeDollars: dollarsSchema.optional(),
  hasComplexStructure: z.boolean(),
  sourceUri: z.string().url().max(500).optional(),
  confirmed: z.boolean(),
});

/** Mirrors the bathroom RFP schema so the shared lead pipeline stays uniform. */
export const solarRfpSubmissionSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required").max(80),
  lastName: z.string().trim().max(80).optional(),
  email: z.string().trim().email("Enter a valid email address").max(200),
  phone: z
    .string()
    .trim()
    .refine((v) => v.replace(/\D/g, "").length >= 10, "Enter a valid phone number"),
  zipCode: z.string().trim().regex(/^\d{5}$/, "Enter a 5-digit ZIP code"),
  timeline: z.string().max(60).optional(),
  preferredContact: z.string().max(40).optional(),
  preferredContactTimes: z.string().max(120).optional(),
  maxContractors: z.number().int().min(1).max(3).default(3),
  termsAccepted: z.literal(true),
  privacyAcknowledged: z.literal(true),
  notes: z.string().max(2000).optional(),
  tcpaConsent: z.boolean(),
});

export type PlanRequest = z.infer<typeof planRequestSchema>;
export type RoofAnalysisRequest = z.infer<typeof roofAnalysisRequestSchema>;
export type SolarRfpSubmission = z.infer<typeof solarRfpSubmissionSchema>;
