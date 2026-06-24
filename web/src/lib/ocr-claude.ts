// OCR con Claude vision (Anthropic SDK) para extraer texto de imágenes y PDFs
// escaneados — sin proveedores externos de visión. Reusa el patrón de
// supabase/functions/process-inbound (bloques {type:"image"|"document"} con source
// base64). El modelo y la API key se resuelven server-side desde runtime_config
// (OCR_MODEL default claude-haiku-4-5).

import Anthropic from "@anthropic-ai/sdk";

const PROMPT =
  "Extrae y transcribe TODO el texto visible del documento. Mantén la estructura " +
  "(tablas, listas, encabezados, números). NO agregues comentarios, explicaciones ni " +
  "marcadores de código: devuelve únicamente el texto extraído.";

const IMAGE_MIME = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);

// base64 vía Buffer (el route handler corre en runtime Node).
function toBase64(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString("base64");
}

// Limpieza post-OCR: quita fences ```...```, prefijos conversacionales y --- inicial.
export function cleanPostOcr(text: string): string {
  let t = text.trim();
  t = t.replace(/^```[a-zA-Z]*\s*\n?/, "").replace(/\n?```\s*$/, "");
  t = t.replace(/^(aquí (está|tienes)[^\n:]*:|el texto( extraído)?( es)?:|texto extraído:|transcripción:)\s*/i, "");
  t = t.replace(/^---+\s*\n/, "");
  return t.trim();
}

export async function ocrWithClaude(
  buf: ArrayBuffer,
  mime: string,
  apiKey: string,
  model: string
): Promise<string> {
  const isPdf = mime === "application/pdf";
  if (!isPdf && !IMAGE_MIME.has(mime)) {
    throw new Error(`OCR no soportado para mime: ${mime}`);
  }
  const data = toBase64(new Uint8Array(buf));
  const block = isPdf
    ? { type: "document" as const, source: { type: "base64" as const, media_type: "application/pdf" as const, data } }
    : { type: "image" as const, source: { type: "base64" as const, media_type: mime as "image/png" | "image/jpeg" | "image/webp" | "image/gif", data } };

  const anthropic = new Anthropic({ apiKey });
  const res = await anthropic.messages.create({
    model,
    max_tokens: 4096,
    messages: [{ role: "user", content: [block, { type: "text", text: PROMPT }] }],
  });

  const out = res.content.map((b) => (b.type === "text" ? b.text : "")).join("");
  return cleanPostOcr(out);
}
