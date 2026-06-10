import Link from "next/link";
import { getSession, canAccessAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";

export default async function ContractorsPage() {
  const session = await getSession();
  if (!session || !canAccessAdmin(session.role)) redirect("/login");

  const contractors = await prisma.contractorProfile.findMany({
    include: { user: true, capacityCells: true, _count: { select: { appointments: true } } },
  });

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Contractors</h1>
        <Link href="/portal/admin/contractors/new" className="btn-primary text-sm">
          + Add Contractor
        </Link>
      </div>
      <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {contractors.map((c) => (
          <Link key={c.id} href={`/portal/admin/contractors/${c.id}`} className="card p-4 hover:border-copper transition-colors">
            <h2 className="font-semibold">{c.companyName}</h2>
            <p className="text-sm text-muted">{c.trade} · {c.tier}</p>
            <dl className="mt-4 grid grid-cols-2 gap-2 text-sm">
              <div><dt className="text-muted">Show Rate</dt><dd>{c.showRate}%</dd></div>
              <div><dt className="text-muted">Accept Rate</dt><dd>{c.acceptanceRate}%</dd></div>
              <div><dt className="text-muted">Appointments</dt><dd>{c._count.appointments}</dd></div>
              <div><dt className="text-muted">Status</dt><dd>{c.status}</dd></div>
            </dl>
            <div className="mt-3 flex flex-wrap gap-1">
              {c.licenseVerified && <span className="badge-green">Licensed</span>}
              {c.insuranceVerified && <span className="badge-green">Insured</span>}
            </div>
          </Link>
        ))}
        {contractors.length === 0 && (
          <p className="text-muted col-span-full">No contractors yet. Add one to begin.</p>
        )}
      </div>
    </div>
  );
}
