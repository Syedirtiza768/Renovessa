import type { Metadata } from "next";
import { bathroomContractorStudioEnabled } from "@/lib/feature-flags";
import { PublicProposalView } from "@/components/proposal/PublicProposalView";

export const metadata: Metadata = {
  title: "Proposal",
  robots: { index: false, follow: false, nocache: true },
};

export default async function PublicProposalPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  if (!bathroomContractorStudioEnabled()) {
    return (
      <main className="mx-auto max-w-lg px-4 py-16 text-center text-stone-600">
        <p>This proposal link is not available.</p>
      </main>
    );
  }
  const { token } = await params;
  return <PublicProposalView token={token} />;
}
