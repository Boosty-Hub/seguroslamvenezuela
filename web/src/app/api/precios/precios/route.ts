import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/precios/precios?fecha&subcategoria&rango_edad → filas de daily_prices
// de la última fecha (o la indicada).
export async function GET(request: Request) {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const sp = new URL(request.url).searchParams;
  const subcategoria = sp.get("subcategoria");
  const rango = sp.get("rango_edad");
  let fecha = sp.get("fecha");

  if (!fecha) {
    const { data } = await supabase
      .from("daily_prices").select("fecha").order("fecha", { ascending: false }).limit(1).maybeSingle();
    fecha = (data?.fecha as string | undefined) ?? null;
  }
  if (!fecha) return NextResponse.json({ fecha: null, rows: [] });

  let q = supabase
    .from("daily_prices")
    .select("aseguradora,nombre_plan,subcategoria,rango_edad,suma_asegurada,prima_mensual,prima_anual,prima_trimestral,prima_semestral,fecha")
    .eq("fecha", fecha);
  if (subcategoria) q = q.eq("subcategoria", subcategoria);
  if (rango) q = q.eq("rango_edad", rango);

  const { data: rows, error } = await q
    .order("subcategoria").order("rango_edad").order("prima_mensual").limit(2000);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ fecha, rows: rows ?? [] });
}
