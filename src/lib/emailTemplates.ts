/**
 * Reusable email templates for ops outreach. Each template's subject/body may
 * contain {{variable}} tokens that are filled from an EmailContext at compose
 * time (see interpolateTemplate). Templates are scoped by audience so the
 * composer only offers relevant ones for the contact in view.
 */

export type EmailAudience = "homeowner" | "contractor";

export interface EmailContext {
  firstName?: string;
  lastName?: string;
  companyName?: string;
  reference?: string;
  trade?: string;
  scheduledAt?: string;
  agentName?: string;
}

export interface EmailTemplate {
  id: string;
  name: string;
  audience: EmailAudience[];
  subject: string;
  body: string;
}

/**
 * Ops-facing templates. Keep the tone plain and human — these go out as text
 * emails with the agent's own address as reply-to. `{{scheduledAt}}` is only
 * present in appointment templates; empty context values collapse gracefully.
 */
export const EMAIL_TEMPLATES: EmailTemplate[] = [
  {
    id: "homeowner_intro",
    name: "Intro — first touch",
    audience: ["homeowner"],
    subject: "Your {{trade}} project request ({{reference}})",
    body: `Hi {{firstName}},

Thanks for your {{trade}} request with Renovessa. I'm {{agentName}}, and I'll be your point of contact while we match you with a vetted local pro.

I tried reaching you by phone — when's a good time to talk through the details so we can get your appointment set up? Reply here or let me know a number and time that works.

Best,
{{agentName}}
Renovessa`,
  },
  {
    id: "homeowner_appointment_confirm",
    name: "Appointment confirmation",
    audience: ["homeowner"],
    subject: "Your appointment is confirmed — {{reference}}",
    body: `Hi {{firstName}},

Good news — your {{trade}} appointment is confirmed for {{scheduledAt}}. {{companyName}} will be handling the visit.

Please make sure someone 18+ who can authorize the work is on-site, and have any relevant photos or details ready. If anything changes, just reply to this email and I'll take care of it.

Thanks,
{{agentName}}
Renovessa`,
  },
  {
    id: "homeowner_followup",
    name: "Follow-up — couldn't reach",
    audience: ["homeowner"],
    subject: "Following up on your {{trade}} request ({{reference}})",
    body: `Hi {{firstName}},

I've tried to reach you a couple of times about your {{trade}} project but haven't been able to connect. I'd hate for you to miss out on getting matched with a pro.

Could you reply with a good time and number to reach you? It only takes a few minutes to get everything scheduled.

Thanks,
{{agentName}}
Renovessa`,
  },
  {
    id: "contractor_offer",
    name: "New opportunity offer",
    audience: ["contractor"],
    subject: "New {{trade}} opportunity — {{reference}}",
    body: `Hi {{companyName}} team,

We have a new {{trade}} opportunity that matches your service area. The homeowner is verified and ready to schedule.

You can review and accept it in your Renovessa portal. If you'd like to take it, please respond within your usual SLA window so we can lock in the appointment.

Thanks,
{{agentName}}
Renovessa`,
  },
  {
    id: "contractor_appointment_confirm",
    name: "Appointment confirmation",
    audience: ["contractor"],
    subject: "Appointment confirmed — {{reference}}",
    body: `Hi {{companyName}} team,

This confirms the {{trade}} appointment for {{scheduledAt}}. Details and the homeowner's contact info are in your portal.

Please arrive on time and update the appointment status after the visit so we can keep everything on track. Reply here if anything comes up.

Thanks,
{{agentName}}
Renovessa`,
  },
  {
    id: "contractor_followup",
    name: "Follow-up — awaiting response",
    audience: ["contractor"],
    subject: "Following up — {{trade}} opportunity {{reference}}",
    body: `Hi {{companyName}} team,

Just following up on the {{trade}} opportunity ({{reference}}) we sent over. It's still available, but we'll need to reassign it soon if we don't hear back.

Let me know if you'd like to take it.

Thanks,
{{agentName}}
Renovessa`,
  },
];

/** Returns templates applicable to the given audience. */
export function templatesForAudience(audience: EmailAudience): EmailTemplate[] {
  return EMAIL_TEMPLATES.filter((t) => t.audience.includes(audience));
}

/**
 * Replaces {{token}} occurrences with values from context. Unknown or empty
 * tokens are replaced with an empty string, then any double spaces / dangling
 * punctuation left by a missing value are lightly tidied.
 */
export function interpolate(text: string, context: EmailContext): string {
  return text.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key: string) => {
    const value = (context as Record<string, string | undefined>)[key];
    return value && value.trim() !== "" ? value : "";
  });
}

export function interpolateTemplate(
  template: EmailTemplate,
  context: EmailContext
): { subject: string; body: string } {
  return {
    subject: interpolate(template.subject, context).trim(),
    body: interpolate(template.body, context),
  };
}
