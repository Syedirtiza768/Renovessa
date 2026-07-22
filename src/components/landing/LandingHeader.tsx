"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Wordmark } from "./Wordmark";
import { OPS_PHONE } from "@/lib/first-job-config";
import { useOptionalCategories } from "./CategoryContext";

const NAV = [
  { href: "/estimate", label: "Estimate" },
  { href: "/cost-guides", label: "Cost Guides" },
  { href: "/services", label: "Services" },
  { href: "/locations", label: "Locations" },
  { href: "/resources", label: "Resources" },
  { href: "/how-it-works", label: "How it works" },
];

export function LandingHeader() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const categoryContext = useOptionalCategories();
  const wizardOpen = categoryContext?.wizardSheetOpen ?? false;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 28);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const phoneDisplay = OPS_PHONE || "(571) 460-0006";
  const phoneHref = `tel:${phoneDisplay.replace(/\D/g, "")}`;

  if (wizardOpen) {
    return <header id="top" className="pointer-events-none sticky top-0 z-50 h-0 overflow-hidden opacity-0" aria-hidden />;
  }

  return (
    <header
      id="top"
      className={`sticky top-0 z-50 bg-bone-0/95 backdrop-blur-md transition-[border-color] ${
        scrolled ? "border-b border-ink-15" : "border-b border-transparent"
      }`}
    >
      <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-4 px-4 py-3.5 sm:px-6">
        <Link href="/" className="focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">
          <Wordmark />
        </Link>

        <nav className="hidden items-center gap-5 lg:flex" aria-label="Primary">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-sm font-medium text-ink-70 transition hover:text-ink-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          <a href={phoneHref} className="hidden items-center gap-2 text-sm font-medium text-ink-70 sm:flex">
            <span className="landing-pulse" aria-hidden />
            <span className="font-mono-landing text-xs">{phoneDisplay}</span>
          </a>
          <button type="button" onClick={() => categoryContext?.openEstimate()} className="landing-btn-primary whitespace-nowrap text-sm">
            Estimate my project
          </button>
          <button
            type="button"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((value) => !value)}
            className="flex h-9 w-9 items-center justify-center rounded-md text-ink-70 transition hover:bg-ink-5 lg:hidden"
          >
            {menuOpen ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
            )}
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className="border-t border-ink-15 bg-bone-0 px-4 pb-4 lg:hidden">
          <nav className="flex flex-col gap-1 pt-2" aria-label="Mobile primary">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMenuOpen(false)}
                className="rounded-md px-3 py-2.5 text-sm font-medium text-ink-70 transition hover:bg-ink-5 hover:text-ink-100"
              >
                {item.label}
              </Link>
            ))}
            <Link href="/for-contractors" onClick={() => setMenuOpen(false)} className="rounded-md px-3 py-2.5 text-sm font-medium text-ink-70 transition hover:bg-ink-5">
              For Contractors
            </Link>
            <a href={phoneHref} className="flex items-center gap-2 rounded-md px-3 py-2.5 text-sm font-medium text-ink-70 transition hover:bg-ink-5">
              <span className="landing-pulse" aria-hidden />
              <span className="font-mono-landing text-xs">{phoneDisplay}</span>
            </a>
          </nav>
        </div>
      )}
    </header>
  );
}
