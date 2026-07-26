/**
 * Authorization helpers for bathroom project resources (PRD §37).
 * Mirrors src/lib/authorization.ts patterns.
 */

import { prisma } from "@/lib/db";
import type { SessionUser } from "@/lib/auth";
import { AuthError } from "@/lib/authorization";

const ADMIN_ROLES = [
  "SUPER_ADMIN", "OPS_AGENT", "SCHEDULER", "FINANCE_MANAGER",
  "OPS_MANAGER", "QA_MANAGER", "CONTRACTOR_ACQUISITION",
];

/**
 * Allows:
 * - Admins
 * - Owning homeowner
 * - Owning contractor (white-label proposal studio)
 * - Anonymous access to drafts with no homeownerId and no contractorOwnerId
 */
export async function assertBathroomProjectAccess(
  session: SessionUser | null,
  projectId: string,
) {
  const project = await prisma.bathroomProject.findUnique({
    where: { id: projectId },
    include: { contractorOwner: { select: { id: true, userId: true } } },
  });
  if (!project) throw new AuthError("Bathroom project not found", 404);

  // Anonymous public planner drafts (no homeowner, no contractor owner)
  if (!project.homeownerId && !project.contractorOwnerId) {
    return project;
  }

  if (!session) throw new AuthError("Authentication required");

  const isAdmin = ADMIN_ROLES.includes(session.role);
  const isOwner = project.homeownerId === session.id;
  const isContractorOwner =
    session.role === "CONTRACTOR" &&
    project.contractorOwner?.userId === session.id;

  if (!isAdmin && !isOwner && !isContractorOwner) {
    throw new AuthError("Not authorized to access this bathroom project");
  }

  return project;
}

/** Resolve the logged-in contractor's profile or throw. */
export async function requireContractorProfile(session: SessionUser | null) {
  if (!session || session.role !== "CONTRACTOR") {
    throw new AuthError("Contractor access required", 403);
  }
  const profile = await prisma.contractorProfile.findUnique({ where: { userId: session.id } });
  if (!profile) throw new AuthError("Contractor profile not found", 404);
  return profile;
}

/** Assert the project is owned by this contractor profile. */
export async function assertContractorOwnsBathroomProject(
  session: SessionUser | null,
  projectId: string,
) {
  const profile = await requireContractorProfile(session);
  const project = await prisma.bathroomProject.findUnique({ where: { id: projectId } });
  if (!project) throw new AuthError("Bathroom project not found", 404);
  if (project.contractorOwnerId !== profile.id) {
    throw new AuthError("Not authorized to access this job");
  }
  return { project, profile };
}

export async function assertBathroomProjectOwner(
  session: SessionUser | null,
  projectId: string,
) {
  if (!session) throw new AuthError("Authentication required");
  if (session.role !== "HOMEOWNER") {
    throw new AuthError("Homeowner access required");
  }

  const project = await prisma.bathroomProject.findUnique({ where: { id: projectId } });
  if (!project) throw new AuthError("Bathroom project not found", 404);

  if (project.homeownerId !== session.id) {
    throw new AuthError("Not authorized to access this bathroom project");
  }

  return project;
}

export function isAdminRole(role: string): boolean {
  return ADMIN_ROLES.includes(role);
}
