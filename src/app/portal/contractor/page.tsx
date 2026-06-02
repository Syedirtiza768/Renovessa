import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatDate } from "@/lib/utils";
import { AppointmentActions } from "@/components/AppointmentActions";

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

  return (
    <div>
      <h1 className="text-2xl font-bold">Appointments</h1>
      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <div className="kpi-card"><p className="text-xs text-muted">Show Rate</p><p className="text-2xl font-bold">{profile.showRate}%</p></div>
        <div className="kpi-card"><p className="text-xs text-muted">Accept Rate</p><p className="text-2xl font-bold">{profile.acceptanceRate}%</p></div>
        <div className="kpi-card"><p className="text-xs text-muted">Tier</p><p className="text-2xl font-bold">{profile.tier}</p></div>
      </div>

      <div className="mt-8 space-y-4">
        {profile.appointments.map((appt) => (
          <div key={appt.id} className="card-accent p-4">
            <div className="flex flex-wrap justify-between gap-4">
              <div>
                <p className="font-mono text-sm text-copper">{appt.projectRequest.referenceNumber}</p>
                <h2 className="font-semibold">{appt.projectRequest.trade} — {appt.projectRequest.zipCode}</h2>
                <p className="text-sm text-muted">{appt.projectRequest.description.slice(0, 120)}...</p>
                <p className="mt-2 text-sm">Scheduled: {formatDate(appt.scheduledAt)}</p>
              </div>
              <span className="badge-copper">{appt.status}</span>
            </div>
            <AppointmentActions appointmentId={appt.id} status={appt.status} />
          </div>
        ))}
        {profile.appointments.length === 0 && (
          <p className="text-muted">No appointments yet. New verified appointments will appear here.</p>
        )}
      </div>
    </div>
  );
}
