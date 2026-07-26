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

export async function assertBathroomProjectAccess(
  session: SessionUser | null,
  projectId: string,
) {
  if (!session) throw new AuthError("Authentication required");

  const project = await prisma.bathroomProject.findUnique({ where: { id: projectId } });
  if (!project) throw new AuthError("Bathroom project not found", 404);

  const isAdmin = ADMIN_ROLES.includes(session.role);
  const isOwner = project.homeownerId === session.id;

  if (!isAdmin && !isOwner) {
    throw new AuthError("Not authorized to access this bathroom project");
  }

  return project;
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
