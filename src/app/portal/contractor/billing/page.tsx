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
      <div className="mt-6 card overflow-x-auto">
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
    </div>
  );
}
