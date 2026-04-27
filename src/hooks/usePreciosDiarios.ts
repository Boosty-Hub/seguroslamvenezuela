import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface CotizacionDiaria {
  id: string;
  fecha: string;
  categoria: string;
  rango_edad: string;
  id_cotizacion: number | null;
  codigo: string | null;
  pdf_url: string | null;
  pdf_filename: string | null;
  total_planes: number;
  aseguradoras: { id: number; nombre: string }[];
  status: "success" | "error" | "pendiente";
  error_message: string | null;
  ejecutado_en: string;
}

export type CategoriaKey =
  | "asistencia_aps"
  | "emergencias_medicas"
  | "salud_basica_a"
  | "salud_basica_b"
  | "salud_estandar"
  | "salud_media"
  | "salud_alta"
  | "salud_premium";

export const CATEGORIAS_ORDER: CategoriaKey[] = [
  "asistencia_aps",
  "emergencias_medicas",
  "salud_basica_a",
  "salud_basica_b",
  "salud_estandar",
  "salud_media",
  "salud_alta",
  "salud_premium",
];

export const RANGOS_ORDER = [
  "0-9", "10-29", "30-39", "40-49", "50-54",
  "55-59", "60-64", "65-69", "70-74", "75+",
];

// DiaResumen: por cada subcategoría, un mapa de rango_edad → cotización
export interface DiaResumen {
  fecha: string;
  categorias: Record<CategoriaKey, Record<string, CotizacionDiaria>>;
}

export type Subcategoria = CategoriaKey;

export interface PlanCatalog {
  id: string;
  fecha: string;
  id_aseguradora: number;
  nombre_aseguradora: string;
  id_plan: number;
  nombre_plan: string;
  suma_asegurada: number;
  tipo: number;
  subcategoria: Subcategoria;
  ejecutado_en: string;
}

interface Filters {
  fechaDesde?: string;
  fechaHasta?: string;
}

const db = supabase as any;

export function usePreciosDiarios(filters: Filters = {}) {
  const [dias, setDias] = useState<DiaResumen[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRegistros = useCallback(async () => {
    setLoading(true);
    let query = db
      .from("cotizaciones_diarias")
      .select("*")
      .order("fecha", { ascending: false })
      .order("categoria")
      .order("rango_edad");

    if (filters.fechaDesde) query = query.gte("fecha", filters.fechaDesde);
    if (filters.fechaHasta) query = query.lte("fecha", filters.fechaHasta);

    const { data, error } = await query;
    if (!error && data) {
      const map = new Map<string, DiaResumen>();
      for (const row of data as CotizacionDiaria[]) {
        if (!map.has(row.fecha)) {
          map.set(row.fecha, {
            fecha: row.fecha,
            categorias: {} as Record<CategoriaKey, Record<string, CotizacionDiaria>>,
          });
        }
        const dia = map.get(row.fecha)!;
        const cat = row.categoria as CategoriaKey;
        if (!dia.categorias[cat]) dia.categorias[cat] = {};
        dia.categorias[cat][row.rango_edad] = row;
      }
      setDias(Array.from(map.values()));
    }
    setLoading(false);
  }, [filters.fechaDesde, filters.fechaHasta]);

  useEffect(() => { fetchRegistros(); }, [fetchRegistros]);

  const ANON_KEY = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5oc3pxcXFxbGN3bWNzam1ncm12Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUxNjY0MjYsImV4cCI6MjA5MDc0MjQyNn0.uwi4m7-HC4AuSqm0GkCn_ixNY5VIK6-mETY0I6RwsXA`;

  const callEdgeFn = useCallback(async (fn: string) => {
    const res = await fetch(
      `https://nhszqqqqlcwmcsjmgrmv.supabase.co/functions/v1/${fn}`,
      { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${ANON_KEY}` } }
    );
    return res.json();
  }, []);

  const triggerSync = useCallback(async () => {
    const result = await callEdgeFn("daily-price-sync");
    await fetchRegistros();
    return result;
  }, [callEdgeFn, fetchRegistros]);

  const triggerExtractPrices = useCallback(async () => {
    return callEdgeFn("extract-prices");
  }, [callEdgeFn]);

  return { dias, loading, refetch: fetchRegistros, triggerSync, triggerExtractPrices };
}

export function usePlanCatalog(filters: { fecha?: string; id_aseguradora?: number; tipo?: number } = {}) {
  const [planes, setPlanes] = useState<PlanCatalog[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPlanes = useCallback(async () => {
    setLoading(true);
    let fechaTarget = filters.fecha;
    if (!fechaTarget) {
      const { data: latest } = await db
        .from("daily_plan_catalog")
        .select("fecha")
        .order("fecha", { ascending: false })
        .limit(1)
        .maybeSingle();
      fechaTarget = latest?.fecha;
    }
    if (!fechaTarget) { setLoading(false); return; }

    let query = db
      .from("daily_plan_catalog")
      .select("*")
      .eq("fecha", fechaTarget)
      .order("id_aseguradora")
      .order("suma_asegurada");

    if (filters.id_aseguradora) query = query.eq("id_aseguradora", filters.id_aseguradora);
    if (filters.tipo)           query = query.eq("tipo", filters.tipo);

    const { data, error } = await query;
    if (!error && data) setPlanes(data as PlanCatalog[]);
    setLoading(false);
  }, [filters.fecha, filters.id_aseguradora, filters.tipo]);

  useEffect(() => { fetchPlanes(); }, [fetchPlanes]);

  return { planes, loading, refetch: fetchPlanes };
}
