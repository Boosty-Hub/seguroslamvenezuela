import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Anthropic from "npm:@anthropic-ai/sdk@0.95.1";
import { loadConfig } from "../_shared/config.ts";
import { recordUsage } from "../_shared/usage.ts";

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

const ASEGURADORAS = [
  "MERCANTIL SEGUROS", "SEGUROS CARACAS", "SEGUROS UNIVERSITAS",
  "ESTAR SEGUROS", "LA INTERNACIONAL DE SEGUROS", "SEGUROS VENEZUELA",
];

// ── EXTRACTOR PDF con Claude vision ───────────────────────────────────────────

// deno-lint-ignore no-explicit-any
async function extractPricesFromPDF(
  pdfUrl: string,
  subcategoria: string,
  catalogoTexto: string,
  anthropic: Anthropic,
  model: string,
  // deno-lint-ignore no-explicit-any
  supabase: any,
): Promise<PriceRow[]> {
  const resp = await fetch(pdfUrl);
  if (!resp.ok) throw new Error(`PDF download failed: ${resp.status}`);

  const pdfBytes = new Uint8Array(await resp.arrayBuffer());
  // base64 en trozos de 8192 (evita stack overflow)
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

  const res = await anthropic.messages.create({
    model,
    max_tokens: 2000,
    messages: [{
      role: "user",
      content: [
        { type: "document", source: { type: "base64", media_type: "application/pdf", data: base64 } },
        { type: "text", text: prompt },
      ],
    }],
    // deno-lint-ignore no-explicit-any
    output_config: {
      format: {
        type: "json_schema",
        schema: {
          type: "object",
          additionalProperties: false,
          properties: {
            planes: {
              type: "array",
              items: {
                type: "object",
                additionalProperties: false,
                properties: {
                  nombre_plan:      { type: "string" },
                  aseguradora:      { type: "string", enum: ASEGURADORAS },
                  suma_asegurada:   { type: "number" },
                  prima_anual:      { type: "number" },
                  prima_mensual:    { type: "number" },
                  prima_semestral:  { type: "number" },
                  prima_trimestral: { type: "number" },
                },
                required: ["nombre_plan", "aseguradora", "suma_asegurada", "prima_anual", "prima_mensual", "prima_semestral", "prima_trimestral"],
              },
            },
          },
          required: ["planes"],
        },
      },
    },
    // deno-lint-ignore no-explicit-any
  } as any);

  // Registro de consumo (no bloquea la extracción si falla)
  try {
    await recordUsage(supabase, {
      component: "extract-prices",
      model,
      inputTokens: res.usage?.input_tokens,
      outputTokens: res.usage?.output_tokens,
    });
  } catch (_) { /* ignore */ }

  const block = res.content.find((b) => b.type === "text");
  if (!block || block.type !== "text") throw new Error("extract-prices: sin bloque de texto en la respuesta");
  const parsed = JSON.parse(block.text);

  const planes = parsed.planes ?? [];
  // deno-lint-ignore no-explicit-any
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
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const cfg = await loadConfig(supabase);
  const apiKey = cfg.require("ANTHROPIC_API_KEY");
  const model = cfg.getOr("EXTRACT_PRICES_MODEL", "claude-haiku-4-5");
  const anthropic = new Anthropic({ apiKey });

  const body = await _req.text().then((t) => (t ? JSON.parse(t) : {})).catch(() => ({}));
  const fechaTarget: string = body.fecha ?? new Date().toISOString().split("T")[0];
  const force: boolean = body.force === true;

  if (force) {
    // Re-extracción manual: borrar precios del día y resetear la marca de leído.
    await supabase.from("daily_prices").delete().eq("fecha", fechaTarget);
    await supabase.from("cotizaciones_diarias").update({ prices_extracted_at: null }).eq("fecha", fechaTarget);
  }

  // Pendientes = PDFs aún NO leídos (prices_extracted_at IS NULL). Cada PDF se
  // lee EXACTAMENTE una vez: tras procesarlo se marca, aunque dé 0 filas, para
  // que NUNCA se re-extraiga (antes ese caso se re-leía cada corrida = costo IA).
  const { data: pendientes } = await supabase
    .from("cotizaciones_diarias")
    .select("categoria, rango_edad, pdf_url")
    .eq("fecha", fechaTarget)
    .eq("status", "success")
    .not("pdf_url", "is", null)
    .is("prices_extracted_at", null);

  if (!pendientes || pendientes.length === 0) {
    return new Response(
      JSON.stringify({ message: "Precios ya extraídos hoy — nada que leer", fecha: fechaTarget }),
      { headers: { "Content-Type": "application/json", ...CORS } },
    );
  }

  // Catálogo del día → fuente de verdad para plan→aseguradora
  const { data: catalogo } = await supabase
    .from("daily_plan_catalog")
    .select("nombre_aseguradora, nombre_plan, suma_asegurada")
    .eq("fecha", fechaTarget)
    .order("nombre_aseguradora")
    .order("nombre_plan");

  const porAseguradora: Record<string, string[]> = {};
  // deno-lint-ignore no-explicit-any
  for (const p of (catalogo ?? []) as any[]) {
    const a = p.nombre_aseguradora;
    if (!porAseguradora[a]) porAseguradora[a] = [];
    const linea = `${p.nombre_plan} (SA: ${p.suma_asegurada})`;
    if (!porAseguradora[a].includes(linea)) porAseguradora[a].push(linea);
  }
  const catalogoTexto = Object.entries(porAseguradora)
    .map(([aseg, planes]) => `${aseg}:\n${planes.map((p) => `  - ${p}`).join("\n")}`)
    .join("\n\n");

  // deno-lint-ignore no-explicit-any
  const resultados: Record<string, any> = {};
  let extraidos = 0;
  let leidos = 0;
  const start = Date.now();
  const TIME_BUDGET_MS = 110_000; // si no alcanza, lo no-leído se reanuda (la marca evita re-cobro)

  // Marca el PDF como LEÍDO para que no se vuelva a extraer (aunque dé 0 filas).
  // deno-lint-ignore no-explicit-any
  const marcarLeido = (cot: any) =>
    supabase.from("cotizaciones_diarias")
      .update({ prices_extracted_at: new Date().toISOString() })
      .eq("fecha", fechaTarget).eq("categoria", cot.categoria).eq("rango_edad", cot.rango_edad);

  // Procesa TODOS los pendientes del día en lotes (concurrencia = BATCH_SIZE).
  for (let i = 0; i < pendientes.length; i += BATCH_SIZE) {
    if (Date.now() - start > TIME_BUDGET_MS) break;
    // deno-lint-ignore no-explicit-any
    const chunk = (pendientes as any[]).slice(i, i + BATCH_SIZE);
    await Promise.all(chunk.map(async (cot) => {
      const key = `${cot.categoria}__${cot.rango_edad}`;
      try {
        const priceRows = await extractPricesFromPDF(cot.pdf_url, cot.categoria, catalogoTexto, anthropic, model, supabase);

        if (priceRows.length > 0) {
          const seen = new Set<string>();
          const uniqueRows = priceRows.filter((r) => {
            const k = `${r.nombre_plan}__${r.suma_asegurada}`;
            if (seen.has(k)) return false;
            seen.add(k);
            return true;
          });

          const { error: insErr } = await supabase.from("daily_prices").upsert(
            uniqueRows.map((r) => ({
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
            { onConflict: "fecha,subcategoria,rango_edad,nombre_plan,suma_asegurada", ignoreDuplicates: false },
          );

          if (!insErr) extraidos++;
          else resultados[key + "_err"] = insErr.message;
        }

        // La vision call se completó → marcar leído SIEMPRE (aunque 0 filas), así
        // este PDF NUNCA se vuelve a leer (era el origen del costo descontrolado).
        await marcarLeido(cot);
        leidos++;
        resultados[key] = { precios: priceRows.length };
      } catch (err) {
        // Error transitorio (descarga/API): NO marcar → se reintenta la próxima
        // corrida diaria (no se pierde, no se re-cobra en bucle).
        resultados[key] = { error: err instanceof Error ? err.message : String(err) };
      }
    }));
  }

  return new Response(
    JSON.stringify({ success: true, fecha: fechaTarget, leidos, extraidos, restantes: pendientes.length - leidos, resultados }),
    { headers: { "Content-Type": "application/json", ...CORS } },
  );
});
