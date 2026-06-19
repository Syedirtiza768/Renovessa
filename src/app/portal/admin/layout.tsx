import { redirect } from "next/navigation";
import { getSession, canAccessAdmin, getAdminNavItems } from "@/lib/auth";
import { PortalShell } from "@/components/PortalShell";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session || !canAccessAdmin(session.role)) redirect("/login");

  return (
    <PortalShell
      title="Renovessa Ops"
      subtitle={session.role.replace(/_/g, " ")}
      userName={session.name}
      navItems={getAdminNavItems(session.role)}
    >
      {children}
    </PortalShell>
  );
}
