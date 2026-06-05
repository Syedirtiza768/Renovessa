import { redirect } from "next/navigation";
import { getSession, canAccessAdmin } from "@/lib/auth";
import { PortalShell } from "@/components/PortalShell";

const navItems = [
  { href: "/portal/admin", label: "Command Center" },
  { href: "/portal/admin/leads", label: "Lead Pipeline" },
  { href: "/portal/admin/operations", label: "Operations Queues" },
  { href: "/portal/admin/appointments", label: "Appointments" },
  { href: "/portal/admin/contractors", label: "Contractors" },
  { href: "/portal/admin/capacity", label: "Capacity Map" },
  { href: "/portal/admin/finance", label: "Finance" },
  { href: "/portal/admin/disputes", label: "Disputes" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session || !canAccessAdmin(session.role)) redirect("/login");

  return (
    <PortalShell
      title="Renovessa Ops"
      subtitle={session.role.replace(/_/g, " ")}
      userName={session.name}
      navItems={navItems}
    >
      {children}
    </PortalShell>
  );
}
