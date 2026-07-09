import sgMail from "@sendgrid/mail";
import { prisma } from "./db";
import { logAuditEvent } from "./audit";

export class SendGridError extends Error {}

let configured = false;

export function getSendGridClient() {
  const apiKey = process.env.SENDGRID_API_KEY;
  if (!apiKey) throw new SendGridError("SendGrid is not configured (missing SENDGRID_API_KEY)");
  if (!configured) {
    sgMail.setApiKey(apiKey);
    configured = true;
  }
  return sgMail;
}

/** Sends an email via SendGrid on the agent's behalf and logs it. Reply-to is the agent's own email. */
export async function sendEmail(params: {
  agentId: string;
  to: string;
  subject: string;
  message: string;
  projectRequestId?: string;
  contractorId?: string;
}) {
  const fromEmail = process.env.SENDGRID_FROM_EMAIL;
  if (!fromEmail) throw new SendGridError("SENDGRID_FROM_EMAIL is not set");
  const fromName = process.env.SENDGRID_FROM_NAME || "Renovessa Ops";

  const agent = await prisma.user.findUnique({ where: { id: params.agentId } });
  if (!agent) throw new SendGridError("Agent not found");

  const client = getSendGridClient();

  const [response] = await client.send({
    to: params.to,
    from: { email: fromEmail, name: fromName },
    replyTo: agent.email,
    subject: params.subject,
    text: params.message,
  });

  const emailMessage = await prisma.emailMessage.create({
    data: {
      sendgridMessageId: (response.headers["x-message-id"] as string | undefined) ?? null,
      fromEmail,
      toEmail: params.to,
      subject: params.subject,
      body: params.message,
      status: "sent",
      agentId: agent.id,
      projectRequestId: params.projectRequestId,
      contractorId: params.contractorId,
    },
  });

  await logAuditEvent({
    eventType: "EMAIL_SENT",
    description: `${agent.name} emailed ${params.to}: "${params.subject}"`,
    actorId: agent.id,
    projectRequestId: params.projectRequestId,
    metadata: { to: params.to, subject: params.subject },
  });

  return emailMessage;
}
