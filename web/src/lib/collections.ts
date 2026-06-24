// Taxonomía de Seguros LAM portada 1:1 desde el proyecto KB original
// (_lam_port/lib/collections.ts). Etiqueta documentos en kb_documents/kb_chunks
// (metadata.collection / metadata.policy_type) y alimenta el filtro de search_kb.

export const COLLECTIONS = [
  { value: "seguros_caracas", label: "Seguros Caracas" },
  { value: "seguros_mercantil", label: "Mercantil (Venezuela)" },
  { value: "seguros_mercantil_panama", label: "Mercantil (Panamá)" },
  { value: "seguros_universitas", label: "Seguros Universitas" },
  { value: "seguros_venezuela", label: "Seguros Venezuela" },
  { value: "estar_seguros", label: "Estar Seguros" },
  { value: "la_internacional", label: "La Internacional" },
  { value: "lam_corredora", label: "LAM Corredora (Interna)" },
] as const;

export const POLICY_TYPES = [
  { value: "salud", label: "Salud / HCM" },
  { value: "vida", label: "Vida" },
  { value: "auto", label: "Auto / Vehiculos" },
  { value: "hogar", label: "Hogar / Residencia" },
  { value: "funeraria", label: "Funeraria / Sepelio" },
  { value: "accidentes_personales", label: "Accidentes Personales" },
  { value: "responsabilidad_civil", label: "Responsabilidad Civil" },
  { value: "viaje", label: "Viaje" },
  { value: "empresarial", label: "Empresarial / Pymes" },
  { value: "mascotas", label: "Mascotas" },
  { value: "ciberseguridad", label: "Ciberseguridad" },
  { value: "fianza", label: "Fianza" },
  { value: "general", label: "General / Condicionados" },
] as const;

// Defaults sugeridos para la UI del uploader.
export const DEFAULT_COLLECTION = "seguros_caracas";
export const DEFAULT_POLICY_TYPE = "salud";
export const FALLBACK_POLICY_TYPE = "general";

export const COLLECTION_VALUES: string[] = COLLECTIONS.map((c) => c.value);
export const POLICY_TYPE_VALUES: string[] = POLICY_TYPES.map((p) => p.value);

export function isValidCollection(v: string | null | undefined): v is string {
  return typeof v === "string" && COLLECTION_VALUES.includes(v);
}
export function isValidPolicyType(v: string | null | undefined): v is string {
  return typeof v === "string" && POLICY_TYPE_VALUES.includes(v);
}

export function collectionLabel(value: string): string {
  return COLLECTIONS.find((c) => c.value === value)?.label ?? value;
}
export function policyTypeLabel(value: string): string {
  return POLICY_TYPES.find((p) => p.value === value)?.label ?? value;
}
