import type { Metadata } from "next";
import { PublicPage, InfoCard, PageCta } from "@/components/marketing/PublicPage";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "About Renovessa",
  description:
    "Renovessa helps DMV homeowners scope home-improvement projects, understand planning costs, and request organized contractor bids.",
  path: "/about",
});

export default function AboutPage() {
  return (
    <PublicPage
      eyebrow="About Renovessa"
      title="A clearer starting point for home-improvement decisions."
      intro="Renovessa helps homeowners in Washington, DC, Maryland, and Northern Virginia define a project before contractor outreach begins."
      breadcrumbs={[{ label: "Home", href: "/" }, { label: "About" }]}
    >
      <div className="grid gap-5 md:grid-cols-2">
        <InfoCard title="What we are building">
          <p>A planning and coordination service that turns trade-specific project details into a local ballpark and organized request for quote.</p>
        </InfoCard>
        <InfoCard title="What Renovessa is not">
          <p>Renovessa is not the contractor performing the work, does not issue a binding construction quote, and does not guarantee that contractors are available for every trade or ZIP.</p>
        </InfoCard>
        <InfoCard title="Why the DMV focus matters">
          <p>Labor, property types, permit processes, access, and contractor capacity vary across the region. Local context is more useful than an unsupported national average.</p>
        </InfoCard>
        <InfoCard title="How homeowners remain in control">
          <p>Homeowners review the planning range and RFQ before submission, can compare the options returned, and are not obligated to hire through Renovessa.</p>
        </InfoCard>
      </div>
      <PageCta />
    </PublicPage>
  );
}
