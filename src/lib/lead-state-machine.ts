import type { LeadStatus } from "@prisma/client";

/**
 * Valid lead status transitions.
 * The state machine is law — APIs reject jumps that aren't listed here.
 */
const TRANSITIONS: Record<LeadStatus, LeadStatus[]> = {
  NEW: ["ASSIGNED"],
  ASSIGNED: ["CALLING"],
  CALLING: ["QUALIFICATION_IN_PROGRESS"],
  QUALIFICATION_IN_PROGRESS: ["QUALIFIED", "UNQUALIFIED"],
  QUALIFIED: ["APPOINTMENT_OFFERED"],
  APPOINTMENT_OFFERED: ["APPOINTMENT_CONFIRMED", "QUALIFIED"],
  // APPOINTMENT_CONFIRMED can also go to APPOINTMENT_OFFERED (admin reassigns contractor)
  // or to CLOSED (appointment cancelled before completion)
  APPOINTMENT_CONFIRMED: ["APPOINTMENT_COMPLETED", "APPOINTMENT_OFFERED", "CLOSED"],
  // APPOINTMENT_COMPLETED can go to RECYCLE (no-show, rebook) or CLOSED (no-show, abandon)
  APPOINTMENT_COMPLETED: ["HOMEOWNER_CONFIRMED", "RECYCLE", "CLOSED"],
  HOMEOWNER_CONFIRMED: ["BILLING_PENDING"],
  BILLING_PENDING: ["BILLING_APPROVED", "DISPUTED"],
  BILLING_APPROVED: ["CLOSED"],
  DISPUTED: ["CLOSED"],
  UNQUALIFIED: ["CLOSED"],
  CLOSED: [],
  RECYCLE: ["NEW"],
  SCHEDULING: ["APPOINTMENT_OFFERED"],
};

/**
 * Check if a lead status transition is valid.
 */
export function canTransitionLead(from: LeadStatus, to: LeadStatus): boolean {
  return TRANSITIONS[from]?.includes(to) ?? false;
}

/**
 * Returns the list of valid next statuses for a given lead status.
 */
export function validLeadTransitions(from: LeadStatus): LeadStatus[] {
  return TRANSITIONS[from] ?? [];
}
