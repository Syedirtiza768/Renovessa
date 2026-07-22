import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSession, canAccessAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { CampaignActions } from "@/components/admin/CampaignActions";

const AUDIENCE_LABEL: Record<string, string> = {
  homeowner: "Homeowners",
  contractor: "Active contractors",
  prospect_contractor: "Prospective contractors",
};

export default async function CampaignDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || !canAccessAdmin(session.role)) redirect("/login");

  const { id } = await params;
  const campaign = await prisma.emailCampaign.findUnique({
    where: { id },
    include: { owner: { select: { name: true } } },
  });
  if (!campaign) notFound();

  const filters = (campaign.filters as Record<string, string | number> | null) || {};
  const activeFilters = Object.entries(filters).filter(([, v]) => v);

  // Delivery stats from the SendGrid event webhook (phase 2). Only meaningful
  // once the campaign has been sent and events have started arriving.
  const [delivered, opened, clicked, bounced, complained] = await Promise.all([
    prisma.emailMessage.count({ where: { campaignId: id, deliveredAt: { not: null } } }),
    prisma.emailMessage.count({ where: { campaignId: id, openedAt: { not: null } } }),
    prisma.emailMessage.count({ where: { campaignId: id, clickedAt: { not: null } } }),
    prisma.emailMessage.count({ where: { campaignId: id, bouncedAt: { not: null } } }),
    prisma.emailMessage.count({ where: { campaignId: id, spamReportedAt: { not: null } } }),
  ]);
  const hasEngagement = delivered + opened + clicked + bounced + complained > 0;

  // Fetch all sent messages for this campaign with prospect details.
  const messages = await prisma.emailMessage.findMany({
    where: { campaignId: id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      toEmail: true,
      subject: true,
      body: true,
      status: true,
      sendgridMessageId: true,
      direction: true,
      createdAt: true,
      deliveredAt: true,
      openedAt: true,
    },
  });

  // Resolve prospect company names for each recipient.
  const recipientEmails = [...new Set(messages.map((m) => m.toEmail.toLowerCase()))];
  const prospects = recipientEmails.length
    ? await prisma.contractorInquiry.findMany({
        where: { email: { in: recipientEmails } },
        select: { email: true, companyName: true, contactName: true, rating: true, reviewCount: true, city: true, status: true },
      })
    : [];
  const prospectMap = new Map(prospects.map((p) => [p.email.toLowerCase(), p]));

  return (
    <div className="max-w-4xl">
      <Link href="/portal/admin/campaigns" className="text-sm text-copper hover:underline">
        ← Back to Campaigns
      </Link>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{campaign.name}</h1>
          <p className="text-sm text-muted">
            {AUDIENCE_LABEL[campaign.audience] || campaign.audience}
            {campaign.owner?.name ? ` · created by ${campaign.owner.name}` : ""}
          </p>
        </div>
        <span className="rounded px-2 py-1 text-xs font-medium bg-blueprint text-muted">{campaign.status}</span>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <div className="card p-4"><dt className="text-xs text-muted">Recipients</dt><dd className="text-2xl font-bold">{campaign.totalRecipients}</dd></div>
        <div className="card p-4"><dt className="text-xs text-muted">Sent</dt><dd className="text-2xl font-bold">{campaign.sentCount}</dd></div>
        <div className="card p-4"><dt className="text-xs text-muted">Failed</dt><dd className="text-2xl font-bold">{campaign.failedCount}</dd></div>
      </div>

      {(campaign.status === "sent" || hasEngagement) && (
        <div className="mt-4">
          <p className="text-xs font-medium text-muted">Delivery (via SendGrid events)</p>
          <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-5">
            <div className="card p-3"><dt className="text-xs text-muted">Delivered</dt><dd className="text-lg font-semibold">{delivered}</dd></div>
            <div className="card p-3"><dt className="text-xs text-muted">Opened</dt><dd className="text-lg font-semibold">{opened}</dd></div>
            <div className="card p-3"><dt className="text-xs text-muted">Clicked</dt><dd className="text-lg font-semibold">{clicked}</dd></div>
            <div className="card p-3"><dt className="text-xs text-muted">Bounced</dt><dd className="text-lg font-semibold">{bounced}</dd></div>
            <div className="card p-3"><dt className="text-xs text-muted">Complaints</dt><dd className="text-lg font-semibold">{complained}</dd></div>
          </div>
          {!hasEngagement && (
            <p className="mt-2 text-xs text-muted">No events received yet. Ensure the SendGrid Event Webhook points to <code>/api/webhooks/sendgrid/events</code>.</p>
          )}
        </div>
      )}

      {activeFilters.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {activeFilters.map(([k, v]) => (
            <span key={k} className="rounded bg-blueprint px-2 py-1 text-xs text-muted">{k}: {String(v)}</span>
          ))}
        </div>
      )}

      <div className="mt-6 card p-4">
        <p className="text-xs text-muted">Subject</p>
        <p className="font-semibold">{campaign.subject}</p>
        <pre className="mt-3 whitespace-pre-wrap font-sans text-sm text-foreground">{campaign.bodyTemplate}</pre>
        <p className="mt-3 text-xs text-muted">An unsubscribe link and mailing address are appended to every send.</p>
      </div>

      {/* Recipient list */}
      <div className="mt-8">
        <h2 className="text-lg font-bold">Recipients ({messages.length})</h2>
        <p className="text-sm text-muted">Every contact who received this campaign, with the message sent.</p>
        <div className="mt-4 space-y-3">
          {messages.map((m) => {
            const prospect = prospectMap.get(m.toEmail.toLowerCase());
            const who = prospect?.companyName || m.toEmail;
            return (
              <details key={m.id} className="card">
                <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-2 p-4">
                  <div className="min-w-0">
                    <span className="font-semibold">{who}</span>
                    {prospect?.contactName && <span className="ml-2 text-sm text-muted">({prospect.contactName})</span>}
                    <span className="ml-2 text-sm text-muted">{m.toEmail}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted">
                    {prospect?.rating && <span>{prospect.rating}★ {prospect.reviewCount ? `(${prospect.reviewCount})` : ""}</span>}
                    {prospect?.city && <span>{prospect.city}</span>}
                    <span className={`rounded px-1.5 py-0.5 font-medium ${m.status === "sent" ? "badge-green" : m.status === "received" ? "badge-green" : "bg-red-100 text-red-700"}`}>
                      {m.status}
                    </span>
                  </div>
                </summary>
                <div className="border-t border-rule p-4">
                  <p className="text-xs text-muted">To: {m.toEmail} · SendGrid ID: {m.sendgridMessageId || "—"}</p>
                  <p className="mt-2 text-sm font-medium">{m.subject}</p>
                  <pre className="mt-2 whitespace-pre-wrap font-sans text-sm text-muted">{m.body}</pre>
                </div>
              </details>
            );
          })}
        </div>
      </div>

      <CampaignActions
        campaignId={campaign.id}
        audience={campaign.audience}
        subject={campaign.subject}
        bodyTemplate={campaign.bodyTemplate}
        filters={Object.fromEntries(Object.entries(filters).map(([key, value]) => [key, value]))}
        status={campaign.status}
      />
    </div>
  );
}
