import Link from "next/link";
import { prisma } from "@/lib/db";
import { StatusBadge } from "@/components/StatusBadge";
import { formatDate } from "@/lib/utils";

export default async function AdminLeadsPage() {
  const leads = await prisma.projectRequest.findMany({
    orderBy: { createdAt: "desc" },
    include: { appointment: { include: { contractor: true } }, assignedAgent: true },
  });

  return (
    <div>
      <h1 className="text-2xl font-bold">Renovessa Lead Pipeline</h1>

      {/* Desktop table */}
      <div className="mt-6 hidden overflow-x-auto card sm:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-rule bg-blueprint text-left text-xs uppercase text-muted">
              <th className="p-3">Reference</th>
              <th className="p-3">Homeowner</th>
              <th className="p-3">Trade</th>
              <th className="p-3">ZIP</th>
              <th className="p-3">Status</th>
              <th className="p-3">Agent</th>
              <th className="p-3">Submitted</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {leads.map((lead) => (
              <tr key={lead.id} className="border-b border-rule/50 hover:bg-blueprint/30">
                <td className="p-3 font-mono text-xs">{lead.referenceNumber}</td>
                <td className="p-3">{lead.firstName} {lead.lastName}</td>
                <td className="p-3">{lead.trade}</td>
                <td className="p-3">{lead.zipCode}</td>
                <td className="p-3"><StatusBadge status={lead.status} /></td>
                <td className="p-3 text-xs">{lead.assignedAgent?.name || "—"}</td>
                <td className="p-3 text-xs">{formatDate(lead.createdAt)}</td>
                <td className="p-3">
                  <Link href={`/portal/admin/leads/${lead.id}`} className="text-copper hover:underline">View</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="mt-6 space-y-3 sm:hidden">
        {leads.map((lead) => (
          <div key={lead.id} className="card p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-mono text-xs text-copper">{lead.referenceNumber}</p>
                <p className="mt-0.5 font-semibold">{lead.firstName} {lead.lastName}</p>
                <p className="text-sm text-muted">{lead.trade} · {lead.zipCode}</p>
              </div>
              <StatusBadge status={lead.status} />
            </div>
            <div className="mt-3 flex items-center justify-between text-xs text-muted">
              <span>{lead.assignedAgent?.name || "Unassigned"} · {formatDate(lead.createdAt)}</span>
              <Link href={`/portal/admin/leads/${lead.id}`} className="font-medium text-copper hover:underline">
                View →
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
