import { Badge } from "@/components/ui/badge";
import type { LeadStatus, PropertyStatus } from "@/lib/api/types";
import { humanise } from "@/lib/format";

/** Colour carries meaning here: green is live, amber is waiting on someone. */
const PROPERTY_VARIANTS: Record<PropertyStatus, string> = {
  DRAFT: "bg-muted text-muted-foreground",
  PENDING_REVIEW: "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200",
  ACTIVE: "bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200",
  SOLD: "bg-blue-100 text-blue-900 dark:bg-blue-950 dark:text-blue-200",
  RENTED: "bg-blue-100 text-blue-900 dark:bg-blue-950 dark:text-blue-200",
  ARCHIVED: "bg-muted text-muted-foreground line-through",
};

const LEAD_VARIANTS: Record<LeadStatus, string> = {
  NEW: "bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200",
  CONTACTED: "bg-blue-100 text-blue-900 dark:bg-blue-950 dark:text-blue-200",
  QUALIFIED: "bg-violet-100 text-violet-900 dark:bg-violet-950 dark:text-violet-200",
  CLOSED: "bg-muted text-muted-foreground",
  SPAM: "bg-red-100 text-red-900 dark:bg-red-950 dark:text-red-200",
};

export function StatusBadge({ status }: { status: PropertyStatus }) {
  return (
    <Badge variant="secondary" className={PROPERTY_VARIANTS[status]}>
      {humanise(status)}
    </Badge>
  );
}

export function LeadStatusBadge({ status }: { status: LeadStatus }) {
  return (
    <Badge variant="secondary" className={LEAD_VARIANTS[status]}>
      {humanise(status)}
    </Badge>
  );
}
