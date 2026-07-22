import { prisma } from "@/lib/db";
import { logAuditEvent } from "@/lib/audit";
import { getSendGridClient } from "@/lib/sendgrid";
import { bodyToEmailHtml, linksToPlainText } from "@/lib/emailLinks";

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

async function sendConfirmation(params: {
  to: string;
  subject: string;
  /** Body may include [Label](url) one-word markdown links. */
  body: string;
  projectRequestId?: string;
  contractorId?: string;
  template: string;
  auditOk: string;
  auditFail: string;
}) {
  const text = linksToPlainText(params.body);
  const html = bodyToEmailHtml(params.body);

  try {
    const from = mailFrom();
    await getSendGridClient().send({
      to: params.to,
      from,
      replyTo: replyTo(),
      subject: params.subject,
      text,
      html,
    });

    await prisma.emailMessage.create({
      data: {
        fromEmail: from.email,
        toEmail: params.to,
        subject: params.subject,
        body: text,
        status: "sent",
        projectRequestId: params.projectRequestId,
        contractorId: params.contractorId ?? null,
      },
    });

    await logAuditEvent({
      eventType: "EMAIL_SENT",
      description: params.auditOk,
      projectRequestId: params.projectRequestId,
      metadata: { template: params.template, contractorId: params.contractorId },
    });

    return true;
  } catch (err) {
    console.error(params.auditFail, err);
    await logAuditEvent({
      eventType: "EMAIL_SENT",
      description: params.auditFail,
      projectRequestId: params.projectRequestId,
      metadata: {
        template: params.template,
        failed: true,
        contractorId: params.contractorId,
      },
    });
    return false;
  }
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
  [Portal](${loginUrl})
  Email: ${params.to}
  Password: ${params.tempPassword}
${
  params.isExistingAccount
    ? "(We reset your portal password so you can sign in with this new one.)\n"
    : ""
}`
    : `

Track this RFQ anytime: [Portal](${loginUrl})
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
2. We check current trade and ZIP availability and request responses from relevant contractors.
3. We get back to you with available bid options and next steps. Timing varies with capacity.
${portalBlock}
Questions? Just reply to this email.

Ray Cooper
[Renovessa](${appUrl()})
`;

  return sendConfirmation({
    to: params.to,
    subject,
    body,
    projectRequestId: params.projectRequestId,
    template: "rfq_confirmation",
    auditOk: `RFQ confirmation email sent to ${params.to}`,
    auditFail: `RFQ confirmation email FAILED for ${params.to}`,
  });
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

Our contractor success team will review the application. If you're a fit for the RFQs homeowners are submitting in your area, we'll follow up with onboarding next steps. Review timing varies with current volume.

Questions? Just reply to this email.

Ray Cooper
[Renovessa](${appUrl()})
`;

  return sendConfirmation({
    to: params.to,
    subject,
    body,
    template: "contractor_application_confirmation",
    auditOk: `Contractor application confirmation sent to ${params.to}`,
    auditFail: `Contractor application confirmation FAILED for ${params.to}`,
  });
}

/** Welcome email when a contractor portal account is created. Non-fatal on failure. */
export async function sendContractorWelcomeEmail(params: {
  to: string;
  name: string;
  companyName: string;
  trade: string;
  tempPassword: string;
  contractorId?: string;
}) {
  const loginUrl = `${appUrl()}/login`;
  const subject = `Welcome to Renovessa — your contractor portal is ready`;
  const body = `Hi ${params.name},

You're confirmed on Renovessa. Your contractor portal for ${params.companyName} (${params.trade}) is ready.

Sign in here:
  [Portal](${loginUrl})
  Email: ${params.to}
  Temporary password: ${params.tempPassword}

Please sign in and change your password after your first login.

You'll receive RFQs from homeowners in your service area through this portal. Reply to this email anytime if you have questions.

Ray Cooper
[Renovessa](${appUrl()})
`;

  return sendConfirmation({
    to: params.to,
    subject,
    body,
    contractorId: params.contractorId,
    template: "contractor_welcome",
    auditOk: `Contractor welcome email sent to ${params.to}`,
    auditFail: `Contractor welcome email FAILED for ${params.to}`,
  });
}
