import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { bathroomRockvilleEnabled } from "@/lib/feature-flags";
import { PublicPage, InfoCard, PageCta } from "@/components/marketing/PublicPage";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Bathroom Remodeling Planning Guide for Rockville, MD",
  description:
    "Plan, demo, rough-in, waterproofing, finishes, and closeout — what to expect at each stage of a Rockville bathroom remodel.",
  path: "/bathroom-remodeling/rockville-md/planning-guide",
});

const STAGES = [
  { t: "Plan", d: "Define scope, measurements, layout, finishes, budget, and timeline." },
  { t: "Demo", d: "Protect the home, remove existing fixtures and finishes, dispose of debris." },
  { t: "Rough-in", d: "Framing, plumbing, electrical, and ventilation behind walls." },
  { t: "Waterproofing", d: "Shower pan, membrane, and slope before tile." },
  { t: "Finishes", d: "Tile, vanity, countertop, toilet, lighting, paint, trim, and accessories." },
  { t: "Closeout", d: "Inspections, punch list, walkthrough, and final payment." },
];

export default function PlanningGuidePage() {
  if (!bathroomRockvilleEnabled()) notFound();
  return (
    <PublicPage
      eyebrow="Planning guide · Rockville, MD"
      title="The Rockville bathroom remodeling process."
      intro="A typical bathroom remodel moves through six stages. Knowing what happens at each helps you compare contractor proposals and avoid surprises."
      breadcrumbs={[{ label: "Home", href: "/" }, { label: "Bathroom Remodeling", href: "/bathroom-remodeling/rockville-md" }, { label: "Planning Guide" }]}
    >
      <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 list-none">
        {STAGES.map((s, i) => (
          <li key={s.t}>
            <InfoCard title={`${i + 1}. ${s.t}`}>
              <p>{s.d}</p>
            </InfoCard>
          </li>
        ))}
      </ol>
      <PageCta title="Plan your remodel with the planner" label="Start the planner" href="/bathroom-remodeling/rockville-md/planner" />
    </PublicPage>
  );
}
