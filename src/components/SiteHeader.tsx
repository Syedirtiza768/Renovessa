import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-rule bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
        <Link href="/" className="text-xl font-bold tracking-tight text-slate">
          Renovessa
        </Link>
        <nav className="hidden items-center gap-6 md:flex">
          <Link href="/how-it-works" className="text-sm text-slate/80 hover:text-slate">
            How It Works
          </Link>
          <Link href="/for-homeowners" className="text-sm text-slate/80 hover:text-slate">
            For Homeowners
          </Link>
          <Link href="/for-contractors" className="text-sm text-slate/80 hover:text-slate">
            For Contractors
          </Link>
          <Link href="/trust" className="text-sm text-slate/80 hover:text-slate">
            Trust & Safety
          </Link>
          <Link href="/login" className="text-sm text-slate/80 hover:text-slate">
            Login
          </Link>
        </nav>
        <Link href="/#project-form" className="btn-primary text-sm">
          Submit My Project
        </Link>
      </div>
    </header>
  );
}
