import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession, canManageTeam } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatDate } from "@/lib/utils";

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: "Super Admin",
  OPS_AGENT: "Ops Agent",
  SCHEDULER: "Scheduler",
  OPS_MANAGER: "Ops Manager",
};

export default async function TeamPage() {
  const session = await getSession();
  if (!session || !canManageTeam(session.role)) redirect("/portal/admin");

  const members = await prisma.user.findMany({
    where: {
      role: { in: ["SUPER_ADMIN", "OPS_AGENT", "SCHEDULER", "OPS_MANAGER"] },
    },
    select: { id: true, name: true, email: true, role: true, createdAt: true },
    orderBy: { name: "asc" },
  });

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Team</h1>
        <Link href="/portal/admin/team/new" className="btn-primary text-sm">
          Add Team Member
        </Link>
      </div>
      <p className="mt-2 text-sm text-muted">
        Ops agents and schedulers who qualify leads and manage appointments.
      </p>

      <div className="mt-6 hidden overflow-x-auto card sm:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-rule bg-blueprint text-left text-xs uppercase text-muted">
              <th className="p-3">Name</th>
              <th className="p-3">Email</th>
              <th className="p-3">Role</th>
              <th className="p-3">Added</th>
            </tr>
          </thead>
          <tbody>
            {members.map((m) => (
              <tr key={m.id} className="border-b border-rule/50">
                <td className="p-3 font-medium">{m.name}</td>
                <td className="p-3">{m.email}</td>
                <td className="p-3">{ROLE_LABELS[m.role] ?? m.role}</td>
                <td className="p-3 text-xs text-muted">{formatDate(m.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-6 space-y-3 sm:hidden">
        {members.map((m) => (
          <div key={m.id} className="card p-4 text-sm">
            <p className="font-medium">{m.name}</p>
            <p className="text-muted">{m.email}</p>
            <p className="mt-1 text-xs">{ROLE_LABELS[m.role] ?? m.role}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
