/**
 * Resource-level authorization helpers.
 * Used by API routes to verify the session user owns or is allowed
 * to access a given resource.
 */

import { prisma } from "./db";
import type { SessionUser } from "./auth";

/**
 * Verifies the session user is an admin (any ops role).
 * Throws if not authorized.
 */
export async function assertAdminAccess(session: SessionUser | null): Promise<SessionUser> {
  if (!session) throw new AuthError("Authentication required");
  const adminRoles = [
    "SUPER_ADMIN",
    "OPS_AGENT",
    "SCHEDULER",
    "FINANCE_MANAGER",
    "OPS_MANAGER",
    "QA_MANAGER",
    "CONTRACTOR_ACQUISITION",
  ];
  if (!adminRoles.includes(session.role)) {
    throw new AuthError("Admin access required");
  }
  return session;
}

/**
 * Verifies the session user is the homeowner who owns the lead,
 * or is an admin. Returns the lead.
 */
export async function assertLeadAccess(
  session: SessionUser | null,
  leadId: string
) {
  if (!session) throw new AuthError("Authentication required");

  const lead = await prisma.projectRequest.findUnique({ where: { id: leadId } });
  if (!lead) throw new AuthError("Lead not found", 404);

  const isAdmin = [
    "SUPER_ADMIN",
    "OPS_AGENT",
    "SCHEDULER",
    "FINANCE_MANAGER",
    "OPS_MANAGER",
    "QA_MANAGER",
    "CONTRACTOR_ACQUISITION",
  ].includes(session.role);

  const isOwner = lead.homeownerId === session.id;

  if (!isAdmin && !isOwner) {
    throw new AuthError("Not authorized to access this lead");
  }

  return lead;
}

/**
 * Verifies the session user is the contractor assigned to the appointment,
 * or is an admin. Returns the appointment.
 */
export async function assertAppointmentAccess(
  session: SessionUser | null,
  appointmentId: string
) {
  if (!session) throw new AuthError("Authentication required");

  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: { contractor: true },
  });
  if (!appointment) throw new AuthError("Appointment not found", 404);

  const isAdmin = [
    "SUPER_ADMIN",
    "OPS_AGENT",
    "SCHEDULER",
    "FINANCE_MANAGER",
    "OPS_MANAGER",
    "QA_MANAGER",
    "CONTRACTOR_ACQUISITION",
  ].includes(session.role);

  const isContractor = appointment.contractor.userId === session.id;

  if (!isAdmin && !isContractor) {
    throw new AuthError("Not authorized to access this appointment");
  }

  return appointment;
}

/**
 * Verifies the session user is the contractor who owns the appointment.
 * Used for contractor-only actions (accept, check-in, decline).
 */
export async function assertContractorOwnsAppointment(
  session: SessionUser | null,
  appointmentId: string
) {
  if (!session) throw new AuthError("Authentication required");
  if (session.role !== "CONTRACTOR") {
    throw new AuthError("Contractor access required");
  }

  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: { contractor: true },
  });
  if (!appointment) throw new AuthError("Appointment not found", 404);

  if (appointment.contractor.userId !== session.id) {
    throw new AuthError("Not authorized to access this appointment");
  }

  return appointment;
}

export class AuthError extends Error {
  status: number;
  constructor(message: string, status = 403) {
    super(message);
    this.name = "AuthError";
    this.status = status;
  }
}
