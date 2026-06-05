import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatCurrency, formatDate } from "@/lib/utils";

export default async function ContractorBillingPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const profile = await prisma.contractorProfile.findUnique({
    where: { userId: session.id },
    include: { invoices: { orderBy: { createdAt: "desc" } } },
  });

  if (!profile) return <p>Profile not found</p>;

  return (
    <div>
      <h1 className="text-2xl font-bold">Billing</h1>
      <p className="text-sm text-muted">Renovessa Billing Review — charges only after homeowner verification</p>

      {/* Desktop table */}
      <div className="mt-6 hidden card overflow-x-auto sm:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-rule bg-blueprint text-left text-xs uppercase text-muted">
              <th className="p-3">Amount</th>
              <th className="p-3">Status</th>
              <th className="p-3">Date</th>
            </tr>
          </thead>
          <tbody>
            {profile.invoices.map((inv) => (
              <tr key={inv.id} className="border-b border-rule/50">
                <td className="p-3">{formatCurrency(inv.amount)}</td>
                <td className="p-3">{inv.status}</td>
                <td className="p-3">{formatDate(inv.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="mt-6 space-y-3 sm:hidden">
        {profile.invoices.map((inv) => (
          <div key={inv.id} className="card p-4">
            <div className="flex items-center justify-between gap-2">
              <span className="font-semibold">{formatCurrency(inv.amount)}</span>
              <span className="badge-neutral">{inv.status}</span>
            </div>
            <p className="mt-1 text-xs text-muted">{formatDate(inv.createdAt)}</p>
          </div>
        ))}
        {profile.invoices.length === 0 && (
          <p className="text-muted">No invoices yet.</p>
        )}
      </div>
    </div>
  );
}
