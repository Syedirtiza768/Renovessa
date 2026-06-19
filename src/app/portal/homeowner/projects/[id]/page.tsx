import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { StatusBadge } from "@/components/StatusBadge";
import { formatDate } from "@/lib/utils";
import { ConfirmAppointmentButton } from "@/components/ConfirmAppointmentButton";
import { HomeownerFeedbackForm } from "@/components/HomeownerFeedbackForm";
import { isHomeownerVisibleAuditEvent } from "@/lib/homeowner-audit";

export default async function HomeownerProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session || session.role !== "HOMEOWNER") redirect("/login");

  const { id } = await params;
  const project = await prisma.projectRequest.findUnique({
    where: { id },
    include: {
      appointment: {
        include: {
          contractor: true,
          feedbacks: { where: { actorType: "homeowner" } },
        },
      },
      auditEvents: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!project || project.homeownerId !== session.id) notFound();

  const appt = project.appointment;
  const visibleEvents = project.auditEvents.filter((e) =>
    isHomeownerVisibleAuditEvent(e.eventType)
  );
  const hasSubmittedFeedback = (appt?.feedbacks.length ?? 0) > 0;
  const canLeaveFeedback =
    appt &&
    ["HOMEOWNER_CONFIRMED", "BILLED"].includes(appt.status) &&
    !hasSubmittedFeedback;

  return (
    <div>
      <Link href="/portal/homeowner" className="text-sm text-copper hover:underline">
        ← Back to My Projects
      </Link>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-mono text-sm text-copper">{project.referenceNumber}</p>
          <h1 className="text-2xl font-bold">{project.trade}</h1>
          <p className="text-sm text-muted">Submitted {formatDate(project.createdAt)}</p>
        </div>
        <StatusBadge status={project.status} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="card p-4">
          <h2 className="font-semibold">What You Submitted</h2>
          <dl className="mt-4 space-y-2 text-sm">
            <div>
              <dt className="text-muted">Description</dt>
              <dd>{project.description}</dd>
            </div>
            <div>
              <dt className="text-muted">Urgency</dt>
              <dd>{project.urgency}</dd>
            </div>
            <div>
              <dt className="text-muted">Budget</dt>
              <dd>{project.budgetRange}</dd>
            </div>
            <div>
              <dt className="text-muted">ZIP code</dt>
              <dd>{project.zipCode}</dd>
            </div>
            {project.address && (
              <div>
                <dt className="text-muted">Address</dt>
                <dd>{project.address}</dd>
              </div>
            )}
            {project.ownershipAuthority && (
              <div>
                <dt className="text-muted">Ownership</dt>
                <dd>{project.ownershipAuthority}</dd>
              </div>
            )}
            {project.preferredAppointmentWindows && (
              <div>
                <dt className="text-muted">Preferred appointment windows</dt>
                <dd>{project.preferredAppointmentWindows}</dd>
              </div>
            )}
            {project.preferredContact && (
              <div>
                <dt className="text-muted">Preferred contact time</dt>
                <dd>{project.preferredContact}</dd>
              </div>
            )}
            <div>
              <dt className="text-muted">Contact</dt>
              <dd>{project.phone} · {project.email}</dd>
            </div>
          </dl>
        </div>

        {appt ? (
          <div className="card-accent p-4">
            <h2 className="font-semibold">Appointment</h2>
            <dl className="mt-4 space-y-2 text-sm">
              <div>
                <dt className="text-muted">Contractor</dt>
                <dd>{appt.contractor.companyName}</dd>
              </div>
              <div>
                <dt className="text-muted">Status</dt>
                <dd>{appt.status}</dd>
              </div>
              {appt.scheduledAt ? (
                <div>
                  <dt className="text-muted">Scheduled</dt>
                  <dd>{formatDate(appt.scheduledAt)}</dd>
                </div>
              ) : (
                <div>
                  <dt className="text-muted">Scheduled</dt>
                  <dd className="text-muted italic">Date to be confirmed</dd>
                </div>
              )}
              {appt.location && (
                <div>
                  <dt className="text-muted">Location</dt>
                  <dd>{appt.location}</dd>
                </div>
              )}
            </dl>

            <div className="mt-4">
              <ConfirmAppointmentButton
                appointmentId={appt.id}
                appointmentStatus={appt.status}
                scheduledAt={appt.scheduledAt ? appt.scheduledAt.toISOString() : null}
              />
            </div>
          </div>
        ) : (
          <div className="card p-4">
            <h2 className="font-semibold">Appointment</h2>
            <p className="mt-4 text-sm text-muted">
              No appointment scheduled yet. Our team will call to qualify your request.
            </p>
          </div>
        )}
      </div>

      {canLeaveFeedback && appt && (
        <div className="mt-6">
          <HomeownerFeedbackForm appointmentId={appt.id} />
        </div>
      )}

      {hasSubmittedFeedback && (
        <p className="mt-6 text-sm text-muted italic">Feedback submitted — thank you.</p>
      )}

      {visibleEvents.length > 0 && (
        <div className="mt-6 card p-4">
          <h2 className="font-semibold">Verification Trail</h2>
          <ul className="mt-4 space-y-2 text-sm">
            {visibleEvents.map((e) => (
              <li key={e.id} className="flex gap-2 text-muted">
                <span className="shrink-0 text-xs">{formatDate(e.createdAt)}</span>
                <span>{e.description}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
