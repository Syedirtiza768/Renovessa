/**
 * Reusable email templates for ops outreach. Each template's subject/body may
 * contain {{variable}} tokens that are filled from an EmailContext at compose
 * time (see interpolateTemplate). Templates are scoped by audience so the
 * composer only offers relevant ones for the contact in view.
 */

export type EmailAudience = "homeowner" | "contractor" | "prospect_contractor";

export interface EmailContext {
  firstName?: string;
  lastName?: string;
  companyName?: string;
  reference?: string;
  trade?: string;
  scheduledAt?: string;
  agentName?: string;
  city?: string;
  // Cold-outreach merge fields, precomputed by the prospect segment resolver so
  // templates stay logic-free: greetingName falls back to "there" when we have
  // no contact name; tradeLabel is the human-readable trade; ratingLine is a
  // full sentence that adapts to whether we have a review rating for the row.
  greetingName?: string;
  tradeLabel?: string;
  rating?: string;
  reviewCount?: string;
  ratingLine?: string;
  ratingMath?: string;
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
  // --- Cold outreach (bulk) ---
  {
    id: "prospect_contractor_intro",
    name: "Prospecting — icebreaker (astrology)",
    audience: ["prospect_contractor"],
    subject: "The homeowner who ghosted you says hi",
    body: `Hi {{greetingName}},

You don't know me, so instead of introducing myself, let me guess a few things about you:

Somewhere in your phone right now is a homeowner you quoted three weeks ago who vanished into thin air. You've rebuilt at least one "I saw it on Pinterest" idea this year. And the jobs you're best at are NOT the ones that walk in the door most often.

If I got two out of three right, keep reading. (I usually get all three.)

I'm {{agentName}} with Renovessa. We put {{tradeLabel}} pros in {{city}} in front of homeowners who are actually ready to start — not tire-kickers collecting five quotes for sport. {{ratingLine}}

{{ratingMath}}

Here's how we fix that:

1. We personally reach out to your past customers, ask them for feedback and reviews — we handle the awkward follow-ups so you don't have to.
2. Technical audit and optimization of your Google Business Profile — most contractors leave money on the table with incomplete profiles.
3. Systematic policy enforcement — we flag and request takedowns of reviews that violate Google's policies.
4. Review automation — we set up a system that consistently generates new reviews from every completed job.

The target: bringing {{companyName}} to a 4.9 within 3 to 6 months.

And here's the best part — we run renovessa.com, where homeowners submit real project inquiries. We can land you actual customers while we work on your reputation.

Do you keep track of — or have phone numbers of — your past customers? We'd need to reach out to them.

Just hit reply. One word works — even "how?" — and I'll take it from there.

Quick favor: if you're the one reading the inbox but not the one who decides where new work comes from, forward this to the owner. They'll thank you when the calendar fills up.

{{agentName}}
Renovessa

P.S. Buried in the busy season? Reply "later" and I'll circle back when the dust settles. Ignoring me is also an option — but where's the fun in that?`,
  },
  {
    id: "prospect_contractor_followup",
    name: "Prospecting — follow-up (no reply)",
    audience: ["prospect_contractor"],
    subject: "re: the homeowner who ghosted you",
    body: `Hi {{greetingName}},

No pitch — just floating my last note back to the top of your inbox.

The offer stands: homeowners in {{city}} who are ready to start {{tradeLabel}} work, sent straight to {{companyName}}, with the only goal being to bring you more of the right jobs.

A one-word reply still works. Even "maybe."

{{agentName}}
Renovessa`,
  },
  {
    id: "prospect_homeowner_intro",
    name: "Prospecting — homeowner reactivation",
    audience: ["homeowner"],
    subject: "Still need help with your {{trade}} project?",
    body: `Hi {{firstName}},

I'm {{agentName}} with Renovessa. A little while back you looked into getting {{trade}} work done, and I wanted to check whether you're still planning it.

If so, I can match you with a vetted local pro and get an appointment set up — it only takes a few minutes. Just reply and let me know a good time to reach you.

Best,
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
