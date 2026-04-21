import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const COTIZAR_URL  = "https://mspeed.yoestoyasegurado.co/app/lam/cotizar.php";
const PLANES_URL   = "https://mspeed.yoestoyasegurado.co/app/lam/planes.php";

const ASEGURADORAS = [
  { id: 2,  nombre: "MERCANTIL SEGUROS" },
  { id: 3,  nombre: "SEGUROS CARACAS" },
  { id: 4,  nombre: "SEGUROS UNIVERSITAS" },
  { id: 5,  nombre: "ESTAR SEGUROS" },
  { id: 19, nombre: "LA INTERNACIONAL DE SEGUROS" },
  { id: 20, nombre: "SEGUROS VENEZUELA" },
];

// Clasificación por suma_asegurada y tipo
// BÁSICO  : tipo 2 y 3 (emergencias/APS) + tipo 1 con suma <= 50.000
// INTERMEDIO: tipo 1 con suma 51.000 - 300.000
// PREMIUM : tipo 1 con suma > 300.000

const PLANES_BASICO = [
  // Mercantil (2) - tipo 3 + tipo 1 <= 50k
  162, 186, 163, 187, 304,   // emergencias tipo 3
  6, 8,                       // 30k, 50k tipo 1
  // Caracas (3) - tipo 1 <= 50k
  69, 88, 92, 297, 27, 87, 293, 302,
  // Universitas (4) - tipo 2 (APS) + tipo 1 50k
  156, 157, 158, 159, 160, 161,
  102,
  // Estar (5) - tipo 2 + tipo 1 <= 50k
  279, 280, 281,
  243, 244, 242, 245, 240, 246, 241, 247, 134, 138,
  // La Internacional (19) - tipo 3 + tipo 1 <= 50k
  248, 249, 250, 251,
  225, 229, 226, 230,
  // Venezuela (20) - tipo 1 <= 50k
  282,
];

const PLANES_INTERMEDIO = [
  // Mercantil (2) - tipo 1, 100k-200k
  2, 5,
  // Caracas (3) - tipo 1, 75k-250k
  93, 295, 24, 86, 296, 301, 94, 182, 183, 292,
  26, 85, 298, 300, 174, 181, 185, 291,
  // Universitas (4) - tipo 1, 100k-200k
  103, 37,
  // Estar (5) - tipo 1, 100k-300k
  135, 139, 136, 140, 137, 141,
  // La Internacional (19) - tipo 1, 75k-300k
  227, 231, 228, 232, 233, 234,
  // Venezuela (20) - tipo 1, 100k-200k
  283, 284,
];

const PLANES_PREMIUM = [
  // Mercantil (2) - tipo 1, 1M con deducible
  9, 10, 11, 12,
  // Caracas (3) - tipo 1, 500k-1M
  28, 84, 173, 299, 176, 177, 290, 294,
  // Universitas (4) - tipo 1, 500k
  104,
  // La Internacional (19) - tipo 1, 500k-1M
  235, 236,
  // Venezuela (20) - tipo 1, 500k
  285,
];

const PERSONA_REF = {
  nombre:           "Referencia Diaria",
  fecha_nacimiento: "15-06-1990",
  sexo:             "Masculino",
  email:            "referencia@seguroslamit.com",
  telefono:         "584241234567",
};

async function cotizar(planes: number[]) {
  const res = await fetch(COTIZAR_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...PERSONA_REF, planes }),
  });
  return res.json();
}

async function fetchPlanesAseguradora(id_aseguradora: number) {
  const res = await fetch(`${PLANES_URL}?id_aseguradora=${id_aseguradora}`);
  return res.json();
}

