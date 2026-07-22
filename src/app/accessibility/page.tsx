import type { Metadata } from "next";
import { InfoCard, PublicPage } from "@/components/marketing/PublicPage";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Accessibility",
  description: "Renovessa's accessibility commitment and ways to request help using the website or project-planning service.",
  path: "/accessibility",
});

export default function AccessibilityPage() {
  return (
    <PublicPage
      eyebrow="Accessibility"
      title="Renovessa should work for every homeowner."
      intro="We aim to make our public content, estimator, forms, and account experiences understandable and usable with common assistive technologies."
      breadcrumbs={[{ label: "Home", href: "/" }, { label: "Accessibility" }]}
    >
      <div className="grid gap-5 md:grid-cols-2">
        <InfoCard title="Our approach">
          <p>We work toward the Web Content Accessibility Guidelines (WCAG) 2.2 Level AA, including keyboard access, visible focus, semantic structure, readable contrast, clear labels, and useful error messages.</p>
        </InfoCard>
        <InfoCard title="Need assistance?">
          <p>Call <a className="font-medium text-accent" href="tel:+15714600006">(571) 460-0006</a> or email <a className="font-medium text-accent" href="mailto:ray@renovessa.com">ray@renovessa.com</a>. Tell us the page, task, assistive technology, and preferred response format.</p>
        </InfoCard>
      </div>
      <section className="mt-10 rounded-lg border border-ink-15 bg-bone-1 p-6 text-sm leading-relaxed text-ink-70">
        <h2 className="text-xl font-semibold text-ink-100">Feedback and alternatives</h2>
        <p className="mt-3">If a feature blocks you, we will make a reasonable effort to provide the information or complete the same task through an accessible alternative. Accessibility is an ongoing effort; this statement was last reviewed July 23, 2026.</p>
      </section>
    </PublicPage>
  );
}
