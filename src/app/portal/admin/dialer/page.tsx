import { redirect } from "next/navigation";
import { getSession, canAccessAdmin } from "@/lib/auth";
import { Dialer } from "@/components/admin/Softphone";

export default async function DialerPage() {
  const session = await getSession();
  if (!session || !canAccessAdmin(session.role)) redirect("/login");

  return (
    <div>
      <h1 className="text-2xl font-bold">Dialer</h1>
      <p className="mt-2 max-w-xl text-sm text-muted">
        Place WebRTC calls to homeowners and contractors directly from the browser. Pick a
        Twilio number as your caller ID, dial or use the keypad, and log the call outcome
        when you hang up — it&rsquo;s recorded on the lead audit trail automatically.
      </p>

      <div className="mt-6">
        <Dialer variant="full" />
      </div>
    </div>
  );
}
