import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  SHIPMENT_STATUS_LABELS,
  SHIPMENT_STATUS_COLORS,
  INVOICE_STATUS_COLORS,
} from "@/lib/helpers";

interface StatusBadgeProps {
  status: string;
  type?: "shipment" | "invoice" | "default";
}

export function StatusBadge({ status, type = "default" }: StatusBadgeProps) {
  const label =
    type === "shipment"
      ? SHIPMENT_STATUS_LABELS[status] ?? status
      : status.replace(/_/g, " ");

  const colorClass =
    type === "shipment"
      ? SHIPMENT_STATUS_COLORS[status]
      : type === "invoice"
        ? INVOICE_STATUS_COLORS[status]
        : "bg-secondary text-secondary-foreground";

  return (
    <Badge variant="secondary" className={cn("font-medium", colorClass)}>
      {label}
    </Badge>
  );
}
