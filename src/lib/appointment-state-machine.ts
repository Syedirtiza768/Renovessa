import type { AppointmentStatus } from "@prisma/client";

/**
 * Valid appointment status transitions.
 * The state machine is law — APIs reject jumps that aren't listed here.
 */
const TRANSITIONS: Record<AppointmentStatus, AppointmentStatus[]> = {
  OFFERED: ["ACCEPTED", "DECLINED", "CANCELLED"],
  ACCEPTED: ["SCHEDULED"],
  DECLINED: [],
  SCHEDULED: ["REMINDER_SENT", "CHECKED_IN", "NO_SHOW", "CANCELLED"],
  REMINDER_SENT: ["CHECKED_IN", "NO_SHOW"],
  IN_PROGRESS: ["CHECKED_IN", "COMPLETED"],
  CHECKED_IN: ["COMPLETED"],
  COMPLETED: ["HOMEOWNER_CONFIRMED", "DISPUTED"],
  HOMEOWNER_CONFIRMED: ["BILLED"],
  NO_SHOW: [],
  DISPUTED: [],
  BILLED: [],
  CANCELLED: [],
};

/**
 * Check if an appointment status transition is valid.
 */
export function canTransitionAppointment(from: AppointmentStatus, to: AppointmentStatus): boolean {
  return TRANSITIONS[from]?.includes(to) ?? false;
}

/**
 * Returns the list of valid next statuses for a given appointment status.
 */
export function validAppointmentTransitions(from: AppointmentStatus): AppointmentStatus[] {
  return TRANSITIONS[from] ?? [];
}
