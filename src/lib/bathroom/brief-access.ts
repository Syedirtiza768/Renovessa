import { randomBytes } from "node:crypto";

const BRIEF_ACCESS_DAYS = 14;

export function generateBriefAccessToken(): string {
  return randomBytes(24).toString("base64url");
}

export function briefAccessExpiresAt(now = new Date()): Date {
  return new Date(now.getTime() + BRIEF_ACCESS_DAYS * 24 * 60 * 60 * 1000);
}

export function isValidBriefAccessToken(params: {
  token: string | null;
  storedToken: string | null;
  expiresAt: Date | null;
  now?: Date;
}): boolean {
  const now = params.now ?? new Date();
  return Boolean(
    params.token &&
      params.storedToken &&
      params.token === params.storedToken &&
      params.expiresAt &&
      params.expiresAt.getTime() > now.getTime(),
  );
}

export function publicAppUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL || "https://renovessa.com").replace(/\/$/, "");
}

export function buildBriefPdfUrl(projectId: string, token: string): string {
  return `${publicAppUrl()}/api/bathroom-projects/${encodeURIComponent(projectId)}/brief/pdf?token=${encodeURIComponent(token)}`;
}
