import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { StatusBadge } from "@/components/StatusBadge";
import { formatDate } from "@/lib/utils";
import { ConfirmAppointmentButton } from "@/components/ConfirmAppointmentButton";

export default async function HomeownerDashboard() {
  const session = await getSession();
  if (!session) redirect("/login");

  const projects = await prisma.projectRequest.findMany({
    where: { homeownerId: session.id },
    include: {
      appointment: { include: { contractor: true } },
      auditEvents: { orderBy: { createdAt: "asc" }, take: 10 },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">My Projects</h1>
        <Link href="/#request" className="btn-primary text-sm">Submit Another Project</Link>
      </div>

      {projects.length === 0 ? (
        <div className="mt-8 card p-8 text-center">
          <p className="text-muted">No projects yet. Submit a project request to get started.</p>
          <Link href="/#request" className="btn-primary mt-4 inline-flex">Submit My Project</Link>
        </div>
      ) : (
        <div className="mt-8 space-y-6">
          {projects.map((project) => (
            <div key={project.id} className="card-accent p-5 sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-mono text-sm text-copper">{project.referenceNumber}</p>
                  <h2 className="text-lg font-semibold">{project.trade}</h2>
                  <p className="text-sm text-muted">{project.description}</p>
                </div>
                <StatusBadge status={project.status} />
              </div>

              {project.appointment && (
                <div className="mt-4 rounded-md bg-blueprint p-4 text-sm">
                  <p><strong>Contractor:</strong> {project.appointment.contractor.companyName}</p>
                  <p><strong>Scheduled:</strong> {formatDate(project.appointment.scheduledAt)}</p>
                  <p><strong>Appointment Status:</strong> {project.appointment.status}</p>
                  {project.appointment.status === "SCHEDULED" && (
                    <ConfirmAppointmentButton appointmentId={project.appointment.id} />
                  )}
                </div>
              )}

              <div className="mt-4">
                <p className="text-xs font-semibold uppercase text-muted">Verification Trail</p>
                <ul className="mt-2 space-y-1 text-sm">
                  {project.auditEvents.map((e) => (
                    <li key={e.id} className="text-muted">· {e.description}</li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