Deno.serve(async (_req) => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const fechaHoy = new Date().toISOString().split("T")[0];

  // Skip if all 3 categories already succeeded today
  const { data: existentes } = await supabase
    .from("cotizaciones_diarias")
    .select("categoria")
    .eq("fecha", fechaHoy)
    .eq("status", "success");

  const categoriasHoy = new Set((existentes ?? []).map((r: any) => r.categoria));
  const todoListo = ["basico", "intermedio", "premium"].every(c => categoriasHoy.has(c));

  if (todoListo) {
    return new Response(
      JSON.stringify({ message: "Ya se ejecutó hoy", fecha: fechaHoy }),
      { headers: { "Content-Type": "application/json" } }
    );
  }

  const resultados: Record<string, any> = {};

  // ── 1. CATÁLOGO DE PLANES ─────────────────────────────────────────
  try {
    // Delete today's catalog first to avoid duplicates on re-run
    await supabase.from("daily_plan_catalog").delete().eq("fecha", fechaHoy);

    const catalogRows: any[] = [];
    for (const aseg of ASEGURADORAS) {
      const data = await fetchPlanesAseguradora(aseg.id);
      if (data.success && data.planes) {
        for (const plan of data.planes) {
          catalogRows.push({
            fecha:              fechaHoy,
            id_aseguradora:     aseg.id,
            nombre_aseguradora: aseg.nombre,
            id_plan:            plan.id,
            nombre_plan:        plan.nombre_plan,
            suma_asegurada:     plan.suma_asegurada,
            tipo:               plan.tipo,
          });
        }
      }
    }

    if (catalogRows.length > 0) {
      await supabase.from("daily_plan_catalog").insert(catalogRows);
    }
    resultados.catalogo = { planes_guardados: catalogRows.length };
  } catch (err) {
    resultados.catalogo = { error: err instanceof Error ? err.message : String(err) };
  }

  // ── 2. COTIZACIÓN BÁSICO ──────────────────────────────────────────
  if (!categoriasHoy.has("basico")) {
    try {
      const data = await cotizar(PLANES_BASICO);
      await supabase.from("cotizaciones_diarias").insert({
        fecha:         fechaHoy,
        categoria:     "basico",
        id_cotizacion: data.success ? data.id_cotizacion : null,
        codigo:        data.success ? data.codigo        : null,
        pdf_url:       data.success ? data.pdf_url       : null,
        pdf_filename:  data.success ? data.pdf_filename  : null,
        total_planes:  PLANES_BASICO.length,
        aseguradoras:  ASEGURADORAS,
        status:        data.success ? "success" : "error",
        error_message: data.success ? null : JSON.stringify(data),
      });
      resultados.basico = data.success
        ? { pdf_url: data.pdf_url }
        : { error: data };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      await supabase.from("cotizaciones_diarias").insert({
        fecha: fechaHoy, categoria: "basico", status: "error",
        error_message: msg, aseguradoras: ASEGURADORAS, total_planes: PLANES_BASICO.length,
      });
      resultados.basico = { error: msg };
    }
  }

  // ── 3. COTIZACIÓN INTERMEDIO ──────────────────────────────────────
  if (!categoriasHoy.has("intermedio")) {
    try {
      const data = await cotizar(PLANES_INTERMEDIO);
      await supabase.from("cotizaciones_diarias").insert({
        fecha:         fechaHoy,
        categoria:     "intermedio",
        id_cotizacion: data.success ? data.id_cotizacion : null,
        codigo:        data.success ? data.codigo        : null,
        pdf_url:       data.success ? data.pdf_url       : null,
        pdf_filename:  data.success ? data.pdf_filename  : null,
        total_planes:  PLANES_INTERMEDIO.length,
        aseguradoras:  ASEGURADORAS,
        status:        data.success ? "success" : "error",
        error_message: data.success ? null : JSON.stringify(data),
      });
      resultados.intermedio = data.success
        ? { pdf_url: data.pdf_url }
        : { error: data };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      await supabase.from("cotizaciones_diarias").insert({
        fecha: fechaHoy, categoria: "intermedio", status: "error",
        error_message: msg, aseguradoras: ASEGURADORAS, total_planes: PLANES_INTERMEDIO.length,
      });
      resultados.intermedio = { error: msg };
    }
  }

  // ── 4. COTIZACIÓN PREMIUM ─────────────────────────────────────────
  if (!categoriasHoy.has("premium")) {
    try {
      const data = await cotizar(PLANES_PREMIUM);
      await supabase.from("cotizaciones_diarias").insert({
        fecha:         fechaHoy,
        categoria:     "premium",
        id_cotizacion: data.success ? data.id_cotizacion : null,
        codigo:        data.success ? data.codigo        : null,
        pdf_url:       data.success ? data.pdf_url       : null,
        pdf_filename:  data.success ? data.pdf_filename  : null,
        total_planes:  PLANES_PREMIUM.length,
        aseguradoras:  ASEGURADORAS,
        status:        data.success ? "success" : "error",
        error_message: data.success ? null : JSON.stringify(data),
      });
      resultados.premium = data.success
        ? { pdf_url: data.pdf_url }
        : { error: data };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      await supabase.from("cotizaciones_diarias").insert({
        fecha: fechaHoy, categoria: "premium", status: "error",
        error_message: msg, aseguradoras: ASEGURADORAS, total_planes: PLANES_PREMIUM.length,
      });
      resultados.premium = { error: msg };
    }
  }

  return new Response(
    JSON.stringify({ success: true, fecha: fechaHoy, resultados }),
    { headers: { "Content-Type": "application/json" } }
  );
});
