import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { PublicPage, InfoCard } from "@/components/marketing/PublicPage";
import { ContentArticle } from "@/components/marketing/ContentArticle";
import { pageMetadata } from "@/lib/seo";
import { getPublishedContentBySlug, publicPathForContent } from "@/lib/content";

export const dynamic = "force-dynamic";

function buildPath(slugParts: string[]): string {
  return `/resources/${slugParts.join("/")}`;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug?: string[] }>;
}): Promise<Metadata> {
  const { slug } = await params;
  if (!slug || slug.length === 0) {
    return pageMetadata({
      title: "DMV Home Improvement Resources",
      description:
        "Permit guides, bid comparison checklists, repair-vs-replace decisions, and planning resources for homeowners in the Washington DC metro area.",
      path: "/resources",
    });
  }
  const contentSlug = slug.join("/");
  const content = await getPublishedContentBySlug(contentSlug);
  if (!content) {
    return pageMetadata({
      title: "Resource Not Found",
      description: "The requested resource could not be found.",
      path: buildPath(slug),
    });
  }
  return pageMetadata({
    title: content.title,
    description: `Planning resource for ${content.applicableTrade ?? "home improvement"} in ${content.applicableLocation?.replace(/-/g, " ") ?? "the DMV"}.`,
    path: buildPath(slug),
  });
}

async function ResourcesIndex() {
  const { getAllPublishedContent } = await import("@/lib/content");
  const all = await getAllPublishedContent();
  const resources = all.filter((c) =>
    !/cost|price|payback/i.test(c.title)
  );

  return (
    <PublicPage
      eyebrow="Resources"
      title="Home improvement planning resources"
      intro="Permit guidance, bid comparison tools, repair-or-replace decisions, and homeowner education across Washington DC, Maryland, and Northern Virginia."
      breadcrumbs={[{ label: "Home", href: "/" }, { label: "Resources" }]}
    >
      <div className="grid gap-5 md:grid-cols-2">
        {resources.length === 0 && (
          <InfoCard title="Resources coming soon">
            <p>Planning resources are being reviewed and will be published shortly.</p>
          </InfoCard>
        )}
        {resources.map((item) => {
          const path = publicPathForContent(item.slug, item.title);
          return (
            <article key={item.slug} className="landing-card p-6">
              <p className="font-mono-landing text-xs text-ink-40 uppercase tracking-wide">
                {item.applicableTrade}
              </p>
              <h2 className="mt-2 text-lg font-semibold text-ink-100">
                <Link href={path} className="hover:text-accent transition">
                  {item.title}
                </Link>
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-ink-70 line-clamp-3">
                {item.bodyText.slice(0, 200).replace(/\n/g, " ")}…
              </p>
              <div className="mt-4 flex items-center gap-3 text-xs text-ink-40">
                <span className="capitalize">{item.applicableLocation?.replace(/-/g, " ")}</span>
                <span>·</span>
                <span>{item.lastReviewedAt?.toLocaleDateString("en-US", { month: "short", year: "numeric" })}</span>
              </div>
            </article>
          );
        })}
      </div>
    </PublicPage>
  );
}

export default async function ResourcePage({
  params,
}: {
  params: Promise<{ slug?: string[] }>;
}) {
  const { slug } = await params;

  // Index page: /resources/
  if (!slug || slug.length === 0) {
    return <ResourcesIndex />;
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
        { label: "Resources", href: "/resources" },
        { label: content.title },
      ]}
    />
  );
}
