import { prisma } from "@/lib/db";

export default async function ContractorsPage() {
  const contractors = await prisma.contractorProfile.findMany({
    include: { user: true, capacityCells: true, _count: { select: { appointments: true } } },
  });

  return (
    <div>
      <h1 className="text-2xl font-bold">Renovessa Contractor Scorecard</h1>
      <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {contractors.map((c) => (
          <div key={c.id} className="card p-4">
            <h2 className="font-semibold">{c.companyName}</h2>
            <p className="text-sm text-muted">{c.trade} · {c.tier}</p>
            <dl className="mt-4 grid grid-cols-2 gap-2 text-sm">
              <div><dt className="text-muted">Show Rate</dt><dd>{c.showRate}%</dd></div>
              <div><dt className="text-muted">Accept Rate</dt><dd>{c.acceptanceRate}%</dd></div>
              <div><dt className="text-muted">Dispute Rate</dt><dd>{c.disputeRate}%</dd></div>
              <div><dt className="text-muted">Appointments</dt><dd>{c._count.appointments}</dd></div>
            </dl>
            <div className="mt-3 flex flex-wrap gap-1">
              {c.licenseVerified && <span className="badge-green">Licensed</span>}
              {c.insuranceVerified && <span className="badge-green">Insured</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
