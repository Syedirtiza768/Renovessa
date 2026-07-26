import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { bathroomContractorStudioEnabled } from "@/lib/feature-flags";
import { StudioJobList } from "@/components/contractor/StudioJobList";

export default async function ProposalStudioPage() {
  const session = await getSession();
  if (!session || session.role !== "CONTRACTOR") redirect("/login");
  if (!bathroomContractorStudioEnabled()) {
    return (
      <div className="rounded-xl border border-stone-200 bg-white p-8 text-sm text-stone-600">
        Proposal Studio is not enabled for this environment yet. Contact Renovessa ops to turn on
        <code className="mx-1">BATHROOM_CONTRACTOR_STUDIO_ENABLED</code>.
      </div>
    );
  }
  return <StudioJobList />;
}
