import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { bathroomRockvilleEnabled, BATHROOM_CONTRACTOR_MATCHING_ENABLED } from "@/lib/feature-flags";
import { PublicPage, InfoCard, PageCta } from "@/components/marketing/PublicPage";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Bathroom Remodeling Contractors in Rockville, MD",
  description:
    "How Renovessa reviews and matches Rockville bathroom remodeling contractors. Credential status, verification dates, and controlled contact release.",
  path: "/bathroom-remodeling/rockville-md/contractors",
});

export default function ContractorsPage() {
  if (!bathroomRockvilleEnabled()) notFound();
  return (
    <PublicPage
      eyebrow="Contractors · Rockville, MD"
      title="How Renovessa matches Rockville bathroom contractors."
      intro="Renovessa records MHIC license status, insurance status, and the last verification date for each contractor. Contractors are independent businesses; homeowners should confirm official records before signing."
      breadcrumbs={[{ label: "Home", href: "/" }, { label: "Bathroom Remodeling", href: "/bathroom-remodeling/rockville-md" }, { label: "Contractors" }]}
    >
      <div className="grid gap-5 md:grid-cols-2">
        <InfoCard title="What we record">
          <ul className="list-disc space-y-1 pl-5">
            <li>Legal business name and trade name</li>
            <li>MHIC licence number, holder, status, and expiration</li>
            <li>Last verified date</li>
            <li>General liability insurance status</li>
            <li>Service area and bathroom specialties</li>
            <li>Project-size preferences and portfolio</li>
          </ul>
        </InfoCard>
        <InfoCard title="Controlled contact release">
          <p>Your contact details are not automatically sent to multiple contractors. A contractor receives your contact information only after:</p>
          <ul className="mt-2 list-disc pl-5 text-sm">
            <li>You reconfirm the release</li>
            <li>The contractor has accepted the opportunity</li>
            <li>Renovessa records the release with an audit entry</li>
          </ul>
          <p className="mt-2 text-sm">You control the maximum number of contractors contacted.</p>
        </InfoCard>
      </div>
      {BATHROOM_CONTRACTOR_MATCHING_ENABLED && (
        <PageCta title="Request bids from reviewed contractors" label="Start the planner" href="/bathroom-remodeling/rockville-md/planner" />
      )}
    </PublicPage>
  );
}
