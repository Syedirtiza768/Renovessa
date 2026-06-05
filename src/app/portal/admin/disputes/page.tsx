import { prisma } from "@/lib/db";
import { formatDate } from "@/lib/utils";

export default async function DisputesPage() {
  const disputes = await prisma.dispute.findMany({
    include: { projectRequest: true, contractor: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <h1 className="text-2xl font-bold">Renovessa Dispute Case Files</h1>
      <div className="mt-6 space-y-4">
        {disputes.map((d) => (
          <div key={d.id} className="card-accent p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="font-semibold">{d.projectRequest.referenceNumber}</h2>
                <p className="text-sm text-muted">{d.contractor.companyName}</p>
              </div>
              <span className="badge-red shrink-0">{d.status}</span>
            </div>
            <p className="mt-3 text-sm">{d.reason}</p>
            <p className="mt-2 text-xs text-muted">
              Evidence score: {d.evidenceScore}/100 · {formatDate(d.createdAt)}
            </p>
          </div>
        ))}
        {disputes.length === 0 && <p className="text-muted">No open disputes.</p>}
      </div>
    </div>
  );
}
