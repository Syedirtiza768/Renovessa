import Link from "next/link";
import { getSession, canAccessAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { bathroomRockvilleEnabled } from "@/lib/feature-flags";
import { ContentVersionForm } from "./ContentVersionForm";

export default async function BathroomContentPage() {
  const session = await getSession();
  if (!session || !canAccessAdmin(session.role)) redirect("/login");
  if (!bathroomRockvilleEnabled()) redirect("/portal/admin");

  const versions = await prisma.bathroomContentVersion.findMany({
    orderBy: [{ slug: "asc" }, { lastUpdatedAt: "desc" }],
  });

  return (
    <div>
      <h1 className="text-2xl font-bold">Bathroom Content Versions</h1>
      <p className="mt-1 text-sm text-muted">
        Authority content for the Rockville bathroom remodeling pages. Each slug has one row; set status to <code>published</code> to make it live.
      </p>

      <ContentVersionForm />

      <section className="mt-8">
        <h2 className="text-lg font-semibold">Existing versions ({versions.length})</h2>
        <div className="mt-3 space-y-3">
          {versions.map((v) => (
            <div key={v.id} className="rounded-lg border p-4">
              <div className="flex items-center justify-between">
                <p className="font-mono text-sm font-semibold">/{v.slug}</p>
                <span className={`rounded px-2 py-0.5 text-xs ${v.status === "published" ? "bg-green-100 text-green-800" : v.status === "retired" ? "bg-gray-100 text-gray-600" : "bg-amber-100 text-amber-800"}`}>
                  {v.status}
                </span>
              </div>
              <p className="mt-1 text-sm">{v.title}</p>
              <p className="mt-1 text-xs text-muted">
                Author: {v.author ?? "—"} · Reviewer: {v.reviewer ?? "—"} · Updated: {v.lastUpdatedAt.toLocaleDateString()}
              </p>
            </div>
          ))}
          {versions.length === 0 && <p className="text-muted text-sm">No content versions yet.</p>}
        </div>
      </section>

      <div className="mt-8">
        <Link href="/portal/admin/bathroom/projects" className="text-sm text-copper hover:underline">← Back to projects</Link>
      </div>
    </div>
  );
}
