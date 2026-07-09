import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import type { UserRole } from "@prisma/client";

const COOKIE_NAME = "renovessa_session";

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}

function getSecret() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is not set");
  return new TextEncoder().encode(secret);
}

export async function createSession(user: SessionUser) {
  const token = await new SignJWT({ user })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getSecret());

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, getSecret());
    return payload.user as SessionUser;
  } catch {
    return null;
  }
}

export async function destroySession() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export function portalPathForRole(role: UserRole): string {
  switch (role) {
    case "HOMEOWNER":
      return "/portal/homeowner";
    case "CONTRACTOR":
      return "/portal/contractor";
    case "OPS_AGENT":
    case "SCHEDULER":
      return "/portal/admin/my-leads";
    default:
      return "/portal/admin";
  }
}

export function canManageTeam(role: UserRole): boolean {
  return ["SUPER_ADMIN", "OPS_MANAGER"].includes(role);
}

export interface AdminNavItem {
  href: string;
  label: string;
}

export function getAdminNavItems(role: UserRole): AdminNavItem[] {
  const isFieldAgent = ["OPS_AGENT", "SCHEDULER"].includes(role);

  if (isFieldAgent) {
    return [
      { href: "/portal/admin/my-leads", label: "My Leads" },
      { href: "/portal/admin/dialer", label: "Dialer" },
      { href: "/portal/admin/operations", label: "Operations Queues" },
      { href: "/portal/admin/leads", label: "All Leads" },
      { href: "/portal/admin/appointments", label: "Appointments" },
    ];
  }

  const items: AdminNavItem[] = [
    { href: "/portal/admin", label: "Command Center" },
    { href: "/portal/admin/my-leads", label: "My Leads" },
    { href: "/portal/admin/dialer", label: "Dialer" },
    { href: "/portal/admin/leads", label: "Lead Pipeline" },
    { href: "/portal/admin/operations", label: "Operations Queues" },
    { href: "/portal/admin/appointments", label: "Appointments" },
    { href: "/portal/admin/contractors", label: "Contractors" },
    { href: "/portal/admin/campaigns", label: "Campaigns" },
    { href: "/portal/admin/capacity", label: "Capacity Map" },
    { href: "/portal/admin/finance", label: "Finance" },
    { href: "/portal/admin/disputes", label: "Disputes" },
  ];

  if (canManageTeam(role)) {
    items.splice(6, 0, { href: "/portal/admin/team", label: "Team" });
    items.splice(7, 0, { href: "/portal/admin/phone-numbers", label: "Phone Numbers" });
  }

  return items;
}

export function canAccessAdmin(role: UserRole): boolean {
  return [
    "SUPER_ADMIN",
    "OPS_AGENT",
    "SCHEDULER",
    "FINANCE_MANAGER",
    "OPS_MANAGER",
    "QA_MANAGER",
    "CONTRACTOR_ACQUISITION",
  ].includes(role);
}
