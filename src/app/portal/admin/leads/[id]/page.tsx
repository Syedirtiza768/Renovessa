import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { StatusBadge } from "@/components/StatusBadge";
import { formatDate } from "@/lib/utils";
import { LeadActions } from "@/components/LeadActions";
import { AssignAgentPanel } from "@/components/admin/AssignAgentPanel";
import { QualificationPanel } from "@/components/admin/QualificationPanel";
import { CommunicationLogForm } from "@/components/admin/CommunicationLogForm";
import { ContactCommunications } from "@/components/admin/ContactCommunications";
import { OpportunityPanel } from "@/components/admin/OpportunityPanel";
import { ReassignContractorPanel } from "@/components/admin/ReassignContractorPanel";
import { ScheduleAppointmentForm } from "@/components/admin/ScheduleAppointmentForm";
import { AppointmentDayPanel } from "@/components/admin/AppointmentDayPanel";
import { BillingProofPanel } from "@/components/admin/BillingProofPanel";
import { FeedbackForm } from "@/components/admin/FeedbackForm";
import { CaseStudyForm } from "@/components/admin/CaseStudyForm";
import { NoShowPanel } from "@/components/admin/NoShowPanel";

export default async function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { id } = await params;
  const lead = await prisma.projectRequest.findUnique({
    where: { id },
    include: {
      appointment: { include: { contractor: { include: { user: true } }, invoice: true, feedbacks: true } },
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
  const showBilling = appt && (["HOMEOWNER_CONFIRMED", "BILLED"].includes(appt.status) || lead.status === "BILLING_PENDING" || lead.status === "BILLING_APPROVED");
  const showFeedback = appt && ["HOMEOWNER_CONFIRMED", "BILLED"].includes(appt.status);
  const showCaseStudy = ["HOMEOWNER_CONFIRMED", "BILLING_PENDING", "BILLING_APPROVED", "CLOSED"].includes(lead.status);
  const showReassign = appt && ["ACCEPTED", "SCHEDULED", "REMINDER_SENT", "CHECKED_IN"].includes(appt.status);

  // Offer history for the OpportunityPanel
  const offerHistory = lead.auditEvents.filter(
    (e) => e.eventType === "CONTRACTOR_OFFERED" || e.eventType === "CONTRACTOR_DECLINED"
  );

  // SLA deadline: opportunitySentAt + responseTimeHours
  const slaInfo =
    appt?.status === "OFFERED" && appt.opportunitySentAt && appt.contractor.responseTimeHours
      ? {
          deadline: new Date(
            appt.opportunitySentAt.getTime() + appt.contractor.responseTimeHours * 60 * 60 * 1000
          ),
          overdue: new Date() > new Date(appt.opportunitySentAt.getTime() + appt.contractor.responseTimeHours * 60 * 60 * 1000),
        }
      : null;

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

            {slaInfo && (
              <div className={`mt-2 rounded-md px-3 py-2 text-sm ${slaInfo.overdue ? "bg-red-50 text-red-700" : "bg-blueprint text-slate"}`}>
                {slaInfo.overdue
                  ? `SLA overdue — response was due by ${formatDate(slaInfo.deadline)}`
                  : `Contractor response due by ${formatDate(slaInfo.deadline)}`}
              </div>
            )}

            <dl className="mt-4 space-y-2 text-sm">
              <div>
                <dt className="text-muted">Contractor</dt>
                <dd>{appt.contractor.companyName}</dd>
              </div>
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

        {appt && (
          <ContactCommunications
            title="Contact Contractor"
            contactName={appt.contractor.companyName}
            contactType="contractor"
            reference={lead.referenceNumber}
            phone={appt.contractor.user.phone}
            email={appt.contractor.user.email}
            callLabel="Call Contractor"
            projectRequestId={lead.id}
            contractorId={appt.contractorId}
            emailContext={{
              companyName: appt.contractor.companyName,
              firstName: lead.firstName,
              lastName: lead.lastName,
              reference: lead.referenceNumber,
              trade: lead.trade,
              scheduledAt: appt.scheduledAt ? formatDate(appt.scheduledAt) : undefined,
            }}
          />
        )}

        <AssignAgentPanel
          leadId={lead.id}
          currentStatus={lead.status}
          assignedAgentId={lead.assignedAgentId ?? null}
          assignedAgentName={lead.assignedAgent?.name ?? null}
          sessionId={session.id}
        />

        <QualificationPanel
          leadId={lead.id}
          currentStatus={lead.status}
          qualificationNotes={lead.qualificationNotes}
          disposition={lead.disposition}
          ownershipAuthority={lead.ownershipAuthority}
          reachable={lead.reachable}
          invalidReason={lead.invalidReason}
        />

        <ContactCommunications
          title="Contact Homeowner"
          contactName={`${lead.firstName} ${lead.lastName}`}
          contactType="homeowner"
          reference={lead.referenceNumber}
          phone={lead.phone}
          email={lead.email}
          callLabel="Call"
          projectRequestId={lead.id}
          emailContext={{
            firstName: lead.firstName,
            lastName: lead.lastName,
            reference: lead.referenceNumber,
            trade: lead.trade,
            scheduledAt: appt?.scheduledAt ? formatDate(appt.scheduledAt) : undefined,
            companyName: appt?.contractor.companyName,
          }}
        />

        <CommunicationLogForm leadId={lead.id} />

        <OpportunityPanel
          leadId={lead.id}
          currentStatus={lead.status}
          leadTrade={lead.trade}
          offerHistory={offerHistory.map((e) => ({
            id: e.id,
            eventType: e.eventType,
            description: e.description,
            createdAt: e.createdAt.toISOString(),
            metadata: e.metadata as Record<string, any> | null,
          }))}
        />

        {showReassign && appt && (
          <ReassignContractorPanel
            appointmentId={appt.id}
            appointmentStatus={appt.status}
            currentContractorId={appt.contractorId}
            leadTrade={lead.trade}
          />
        )}

        {showSchedule && appt && <ScheduleAppointmentForm appointmentId={appt.id} />}

        {showDayPanel && appt && (
          <AppointmentDayPanel appointmentId={appt.id} status={appt.status} />
        )}

        {/* No-show resolution panel */}
        <NoShowPanel
          leadId={lead.id}
          leadStatus={lead.status}
          appointmentStatus={appt?.status ?? null}
        />

        {showBilling && appt && (
          <BillingProofPanel
            appointmentId={appt.id}
            invoiceId={appt.invoice?.id ?? null}
            status={appt.invoice?.status ?? null}
          />
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
                {event.actor && (
                  <span className="text-xs text-muted whitespace-nowrap">{event.actor.name}</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
