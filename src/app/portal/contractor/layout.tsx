import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";

export default async function ContractorLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session || session.role !== "CONTRACTOR") redirect("/login");

  return (
    <div className="flex min-h-screen">
      <aside className="portal-sidebar">
        <div className="border-b border-white/10 p-4">
          <p className="font-bold">Contractor Portal</p>
          <p className="text-xs text-white/60">{session.name}</p>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          <Link href="/portal/contractor" className="portal-nav-link">Appointments</Link>
          <Link href="/portal/contractor/billing" className="portal-nav-link">Billing</Link>
          <Link href="/portal/contractor/profile" className="portal-nav-link">Profile</Link>
        </nav>
        <div className="border-t border-white/10 p-4">
          <form action="/api/auth/logout" method="POST">
            <button type="submit" className="text-sm text-copper hover:underline">Sign out</button>
          </form>
        </div>
      </aside>
      <div className="flex-1 overflow-auto bg-cream p-6">{children}</div>
    </div>
  );
}
