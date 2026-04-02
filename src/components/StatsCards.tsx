import { Card, CardContent } from "@/components/ui/card";
import { FileText, CheckCircle2, Clock, DollarSign } from "lucide-react";
import type { Quote } from "@/types/quote";

const formatCurrency = (n: number) =>
  new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(n);

export function StatsCards({ quotes }: { quotes: Quote[] }) {
  const total = quotes.length;
  const approved = quotes.filter((q) => q.status === "aprobada").length;
  const pending = quotes.filter((q) => q.status === "pendiente").length;
  const totalPremium = quotes.reduce((sum, q) => sum + q.premium, 0);

  const stats = [
    { label: "Total cotizaciones", value: total, icon: FileText, color: "text-primary" },
    { label: "Aprobadas", value: approved, icon: CheckCircle2, color: "text-success" },
    { label: "Pendientes", value: pending, icon: Clock, color: "text-warning" },
    { label: "Prima total", value: formatCurrency(totalPremium), icon: DollarSign, color: "text-primary" },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((s) => (
        <Card key={s.label} className="animate-fade-in">
          <CardContent className="flex items-center gap-3 p-4">
            <div className={`rounded-lg bg-muted p-2.5 ${s.color}`}>
              <s.icon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold tracking-tight">{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
