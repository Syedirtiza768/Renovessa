import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="border-t border-rule bg-slate text-white">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 sm:grid-cols-2 md:grid-cols-4">
        <div>
          <p className="text-lg font-bold">Renovessa</p>
          <p className="mt-2 text-sm text-white/70">
            Verified home improvement appointments for Washington DC, Maryland, and Northern Virginia.
          </p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-white/50">Homeowners</p>
          <ul className="mt-3 space-y-2 text-sm">
            <li><Link href="/#estimate" className="hover:text-copper">Free Estimate &amp; RFQ</Link></li>
            <li><Link href="/how-it-works" className="hover:text-copper">How It Works</Link></li>
            <li><Link href="/trust" className="hover:text-copper">Trust & Safety</Link></li>
          </ul>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-white/50">Contractors</p>
          <ul className="mt-3 space-y-2 text-sm">
            <li><Link href="/for-contractors" className="hover:text-copper">Get Verified Appointments</Link></li>
            <li><Link href="/for-contractors#inquiry" className="hover:text-copper">Apply for Access</Link></li>
          </ul>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-white/50">Legal</p>
          <ul className="mt-3 space-y-2 text-sm text-white/70">
            <li>Privacy Policy</li>
            <li>Terms of Service</li>
            <li>TCPA / SMS Consent</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10 py-4 text-center text-xs text-white/50">
        © {new Date().getFullYear()} Renovessa.com — Verified appointments, not shared leads.
      </div>
    </footer>
  );
}
