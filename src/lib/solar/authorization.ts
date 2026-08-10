/**
 * Authorization for solar project resources.
 * Mirrors src/lib/bathroom/authorization.ts.
 */

import { prisma } from "@/lib/db";
import type { SessionUser } from "@/lib/auth";
import { AuthError } from "@/lib/authorization";

const ADMIN_ROLES = [
  "SUPER_ADMIN",
  "OPS_AGENT",
  "SCHEDULER",
  "FINANCE_MANAGER",
  "OPS_MANAGER",
  "QA_MANAGER",
  "CONTRACTOR_ACQUISITION",
];

/**
 * Allows admins, the owning homeowner, and anonymous access to unclaimed
 * drafts — the planner must work before signup (§39).
 */
export async function assertSolarProjectAccess(session: SessionUser | null, projectId: string) {
  const project = await prisma.solarProject.findUnique({ where: { id: projectId } });
  if (!project) throw new AuthError("Solar project not found", 404);

  // Anonymous public planner draft.
  if (!project.homeownerId) return project;

  if (!session) throw new AuthError("Authentication required");

  const isAdmin = ADMIN_ROLES.includes(session.role);
  const isOwner = project.homeownerId === session.id;
  if (!isAdmin && !isOwner) {
    throw new AuthError("Not authorized to access this solar project");
  }
  return project;
}

export function isAdminRole(role: string): boolean {
  return ADMIN_ROLES.includes(role);
}
