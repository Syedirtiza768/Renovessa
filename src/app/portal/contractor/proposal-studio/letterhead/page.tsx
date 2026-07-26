import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { bathroomContractorStudioEnabled } from "@/lib/feature-flags";
import { LetterheadEditor } from "@/components/contractor/LetterheadEditor";

export default async function LetterheadPage() {
  const session = await getSession();
  if (!session || session.role !== "CONTRACTOR") redirect("/login");
  if (!bathroomContractorStudioEnabled()) redirect("/portal/contractor/proposal-studio");
  return <LetterheadEditor />;
}
