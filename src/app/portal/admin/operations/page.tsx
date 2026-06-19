import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSession, canAccessAdmin } from "@/lib/auth";
import { StatusBadge } from "@/components/StatusBadge";
import { AssignToMeButton } from "@/components/admin/AssignToMeButton";

const QUEUES = [
  { key: "NEW", label: "New Leads" },
  { key: "ASSIGNED", label: "Assigned" },
  { key: "CALLING", label: "Call Now" },
  { key: "QUALIFICATION_IN_PROGRESS", label: "Qualifying" },
  { key: "QUALIFIED", label: "Qualified" },
  { key: "APPOINTMENT_OFFERED", label: "Offered" },
  { key: "APPOINTMENT_CONFIRMED", label: "Confirmed" },
  { key: "APPOINTMENT_COMPLETED", label: "Completed" },
  { key: "BILLING_PENDING", label: "Billing Pending" },
];

export default async function OperationsPage({
  searchParams,
}: {
  searchParams: Promise<{ mine?: string }>;
}) {
  const session = await getSession();
  if (!session || !canAccessAdmin(session.role)) redirect("/login");

  const { mine } = await searchParams;
  const mineOnly = mine === "1";
  const agentFilter = mineOnly ? { assignedAgentId: session.id } : {};

  const queueStatuses = QUEUES.map((q) => q.key);
  const results = await Promise.all(
    queueStatuses.map((status) =>
      prisma.projectRequest.findMany({
        where: { status: status as any, ...agentFilter },
        take: 20,
        include: { assignedAgent: true },
      })
    )
  );

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Operations Queues</h1>
        <div className="flex gap-2 text-sm">
          <Link
            href="/portal/admin/operations"
            className={`rounded-md px-3 py-1.5 ${!mineOnly ? "bg-slate text-white" : "border border-rule text-muted hover:text-slate"}`}
          >
            All leads
          </Link>
          <Link
            href="/portal/admin/operations?mine=1"
            className={`rounded-md px-3 py-1.5 ${mineOnly ? "bg-slate text-white" : "border border-rule text-muted hover:text-slate"}`}
          >
            My leads only
          </Link>
        </div>
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {QUEUES.map((queue, i) => {
          const items = results[i];
          return (
            <div key={queue.key} className="card p-4">
              <h2 className="font-semibold">{queue.label} ({items.length})</h2>
              <ul className="mt-4 space-y-2 text-sm">
                {items.length === 0 ? (
                  <li className="text-muted">No items in queue</li>
                ) : (
                  items.map((item) => (
                    <li key={item.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-rule/50 pb-2">
                      <div className="min-w-0">
                        <Link href={`/portal/admin/leads/${item.id}`} className="text-copper hover:underline font-mono text-xs">
                          {item.referenceNumber}
                        </Link>
                        <span className="ml-2">{item.firstName} {item.lastName}</span>
                        {item.assignedAgent ? (
                          <span className="ml-2 text-xs text-muted">→ {item.assignedAgent.name}</span>
                        ) : item.status === "NEW" ? (
                          <span className="ml-2 inline-flex">
                            <AssignToMeButton leadId={item.id} />
                          </span>
                        ) : null}
                      </div>
                      <StatusBadge status={item.status} />
                    </li>
                  ))
                )}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}
