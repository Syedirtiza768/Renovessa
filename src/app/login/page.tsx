"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Login failed");
      router.push(data.redirect);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-md px-4 py-16 sm:px-6">
        <div className="card p-8">
          <h1 className="text-2xl font-bold text-slate">Portal Login</h1>
          <p className="mt-2 text-sm text-muted">Homeowner, contractor, or admin access</p>
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label className="label">Email</label>
              <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div>
              <label className="label">Password</label>
              <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            {error && <p className="text-sm text-danger">{error}</p>}
            <button type="submit" className="btn-primary w-full" disabled={loading}>
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>
          <div className="mt-6 rounded-md bg-blueprint p-4 text-xs text-muted">
            <p className="font-semibold text-slate">Demo accounts (password: demo1234)</p>
            <ul className="mt-2 space-y-1">
              <li>admin@renovessa.com — Admin</li>
              <li>sarah.mitchell@demo.renovessa.com — Homeowner</li>
              <li>hvac@demo.renovessa.com — Contractor</li>
            </ul>
          </div>
          <Link href="/" className="mt-4 block text-center text-sm text-copper hover:underline">← Back to website</Link>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
