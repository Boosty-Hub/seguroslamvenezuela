import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const BATCH_SIZE = 10;

// ── CORS ──────────────────────────────────────────────────────────────────────

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ── INTERFACES ────────────────────────────────────────────────────────────────

interface PriceRow {
  nombre_plan:      string;
  aseguradora:      string;
  suma_asegurada:   number;
  prima_anual:      number;
  prima_mensual:    number;
  prima_semestral:  number;
  prima_trimestral: number;
}

// ── AI PDF EXTRACTOR ──────────────────────────────────────────────────────────

async function extractPricesFromPDF(
  pdfUrl: string,
  subcategoria: string,
  catalogoTexto: string,
  openaiKey: string
): Promise<PriceRow[]> {
  const resp = await fetch(pdfUrl);
  if (!resp.ok) throw new Error(`PDF download failed: ${resp.status}`);

  const pdfBytes = new Uint8Array(await resp.arrayBuffer());

  // Convert Uint8Array to base64 in chunks to avoid stack overflow
  const CHUNK = 8192;
  let binary = "";
  for (let i = 0; i < pdfBytes.length; i += CHUNK) {
    binary += String.fromCharCode(...pdfBytes.subarray(i, i + CHUNK));
  }
  const base64 = btoa(binary);

  const prompt = `Eres un experto en cotizaciones de seguros venezolanos.
Este PDF es una cotización de la categoría "${subcategoria}".

CATÁLOGO OFICIAL DE PLANES POR ASEGURADORA (úsalo como FUENTE DE VERDAD para el campo "aseguradora"):
${catalogoTexto}

Extrae TODOS los planes de la tabla de precios. Para cada plan devuelve:
- nombre_plan: nombre exacto del plan tal como aparece en el PDF
- aseguradora: empresa aseguradora del plan. DEBE coincidir con el catálogo de arriba — busca el plan por nombre en el catálogo y usa la aseguradora correspondiente. Si no encuentras coincidencia exacta, usa la coincidencia más cercana del catálogo. Solo puede ser una de: MERCANTIL SEGUROS, SEGUROS CARACAS, SEGUROS UNIVERSITAS, ESTAR SEGUROS, LA INTERNACIONAL DE SEGUROS, SEGUROS VENEZUELA
- suma_asegurada: monto de cobertura (solo el número, sin símbolo de moneda ni separadores de miles, usa punto para decimales)
- prima_anual: prima anual (solo el número)
- prima_mensual: prima mensual (solo el número)
- prima_semestral: prima semestral (solo el número)
- prima_trimestral: prima trimestral (solo el número)

Reglas:
- Si un plan indica "No asegurable", NO lo incluyas en el resultado
- Si una prima no aparece o es 0, usa 0
- Los números deben ser valores numéricos reales (ej: 1234.56, no "$1.234,56")
- La aseguradora se determina por el catálogo, NO por la posición visual en el PDF

Responde ÚNICAMENTE con JSON válido: {"planes": [...]}`;

  const aiResp = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${openaiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "file",
              file: {
                filename: "cotizacion.pdf",
                file_data: `data:application/pdf;base64,${base64}`,
              },
            },
            { type: "text", text: prompt },
          ],
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0,
      max_tokens: 2000,
    }),
  });

  if (!aiResp.ok) {
    const errText = await aiResp.text();
    throw new Error(`OpenAI error ${aiResp.status}: ${errText}`);
  }

  const aiJson = await aiResp.json();
  const content = aiJson.choices?.[0]?.message?.content ?? "{}";
  const parsed = JSON.parse(content);

  const planes = parsed.planes ?? [];
  return planes.map((p: any) => ({
    nombre_plan:      String(p.nombre_plan ?? "").trim(),
    aseguradora:      String(p.aseguradora ?? "").trim(),
    suma_asegurada:   Number(p.suma_asegurada) || 0,
    prima_anual:      Number(p.prima_anual)    || 0,
    prima_mensual:    Number(p.prima_mensual)  || 0,
    prima_semestral:  Number(p.prima_semestral)  || 0,
    prima_trimestral: Number(p.prima_trimestral) || 0,
  })).filter((r: PriceRow) => r.prima_anual > 0 || r.prima_mensual > 0);
}

// ── MAIN ──────────────────────────────────────────────────────────────────────

