import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatDate } from "@/lib/utils";
import { AppointmentActions } from "@/components/AppointmentActions";
import { StatusBadge } from "@/components/StatusBadge";

export default async function ContractorDashboard() {
  const session = await getSession();
  if (!session) redirect("/login");

  const profile = await prisma.contractorProfile.findUnique({
    where: { userId: session.id },
    include: {
      appointments: {
        include: { projectRequest: true },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!profile) {
    return <p>Contractor profile not found.</p>;
  }

  const pendingCount = profile.appointments.filter((a) =>
    ["OFFERED", "ACCEPTED", "SCHEDULED", "REMINDER_SENT", "CHECKED_IN"].includes(a.status)
  ).length;

  return (
    <div>
      <h1 className="text-2xl font-bold">Appointments</h1>
      <div className="mt-4 grid gap-4 sm:grid-cols-4">
        <div className="kpi-card">
          <p className="text-xs text-muted">Pending Action</p>
          <p className="text-2xl font-bold">{pendingCount}</p>
        </div>
        <div className="kpi-card">
          <p className="text-xs text-muted">Show Rate</p>
          <p className="text-2xl font-bold">{profile.showRate}%</p>
        </div>
        <div className="kpi-card">
          <p className="text-xs text-muted">Accept Rate</p>
          <p className="text-2xl font-bold">{profile.acceptanceRate}%</p>
        </div>
        <div className="kpi-card">
          <p className="text-xs text-muted">Tier</p>
          <p className="text-2xl font-bold">{profile.tier}</p>
        </div>
      </div>

      <div className="mt-8 space-y-4">
        {profile.appointments.map((appt) => {
          const lead = appt.projectRequest;
          const isPending = ["OFFERED", "ACCEPTED", "SCHEDULED", "REMINDER_SENT", "CHECKED_IN"].includes(appt.status);

          return (
            <div key={appt.id} className={isPending ? "card-accent p-4" : "card p-4 opacity-80"}>
              <div className="flex flex-wrap justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-mono text-sm text-copper">{lead.referenceNumber}</p>
                    <StatusBadge status={appt.status} />
                  </div>
                  <h2 className="mt-1 font-semibold">{lead.trade} — {lead.zipCode}</h2>
                </div>
              </div>

              <div className="mt-3 grid gap-3 sm:grid-cols-2 text-sm">
                <div>
                  <p className="text-xs font-medium text-muted uppercase tracking-wide mb-1">Project Details</p>
                  <p className="text-muted">{lead.description}</p>
                  {lead.urgency && (
                    <p className="mt-1"><span className="text-muted">Urgency:</span> {lead.urgency}</p>
                  )}
                  {lead.budgetRange && (
                    <p><span className="text-muted">Budget:</span> {lead.budgetRange}</p>
                  )}
                  {lead.preferredAppointmentWindows && (
                    <p><span className="text-muted">Preferred windows:</span> {lead.preferredAppointmentWindows}</p>
                  )}
                </div>

                <div>
                  <p className="text-xs font-medium text-muted uppercase tracking-wide mb-1">Appointment</p>
                  {appt.scheduledAt ? (
                    <p><span className="text-muted">Scheduled:</span> {formatDate(appt.scheduledAt)}</p>
                  ) : (
                    <p className="text-muted italic">Not yet scheduled</p>
                  )}
                  {appt.location && (
                    <p><span className="text-muted">Location:</span> {appt.location}</p>
                  )}
                  {appt.estimateGiven && (
                    <p><span className="text-muted">Estimate recorded:</span> {appt.estimateGiven}</p>
                  )}
                  {appt.declineReason && (
                    <p className="text-red-600"><span className="text-muted">Declined:</span> {appt.declineReason}</p>
                  )}
                </div>
              </div>

              <AppointmentActions appointmentId={appt.id} status={appt.status} />
            </div>
          );
        })}
        {profile.appointments.length === 0 && (
          <p className="text-muted">No appointments yet. New verified appointments will appear here.</p>
        )}
      </div>
    </div>
  );
}
