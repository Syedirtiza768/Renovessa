import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession, canAccessAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";

const STATUS_BADGE: Record<string, string> = {
  draft: "bg-blueprint text-muted",
  sending: "badge-green",
  sent: "badge-green",
  failed: "bg-red-100 text-red-700",
};

const AUDIENCE_LABEL: Record<string, string> = {
  homeowner: "Homeowners",
  contractor: "Contractors",
  prospect_contractor: "Prospective contractors",
};

export default async function CampaignsPage() {
  const session = await getSession();
  if (!session || !canAccessAdmin(session.role)) redirect("/login");

  const campaigns = await prisma.emailCampaign.findMany({
    orderBy: { createdAt: "desc" },
    include: { owner: { select: { name: true } } },
  });

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Email Campaigns</h1>
          <p className="text-sm text-muted">Bulk outreach to homeowners and contractors via SendGrid.</p>
        </div>
        <Link href="/portal/admin/campaigns/new" className="btn-primary text-sm">
          + New Campaign
        </Link>
      </div>

      <div className="mt-6 space-y-3">
        {campaigns.map((c) => (
          <Link
            key={c.id}
            href={`/portal/admin/campaigns/${c.id}`}
            className="card flex flex-wrap items-center justify-between gap-4 p-4 hover:border-copper transition-colors"
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="font-semibold">{c.name}</h2>
                <span className={`rounded px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[c.status] || "bg-blueprint text-muted"}`}>
                  {c.status}
                </span>
              </div>
              <p className="mt-1 text-sm text-muted">
                {AUDIENCE_LABEL[c.audience] || c.audience} · “{c.subject}”
              </p>
            </div>
            <dl className="flex gap-6 text-sm">
              <div><dt className="text-muted">Recipients</dt><dd className="font-medium">{c.totalRecipients}</dd></div>
              <div><dt className="text-muted">Sent</dt><dd className="font-medium">{c.sentCount}</dd></div>
              <div><dt className="text-muted">Failed</dt><dd className="font-medium">{c.failedCount}</dd></div>
            </dl>
          </Link>
        ))}
        {campaigns.length === 0 && (
          <p className="text-muted">No campaigns yet. Create one to start bulk outreach.</p>
        )}
      </div>
    </div>
  );
}
