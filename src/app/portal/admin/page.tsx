import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession, canAccessAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatCurrency, formatDate } from "@/lib/utils";
import { StatusBadge } from "@/components/StatusBadge";

export default async function AdminDashboard() {
  const session = await getSession();
  if (!session || !canAccessAdmin(session.role)) redirect("/login");

  const [
    totalLeads,
    qualifiedLeads,
    appointments,
    verifiedAppointments,
    contractors,
    capacityCells,
    disputes,
    revenue,
    recentLeads,
    recentAudit,
  ] = await Promise.all([
    prisma.projectRequest.count(),
    prisma.projectRequest.count({ where: { status: { in: ["QUALIFIED", "APPOINTMENT_CONFIRMED", "HOMEOWNER_CONFIRMED", "BILLING_APPROVED"] } } }),
    prisma.appointment.count(),
    prisma.appointment.count({ where: { status: { in: ["HOMEOWNER_CONFIRMED", "BILLED"] } } }),
    prisma.contractorProfile.count(),
    prisma.capacityCell.count(),
    prisma.dispute.count({ where: { status: "OPEN" } }),
    prisma.invoice.aggregate({ _sum: { amount: true }, where: { status: { in: ["CHARGED", "APPROVED"] } } }),
    prisma.projectRequest.findMany({ orderBy: { createdAt: "desc" }, take: 10, include: { appointment: true } }),
    prisma.auditEvent.findMany({ orderBy: { createdAt: "desc" }, take: 15, include: { actor: true } }),
  ]);

  const kpis = [
    { label: "Total Leads", value: totalLeads },
    { label: "Qualified Leads", value: qualifiedLeads },
    { label: "Appointments", value: appointments },
    { label: "Verified", value: verifiedAppointments },
    { label: "Revenue", value: formatCurrency(revenue._sum.amount || 0) },
    { label: "Active Disputes", value: disputes },
    { label: "Contractors", value: contractors },
    { label: "Capacity Cells", value: capacityCells },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold">Operations Command Center</h1>
      <p className="text-sm text-muted">Welcome, {session.name}</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="kpi-card">
            <p className="text-xs font-medium uppercase text-muted">{kpi.label}</p>
            <p className="mt-1 text-2xl font-bold">{kpi.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="card p-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Renovessa Lead Pipeline</h2>
            <Link href="/portal/admin/leads" className="text-sm text-copper">View all →</Link>
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-rule text-left text-xs uppercase text-muted">
                  <th className="pb-2">Ref</th>
                  <th className="pb-2">Trade</th>
                  <th className="pb-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {recentLeads.map((lead) => (
                  <tr key={lead.id} className="border-b border-rule/50">
                    <td className="py-2 font-mono text-xs">{lead.referenceNumber}</td>
                    <td className="py-2">{lead.trade}</td>
                    <td className="py-2"><StatusBadge status={lead.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card p-4">
          <h2 className="font-semibold">Verification Trail — Activity Feed</h2>
          <ul className="mt-4 max-h-80 space-y-3 overflow-y-auto text-sm">
            {recentAudit.map((event) => (
              <li key={event.id} className="border-b border-rule/50 pb-2">
                <p>{event.description}</p>
                <p className="font-mono text-xs text-muted">{formatDate(event.createdAt)} {event.actor?.name && `· ${event.actor.name}`}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
