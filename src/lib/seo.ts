import type { Metadata } from "next";

export const SITE_NAME = "Renovessa";
export const SITE_URL = (process.env.NEXT_PUBLIC_APP_URL || "https://renovessa.com").replace(/\/$/, "");
export const SITE_DESCRIPTION =
  "Scope a home-improvement project, see a DMV planning range, and turn it into a managed request for contractor bids.";

type PageMetadataOptions = {
  title: string;
  description: string;
  path: string;
  noIndex?: boolean;
};

export function pageMetadata({
  title,
  description,
  path,
  noIndex = false,
}: PageMetadataOptions): Metadata {
  const canonical = path === "/" ? "/" : path.replace(/\/$/, "");

  return {
    title,
    description,
    alternates: { canonical },
    robots: noIndex
      ? { index: false, follow: false, nocache: true }
      : { index: true, follow: true },
    openGraph: {
      type: "website",
      url: canonical,
      siteName: SITE_NAME,
      title,
      description,
      locale: "en_US",
    },
    twitter: {
      card: "summary",
      title,
      description,
    },
  };
}

export function absoluteUrl(path: string) {
  return new URL(path, SITE_URL).toString();
}
