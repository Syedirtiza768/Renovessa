"use client";

import Link from "next/link";
import { useState } from "react";

const NAV_LINKS = [
  { href: "/estimate", label: "Estimate" },
  { href: "/cost-guides", label: "Cost Guides" },
  { href: "/services", label: "Services" },
  { href: "/locations", label: "Locations" },
  { href: "/resources", label: "Resources" },
  { href: "/how-it-works", label: "How It Works" },
];

export function SiteHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-rule bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
        <Link href="/" className="text-xl font-bold tracking-tight text-slate">
          Renovessa
        </Link>

        <nav className="hidden items-center gap-5 lg:flex" aria-label="Primary">
          {NAV_LINKS.map((link) => (
            <Link key={link.href} href={link.href} className="text-sm text-slate/80 hover:text-slate">
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Link href="/estimate" className="btn-primary whitespace-nowrap text-sm">
            Estimate My Project
          </Link>
          <button
            type="button"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            onClick={() => setOpen((value) => !value)}
            className="ml-1 flex h-9 w-9 items-center justify-center rounded-md text-slate transition hover:bg-blueprint lg:hidden"
          >
            {open ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
            )}
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t border-rule bg-white px-4 pb-4 lg:hidden">
          <nav className="flex flex-col gap-1 pt-2" aria-label="Mobile primary">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="rounded-md px-3 py-2.5 text-sm font-medium text-slate/80 transition hover:bg-blueprint hover:text-slate"
              >
                {link.label}
              </Link>
            ))}
            <Link href="/for-contractors" onClick={() => setOpen(false)} className="rounded-md px-3 py-2.5 text-sm font-medium text-slate/80 transition hover:bg-blueprint hover:text-slate">
              For Contractors
            </Link>
            <Link href="/login" onClick={() => setOpen(false)} className="rounded-md px-3 py-2.5 text-sm font-medium text-slate/80 transition hover:bg-blueprint hover:text-slate">
              Portal Login
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
