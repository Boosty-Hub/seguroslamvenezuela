import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { TOTAL_ESPERADO } from "@/lib/precios";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/precios/cotizaciones → estado X/80 de la última fecha.
export async function GET() {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data: latest } = await supabase
    .from("cotizaciones_diarias").select("fecha").order("fecha", { ascending: false }).limit(1).maybeSingle();
  const fecha = (latest?.fecha as string | undefined) ?? null;
  if (!fecha) return NextResponse.json({ fecha: null, total: 0, esperado: TOTAL_ESPERADO });

  const { count } = await supabase
    .from("cotizaciones_diarias")
    .select("*", { count: "exact", head: true })
    .eq("fecha", fecha).eq("status", "success").not("pdf_url", "is", null);

  const { count: conPrecios } = await supabase
    .from("daily_prices")
    .select("subcategoria", { count: "exact", head: true })
    .eq("fecha", fecha);

  return NextResponse.json({
    fecha,
    total: count ?? 0,
    esperado: TOTAL_ESPERADO,
    con_precios: conPrecios ?? 0,
  });
}
