import type { Metadata } from "next";
import { Inter, DM_Serif_Display, JetBrains_Mono } from "next/font/google";
import { DemoBanner } from "@/components/DemoBanner";
import { JsonLd } from "@/components/JsonLd";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/seo";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  weight: ["400", "500", "600"],
});

const dmSerif = DM_Serif_Display({
  subsets: ["latin"],
  variable: "--font-serif",
  weight: "400",
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono-landing",
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Home Improvement Cost Estimator & Contractor Bids | DMV | Renovessa",
    template: "%s | Renovessa",
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  authors: [{ name: SITE_NAME, url: SITE_URL }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  alternates: { canonical: "/" },
  formatDetection: { email: false, address: false, telephone: false },
  openGraph: {
    type: "website",
    url: "/",
    title: "Home Improvement Cost Estimator & Contractor Bids | DMV",
    description: SITE_DESCRIPTION,
    siteName: SITE_NAME,
    locale: "en_US",
  },
  twitter: {
    card: "summary",
    title: "Home Improvement Cost Estimator & Contractor Bids | DMV",
    description: SITE_DESCRIPTION,
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${dmSerif.variable} ${jetbrains.variable} font-sans`}>
        <JsonLd
          data={[
            {
              "@context": "https://schema.org",
              "@type": "Organization",
              "@id": `${SITE_URL}/#organization`,
              name: SITE_NAME,
              url: SITE_URL,
              description: SITE_DESCRIPTION,
              telephone: "+1-571-460-0006",
              contactPoint: {
                "@type": "ContactPoint",
                telephone: "+1-571-460-0006",
                contactType: "customer support",
                areaServed: ["Washington, DC", "Maryland", "Northern Virginia"],
                availableLanguage: ["English"],
              },
            },
            {
              "@context": "https://schema.org",
              "@type": "WebSite",
              "@id": `${SITE_URL}/#website`,
              url: SITE_URL,
              name: SITE_NAME,
              description: SITE_DESCRIPTION,
              publisher: { "@id": `${SITE_URL}/#organization` },
              inLanguage: "en-US",
            },
          ]}
        />
        <DemoBanner />
        {children}
      </body>
    </html>
  );
}
