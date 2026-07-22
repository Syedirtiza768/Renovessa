import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { verifyUnsubscribeToken, normalizeEmail } from "@/lib/unsubscribe";
import { recordCommunicationOptOut, requestEvidence } from "@/lib/compliance";

/**
 * Public one-click unsubscribe. No auth: the signed token is the credential.
 * Adds the address to EmailSuppression (idempotent) so future segment resolves
 * and bulk sends skip it. Returns a minimal HTML confirmation page.
 */
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token") || "";
  const email = token ? verifyUnsubscribeToken(token) : null;

  if (!email) {
    return htmlResponse(
      "Invalid unsubscribe link",
      "This unsubscribe link is invalid or has expired. If you continue to receive emails, reply to any of them and we'll remove you.",
      400
    );
  }

  const normalized = normalizeEmail(email);
  await prisma.emailSuppression.upsert({
    where: { email: normalized },
    update: {},
    create: { email: normalized, reason: "unsubscribe" },
  });
  await recordCommunicationOptOut({
    channel: "EMAIL",
    value: normalized,
    reason: "unsubscribe",
    source: "signed_email_unsubscribe_link",
    evidence: requestEvidence(req),
  });

  return htmlResponse(
    "You've been unsubscribed",
    `${normalized} has been removed from Renovessa marketing emails. You won't receive further outreach from us.`,
    200
  );
}

function htmlResponse(title: string, message: string, status: number): Response {
  const body = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="robots" content="noindex" />
<title>${title} — Renovessa</title>
<style>
  body { font-family: system-ui, -apple-system, sans-serif; background:#f7f7f5; color:#1a1a1a; margin:0; }
  .wrap { max-width: 32rem; margin: 12vh auto; padding: 2rem; background:#fff; border-radius:12px; box-shadow:0 1px 4px rgba(0,0,0,.08); }
  h1 { font-size: 1.25rem; margin: 0 0 .75rem; }
  p { line-height: 1.55; color:#444; margin: 0; }
  .brand { font-weight: 700; letter-spacing:.02em; color:#b06a3b; margin-bottom: 1.25rem; }
</style>
</head>
<body>
  <div class="wrap">
    <div class="brand">Renovessa</div>
    <h1>${title}</h1>
    <p>${message}</p>
  </div>
</body>
</html>`;
  return new Response(body, {
    status,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
