"use client";

import Link from "next/link";
import { useState } from "react";

const NAV_LINKS = [
  { href: "/how-it-works", label: "How It Works" },
  { href: "/for-homeowners", label: "For Homeowners" },
  { href: "/for-contractors", label: "For Contractors" },
  { href: "/trust", label: "Trust & Safety" },
  { href: "/login", label: "Login" },
];

export function SiteHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-rule bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
        <Link href="/" className="text-xl font-bold tracking-tight text-slate">
          Renovessa
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-6 md:flex">
          {NAV_LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="text-sm text-slate/80 hover:text-slate">
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Link href="/#request" className="btn-primary text-sm">
            Submit My Project
          </Link>
          {/* Hamburger — mobile only */}
          <button
            type="button"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            className="ml-1 flex h-9 w-9 items-center justify-center rounded-md text-slate transition hover:bg-blueprint md:hidden"
          >
            {open ? (
              /* X icon */
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            ) : (
              /* Hamburger icon */
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile nav drawer */}
      {open && (
        <div className="border-t border-rule bg-white px-4 pb-4 md:hidden">
          <nav className="flex flex-col gap-1 pt-2">
            {NAV_LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="rounded-md px-3 py-2.5 text-sm font-medium text-slate/80 transition hover:bg-blueprint hover:text-slate"
              >
                {l.label}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
}
