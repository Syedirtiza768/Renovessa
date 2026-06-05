"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Wordmark } from "./Wordmark";

const NAV = [
  { href: "#how", label: "How it works" },
  { href: "#services", label: "Services" },
  { href: "#why", label: "Why us" },
  { href: "#faq", label: "FAQ" },
];

export function LandingHeader() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 28);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      id="top"
      className={`sticky top-0 z-50 bg-bone-0/95 backdrop-blur-md transition-[border-color] ${
        scrolled ? "border-b border-ink-15" : "border-b border-transparent"
      }`}
    >
      <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-4 px-4 py-3.5 sm:px-6">
        <Link
          href="#top"
          className="focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          <Wordmark />
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-8 md:flex" aria-label="Primary">
          {NAV.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="text-sm font-medium text-ink-70 transition hover:text-ink-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          <a
            href="tel:+12025550100"
            className="hidden items-center gap-2 text-sm font-medium text-ink-70 sm:flex"
          >
            <span className="landing-pulse" aria-hidden />
            <span className="font-mono-landing text-xs">(202) 555-0100</span>
          </a>
          <a href="#request" className="landing-btn-primary whitespace-nowrap text-sm">
            Submit My Project →
          </a>
          {/* Hamburger — mobile only */}
          <button
            type="button"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((v) => !v)}
            className="flex h-9 w-9 items-center justify-center rounded-md text-ink-70 transition hover:bg-ink-5 md:hidden"
          >
            {menuOpen ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile nav drawer */}
      {menuOpen && (
        <div className="border-t border-ink-15 bg-bone-0 px-4 pb-4 md:hidden">
          <nav className="flex flex-col gap-1 pt-2">
            {NAV.map((item) => (
              <a
                key={item.href}
                href={item.href}
                onClick={() => setMenuOpen(false)}
                className="rounded-md px-3 py-2.5 text-sm font-medium text-ink-70 transition hover:bg-ink-5 hover:text-ink-100"
              >
                {item.label}
              </a>
            ))}
            <a
              href="tel:+12025550100"
              className="flex items-center gap-2 rounded-md px-3 py-2.5 text-sm font-medium text-ink-70 transition hover:bg-ink-5"
            >
              <span className="landing-pulse" aria-hidden />
              <span className="font-mono-landing text-xs">(202) 555-0100</span>
            </a>
          </nav>
        </div>
      )}
    </header>
  );
}
