import { prisma } from "@/lib/db";
import { StatusBadge } from "@/components/StatusBadge";

export default async function OperationsPage() {
  const queues = await Promise.all([
    prisma.projectRequest.findMany({ where: { status: "NEW" }, take: 20 }),
    prisma.projectRequest.findMany({ where: { status: "CALLING" }, take: 20 }),
    prisma.projectRequest.findMany({ where: { status: "QUALIFICATION_IN_PROGRESS" }, take: 20 }),
    prisma.projectRequest.findMany({ where: { status: "BILLING_PENDING" }, take: 20 }),
  ]);

  const queueNames = ["New Leads", "Call Now", "Qualification In Progress", "Billing Pending"];

  return (
    <div>
      <h1 className="text-2xl font-bold">Operations Queues</h1>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {queues.map((items, i) => (
          <div key={queueNames[i]} className="card p-4">
            <h2 className="font-semibold">{queueNames[i]} ({items.length})</h2>
            <ul className="mt-4 space-y-2 text-sm">
              {items.length === 0 ? (
                <li className="text-muted">No items in queue</li>
              ) : (
                items.map((item) => (
                  <li key={item.id} className="flex justify-between border-b border-rule/50 pb-2">
                    <span>{item.referenceNumber} — {item.firstName} {item.lastName}</span>
                    <StatusBadge status={item.status} />
                  </li>
                ))
              )}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
