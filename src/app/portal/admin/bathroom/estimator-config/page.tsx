import Link from "next/link";
import { getSession, canAccessAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { bathroomRockvilleEnabled } from "@/lib/feature-flags";
import { EstimatorConfigActions } from "./EstimatorConfigActions";

export default async function EstimatorConfigPage() {
  const session = await getSession();
  if (!session || !canAccessAdmin(session.role)) redirect("/login");
  if (!bathroomRockvilleEnabled()) redirect("/portal/admin");

  const configs = await prisma.estimatorConfiguration.findMany({
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
  });

  const published = configs.find((c) => c.status === "PUBLISHED");
  const drafts = configs.filter((c) => c.status === "DRAFT");
  const retired = configs.filter((c) => c.status === "RETIRED");

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Bathroom Estimator Configurations</h1>
          <p className="mt-1 text-sm text-muted">
            Versioned estimator configurations. Numeric ranges are withheld from public display until a configuration is PUBLISHED.
          </p>
        </div>
      </div>

      {published && (
        <div className="mt-6 rounded-lg border border-green-600 bg-green-50 p-4">
          <p className="text-sm font-semibold text-green-800">Currently published</p>
          <dl className="mt-2 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
            <div><dt className="text-muted">Version</dt><dd className="font-medium">{published.version}</dd></div>
            <div><dt className="text-muted">Location</dt><dd>{published.locationId}</dd></div>
            <div><dt className="text-muted">Trade</dt><dd>{published.tradeId}</dd></div>
            <div><dt className="text-muted">Valid from</dt><dd>{published.validFrom?.toLocaleDateString() ?? "—"}</dd></div>
          </dl>
          <EstimatorConfigActions id={published.id} status="PUBLISHED" />
        </div>
      )}

      {!published && (
        <div className="mt-6 rounded-lg border border-amber-500 bg-amber-50 p-4">
          <p className="text-sm font-semibold text-amber-800">No published configuration</p>
          <p className="mt-1 text-sm text-amber-700">
            Public estimate ranges are withheld until a configuration is reviewed and published. Seed the default and publish it to enable public ranges.
          </p>
          <EstimatorConfigActions id={null} status="NONE" />
        </div>
      )}

      <section className="mt-8">
        <h2 className="text-lg font-semibold">Drafts ({drafts.length})</h2>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          {drafts.map((c) => (
            <div key={c.id} className="card p-4">
              <p className="font-semibold">{c.version}</p>
              <p className="text-sm text-muted">{c.locationId} · {c.tradeId}</p>
              <EstimatorConfigActions id={c.id} status="DRAFT" />
            </div>
          ))}
          {drafts.length === 0 && <p className="text-muted col-span-full text-sm">No draft configurations.</p>}
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold">Retired ({retired.length})</h2>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          {retired.map((c) => (
            <div key={c.id} className="card p-4 opacity-70">
              <p className="font-semibold">{c.version}</p>
              <p className="text-sm text-muted">{c.locationId} · {c.tradeId}</p>
              <EstimatorConfigActions id={c.id} status="RETIRED" />
            </div>
          ))}
          {retired.length === 0 && <p className="text-muted col-span-full text-sm">No retired configurations.</p>}
        </div>
      </section>

      <div className="mt-8">
        <Link href="/portal/admin/bathroom/projects" className="text-sm text-copper hover:underline">← Bathroom Projects</Link>
      </div>
    </div>
  );
}
