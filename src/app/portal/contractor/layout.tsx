import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { PortalShell } from "@/components/PortalShell";
import { NotificationBell } from "@/components/NotificationBell";

const navItems = [
  { href: "/portal/contractor", label: "Appointments" },
  { href: "/portal/contractor/billing", label: "Billing" },
  { href: "/portal/contractor/profile", label: "Profile" },
];

export default async function ContractorLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session || session.role !== "CONTRACTOR") redirect("/login");

  return (
    <PortalShell
      title="Contractor Portal"
      subtitle={session.name}
      userName={session.name}
      navItems={navItems}
      headerExtra={<NotificationBell />}
    >
      {children}
    </PortalShell>
  );
}
