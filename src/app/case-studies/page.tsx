import type { Metadata } from "next";
import { PublicPage, InfoCard, PageCta } from "@/components/marketing/PublicPage";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Verified DMV Home Improvement Case Studies",
  description:
    "Renovessa publishes case studies only after the scope, bid comparison, outcome, and required permissions have been verified.",
  path: "/case-studies",
  noIndex: true,
});

export default function CaseStudiesPage() {
  return (
    <PublicPage
      eyebrow="Case studies"
      title="Project evidence will appear here after it is verified."
      intro="Renovessa does not publish invented testimonials, sample jobs presented as real, or customer details without permission. No public case study currently meets the publication standard."
      breadcrumbs={[{ label: "Home", href: "/" }, { label: "Case Studies" }]}
    >
      <div className="grid gap-5 md:grid-cols-2">
        <InfoCard title="Required evidence">
          <p>A publishable record must identify the initial scope, planning range, bid differences, material changes, timeline, and confirmed outcome.</p>
        </InfoCard>
        <InfoCard title="Privacy and permission">
          <p>Homeowner identity and property details are protected. Photographs, quotes, and outcome details require appropriate permission before publication.</p>
        </InfoCard>
      </div>
      <PageCta />
    </PublicPage>
  );
}
