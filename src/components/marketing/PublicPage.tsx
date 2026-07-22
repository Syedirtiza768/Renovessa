import type { ReactNode } from "react";
import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { JsonLd } from "@/components/JsonLd";
import { absoluteUrl } from "@/lib/seo";

export type BreadcrumbItem = { label: string; href?: string };

function Breadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  const structuredItems = items.map((item, index) => ({
    "@type": "ListItem",
    position: index + 1,
    name: item.label,
    ...(item.href ? { item: absoluteUrl(item.href) } : {}),
  }));

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: structuredItems,
        }}
      />
      <nav aria-label="Breadcrumb" className="text-sm text-ink-40">
        <ol className="flex flex-wrap items-center gap-2">
          {items.map((item, index) => (
            <li key={`${item.label}-${index}`} className="flex items-center gap-2">
              {index > 0 && <span aria-hidden>/</span>}
              {item.href ? (
                <Link href={item.href} className="transition hover:text-ink-100">
                  {item.label}
                </Link>
              ) : (
                <span aria-current="page">{item.label}</span>
              )}
            </li>
          ))}
        </ol>
      </nav>
    </>
  );
}

export function PublicPage({
  eyebrow,
  title,
  intro,
  breadcrumbs,
  children,
}: {
  eyebrow: string;
  title: string;
  intro: string;
  breadcrumbs: BreadcrumbItem[];
  children: ReactNode;
}) {
  return (
    <>
      <SiteHeader />
      <main className="landing-page min-h-screen bg-bone-0">
        <section className="border-b border-ink-15 bg-bone-1 px-4 py-12 sm:px-6 sm:py-16">
          <div className="mx-auto max-w-5xl">
            <Breadcrumbs items={breadcrumbs} />
            <p className="landing-eyebrow mt-8">{eyebrow}</p>
            <h1 className="landing-h1 mt-3 max-w-[20ch]">{title}</h1>
            <p className="mt-5 max-w-3xl text-lg leading-relaxed text-ink-70">{intro}</p>
          </div>
        </section>
        <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-16">{children}</div>
      </main>
      <SiteFooter />
    </>
  );
}

export function InfoCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <article className="landing-card p-6">
      <h2 className="text-lg font-semibold text-ink-100">{title}</h2>
      <div className="mt-3 text-sm leading-relaxed text-ink-70">{children}</div>
    </article>
  );
}

export function PageCta({
  title = "Ready to scope your project?",
  body = "Use the estimate wizard to see a planning range, then preview the RFQ before deciding whether to submit it.",
  href = "/estimate",
  label = "Estimate my project",
}: {
  title?: string;
  body?: string;
  href?: string;
  label?: string;
}) {
  return (
    <aside className="mt-12 rounded-xl bg-ink-100 p-7 text-bone-0 sm:p-9">
      <h2 className="font-serif-landing text-3xl">{title}</h2>
      <p className="mt-3 max-w-2xl text-bone-1">{body}</p>
      <Link href={href} className="landing-btn-primary-lg mt-6">
        {label} →
      </Link>
    </aside>
  );
}
