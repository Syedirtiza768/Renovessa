import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { StatusBadge } from "@/components/StatusBadge";
import { formatDate } from "@/lib/utils";
import { ConfirmAppointmentButton } from "@/components/ConfirmAppointmentButton";
import { HomeownerFeedbackForm } from "@/components/HomeownerFeedbackForm";

export default async function HomeownerDashboard() {
  const session = await getSession();
  if (!session) redirect("/login");

  const projects = await prisma.projectRequest.findMany({
    where: { homeownerId: session.id },
    include: {
      appointment: {
        include: {
          contractor: true,
          feedbacks: { where: { actorType: "homeowner" } },
        },
      },
      auditEvents: { orderBy: { createdAt: "asc" }, take: 5 },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">My Projects</h1>
        <Link href="/portal/homeowner/submit" className="btn-primary text-sm">
          Submit Another Project
        </Link>
      </div>

      {projects.length === 0 ? (
        <div className="mt-8 card p-8 text-center">
          <p className="text-muted">No projects yet. Submit a project request to get started.</p>
          <Link href="/portal/homeowner/submit" className="btn-primary mt-4 inline-flex">
            Submit My Project
          </Link>
        </div>
      ) : (
        <div className="mt-8 space-y-6">
          {projects.map((project) => {
            const appt = project.appointment;
            const hasSubmittedFeedback = (appt?.feedbacks.length ?? 0) > 0;
            const canLeaveFeedback =
              appt &&
              ["HOMEOWNER_CONFIRMED", "BILLED"].includes(appt.status) &&
              !hasSubmittedFeedback;

            return (
              <div key={project.id} className="card-accent p-5 sm:p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-mono text-sm text-copper">{project.referenceNumber}</p>
                    <h2 className="text-lg font-semibold">{project.trade}</h2>
                    <p className="text-sm text-muted line-clamp-2">{project.description}</p>
                  </div>
                  <StatusBadge status={project.status} />
                </div>

                {appt && (
                  <div className="mt-4 rounded-md bg-blueprint p-4 text-sm space-y-1">
                    <p><strong>Contractor:</strong> {appt.contractor.companyName}</p>
                    {appt.scheduledAt ? (
                      <p><strong>Scheduled:</strong> {formatDate(appt.scheduledAt)}</p>
                    ) : (
                      <p className="text-muted">Appointment date to be confirmed.</p>
                    )}
                    {appt.location && <p><strong>Location:</strong> {appt.location}</p>}
                    <p><strong>Status:</strong> {appt.status}</p>

                    <ConfirmAppointmentButton
                      appointmentId={appt.id}
                      appointmentStatus={appt.status}
                      scheduledAt={appt.scheduledAt ? appt.scheduledAt.toISOString() : null}
                    />
                  </div>
                )}

                {canLeaveFeedback && appt && (
                  <HomeownerFeedbackForm appointmentId={appt.id} />
                )}

                {hasSubmittedFeedback && (
                  <p className="mt-3 text-xs text-muted italic">Feedback submitted — thank you.</p>
                )}

                <div className="mt-4 flex items-center justify-between gap-3">
                  <p className="text-xs text-muted">
                    Submitted {formatDate(project.createdAt)}
                  </p>
                  <Link
                    href={`/portal/homeowner/projects/${project.id}`}
                    className="text-sm text-copper hover:underline"
                  >
                    View details →
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
