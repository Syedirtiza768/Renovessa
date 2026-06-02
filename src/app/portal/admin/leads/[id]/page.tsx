import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { StatusBadge } from "@/components/StatusBadge";
import { formatDate } from "@/lib/utils";
import { LeadActions } from "@/components/LeadActions";

export default async function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const lead = await prisma.projectRequest.findUnique({
    where: { id },
    include: {
      appointment: { include: { contractor: true, invoice: true } },
      assignedAgent: true,
      auditEvents: { orderBy: { createdAt: "desc" }, include: { actor: true } },
      dispute: true,
    },
  });

  if (!lead) notFound();

  return (
    <div>
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">{lead.referenceNumber}</h1>
          <p className="text-muted">{lead.firstName} {lead.lastName} · {lead.trade} · {lead.zipCode}</p>
        </div>
        <StatusBadge status={lead.status} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="card p-4">
          <h2 className="font-semibold">Project Details</h2>
          <dl className="mt-4 space-y-2 text-sm">
            <div><dt className="text-muted">Description</dt><dd>{lead.description}</dd></div>
            <div><dt className="text-muted">Urgency</dt><dd>{lead.urgency}</dd></div>
            <div><dt className="text-muted">Budget</dt><dd>{lead.budgetRange}</dd></div>
            <div><dt className="text-muted">Contact</dt><dd>{lead.phone} · {lead.email}</dd></div>
            <div><dt className="text-muted">Source</dt><dd>{lead.source}</dd></div>
          </dl>
        </div>

        {lead.appointment && (
          <div className="card-accent p-4">
            <h2 className="font-semibold">Appointment</h2>
            <dl className="mt-4 space-y-2 text-sm">
              <div><dt className="text-muted">Contractor</dt><dd>{lead.appointment.contractor.companyName}</dd></div>
              <div><dt className="text-muted">Scheduled</dt><dd>{formatDate(lead.appointment.scheduledAt)}</dd></div>
              <div><dt className="text-muted">Status</dt><dd>{lead.appointment.status}</dd></div>
            </dl>
          </div>
        )}

        <LeadActions leadId={lead.id} currentStatus={lead.status} />

        <div className="card p-4 lg:col-span-2">
          <h2 className="font-semibold">Verification Trail</h2>
          <ul className="mt-4 space-y-3">
            {lead.auditEvents.map((event) => (
              <li key={event.id} className="flex gap-3 border-b border-rule/50 pb-2 text-sm">
                <span className="font-mono text-xs text-muted whitespace-nowrap">{formatDate(event.createdAt)}</span>
                <span>{event.description}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
