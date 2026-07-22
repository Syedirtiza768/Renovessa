import type { NextRequest } from "next/server";
import type { CommunicationChannel, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import {
  COMMUNICATION_CONSENT_TEXT,
  COMMUNICATION_CONSENT_VERSION,
  PRIVACY_VERSION,
  TERMS_VERSION,
  LEGAL_CLICKWRAP_TEXT,
} from "@/lib/compliance-versions";

type Evidence = {
  ipAddress?: string;
  userAgent?: string;
};

function clean(value: string | null, max: number) {
  const trimmed = value?.trim();
  return trimmed ? trimmed.slice(0, max) : undefined;
}

export function requestEvidence(req: NextRequest): Evidence {
  const forwarded = req.headers.get("x-forwarded-for")?.split(",")[0] ?? null;
  return {
    ipAddress: clean(forwarded || req.headers.get("x-real-ip"), 64),
    userAgent: clean(req.headers.get("user-agent"), 512),
  };
}

export function normalizePhone(value: string) {
  const digits = value.replace(/\D/g, "");
  return digits.length === 10 ? `+1${digits}` : digits.startsWith("1") ? `+${digits}` : `+${digits}`;
}

export function normalizeContactValue(channel: CommunicationChannel, value: string) {
  return channel === "EMAIL" ? value.trim().toLowerCase() : normalizePhone(value);
}

export async function recordProjectCompliance(
  tx: Prisma.TransactionClient,
  params: {
    projectRequestId: string;
    userId?: string;
    email: string;
    phone: string;
    source: string;
    communicationConsent: boolean;
    evidence: Evidence;
  },
) {
  const now = new Date();
  await tx.projectRequest.update({
    where: { id: params.projectRequestId },
    data: {
      tcpaConsent: params.communicationConsent,
      consentVersion: params.communicationConsent ? COMMUNICATION_CONSENT_VERSION : null,
      consentRecordedAt: params.communicationConsent ? now : null,
      termsAccepted: true,
      termsVersion: TERMS_VERSION,
      termsAcceptedAt: now,
      privacyAcknowledged: true,
      privacyVersion: PRIVACY_VERSION,
      privacyAcknowledgedAt: now,
    },
  });

  const common = {
    subjectEmail: params.email.trim().toLowerCase(),
    subjectPhone: normalizePhone(params.phone),
    source: params.source,
    ipAddress: params.evidence.ipAddress,
    userAgent: params.evidence.userAgent,
    projectRequestId: params.projectRequestId,
    userId: params.userId,
  };

  await tx.consentEvent.createMany({
    data: [
      {
        ...common,
        action: "ACKNOWLEDGED",
        purpose: "TERMS_OF_USE",
        channels: [],
        documentVersion: TERMS_VERSION,
        disclosureText: LEGAL_CLICKWRAP_TEXT,
      },
      {
        ...common,
        action: "ACKNOWLEDGED",
        purpose: "PRIVACY_POLICY",
        channels: [],
        documentVersion: PRIVACY_VERSION,
        disclosureText: LEGAL_CLICKWRAP_TEXT,
      },
      ...(params.communicationConsent
        ? [{
            ...common,
            action: "GRANTED" as const,
            purpose: "PROJECT_COMMUNICATIONS",
            channels: ["PHONE" as const, "SMS" as const],
            documentVersion: COMMUNICATION_CONSENT_VERSION,
            disclosureText: COMMUNICATION_CONSENT_TEXT,
          }]
        : []),
    ],
  });
}

export async function recordCommunicationOptOut(params: {
  channel: CommunicationChannel;
  value: string;
  reason: string;
  source: string;
  projectRequestId?: string;
  userId?: string;
  evidence?: Evidence;
  recordRevocation?: boolean;
}) {
  const normalizedValue = normalizeContactValue(params.channel, params.value);
  await prisma.$transaction(async (tx) => {
    await tx.communicationSuppression.upsert({
      where: { channel_normalizedValue: { channel: params.channel, normalizedValue } },
      update: {
        reason: params.reason,
        source: params.source,
        projectRequestId: params.projectRequestId,
        userId: params.userId,
      },
      create: {
        channel: params.channel,
        normalizedValue,
        reason: params.reason,
        source: params.source,
        projectRequestId: params.projectRequestId,
        userId: params.userId,
      },
    });
    if (params.recordRevocation !== false) {
      await tx.consentEvent.create({
        data: {
          action: "REVOKED",
          purpose: params.channel === "EMAIL" ? "EMAIL_MARKETING" : "PROJECT_COMMUNICATIONS",
          channels: [params.channel],
          subjectEmail: params.channel === "EMAIL" ? normalizedValue : undefined,
          subjectPhone: params.channel === "EMAIL" ? undefined : normalizedValue,
          documentVersion: COMMUNICATION_CONSENT_VERSION,
          disclosureText: `Opt-out recorded: ${params.reason}`,
          source: params.source,
          ipAddress: params.evidence?.ipAddress,
          userAgent: params.evidence?.userAgent,
          projectRequestId: params.projectRequestId,
          userId: params.userId,
        },
      });
    }
  });
}

export async function isCommunicationSuppressed(channel: CommunicationChannel, value: string) {
  const normalizedValue = normalizeContactValue(channel, value);
  return Boolean(
    await prisma.communicationSuppression.findUnique({
      where: { channel_normalizedValue: { channel, normalizedValue } },
      select: { id: true },
    }),
  );
}
