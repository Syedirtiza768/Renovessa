import { prisma } from "@/lib/db";
import { logAuditEvent } from "@/lib/audit";
import { getSendGridClient } from "@/lib/sendgrid";

function mailFrom() {
  return {
    email: process.env.SENDGRID_FROM_EMAIL || "ops@renovessa.com",
    name: process.env.SENDGRID_FROM_NAME || "Renovessa",
  };
}

function replyTo() {
  return process.env.SENDGRID_REPLY_TO || "ray@renovessa.com";
}

function appUrl() {
  return process.env.NEXT_PUBLIC_APP_URL || "https://renovessa.com";
}

/** Homeowner confirmation after RFQ / project request submit. Non-fatal on failure. */
export async function sendRfqConfirmationEmail(params: {
  to: string;
  firstName: string;
  referenceNumber: string;
  trade: string;
  zipCode: string;
  urgency: string;
  budgetRange: string;
  description: string;
  projectRequestId: string;
  tempPassword?: string | null;
  isExistingAccount?: boolean;
}) {
  const loginUrl = `${appUrl()}/login`;
  const portalBlock = params.tempPassword
    ? `

Your Renovessa portal login (track this RFQ anytime):
  URL: ${loginUrl}
  Email: ${params.to}
  Password: ${params.tempPassword}
${
  params.isExistingAccount
    ? "(We reset your portal password so you can sign in with this new one.)\n"
    : ""
}`
    : `

Track this RFQ in your portal: ${loginUrl}
`;

  const subject = `Your Renovessa RFQ is in — ${params.referenceNumber}`;
  const body = `Hi ${params.firstName},

Thanks for submitting your RFQ with Renovessa. We've received it and it's in our queue.

Reference: ${params.referenceNumber}
Trade: ${params.trade}
ZIP: ${params.zipCode}
Timing: ${params.urgency}
Planning range you saw: ${params.budgetRange}

—— Your RFQ ——
${params.description.trim() || "(See portal for full details)"}
——

What happens next:
1. We review your scoped RFQ (trade, ZIP, ballpark, notes).
2. We solicit bids from vetted contractors who handle this work in your area.
3. We get back to you with bid options — usually within 1–2 business days.
${portalBlock}
Questions? Just reply to this email.

Ray Cooper
Renovessa
${appUrl()}
`;

  try {
    const from = mailFrom();
    await getSendGridClient().send({
      to: params.to,
      from,
      replyTo: replyTo(),
      subject,
      text: body,
    });

    await prisma.emailMessage.create({
      data: {
        fromEmail: from.email,
        toEmail: params.to,
        subject,
        body,
        status: "sent",
        projectRequestId: params.projectRequestId,
      },
    });

    await logAuditEvent({
      eventType: "EMAIL_SENT",
      description: `RFQ confirmation email sent to ${params.to}`,
      projectRequestId: params.projectRequestId,
      metadata: { template: "rfq_confirmation" },
    });

    return true;
  } catch (err) {
    console.error("Failed to send RFQ confirmation email:", err);
    await logAuditEvent({
      eventType: "EMAIL_SENT",
      description: `RFQ confirmation email FAILED for ${params.to}`,
      projectRequestId: params.projectRequestId,
      metadata: { template: "rfq_confirmation", failed: true },
    });
    return false;
  }
}

/** Contractor application received confirmation. Non-fatal on failure. */
export async function sendContractorApplicationConfirmationEmail(params: {
  to: string;
  contactName: string;
  companyName: string;
  trade: string;
  serviceZips: string;
}) {
  const subject = `We received your Renovessa contractor application — ${params.companyName}`;
  const body = `Hi ${params.contactName},

Thanks for applying to join Renovessa. We've received your application for ${params.companyName}.

Trade: ${params.trade}
Service ZIPs: ${params.serviceZips}

Our contractor success team will review it within 1–2 business days. If you're a fit for the RFQs homeowners are submitting in your area, we'll follow up with onboarding next steps.

Questions? Just reply to this email.

Ray Cooper
Renovessa
${appUrl()}
`;

  try {
    const from = mailFrom();
    await getSendGridClient().send({
      to: params.to,
      from,
      replyTo: replyTo(),
      subject,
      text: body,
    });

    await prisma.emailMessage.create({
      data: {
        fromEmail: from.email,
        toEmail: params.to,
        subject,
        body,
        status: "sent",
      },
    });

    return true;
  } catch (err) {
    console.error("Failed to send contractor application confirmation:", err);
    return false;
  }
}
