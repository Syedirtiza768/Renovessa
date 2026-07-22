/**
 * Idempotently prepares the approved RFQ Pilot 15 cohort and a draft campaign.
 * This script never sends email. It fails closed on suppressions, prior outreach,
 * non-new contact status, expired licenses, or a cohort count other than 15.
 */
import { PrismaClient } from "@prisma/client";
import { readFileSync } from "node:fs";

const prisma = new PrismaClient();

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

async function main() {
  const sourcePath = process.argv[2];
  if (!sourcePath) throw new Error("Usage: prepare-rfq-pilot-15.ts <campaign-json>");

  const payload = JSON.parse(readFileSync(sourcePath, "utf8"));
  const campaign = payload.campaign as Record<string, any>;
  const recipients = payload.recipients as Record<string, any>[];
  const expectedCount = Number(campaign.expectedCount);

  if (expectedCount !== 15 || recipients.length !== 15) {
    throw new Error(`Pilot must contain exactly 15 recipients; expected=${expectedCount}, actual=${recipients.length}`);
  }

  const emails = recipients.map((r) => normalizeEmail(r.email));
  if (new Set(emails).size !== expectedCount) throw new Error("Pilot contains duplicate email addresses");

  for (const recipient of recipients) {
    if (recipient.outreachCaution) throw new Error(`${recipient.company} has an unresolved outreach caution`);
    if (recipient.matchStatus !== "matched" || recipient.fitTier !== "hot") {
      throw new Error(`${recipient.company} is not both matched and hot-fit`);
    }
    if (!recipient.licenseExpiration || new Date(recipient.licenseExpiration) <= new Date()) {
      throw new Error(`${recipient.company} has a missing or expired license`);
    }
  }

  const [legacySuppressions, complianceSuppressions, priorMessages, existingProspects] = await Promise.all([
    prisma.emailSuppression.findMany({ where: { email: { in: emails } }, select: { email: true, reason: true } }),
    prisma.communicationSuppression.findMany({
      where: { channel: "EMAIL", normalizedValue: { in: emails } },
      select: { normalizedValue: true, reason: true },
    }),
    prisma.emailMessage.findMany({
      where: { direction: "outbound", toEmail: { in: emails } },
      select: { toEmail: true, createdAt: true, campaignId: true },
    }),
    prisma.contractorInquiry.findMany({
      where: { email: { in: emails } },
      select: { id: true, email: true, status: true },
    }),
  ]);

  if (legacySuppressions.length || complianceSuppressions.length) {
    throw new Error(`Suppressed pilot recipients found: ${[
      ...legacySuppressions.map((r) => r.email),
      ...complianceSuppressions.map((r) => r.normalizedValue),
    ].join(", ")}`);
  }
  if (priorMessages.length) {
    throw new Error(`Previously contacted pilot recipients found: ${[...new Set(priorMessages.map((r) => r.toEmail))].join(", ")}`);
  }
  const nonNew = existingProspects.filter((p) => p.status !== "new" && p.status !== "pilot15_ready");
  if (nonNew.length) {
    throw new Error(`Pilot recipients with non-new status found: ${nonNew.map((p) => `${p.email} (${p.status})`).join(", ")}`);
  }

  const inquiryIds: string[] = [];
  for (const recipient of recipients) {
    const email = normalizeEmail(recipient.email);
    const existing = existingProspects.find((p) => normalizeEmail(p.email) === email);
    const data = {
      companyName: recipient.company,
      contactName: recipient.contactName,
      phone: "",
      email,
      trade: recipient.tradeLabel,
      serviceZips: recipient.zip,
      city: recipient.city,
      state: recipient.state || "MD",
      rating: recipient.rating == null ? null : String(recipient.rating),
      reviewCount: recipient.reviewCount,
      website: recipient.website,
      source: "RFQ Pilot 15 — July 2026",
      licenseRegNumber: recipient.licenseRegNumber,
      licenseExpiration: new Date(recipient.licenseExpiration),
      status: "pilot15_ready",
      isDemo: false,
    };
    const inquiry = existing
      ? await prisma.contractorInquiry.update({ where: { id: existing.id }, data })
      : await prisma.contractorInquiry.create({ data });
    inquiryIds.push(inquiry.id);
  }

  const tag = await prisma.contactTag.upsert({
    where: { name: campaign.tag },
    update: {},
    create: { name: campaign.tag, color: "#b5541e" },
  });
  await prisma.contactTagInquiry.deleteMany({ where: { tagId: tag.id } });
  await prisma.contactTagInquiry.createMany({
    data: inquiryIds.map((inquiryId) => ({ inquiryId, tagId: tag.id })),
    skipDuplicates: true,
  });

  const taggedCount = await prisma.contractorInquiry.count({
    where: {
      isDemo: false,
      status: "pilot15_ready",
      tags: { some: { tagId: tag.id } },
    },
  });
  if (taggedCount !== expectedCount) {
    throw new Error(`Prepared tag resolved ${taggedCount} contacts instead of ${expectedCount}`);
  }

  const rayEmail = process.env.RAY_EMAIL || campaign.replyTo || process.env.SENDGRID_REPLY_TO;
  const owner = await prisma.user.findFirst({
    where: { OR: [...(rayEmail ? [{ email: rayEmail }] : []), { role: "CONTRACTOR_ACQUISITION" }] },
  });
  if (!owner) throw new Error("Campaign owner not found; configure RAY_EMAIL or create a contractor-acquisition user");

  const existingCampaign = await prisma.emailCampaign.findFirst({ where: { name: campaign.name } });
  if (existingCampaign?.status === "sent" || existingCampaign?.status === "sending") {
    throw new Error(`Campaign ${existingCampaign.id} is already ${existingCampaign.status}; refusing to overwrite it`);
  }

  const campaignData = {
    audience: campaign.audience,
    subject: campaign.subjectTemplate,
    bodyTemplate: campaign.bodyTemplate,
    bodyHtml: null,
    templateId: campaign.templateId,
    filters: { tag: campaign.tag, status: "pilot15_ready", expectedCount },
    replyTo: process.env.SENDGRID_REPLY_TO || campaign.replyTo,
    ownerAgentId: owner.id,
    status: "draft",
    totalRecipients: expectedCount,
    sentCount: 0,
    failedCount: 0,
  };
  const prepared = existingCampaign
    ? await prisma.emailCampaign.update({ where: { id: existingCampaign.id }, data: campaignData })
    : await prisma.emailCampaign.create({ data: { name: campaign.name, ...campaignData } });

  console.log(`Prepared draft campaign ${prepared.id}`);
  console.log(`Tag: ${campaign.tag}`);
  console.log(`Recipients: ${taggedCount}`);
  console.log("No email was sent.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
