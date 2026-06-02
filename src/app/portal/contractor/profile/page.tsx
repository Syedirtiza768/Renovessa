import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

export default async function ContractorProfilePage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const profile = await prisma.contractorProfile.findUnique({
    where: { userId: session.id },
    include: { capacityCells: true },
  });

  if (!profile) return <p>Profile not found</p>;

  return (
    <div>
      <h1 className="text-2xl font-bold">Profile</h1>
      <div className="mt-6 card p-6">
        <dl className="grid gap-4 sm:grid-cols-2 text-sm">
          <div><dt className="text-muted">Company</dt><dd className="font-medium">{profile.companyName}</dd></div>
          <div><dt className="text-muted">Trade</dt><dd>{profile.trade}</dd></div>
          <div><dt className="text-muted">Tier</dt><dd>{profile.tier}</dd></div>
          <div><dt className="text-muted">Service ZIPs</dt><dd>{profile.serviceZips.join(", ")}</dd></div>
          <div><dt className="text-muted">License Verified</dt><dd>{profile.licenseVerified ? "Yes" : "No"}</dd></div>
          <div><dt className="text-muted">Insurance Verified</dt><dd>{profile.insuranceVerified ? "Yes" : "No"}</dd></div>
        </dl>
        <div className="mt-4">
          <p className="text-xs font-semibold uppercase text-muted">Capacity Cells</p>
          <ul className="mt-2 text-sm">
            {profile.capacityCells.map((c) => (
              <li key={c.id}>· {c.name} ({c.status})</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
