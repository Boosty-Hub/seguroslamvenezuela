import { Badge } from "@/components/ui/badge";
import type { QuoteStatus } from "@/types/quote";

const statusConfig: Record<QuoteStatus, { label: string; className: string }> = {
  pendiente: {
    label: "Pendiente",
    className: "bg-warning/15 text-warning border-warning/30 hover:bg-warning/20",
  },
  aprobada: {
    label: "Aprobada",
    className: "bg-success/15 text-success border-success/30 hover:bg-success/20",
  },
  rechazada: {
    label: "Rechazada",
    className: "bg-destructive/15 text-destructive border-destructive/30 hover:bg-destructive/20",
  },
  vencida: {
    label: "Vencida",
    className: "bg-muted text-muted-foreground border-border hover:bg-muted",
  },
};

export function QuoteStatusBadge({ status }: { status: QuoteStatus }) {
  const config = statusConfig[status];
  return (
    <Badge variant="outline" className={config.className}>
      {config.label}
    </Badge>
  );
}
