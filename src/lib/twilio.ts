import twilio from "twilio";
import { prisma } from "./db";
import { logAuditEvent } from "./audit";

export class TwilioCallError extends Error {}

let client: ReturnType<typeof twilio> | null = null;

function getTwilioClient() {
  if (client) return client;
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (!accountSid || !authToken) {
    throw new TwilioCallError("Twilio is not configured (missing TWILIO_ACCOUNT_SID/TWILIO_AUTH_TOKEN)");
  }
  client = twilio(accountSid, authToken);
  return client;
}

export function getTwilioWebhookBaseUrl() {
  const url = process.env.TWILIO_WEBHOOK_BASE_URL || process.env.NEXT_PUBLIC_APP_URL;
  if (!url) throw new TwilioCallError("TWILIO_WEBHOOK_BASE_URL / NEXT_PUBLIC_APP_URL is not set");
  return url.replace(/\/$/, "");
}

/**
 * Twilio requires E.164 (e.g. +12025550101). Existing phone fields in this app
 * (User.phone, lead/contractor phone) are free-text and often stored as bare
 * 10-digit US numbers, so normalize before calling the Twilio API / Dial TwiML.
 */
export function toE164(phone: string, fieldLabel = "Phone number"): string {
  const trimmed = phone.trim();
  const digits = trimmed.replace(/[^\d+]/g, "");
  if (digits.startsWith("+") && /^\+[1-9]\d{7,14}$/.test(digits)) return digits;
  const onlyDigits = digits.replace(/\D/g, "");
  if (onlyDigits.length === 10) return `+1${onlyDigits}`;
  if (onlyDigits.length === 11 && onlyDigits.startsWith("1")) return `+${onlyDigits}`;
  throw new TwilioCallError(
    `${fieldLabel} "${phone}" isn't a valid phone number — use E.164 format, e.g. +12025550101`
  );
}

/**
 * Places a click-to-call: rings the agent's own phone first, then on answer
 * bridges to `toNumber` with the agent's assigned Twilio number as caller ID.
 * See /api/calls/connect for the bridging TwiML.
 */
export async function placeCall(params: {
  agentId: string;
  toNumber: string;
  twilioPhoneNumberId?: string;
  projectRequestId?: string;
  contractorId?: string;
}) {
  const agent = await prisma.user.findUnique({ where: { id: params.agentId } });
  if (!agent) throw new TwilioCallError("Agent not found");
  if (!agent.phone) {
    throw new TwilioCallError("Add your phone number to your profile before making calls");
  }

  const agentPhone = toE164(agent.phone, "Your phone number");
  const toNumber = toE164(params.toNumber, "The number you're calling");

  const twilioNumber = params.twilioPhoneNumberId
    ? await prisma.twilioPhoneNumber.findFirst({
        where: { id: params.twilioPhoneNumberId, assignedUserId: agent.id, isActive: true },
      })
    : await prisma.twilioPhoneNumber.findFirst({
        where: { assignedUserId: agent.id, isActive: true },
        orderBy: { createdAt: "asc" },
      });

  if (!twilioNumber) {
    throw new TwilioCallError("No Twilio number assigned to you — ask an admin to assign one in Team settings");
  }

  const webhookBase = getTwilioWebhookBaseUrl();
  const twilioClient = getTwilioClient();

  const call = await twilioClient.calls.create({
    to: agentPhone,
    from: twilioNumber.phoneNumber,
    url: `${webhookBase}/api/calls/connect?to=${encodeURIComponent(toNumber)}&callerId=${encodeURIComponent(twilioNumber.phoneNumber)}`,
    statusCallback: `${webhookBase}/api/calls/status`,
    statusCallbackMethod: "POST",
    statusCallbackEvent: ["initiated", "ringing", "answered", "completed"],
  });

  const callLog = await prisma.callLog.create({
    data: {
      twilioCallSid: call.sid,
      direction: "outbound",
      fromNumber: twilioNumber.phoneNumber,
      toNumber,
      status: call.status ?? "initiated",
      agentId: agent.id,
      twilioPhoneNumberId: twilioNumber.id,
      projectRequestId: params.projectRequestId,
      contractorId: params.contractorId,
    },
  });

  await logAuditEvent({
    eventType: "CALL_MADE",
    description: `${agent.name} called ${toNumber} via ${twilioNumber.phoneNumber}`,
    actorId: agent.id,
    projectRequestId: params.projectRequestId,
    metadata: { callSid: call.sid, toNumber, fromNumber: twilioNumber.phoneNumber },
  });

  return callLog;
}

/** Validates the X-Twilio-Signature header on inbound Twilio webhooks. */
export function verifyTwilioSignature(params: {
  signature: string | null;
  url: string;
  body: Record<string, string>;
}): boolean {
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (!authToken || !params.signature) return false;
  return twilio.validateRequest(authToken, params.signature, params.url, params.body);
}

export class TwilioVoiceTokenError extends Error {}

/**
 * Issues a Twilio Voice SDK access token (JWT) for a browser softphone.
 * The browser presents this token to `@twilio/voice-sdk`'s `Device` to
 * register and place WebRTC calls. The token carries a Voice grant bound to
 * the TwiML App; when the agent dials, Twilio hits the TwiML App's voice URL
 * (`/api/calls/connect`) for bridging TwiML.
 *
 * Identity is the agent's user id so the connect webhook can attribute the call.
 * TTL is 1 hour; the client should refresh before expiry.
 */
export async function issueVoiceToken(params: { agentId: string; twimlAppSid?: string }) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const apiKeySid = process.env.TWILIO_API_KEY_SID;
  const apiKeySecret = process.env.TWILIO_API_KEY_SECRET;
  const twimlAppSid = params.twimlAppSid ?? process.env.TWILIO_TWIML_APP_SID;

  if (!accountSid || !apiKeySid || !apiKeySecret) {
    throw new TwilioVoiceTokenError(
      "Twilio Voice SDK is not configured (missing TWILIO_API_KEY_SID/TWILIO_API_KEY_SECRET)"
    );
  }
  if (!twimlAppSid) {
    throw new TwilioVoiceTokenError(
      "Missing TWILIO_TWIML_APP_SID — create a TwiML App pointing at /api/calls/connect"
    );
  }

  const AccessToken = twilio.jwt.AccessToken;
  const VoiceGrant = AccessToken.VoiceGrant;

  const token = new AccessToken(accountSid, apiKeySid, apiKeySecret, {
    identity: params.agentId,
    ttl: 3600,
  });

  token.addGrant(
    new VoiceGrant({
      outgoingApplicationSid: twimlAppSid,
      incomingAllow: false,
    })
  );

  return { token: token.toJwt(), identity: params.agentId };
}
