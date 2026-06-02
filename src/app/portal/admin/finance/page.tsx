import { prisma } from "@/lib/db";
import { formatCurrency, formatDate } from "@/lib/utils";

export default async function FinancePage() {
  const invoices = await prisma.invoice.findMany({
    include: { contractor: true, appointment: { include: { projectRequest: true } } },
    orderBy: { createdAt: "desc" },
  });

  const totals = await prisma.invoice.groupBy({
    by: ["status"],
    _sum: { amount: true },
    _count: true,
  });

  return (
    <div>
      <h1 className="text-2xl font-bold">Renovessa Finance Control</h1>
      <div className="mt-6 grid gap-4 sm:grid-cols-4">
        {totals.map((t) => (
          <div key={t.status} className="kpi-card">
            <p className="text-xs uppercase text-muted">{t.status}</p>
            <p className="text-xl font-bold">{formatCurrency(t._sum.amount || 0)}</p>
            <p className="text-xs text-muted">{t._count} invoices</p>
          </div>
        ))}
      </div>
      <div className="mt-8 card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-rule bg-blueprint text-left text-xs uppercase text-muted">
              <th className="p-3">Contractor</th>
              <th className="p-3">Project</th>
              <th className="p-3">Amount</th>
              <th className="p-3">Status</th>
              <th className="p-3">Date</th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((inv) => (
              <tr key={inv.id} className="border-b border-rule/50">
                <td className="p-3">{inv.contractor.companyName}</td>
                <td className="p-3">{inv.appointment.projectRequest.referenceNumber}</td>
                <td className="p-3">{formatCurrency(inv.amount)}</td>
                <td className="p-3">{inv.status}</td>
                <td className="p-3">{formatDate(inv.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
