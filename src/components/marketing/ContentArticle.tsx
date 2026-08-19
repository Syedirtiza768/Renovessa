import Link from "next/link";
import { JsonLd } from "@/components/JsonLd";
import { PublicPage, PageCta } from "@/components/marketing/PublicPage";
import { absoluteUrl } from "@/lib/seo";
import {
  bodyTextToHtml,
  formatDate,
  tradeLabel,
  tradeEstimatorPath,
} from "@/lib/content";
import type { BathroomContentVersion } from "@prisma/client";

function ArticleByline({ content }: { content: BathroomContentVersion }) {
  return (
    <div className="mt-10 rounded-lg border border-ink-15 bg-bone-1 p-6">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-ink-40">
        About this guide
      </h3>
      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
        {content.author && (
          <div>
            <dt className="text-ink-40">Written by</dt>
            <dd className="text-ink-100">{content.author}</dd>
          </div>
        )}
        {content.reviewer && (
          <div>
            <dt className="text-ink-40">Reviewed by</dt>
            <dd className="text-ink-100">{content.reviewer}</dd>
          </div>
        )}
        <div>
          <dt className="text-ink-40">Last reviewed</dt>
          <dd className="text-ink-100">{formatDate(content.lastReviewedAt)}</dd>
        </div>
        {content.applicableLocation && (
          <div>
            <dt className="text-ink-40">Coverage</dt>
            <dd className="text-ink-100 capitalize">
              {content.applicableLocation.replace(/-/g, " ")}
            </dd>
          </div>
        )}
        {content.applicableTrade && (
          <div>
            <dt className="text-ink-40">Trade</dt>
            <dd className="text-ink-100">{tradeLabel(content.applicableTrade)}</dd>
          </div>
        )}
      </dl>
      {content.methodology && (
        <div className="mt-4 border-t border-ink-15 pt-4">
          <dt className="text-sm text-ink-40">Methodology</dt>
          <dd className="mt-1 text-sm leading-relaxed text-ink-70">
            {content.methodology}
          </dd>
        </div>
      )}
    </div>
  );
}

function ArticleJsonLd({ content, urlPath }: { content: BathroomContentVersion; urlPath: string }) {
  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "Article",
        headline: content.title,
        author: {
          "@type": content.author?.includes("Renovessa") ? "Organization" : "Person",
          name: content.author ?? "Renovessa",
        },
        datePublished: content.createdAt?.toISOString() ?? new Date().toISOString(),
        dateModified: content.lastReviewedAt?.toISOString() ?? content.lastUpdatedAt?.toISOString(),
        publisher: {
          "@type": "Organization",
          name: "Renovessa",
          url: absoluteUrl("/"),
          logo: {
            "@type": "ImageObject",
            url: absoluteUrl("/renovessa-logo.svg"),
          },
        },
        mainEntityOfPage: {
          "@type": "WebPage",
          "@id": absoluteUrl(urlPath),
        },
      }}
    />
  );
}

export function ContentArticle({
  content,
  urlPath,
  breadcrumbs,
  ctaHref,
  ctaLabel,
}: {
  content: BathroomContentVersion;
  urlPath: string;
  breadcrumbs: { label: string; href?: string }[];
  ctaHref?: string;
  ctaLabel?: string;
}) {
  const html = content.bodyHtml?.trim()
    ? content.bodyHtml
    : bodyTextToHtml(content.bodyText);

  const estimatorPath = content.applicableTrade
    ? tradeEstimatorPath(content.applicableTrade)
    : "/estimate";

  return (
    <PublicPage
      eyebrow={`${tradeLabel(content.applicableTrade ?? "")} guide · ${content.applicableLocation?.replace(/-/g, " ") ?? "DMV"}`}
      title={content.title}
      intro=""
      breadcrumbs={breadcrumbs}
    >
      <ArticleJsonLd content={content} urlPath={urlPath} />
      <article
        className="prose-content"
        dangerouslySetInnerHTML={{ __html: html }}
      />
      <ArticleByline content={content} />
      <PageCta
        title={`Ready to plan your ${tradeLabel(content.applicableTrade ?? "").toLowerCase()} project?`}
        body="Use the estimate wizard to see a planning range, then preview the RFQ before deciding whether to submit it."
        href={ctaHref ?? estimatorPath}
        label={ctaLabel ?? "Estimate my project"}
      />
    </PublicPage>
  );
}
