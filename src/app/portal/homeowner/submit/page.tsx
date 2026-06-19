import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PortalProjectForm } from "@/components/PortalProjectForm";

export default async function HomeownerSubmitPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.id },
    select: { phone: true },
  });

  return (
    <div>
      <Link href="/portal/homeowner" className="text-sm text-copper hover:underline">
        ← Back to My Projects
      </Link>
      <h1 className="mt-4 text-2xl font-bold">Submit a Project</h1>
      <p className="mt-1 text-sm text-muted">
        Same intake form as our website — submitted directly to your portal account.
      </p>
      <div className="mt-6 max-w-2xl">
        <PortalProjectForm
          prefill={{
            name: session.name,
            email: session.email,
            phone: user?.phone ?? "",
          }}
        />
      </div>
    </div>
  );
}
