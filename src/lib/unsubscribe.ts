import crypto from "crypto";

/**
 * One-click unsubscribe tokens for bulk email. Each token is a signed,
 * self-contained payload of the recipient's email so the public unsubscribe
 * route can verify it without a database lookup or a login. Tokens do not
 * expire — an unsubscribe link should keep working indefinitely.
 */

function getSecret(): string {
  const secret = process.env.UNSUBSCRIBE_SECRET;
  if (!secret) throw new Error("UNSUBSCRIBE_SECRET is not set");
  return secret;
}

function base64url(input: Buffer | string): string {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function fromBase64url(input: string): string {
  return Buffer.from(input.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8");
}

function sign(payload: string): string {
  return crypto.createHmac("sha256", getSecret()).update(payload).digest("hex");
}

/** Normalizes an email for signing, storage, and comparison. */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** Builds a signed unsubscribe token for the given email. */
export function makeUnsubscribeToken(email: string): string {
  const payload = base64url(normalizeEmail(email));
  return `${payload}.${sign(payload)}`;
}

/**
 * Verifies a token and returns the email it was issued for, or null if the
 * token is malformed or the signature does not match.
 */
export function verifyUnsubscribeToken(token: string): string | null {
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;
  const expected = sign(payload);
  // Constant-time compare to avoid leaking signature bytes via timing.
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    return fromBase64url(payload);
  } catch {
    return null;
  }
}

/** Absolute unsubscribe URL for a recipient. */
export function unsubscribeUrl(email: string): string {
  const base = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:7090";
  return `${base.replace(/\/$/, "")}/api/unsubscribe?token=${encodeURIComponent(
    makeUnsubscribeToken(email)
  )}`;
}

/**
 * CAN-SPAM compliant footer appended to every bulk email: a physical mailing
 * address and a working unsubscribe link. Kept plain-text to match the rest of
 * the ops email tone (all sends are text/plain).
 */
export function complianceFooter(email: string): string {
  const address = process.env.MAILING_ADDRESS || "Renovessa";
  return `\n\n—\nThis business message was sent by Renovessa.\n${address}\nUnsubscribe: ${unsubscribeUrl(email)}`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * HTML variant of the compliance footer for multipart sends. Renders the
 * unsubscribe as a labelled "Unsubscribe" hyperlink rather than a raw URL, and
 * carries the same physical mailing address for CAN-SPAM.
 */
export function complianceFooterHtml(email: string): string {
  const address = process.env.MAILING_ADDRESS || "Renovessa";
  const url = unsubscribeUrl(email);
  return (
    `<p style="color:#8a8a8a;font-size:12px;line-height:1.6;margin:28px 0 0;` +
    `border-top:1px solid #e6e6e6;padding-top:14px">` +
    `This business message was sent by Renovessa.<br>` +
    `${escapeHtml(address)}<br>` +
    `<a href="${escapeHtml(url)}" style="color:#8a8a8a;text-decoration:underline">Unsubscribe</a>` +
    `</p>`
  );
}
