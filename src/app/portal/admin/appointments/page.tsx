import { prisma } from "@/lib/db";
import { formatDate } from "@/lib/utils";

export default async function AppointmentsPage() {
  const appointments = await prisma.appointment.findMany({
    include: { projectRequest: true, contractor: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <h1 className="text-2xl font-bold">Renovessa Appointment Timeline</h1>

      {/* Desktop table */}
      <div className="mt-6 hidden card overflow-x-auto sm:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-rule bg-blueprint text-left text-xs uppercase text-muted">
              <th className="p-3">Project</th>
              <th className="p-3">Contractor</th>
              <th className="p-3">Scheduled</th>
              <th className="p-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {appointments.map((appt) => (
              <tr key={appt.id} className="border-b border-rule/50">
                <td className="p-3">{appt.projectRequest.referenceNumber}</td>
                <td className="p-3">{appt.contractor.companyName}</td>
                <td className="p-3">{formatDate(appt.scheduledAt)}</td>
                <td className="p-3">{appt.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="mt-6 space-y-3 sm:hidden">
        {appointments.map((appt) => (
          <div key={appt.id} className="card p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-mono text-xs text-copper">{appt.projectRequest.referenceNumber}</p>
                <p className="mt-0.5 font-semibold truncate">{appt.contractor.companyName}</p>
              </div>
              <span className="badge-neutral shrink-0">{appt.status}</span>
            </div>
            <p className="mt-2 text-xs text-muted">Scheduled: {formatDate(appt.scheduledAt)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
