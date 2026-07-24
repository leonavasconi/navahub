import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { PRODUCT_STATUS_LABELS, type PRODUCT_STATUSES } from "@/lib/validations/shared";

const STATUS_STYLES: Record<(typeof PRODUCT_STATUSES)[number], string> = {
  AVAILABLE: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400",
  RESERVED: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
  SOLD: "bg-slate-100 text-slate-600 dark:bg-slate-500/15 dark:text-slate-400",
  MAINTENANCE: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400",
};

export function ProductStatusBadge({
  status,
}: {
  status: (typeof PRODUCT_STATUSES)[number];
}) {
  return (
    <Badge className={cn("border-transparent font-medium", STATUS_STYLES[status])}>
      {PRODUCT_STATUS_LABELS[status]}
    </Badge>
  );
}
