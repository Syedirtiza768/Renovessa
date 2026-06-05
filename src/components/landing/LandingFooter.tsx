import Link from "next/link";
import { Wordmark } from "./Wordmark";

export function LandingFooter() {
  return (
    <footer className="border-t border-ink-15 bg-bone-2">
      <div className="mx-auto grid max-w-[1440px] gap-10 px-4 py-12 sm:px-6 md:grid-cols-2 lg:grid-cols-4">
        <div>
          <Wordmark compact />
          <p className="mt-3 text-sm text-ink-70">
            Verified home improvement appointments for Washington DC, Maryland, and Northern
            Virginia.
          </p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-40">For Homeowners</p>
          <ul className="mt-3 space-y-2 text-sm text-ink-70">
            <li>
              <a href="#request" className="hover:text-ink-100">
                Submit My Project Request
              </a>
            </li>
            <li>
              <a href="#how" className="hover:text-ink-100">
                How It Works
              </a>
            </li>
            <li>
              <Link href="/trust" className="hover:text-ink-100">
                Trust &amp; Safety
              </Link>
            </li>
            <li>
              <Link href="/for-homeowners" className="hover:text-ink-100">
                For Homeowners
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-40">For Contractors</p>
          <ul className="mt-3 space-y-2 text-sm text-ink-70">
            <li>
              <Link href="/for-contractors" className="hover:text-ink-100">
                Verified Appointments
              </Link>
            </li>
            <li>
              <Link href="/for-contractors#inquiry" className="hover:text-ink-100">
                Apply for Access
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-40">Legal &amp; Contact</p>
          <ul className="mt-3 space-y-2 text-sm text-ink-70">
            <li>
              <a href="tel:+12025550100" className="hover:text-ink-100">
                (202) 555-0100
              </a>
            </li>
            <li>Privacy Policy</li>
            <li>Terms of Use</li>
            <li>
              <Link href="/login" className="hover:text-ink-100">
                Portal Login
              </Link>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-ink-15 py-4">
        <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-3 px-4 text-xs text-ink-70 sm:px-6">
          <p>© 2025 Renovessa LLC · Washington DC · All rights reserved</p>
          <div className="flex flex-wrap gap-4">
            <Link href="/login" className="hover:text-ink-100">
              Portal Login
            </Link>
            <span>Privacy Policy</span>
            <span>Terms of Use</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
