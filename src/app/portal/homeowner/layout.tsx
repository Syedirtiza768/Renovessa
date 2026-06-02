import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";

export default async function HomeownerLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session || session.role !== "HOMEOWNER") redirect("/login");

  return (
    <div className="min-h-screen bg-cream">
      <header className="border-b border-rule bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <Link href="/portal/homeowner" className="font-bold text-slate">Renovessa Homeowner Portal</Link>
          <div className="flex items-center gap-4 text-sm">
            <span className="text-muted">{session.name}</span>
            <form action="/api/auth/logout" method="POST">
              <button type="submit" className="text-copper hover:underline">Sign out</button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
    </div>
  );
}
