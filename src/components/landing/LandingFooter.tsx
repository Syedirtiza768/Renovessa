import Link from "next/link";
import { Wordmark } from "./Wordmark";

const groups = [
  {
    title: "Homeowners",
    links: [
      ["Estimate My Project", "/estimate"],
      ["Cost Guides", "/cost-guides"],
      ["Services", "/services"],
      ["Locations", "/locations"],
      ["How It Works", "/how-it-works"],
    ],
  },
  {
    title: "Planning & Trust",
    links: [
      ["Resources", "/resources"],
      ["Estimate Methodology", "/methodology/estimate-methodology"],
      ["Verification Methodology", "/methodology/contractor-verification-methodology"],
      ["Trust & Safety", "/trust"],
      ["Case Studies", "/case-studies"],
    ],
  },
  {
    title: "Company",
    links: [
      ["About", "/about"],
      ["Contact", "/contact"],
      ["For Contractors", "/for-contractors"],
      ["Editorial Policy", "/editorial-policy"],
      ["Portal Login", "/login"],
    ],
  },
];

export function LandingFooter() {
  return (
    <footer className="border-t border-ink-15 bg-bone-2">
      <div className="mx-auto grid max-w-[1440px] gap-10 px-4 py-12 sm:grid-cols-2 sm:px-6 lg:grid-cols-5">
        <div className="sm:col-span-2 lg:col-span-2">
          <Wordmark compact />
          <p className="mt-3 max-w-sm text-sm leading-relaxed text-ink-70">
            Home-improvement planning ranges and managed RFQs for Washington, DC, Maryland, and Northern Virginia. Availability varies by trade and ZIP.
          </p>
          <a href="tel:+15714600006" className="mt-4 inline-block text-sm font-medium text-ink-100 hover:text-accent">(571) 460-0006</a>
        </div>
        {groups.map((group) => (
          <div key={group.title}>
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-40">{group.title}</p>
            <ul className="mt-3 space-y-2 text-sm text-ink-70">
              {group.links.map(([label, href]) => (
                <li key={href}><Link href={href} className="hover:text-ink-100">{label}</Link></li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-ink-15 py-4">
        <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-3 px-4 text-xs text-ink-70 sm:px-6">
          <p>© {new Date().getFullYear()} Renovessa. Planning ranges are not contractor quotes.</p>
          <div className="flex flex-wrap gap-4">
            <Link href="/privacy" className="hover:text-ink-100">Privacy</Link>
            <Link href="/terms" className="hover:text-ink-100">Terms</Link>
            <Link href="/tcpa" className="hover:text-ink-100">TCPA / SMS</Link>
            <Link href="/accessibility" className="hover:text-ink-100">Accessibility</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
