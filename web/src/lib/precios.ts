// Tipos y constantes del módulo Precios Diarios (portados de Seguros LAM, sin la
// anon key del hook original). El cliente consume los route handlers /api/precios/*.

export const TOTAL_ESPERADO = 80; // 8 subcategorías × 10 rangos de edad

export type Subcategoria =
  | "asistencia_aps"
  | "emergencias_medicas"
  | "salud_basica_a"
  | "salud_basica_b"
  | "salud_estandar"
  | "salud_media"
  | "salud_alta"
  | "salud_premium";

export const SUBCATEGORIAS: { value: Subcategoria; label: string }[] = [
  { value: "asistencia_aps",      label: "Asistencia / APS" },
  { value: "emergencias_medicas", label: "Emergencias Médicas" },
  { value: "salud_basica_a",      label: "Salud Básica A" },
  { value: "salud_basica_b",      label: "Salud Básica B" },
  { value: "salud_estandar",      label: "Salud Estándar" },
  { value: "salud_media",         label: "Salud Media" },
  { value: "salud_alta",          label: "Salud Alta" },
  { value: "salud_premium",       label: "Salud Premium" },
];

export const RANGOS_EDAD = [
  "0-9", "10-29", "30-39", "40-49", "50-54",
  "55-59", "60-64", "65-69", "70-74", "75+",
];

// 6 aseguradoras del mercado VE (nombres externos del cotizador).
export const ASEGURADORAS_PRECIOS = [
  "MERCANTIL SEGUROS", "SEGUROS CARACAS", "SEGUROS UNIVERSITAS",
  "ESTAR SEGUROS", "LA INTERNACIONAL DE SEGUROS", "SEGUROS VENEZUELA",
];

export const SUB_LABEL: Record<string, string> = Object.fromEntries(
  SUBCATEGORIAS.map((s) => [s.value, s.label])
);

export type DailyPriceRow = {
  aseguradora: string;
  nombre_plan: string;
  subcategoria: string;
  rango_edad: string;
  suma_asegurada: number;
  prima_mensual: number;
  prima_anual: number;
  prima_trimestral: number;
  prima_semestral: number;
  fecha: string;
};

export function fmtMoney(n: number | null | undefined): string {
  const v = Number(n ?? 0);
  return v.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