Deno.serve(async (_req) => {
  if (_req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
  const openaiKey = Deno.env.get("OPENAI_API_KEY") ?? "";

  const body = await _req.text().then(t => t ? JSON.parse(t) : {}).catch(() => ({}));
  const fechaTarget: string = body.fecha ?? new Date().toISOString().split("T")[0];
  const force: boolean = body.force === true;

  if (force) {
    await supabase.from("daily_prices").delete().eq("fecha", fechaTarget);
  }

  const { data: cotizaciones } = await supabase
    .from("cotizaciones_diarias")
    .select("categoria, rango_edad, pdf_url")
    .eq("fecha", fechaTarget)
    .eq("status", "success")
    .not("pdf_url", "is", null);

  const { data: yaExtraidos } = await supabase
    .from("daily_prices")
    .select("subcategoria, rango_edad")
    .eq("fecha", fechaTarget);

  const yaSet = new Set(
    (yaExtraidos ?? []).map((r: any) => `${r.subcategoria}__${r.rango_edad}`)
  );
  const pendientes = (cotizaciones ?? []).filter(
    (c: any) => !yaSet.has(`${c.categoria}__${c.rango_edad}`)
  );

  if (pendientes.length === 0) {
    return new Response(
      JSON.stringify({ message: "Precios ya extraídos", fecha: fechaTarget, total: yaSet.size }),
      { headers: { "Content-Type": "application/json", ...CORS } }
    );
  }

  // Load plan catalog for the date — used as ground truth for plan→aseguradora mapping
  const { data: catalogo } = await supabase
    .from("daily_plan_catalog")
    .select("nombre_aseguradora, nombre_plan, suma_asegurada")
    .eq("fecha", fechaTarget)
    .order("nombre_aseguradora")
    .order("nombre_plan");

  const porAseguradora: Record<string, string[]> = {};
  for (const p of (catalogo ?? []) as any[]) {
    const a = p.nombre_aseguradora;
    if (!porAseguradora[a]) porAseguradora[a] = [];
    const linea = `${p.nombre_plan} (SA: ${p.suma_asegurada})`;
    if (!porAseguradora[a].includes(linea)) porAseguradora[a].push(linea);
  }
  const catalogoTexto = Object.entries(porAseguradora)
    .map(([aseg, planes]) => `${aseg}:\n${planes.map(p => `  - ${p}`).join("\n")}`)
    .join("\n\n");

  const batch = pendientes.slice(0, BATCH_SIZE);
  const resultados: Record<string, any> = {};
  let extraidos = 0;

  await Promise.all((batch as any[]).map(async (cot) => {
    const key = `${cot.categoria}__${cot.rango_edad}`;
    try {
      const priceRows = await extractPricesFromPDF(cot.pdf_url, cot.categoria, catalogoTexto, openaiKey);

      if (priceRows.length > 0) {
        // Deduplicate by unique key to avoid ON CONFLICT duplicates within batch
        const seen = new Set<string>();
        const uniqueRows = priceRows.filter(r => {
          const k = `${r.nombre_plan}__${r.suma_asegurada}`;
          if (seen.has(k)) return false;
          seen.add(k);
          return true;
        });

        const { error: insErr } = await supabase.from("daily_prices").upsert(
          uniqueRows.map(r => ({
            fecha:            fechaTarget,
            subcategoria:     cot.categoria,
            rango_edad:       cot.rango_edad,
            nombre_plan:      r.nombre_plan,
            aseguradora:      r.aseguradora,
            suma_asegurada:   r.suma_asegurada,
            prima_anual:      r.prima_anual,
            prima_mensual:    r.prima_mensual,
            prima_semestral:  r.prima_semestral,
            prima_trimestral: r.prima_trimestral,
          })),
          { onConflict: "fecha,subcategoria,rango_edad,nombre_plan,suma_asegurada", ignoreDuplicates: false }
        );

        if (!insErr) extraidos++;
        else resultados[key + "_err"] = insErr.message;
      }

      const displayRows = priceRows.length > 0
        ? (() => { const s = new Set<string>(); return priceRows.filter(r => { const k = `${r.nombre_plan}__${r.suma_asegurada}`; if (s.has(k)) return false; s.add(k); return true; }); })()
        : priceRows;
      resultados[key] = {
        precios: displayRows.length,
        planes: displayRows.map(r => `${r.aseguradora} | ${r.nombre_plan} | $${r.suma_asegurada}`),
      };
    } catch (err) {
      resultados[key] = { error: err instanceof Error ? err.message : String(err) };
    }
  }));

  return new Response(
    JSON.stringify({
      success: true,
      fecha: fechaTarget,
      extraidos,
      pendientes: pendientes.length - batch.length,
      resultados,
    }),
    { headers: { "Content-Type": "application/json", ...CORS } }
  );
});
