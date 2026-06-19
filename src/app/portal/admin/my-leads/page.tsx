import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession, canAccessAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { StatusBadge } from "@/components/StatusBadge";
import { formatDate } from "@/lib/utils";

export default async function MyLeadsPage() {
  const session = await getSession();
  if (!session || !canAccessAdmin(session.role)) redirect("/login");

  const leads = await prisma.projectRequest.findMany({
    where: { assignedAgentId: session.id },
    orderBy: { updatedAt: "desc" },
    include: { appointment: { include: { contractor: true } } },
  });

  return (
    <div>
      <h1 className="text-2xl font-bold">My Leads</h1>
      <p className="mt-2 text-sm text-muted">
        Leads assigned to you. Use Operations Queues to pick up unassigned work.
      </p>

      {leads.length === 0 ? (
        <div className="mt-8 card p-8 text-center">
          <p className="text-muted">No leads assigned to you yet.</p>
          <Link href="/portal/admin/operations" className="btn-primary mt-4 inline-flex text-sm">
            Browse Operations Queues
          </Link>
        </div>
      ) : (
        <>
          <div className="mt-6 hidden overflow-x-auto card sm:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-rule bg-blueprint text-left text-xs uppercase text-muted">
                  <th className="p-3">Reference</th>
                  <th className="p-3">Homeowner</th>
                  <th className="p-3">Trade</th>
                  <th className="p-3">ZIP</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Updated</th>
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
                    <td className="p-3 text-xs text-muted">{formatDate(lead.updatedAt)}</td>
                    <td className="p-3">
                      <Link href={`/portal/admin/leads/${lead.id}`} className="text-copper hover:underline">
                        Open
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-6 space-y-3 sm:hidden">
            {leads.map((lead) => (
              <Link key={lead.id} href={`/portal/admin/leads/${lead.id}`} className="card block p-4 hover:bg-blueprint/30">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-mono text-xs text-copper">{lead.referenceNumber}</p>
                    <p className="font-medium">{lead.firstName} {lead.lastName}</p>
                    <p className="text-sm text-muted">{lead.trade} · {lead.zipCode}</p>
                  </div>
                  <StatusBadge status={lead.status} />
                </div>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
