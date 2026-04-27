import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const PARALLEL = 1; // sequential to avoid saturating external API

const COTIZAR_URL = "https://mspeed.yoestoyasegurado.co/app/lam/cotizar.php";
const PLANES_URL  = "https://mspeed.yoestoyasegurado.co/app/lam/planes.php";

const ASEGURADORAS = [
  { id: 2,  nombre: "MERCANTIL SEGUROS" },
  { id: 3,  nombre: "SEGUROS CARACAS" },
  { id: 4,  nombre: "SEGUROS UNIVERSITAS" },
  { id: 5,  nombre: "ESTAR SEGUROS" },
  { id: 19, nombre: "LA INTERNACIONAL DE SEGUROS" },
  { id: 20, nombre: "SEGUROS VENEZUELA" },
];

const SUBCATEGORIAS: Record<string, number[]> = {
  asistencia_aps:      [156,157,158,159,160,161, 279,280,281],
  emergencias_medicas: [162,186,163,187,304, 248,249,250,251],
  salud_basica_a:      [6,8, 69,88,92,297,27,87,293,302, 102, 225,229, 282],
  salud_basica_b:      [243,244,242,245,240,246,241,247,134,138, 226,230],
  salud_estandar:      [2, 93,295, 24,86,296,301, 94, 103, 135,139, 227,231, 283],
  salud_media:         [5, 182,183,26,85,298,300,174,181,292, 37, 136,140, 228,232, 284],
  salud_alta:          [185,291, 137,141, 233,234, 28,84,173,299, 104, 235, 285],
  salud_premium:       [9,10,11,12, 176,177,290,294, 236],
};

const RANGOS_EDAD: Record<string, string> = {
  "0-9":   "15-06-2020",
  "10-29": "15-06-2006",
  "30-39": "15-06-1990",
  "40-49": "15-06-1980",
  "50-54": "15-06-1973",
  "55-59": "15-06-1968",
  "60-64": "15-06-1963",
  "65-69": "15-06-1958",
  "70-74": "15-06-1953",
  "75+":   "15-06-1948",
};

const TOTAL_ESPERADO = Object.keys(SUBCATEGORIAS).length * Object.keys(RANGOS_EDAD).length;

async function cotizar(planes: number[], fecha_nacimiento: string) {
  const res = await fetch(COTIZAR_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      nombre: "Referencia Diaria", fecha_nacimiento,
      sexo: "Masculino", email: "referencia@seguroslamit.com",
      telefono: "584241234567", planes,
    }),
  });
  return res.json();
}

async function fetchPlanesAseguradora(id_aseguradora: number) {
  const res = await fetch(`${PLANES_URL}?id_aseguradora=${id_aseguradora}`);
  return res.json();
}

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (_req) => {
  if (_req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const fechaHoy = new Date().toISOString().split("T")[0];

  const { data: existentes } = await supabase
    .from("cotizaciones_diarias")
    .select("categoria, rango_edad")
    .eq("fecha", fechaHoy)
    .eq("status", "success");

  const yaListas = new Set(
    (existentes ?? []).map((r: any) => `${r.categoria}__${r.rango_edad}`)
  );

  if (yaListas.size >= TOTAL_ESPERADO) {
    return new Response(
      JSON.stringify({ message: "Ya se ejecutó hoy", fecha: fechaHoy, completadas: yaListas.size }),
      { headers: { "Content-Type": "application/json", ...CORS } }
    );
  }

  const resultados: Record<string, any> = {};

  // ── 1. CATÁLOGO DE PLANES (solo si no existe hoy) ─────────────────────────
  const { count: catalogCount } = await supabase
    .from("daily_plan_catalog").select("id", { count: "exact", head: true }).eq("fecha", fechaHoy);

  if (!catalogCount || catalogCount === 0) {
    try {
      const catalogRows: any[] = [];
      for (const aseg of ASEGURADORAS) {
        const data = await fetchPlanesAseguradora(aseg.id);
        if (data.success && data.planes) {
          for (const plan of data.planes) {
            catalogRows.push({
              fecha: fechaHoy, id_aseguradora: aseg.id, nombre_aseguradora: aseg.nombre,
              id_plan: plan.id, nombre_plan: plan.nombre_plan,
              suma_asegurada: plan.suma_asegurada, tipo: plan.tipo,
            });
          }
        }
      }
      if (catalogRows.length > 0) await supabase.from("daily_plan_catalog").insert(catalogRows);
      resultados.catalogo = { planes_guardados: catalogRows.length };
    } catch (err) {
      resultados.catalogo = { error: err instanceof Error ? err.message : String(err) };
    }
  } else {
    resultados.catalogo = { skipped: true, planes_existentes: catalogCount };
  }

  // ── 2. COTIZACIONES — all pending in parallel chunks ─────────────────────
  // Build full list of pending combinations
  const pending: Array<{ subcat: string; rango: string; fechaNac: string; planes: number[] }> = [];
  for (const [subcat, planes] of Object.entries(SUBCATEGORIAS)) {
    for (const [rango, fechaNac] of Object.entries(RANGOS_EDAD)) {
      if (!yaListas.has(`${subcat}__${rango}`)) {
        pending.push({ subcat, rango, fechaNac, planes });
      }
    }
  }

  let nuevas = 0;

  // Process all pending in parallel chunks of PARALLEL
  for (let i = 0; i < pending.length; i += PARALLEL) {
    const chunk = pending.slice(i, i + PARALLEL);
    await Promise.all(chunk.map(async ({ subcat, rango, fechaNac, planes }) => {
      const key = `${subcat}__${rango}`;
      try {
        const data = await cotizar(planes, fechaNac);
        await supabase.from("cotizaciones_diarias").insert({
          fecha: fechaHoy, categoria: subcat, rango_edad: rango,
          id_cotizacion: data.success ? data.id_cotizacion : null,
          codigo:        data.success ? data.codigo        : null,
          pdf_url:       data.success ? data.pdf_url       : null,
          pdf_filename:  data.success ? data.pdf_filename  : null,
          total_planes: planes.length, aseguradoras: ASEGURADORAS,
          status:        data.success ? "success" : "error",
          error_message: data.success ? null : JSON.stringify(data),
        });
        if (data.success) nuevas++;
        resultados[key] = data.success ? { pdf_url: data.pdf_url } : { error: data };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        await supabase.from("cotizaciones_diarias").insert({
          fecha: fechaHoy, categoria: subcat, rango_edad: rango,
          status: "error", error_message: msg,
          aseguradoras: ASEGURADORAS, total_planes: planes.length,
        });
        resultados[key] = { error: msg };
      }
    }));
  }

  const remaining = TOTAL_ESPERADO - (yaListas.size + nuevas);
  return new Response(
    JSON.stringify({ success: true, fecha: fechaHoy, nuevas_generadas: nuevas, total: yaListas.size + nuevas, pendientes: remaining, resultados }),
    { headers: { "Content-Type": "application/json", ...CORS } }
  );
});
