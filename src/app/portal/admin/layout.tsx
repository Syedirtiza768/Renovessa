import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession, canAccessAdmin } from "@/lib/auth";

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
    <div className="flex min-h-screen">
      <aside className="portal-sidebar">
        <div className="border-b border-white/10 p-4">
          <p className="font-bold">Renovessa Ops</p>
          <p className="text-xs text-white/60">{session.role.replace(/_/g, " ")}</p>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href} className="portal-nav-link">
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="border-t border-white/10 p-4 text-xs text-white/60">
          <p>{session.name}</p>
          <form action="/api/auth/logout" method="POST">
            <button type="submit" className="mt-2 text-copper hover:underline">Sign out</button>
          </form>
        </div>
      </aside>
      <div className="flex-1 overflow-auto bg-cream p-6">{children}</div>
    </div>
  );
}
