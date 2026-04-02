export type QuoteStatus = "pendiente" | "aprobada" | "rechazada" | "vencida";

export type InsuranceType =
  | "Auto"
  | "Vida"
  | "Hogar"
  | "Salud"
  | "Empresarial"
  | "Responsabilidad Civil"
  | "Otro";

export interface Quote {
  id: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  insuranceType: InsuranceType;
  insurer: string;
  premium: number;
  coverage: string;
  status: QuoteStatus;
  createdAt: string;
  notes: string;
}
