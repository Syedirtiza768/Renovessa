import crypto from "crypto";

/**
 * Verifies the signature on a SendGrid Event Webhook request.
 *
 * SendGrid signs `timestamp + rawBody` with ECDSA (P-256) and sends the
 * base64 DER signature in `X-Twilio-Email-Event-Webhook-Signature` and the
 * timestamp in `X-Twilio-Email-Event-Webhook-Timestamp`. The verification key
 * (base64 DER SubjectPublicKeyInfo) is shown in the SendGrid webhook settings
 * once "Signed Event Webhook" is enabled.
 *
 * If SENDGRID_WEBHOOK_VERIFICATION_KEY is not set we treat verification as
 * disabled and return true — convenient in local/dev, but the key SHOULD be set
 * in production so forged events can't poison the suppression list.
 */
export function verifySendGridSignature(params: {
  rawBody: string;
  signature: string | null;
  timestamp: string | null;
}): boolean {
  const publicKeyB64 = process.env.SENDGRID_WEBHOOK_VERIFICATION_KEY;
  if (!publicKeyB64) return true; // verification disabled

  const { rawBody, signature, timestamp } = params;
  if (!signature || !timestamp) return false;

  try {
    const keyObject = crypto.createPublicKey({
      key: Buffer.from(publicKeyB64, "base64"),
      format: "der",
      type: "spki",
    });
    const signed = Buffer.from(timestamp + rawBody, "utf8");
    return crypto.verify(
      "sha256",
      signed,
      keyObject,
      Buffer.from(signature, "base64")
    );
  } catch {
    return false;
  }
}
