import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { ChangePasswordForm } from "@/components/ChangePasswordForm";

export default async function HomeownerSettingsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <div>
      <Link href="/portal/homeowner" className="text-sm text-copper hover:underline">
        ← Back to My Projects
      </Link>
      <h1 className="mt-4 text-2xl font-bold">Account Settings</h1>
      <p className="mt-1 text-sm text-muted">{session.email}</p>
      <div className="mt-6 max-w-md">
        <ChangePasswordForm />
      </div>
    </div>
  );
}
