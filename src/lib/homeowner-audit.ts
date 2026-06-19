import type { AuditEventType } from "@prisma/client";

/** Audit events safe to show homeowners (no internal ops notes). */
export const HOMEOWNER_VISIBLE_AUDIT_EVENTS: AuditEventType[] = [
  "FORM_SUBMITTED",
  "CONSENT_RECORDED",
  "SMS_SENT",
  "CONTRACTOR_ACCEPTED",
  "CALENDAR_INVITE_SENT",
  "REMINDER_SENT",
  "CHECK_IN_RECORDED",
  "HOMEOWNER_CONFIRMED",
];

export function isHomeownerVisibleAuditEvent(eventType: AuditEventType): boolean {
  return HOMEOWNER_VISIBLE_AUDIT_EVENTS.includes(eventType);
}
