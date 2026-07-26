import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { bathroomContractorStudioEnabled } from "@/lib/feature-flags";
import { StudioWorkspace } from "@/components/contractor/StudioWorkspace";

export default async function ProposalStudioJobPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session || session.role !== "CONTRACTOR") redirect("/login");
  if (!bathroomContractorStudioEnabled()) redirect("/portal/contractor/proposal-studio");
  const { id } = await params;
  return <StudioWorkspace jobId={id} />;
}
