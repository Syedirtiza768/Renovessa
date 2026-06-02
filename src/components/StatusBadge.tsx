import { STATUS_BADGE, LEAD_STATUS_LABELS } from "@/lib/constants";
import { cn } from "@/lib/utils";

export function StatusBadge({ status }: { status: string }) {
  const label = LEAD_STATUS_LABELS[status] || status.replace(/_/g, " ");
  const badgeClass = STATUS_BADGE[status] || "badge-neutral";

  return <span className={cn(badgeClass)}>{label}</span>;
}
