"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

interface NavItem {
  href: string;
  label: string;
}

interface PortalShellProps {
  title: string;
  subtitle: string;
  userName: string;
  navItems: NavItem[];
  children: React.ReactNode;
  headerExtra?: React.ReactNode;
}

export function PortalShell({ title, subtitle, userName, navItems, children, headerExtra }: PortalShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();

  const isActive = (href: string) => {
    // Exact match for root portal pages, prefix match for sub-pages
    if (href.endsWith("/portal/admin") || href.endsWith("/portal/contractor") || href.endsWith("/portal/homeowner")) {
      return pathname === href;
    }
    return pathname.startsWith(href);
  };

  return (
    <div className="flex min-h-screen">
      {/* Mobile overlay backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-slate/50 backdrop-blur-sm md:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-white/10 bg-slate text-white
          transition-transform duration-200 ease-in-out
          md:static md:z-auto md:w-64 md:translate-x-0
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        <div className="flex items-center justify-between border-b border-white/10 p-4">
          <div className="min-w-0">
            <p className="truncate font-bold">{title}</p>
            <p className="truncate text-xs text-white/60">{subtitle}</p>
          </div>
          {/* Close button — mobile only */}
          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close menu"
            className="ml-2 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md text-white/70 hover:bg-white/10 hover:text-white md:hidden"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setSidebarOpen(false)}
              className={`flex items-center gap-2 rounded-md px-3 py-2.5 text-sm transition hover:bg-white/10 hover:text-white ${
                isActive(item.href)
                  ? "bg-white/15 font-medium text-white"
                  : "text-white/80"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="border-t border-white/10 p-4 text-xs text-white/60">
          <p className="truncate">{userName}</p>
          <form action="/api/auth/logout" method="POST">
            <button type="submit" className="mt-2 text-copper hover:underline">
              Sign out
            </button>
          </form>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile top bar */}
        <div className="flex items-center gap-3 border-b border-rule bg-slate px-4 py-3 md:hidden">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open menu"
            className="flex h-9 w-9 items-center justify-center rounded-md text-white/80 hover:bg-white/10 hover:text-white"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
          </button>
          <span className="text-sm font-semibold text-white">{title}</span>
          {headerExtra && <div className="ml-auto">{headerExtra}</div>}
        </div>

        {/* Desktop notification bar (md+) */}
        {headerExtra && (
          <div className="hidden md:flex items-center justify-end gap-2 border-b border-rule bg-slate px-6 py-1.5">
            {headerExtra}
          </div>
        )}

        <div className="flex-1 overflow-auto bg-cream p-4 sm:p-6">
          {children}
        </div>
      </div>
    </div>
  );
}
