import { redirect } from "next/navigation";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { getSession, canAccessAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";

/**
 * Inbound reply inbox. Lists replies captured by the SendGrid Inbound Parse
 * webhook (EmailMessage rows with direction "inbound"), matched back to the
 * prospect and the campaign that prompted them. This is where the notification
 * bell's "New reply from …" links to.
 */
export default async function RepliesPage() {
  const session = await getSession();
  if (!session || !canAccessAdmin(session.role)) redirect("/login");

  const replies = await prisma.emailMessage.findMany({
    where: { direction: "inbound" },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { campaign: { select: { name: true } } },
  });

  // Inbound rows link to a prospect only by address (no FK), so resolve company
  // names in one lookup keyed on the normalized sender email.
  const emails = [...new Set(replies.map((r) => r.fromEmail.toLowerCase()))];
  const inquiries = emails.length
    ? await prisma.contractorInquiry.findMany({
        where: { email: { in: emails } },
        select: { email: true, companyName: true, status: true },
      })
    : [];
  const byEmail = new Map(inquiries.map((i) => [i.email.toLowerCase(), i]));

  return (
    <div>
      <div>
        <h1 className="text-2xl font-bold">Replies</h1>
        <p className="text-sm text-muted">
          Inbound replies to outreach campaigns. Reply from your own inbox — every send uses your
          address as reply-to.
        </p>
      </div>

      <div className="mt-6 space-y-3">
        {replies.map((r) => {
          const prospect = byEmail.get(r.fromEmail.toLowerCase());
          const who = prospect?.companyName || r.fromEmail;
          return (
            <div key={r.id} className="card p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <h2 className="font-semibold">{who}</h2>
                  <p className="text-sm text-muted">
                    {r.fromEmail}
                    {r.campaign?.name ? ` · re: ${r.campaign.name}` : ""}
                  </p>
                </div>
                <span className="text-xs text-muted whitespace-nowrap">
                  {formatDistanceToNow(r.createdAt, { addSuffix: true })}
                </span>
              </div>
              <p className="mt-2 text-sm font-medium">{r.subject}</p>
              <p className="mt-1 whitespace-pre-wrap text-sm text-muted">{r.body}</p>
            </div>
          );
        })}

        {replies.length === 0 && (
          <div className="card p-6 text-center">
            <p className="text-muted">No replies captured yet.</p>
            <p className="mt-1 text-xs text-muted">
              Replies appear here once SendGrid Inbound Parse is configured to POST to
              <code className="mx-1">/api/webhooks/sendgrid/inbound</code>. Until then, replies go
              straight to the reply-to mailbox.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
