import type { AuditEventType, Prisma } from "@prisma/client";
import { prisma } from "./db";

export async function logAuditEvent(params: {
  eventType: AuditEventType;
  description: string;
  actorId?: string;
  projectRequestId?: string;
  appointmentId?: string;
  bathroomProjectId?: string;
  metadata?: Prisma.InputJsonValue;
}) {
  return prisma.auditEvent.create({
    data: {
      eventType: params.eventType,
      description: params.description,
      actorId: params.actorId,
      projectRequestId: params.projectRequestId,
      appointmentId: params.appointmentId,
      bathroomProjectId: params.bathroomProjectId,
      metadata: params.metadata,
    },
  });
}
