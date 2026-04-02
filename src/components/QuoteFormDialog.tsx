import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Quote, InsuranceType, QuoteStatus } from "@/types/quote";

const insuranceTypes: InsuranceType[] = [
  "Auto", "Vida", "Hogar", "Salud", "Empresarial", "Responsabilidad Civil", "Otro",
];
const statuses: { value: QuoteStatus; label: string }[] = [
  { value: "pendiente", label: "Pendiente" },
  { value: "aprobada", label: "Aprobada" },
  { value: "rechazada", label: "Rechazada" },
  { value: "vencida", label: "Vencida" },
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: Omit<Quote, "id" | "createdAt">) => void;
  initial?: Quote;
}

export function QuoteFormDialog({ open, onOpenChange, onSubmit, initial }: Props) {
  const [form, setForm] = useState(() => getDefaults(initial));

  function getDefaults(q?: Quote) {
    return {
      clientName: q?.clientName ?? "",
      clientEmail: q?.clientEmail ?? "",
      clientPhone: q?.clientPhone ?? "",
      insuranceType: q?.insuranceType ?? ("Auto" as InsuranceType),
      insurer: q?.insurer ?? "",
      premium: q?.premium?.toString() ?? "",
      coverage: q?.coverage ?? "",
      status: q?.status ?? ("pendiente" as QuoteStatus),
      notes: q?.notes ?? "",
    };
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      clientName: form.clientName.trim(),
      clientEmail: form.clientEmail.trim(),
      clientPhone: form.clientPhone.trim(),
      insuranceType: form.insuranceType,
      insurer: form.insurer.trim(),
      premium: parseFloat(form.premium) || 0,
      coverage: form.coverage.trim(),
      status: form.status,
      notes: form.notes.trim(),
    });
    setForm(getDefaults());
    onOpenChange(false);
  };

  const set = (field: string, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initial ? "Editar cotización" : "Nueva cotización"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 py-2">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="clientName">Nombre del cliente *</Label>
              <Input id="clientName" required value={form.clientName} onChange={(e) => set("clientName", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="clientPhone">Teléfono</Label>
              <Input id="clientPhone" value={form.clientPhone} onChange={(e) => set("clientPhone", e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="clientEmail">Email</Label>
            <Input id="clientEmail" type="email" value={form.clientEmail} onChange={(e) => set("clientEmail", e.target.value)} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Tipo de seguro *</Label>
              <Select value={form.insuranceType} onValueChange={(v) => set("insuranceType", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {insuranceTypes.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="insurer">Aseguradora *</Label>
              <Input id="insurer" required value={form.insurer} onChange={(e) => set("insurer", e.target.value)} />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="premium">Prima (MXN) *</Label>
              <Input id="premium" type="number" min="0" step="0.01" required value={form.premium} onChange={(e) => set("premium", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Estado</Label>
              <Select value={form.status} onValueChange={(v) => set("status", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {statuses.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="coverage">Cobertura</Label>
            <Input id="coverage" value={form.coverage} onChange={(e) => set("coverage", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="notes">Notas</Label>
            <Textarea id="notes" rows={2} value={form.notes} onChange={(e) => set("notes", e.target.value)} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit">{initial ? "Guardar cambios" : "Crear cotización"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
