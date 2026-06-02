import type { AuditEventType } from "@prisma/client";
import { prisma } from "./db";

export async function logAuditEvent(params: {
  eventType: AuditEventType;
  description: string;
  actorId?: string;
  projectRequestId?: string;
  appointmentId?: string;
  metadata?: Record<string, unknown>;
}) {
  return prisma.auditEvent.create({
    data: {
      eventType: params.eventType,
      description: params.description,
      actorId: params.actorId,
      projectRequestId: params.projectRequestId,
      appointmentId: params.appointmentId,
      metadata: params.metadata ?? undefined,
    },
  });
}
