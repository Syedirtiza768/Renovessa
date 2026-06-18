import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { NotificationBell } from "@/components/NotificationBell";

export default async function HomeownerLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session || session.role !== "HOMEOWNER") redirect("/login");

  return (
    <div className="min-h-screen bg-cream">
      <header className="border-b border-rule bg-white">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-4">
          <Link href="/portal/homeowner" className="font-bold text-slate">
            Renovessa
          </Link>
          <div className="flex items-center gap-3 text-sm">
            <span className="hidden truncate max-w-[160px] text-muted sm:inline">{session.name}</span>
            <div className="flex items-center rounded-md bg-slate px-1">
              <NotificationBell />
            </div>
            <form action="/api/auth/logout" method="POST">
              <button type="submit" className="text-copper hover:underline">
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6 sm:py-8">{children}</main>
    </div>
  );
}
