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
      <div className="mt-6 card overflow-x-auto">
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
    </div>
  );
}
