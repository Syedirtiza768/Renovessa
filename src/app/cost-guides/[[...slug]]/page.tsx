import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { PublicPage, InfoCard } from "@/components/marketing/PublicPage";
import { ContentArticle } from "@/components/marketing/ContentArticle";
import { pageMetadata } from "@/lib/seo";
import { getPublishedContentBySlug, publicPathForContent } from "@/lib/content";

export const dynamic = "force-dynamic";

function buildPath(slugParts: string[]): string {
  return `/cost-guides/${slugParts.join("/")}`;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug?: string[] }>;
}): Promise<Metadata> {
  const { slug } = await params;
  if (!slug || slug.length === 0) {
    return pageMetadata({
      title: "DMV Home Improvement Cost Guides",
      description:
        "Local project-cost guidance for bathroom remodeling, solar, roofing, HVAC, and more across the Washington DC metro area.",
      path: "/cost-guides",
    });
  }
  const contentSlug = slug.join("/");
  const content = await getPublishedContentBySlug(contentSlug);
  if (!content) {
    return pageMetadata({
      title: "Cost Guide Not Found",
      description: "The requested cost guide could not be found.",
      path: buildPath(slug),
    });
  }
  return pageMetadata({
    title: content.title,
    description: `Planning range context for ${content.applicableTrade ?? "home improvement"} in ${content.applicableLocation?.replace(/-/g, " ") ?? "the DMV"}.`,
    path: buildPath(slug),
  });
}

async function CostGuideIndex() {
  const { getAllPublishedContent } = await import("@/lib/content");
  const all = await getAllPublishedContent();
  const costGuides = all.filter((c) =>
    /cost|price|payback/i.test(c.title)
  );

  return (
    <PublicPage
      eyebrow="Cost guides"
      title="DMV home improvement cost guides"
      intro="Planning ranges, cost drivers, and local context for major home improvement projects across Washington DC, Maryland, and Northern Virginia."
      breadcrumbs={[{ label: "Home", href: "/" }, { label: "Cost Guides" }]}
    >
      <div className="grid gap-5 md:grid-cols-2">
        {costGuides.length === 0 && (
          <InfoCard title="Guides coming soon">
            <p>Cost guides are being reviewed and will be published shortly.</p>
          </InfoCard>
        )}
        {costGuides.map((guide) => {
          const path = publicPathForContent(guide.slug, guide.title);
          return (
            <article key={guide.slug} className="landing-card p-6">
              <p className="font-mono-landing text-xs text-ink-40 uppercase tracking-wide">
                {guide.applicableTrade}
              </p>
              <h2 className="mt-2 text-lg font-semibold text-ink-100">
                <Link href={path} className="hover:text-accent transition">
                  {guide.title}
                </Link>
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-ink-70 line-clamp-3">
                {guide.bodyText.slice(0, 200).replace(/\n/g, " ")}…
              </p>
              <div className="mt-4 flex items-center gap-3 text-xs text-ink-40">
                <span className="capitalize">{guide.applicableLocation?.replace(/-/g, " ")}</span>
                <span>·</span>
                <span>{guide.lastReviewedAt?.toLocaleDateString("en-US", { month: "short", year: "numeric" })}</span>
              </div>
            </article>
          );
        })}
      </div>
    </PublicPage>
  );
}

export default async function CostGuidePage({
  params,
}: {
  params: Promise<{ slug?: string[] }>;
}) {
  const { slug } = await params;

  // Index page: /cost-guides/
  if (!slug || slug.length === 0) {
    return <CostGuideIndex />;
  }

  const contentSlug = slug.join("/");
  const content = await getPublishedContentBySlug(contentSlug);

  if (!content) {
    notFound();
  }

  const urlPath = buildPath(slug);

  return (
    <ContentArticle
      content={content}
      urlPath={urlPath}
      breadcrumbs={[
        { label: "Home", href: "/" },
        { label: "Cost Guides", href: "/cost-guides" },
        { label: content.title },
      ]}
    />
  );
}
