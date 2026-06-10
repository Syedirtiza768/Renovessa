import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { StatusBadge } from "@/components/StatusBadge";
import { formatDate } from "@/lib/utils";
import { LeadActions } from "@/components/LeadActions";
import { QualificationPanel } from "@/components/admin/QualificationPanel";
import { CommunicationLogForm } from "@/components/admin/CommunicationLogForm";
import { OpportunityPanel } from "@/components/admin/OpportunityPanel";
import { ScheduleAppointmentForm } from "@/components/admin/ScheduleAppointmentForm";
import { AppointmentDayPanel } from "@/components/admin/AppointmentDayPanel";
import { BillingProofPanel } from "@/components/admin/BillingProofPanel";
import { FeedbackForm } from "@/components/admin/FeedbackForm";
import { CaseStudyForm } from "@/components/admin/CaseStudyForm";

export default async function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const lead = await prisma.projectRequest.findUnique({
    where: { id },
    include: {
      appointment: { include: { contractor: true, invoice: true, feedbacks: true } },
      assignedAgent: true,
      auditEvents: { orderBy: { createdAt: "desc" }, include: { actor: true } },
      dispute: true,
      caseStudy: true,
    },
  });

  if (!lead) notFound();

  const appt = lead.appointment;
  const showSchedule = appt && ["ACCEPTED", "SCHEDULED"].includes(appt.status);
  const showDayPanel = appt && ["SCHEDULED", "REMINDER_SENT", "CHECKED_IN"].includes(appt.status);
  const showBilling = appt && ["HOMEOWNER_CONFIRMED", "BILLED"].includes(appt.status) && appt.invoice;
  const showFeedback = appt && ["HOMEOWNER_CONFIRMED", "BILLED"].includes(appt.status);
  const showCaseStudy = ["HOMEOWNER_CONFIRMED", "BILLING_PENDING", "BILLING_APPROVED", "CLOSED"].includes(lead.status);

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
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
            {lead.address && <div><dt className="text-muted">Address</dt><dd>{lead.address}</dd></div>}
            {lead.ownershipAuthority && <div><dt className="text-muted">Ownership</dt><dd>{lead.ownershipAuthority}</dd></div>}
            {lead.preferredAppointmentWindows && <div><dt className="text-muted">Preferred Windows</dt><dd>{lead.preferredAppointmentWindows}</dd></div>}
            {lead.serviceCellMatch !== null && (
              <div><dt className="text-muted">Cell Match</dt><dd>{lead.serviceCellMatch ? "Yes" : "No"}</dd></div>
            )}
            <div className="break-words"><dt className="text-muted">Contact</dt><dd>{lead.phone} · {lead.email}</dd></div>
            <div><dt className="text-muted">Source</dt><dd>{lead.source}</dd></div>
          </dl>
        </div>

        {appt && (
          <div className="card-accent p-4">
            <h2 className="font-semibold">Appointment</h2>
            <dl className="mt-4 space-y-2 text-sm">
              <div><dt className="text-muted">Contractor</dt><dd>{appt.contractor.companyName}</dd></div>
              <div><dt className="text-muted">Status</dt><dd>{appt.status}</dd></div>
              {appt.scheduledAt && <div><dt className="text-muted">Scheduled</dt><dd>{formatDate(appt.scheduledAt)}</dd></div>}
              {appt.location && <div><dt className="text-muted">Location</dt><dd>{appt.location}</dd></div>}
              {appt.estimateGiven && <div><dt className="text-muted">Estimate Given</dt><dd>{appt.estimateGiven}</dd></div>}
              {appt.contractorOutcomeNotes && <div><dt className="text-muted">Contractor Notes</dt><dd>{appt.contractorOutcomeNotes}</dd></div>}
              {appt.homeownerOutcomeNotes && <div><dt className="text-muted">Homeowner Notes</dt><dd>{appt.homeownerOutcomeNotes}</dd></div>}
              {appt.opportunitySentAt && <div><dt className="text-muted">Opportunity Sent</dt><dd>{formatDate(appt.opportunitySentAt)}</dd></div>}
              {appt.declineReason && <div><dt className="text-muted">Decline Reason</dt><dd>{appt.declineReason}</dd></div>}
            </dl>
          </div>
        )}

        <QualificationPanel
          leadId={lead.id}
          currentStatus={lead.status}
          qualificationNotes={lead.qualificationNotes}
          disposition={lead.disposition}
          ownershipAuthority={lead.ownershipAuthority}
          reachable={lead.reachable}
          invalidReason={lead.invalidReason}
        />

        <CommunicationLogForm leadId={lead.id} />

        <OpportunityPanel leadId={lead.id} currentStatus={lead.status} />

        {showSchedule && appt && <ScheduleAppointmentForm appointmentId={appt.id} />}

        {showDayPanel && appt && (
          <AppointmentDayPanel appointmentId={appt.id} status={appt.status} />
        )}

        {showBilling && appt?.invoice && (
          <BillingProofPanel invoiceId={appt.invoice.id} status={appt.invoice.status} />
        )}

        {showFeedback && appt && (
          <FeedbackForm appointmentId={appt.id} />
        )}

        {showCaseStudy && (
          <CaseStudyForm projectRequestId={lead.id} existing={lead.caseStudy} />
        )}

        <LeadActions leadId={lead.id} currentStatus={lead.status} />

        <div className="card p-4 lg:col-span-2">
          <h2 className="font-semibold">Verification Trail</h2>
          <ul className="mt-4 space-y-3">
            {lead.auditEvents.map((event) => (
              <li key={event.id} className="flex flex-wrap gap-2 border-b border-rule/50 pb-2 text-sm sm:gap-3">
                <span className="font-mono text-xs text-muted whitespace-nowrap">{formatDate(event.createdAt)}</span>
                <span className="flex-1">{event.description}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
