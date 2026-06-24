import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { parseDocument, chunkText, detectTrueType, ACCEPTED_EXT } from "@/lib/kb-parsers";
import { embedTexts } from "@/lib/embed";
import { isValidCollection, isValidPolicyType } from "@/lib/collections";
import { ocrWithClaude } from "@/lib/ocr-claude";
import { configValues } from "@/lib/runtime-config";

export const maxDuration = 60;

const STALE_MS = 10 * 60 * 1000;

// Marca como 'error' los docs colgados en processing/pending por > 10 min.
async function markStaleProcessing(supabase: ReturnType<typeof createSupabaseServerClient>) {
  const cutoff = new Date(Date.now() - STALE_MS).toISOString();
  await supabase
    .from("kb_documents")
    .update({ status: "error", error_message: "Proceso interrumpido (timeout)" })
    .in("status", ["processing", "pending"])
    .lt("created_at", cutoff);
}

export async function POST(request: Request) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  // Limpieza best-effort de procesos colgados.
  try { await markStaleProcessing(supabase); } catch { /* columna ausente: ignorar */ }

  const form = await request.formData();
  const file = form.get("file") as File | null;
  const title = (form.get("title") as string | null)?.trim();
  const inlineContent = form.get("content") as string | null;
  if (!title) return NextResponse.json({ error: "title requerido" }, { status: 400 });

  // Taxonomía (opcional, validada contra collections.ts).
  const collection = (form.get("collection") as string | null)?.trim() || null;
  const policyType = (form.get("policy_type") as string | null)?.trim() || null;
  if (collection && !isValidCollection(collection))
    return NextResponse.json({ error: `collection inválida: ${collection}` }, { status: 400 });
  if (policyType && !isValidPolicyType(policyType))
    return NextResponse.json({ error: `policy_type inválido: ${policyType}` }, { status: 400 });
  const tax: Record<string, string> = {};
  if (collection) tax.collection = collection;
  if (policyType) tax.policy_type = policyType;

  // ── Extracción de texto ──────────────────────────────────────────────────
  let text: string;
  let format: string;
  let filename: string;
  let fileBuf: ArrayBuffer | null = null;
  let fileMime = "text/plain";

  if (file) {
    filename = file.name;
    fileBuf = await file.arrayBuffer();
    const { ext, mime, isImage, isPdf } = detectTrueType(fileBuf, filename);
    fileMime = mime;
    if (!ACCEPTED_EXT.has(ext)) {
      return NextResponse.json(
        { error: `formato no soportado: .${ext}. Acepta: ${Array.from(ACCEPTED_EXT).join(", ")}` },
        { status: 400 }
      );
    }
    const parsed = await parseDocument(fileBuf, filename);
    text = parsed.text;
    format = parsed.format;

    // OCR con Claude vision para imágenes y PDF escaneado (pdf-parse vacío).
    if (isImage || (isPdf && text.trim().length < 50)) {
      const cfg = await configValues(["ANTHROPIC_API_KEY", "OCR_MODEL"]);
      if (!cfg.ANTHROPIC_API_KEY) {
        return NextResponse.json(
          { error: "OCR requiere ANTHROPIC_API_KEY en runtime_config" },
          { status: 400 }
        );
      }
      try {
        text = await ocrWithClaude(fileBuf, mime, cfg.ANTHROPIC_API_KEY, cfg.OCR_MODEL || "claude-haiku-4-5");
        format = isImage ? "image" : "pdf";
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return NextResponse.json({ error: `OCR Claude: ${msg}` }, { status: 502 });
      }
    }
  } else if (inlineContent?.trim()) {
    filename = "inline.md";
    text = inlineContent;
    format = "md";
  } else {
    return NextResponse.json({ error: "sube un archivo o pega contenido" }, { status: 400 });
  }

  if (text.trim().length < 50)
    return NextResponse.json({ error: "contenido demasiado corto (<50 chars)" }, { status: 400 });

  const chunks = chunkText(text, { maxTokens: 450, overlapTokens: 60 });
  if (chunks.length === 0)
    return NextResponse.json({ error: "chunking produjo 0 chunks" }, { status: 400 });

  // ── Documento maestro (status: processing) ───────────────────────────────
  const { data: doc, error: docErr } = await supabase
    .from("kb_documents")
    .insert({
      title,
      source_type: format,
      source_filename: filename,
      raw_text: text,
      embeddings_provider: "supabase_ai_gte_small",
      embeddings_dim: 384,
      total_chunks: chunks.length,
      metadata: { format, ...tax },
      collection,
      policy_type: policyType,
      status: "processing",
    })
    .select("id")
    .single();
  if (docErr || !doc)
    return NextResponse.json({ error: docErr?.message ?? "no se pudo crear documento" }, { status: 500 });

  const fail = async (status: number, message: string) => {
    await supabase.from("kb_documents").update({ status: "error", error_message: message }).eq("id", doc.id);
    return NextResponse.json({ error: message }, { status });
  };

  // ── Binario original → Storage privado (best-effort: no bloquea el RAG) ───
  let storagePath: string | null = null;
  if (file && fileBuf) {
    const path = `${collection ?? "general"}/${doc.id}/${filename}`;
    const { error: upErr } = await supabase.storage
      .from("knowledge-files")
      .upload(path, fileBuf, { contentType: fileMime, upsert: true });
    if (!upErr) {
      storagePath = path;
      await supabase.from("kb_documents").update({ storage_path: path }).eq("id", doc.id);
    }
  }

  // ── Embeddings (gte-small 384) ───────────────────────────────────────────
  let embeddings: number[][];
  try {
    embeddings = await embedTexts(chunks);
  } catch (err) {
    return fail(502, `embed: ${err instanceof Error ? err.message : String(err)}`);
  }

  // ── Chunks ────────────────────────────────────────────────────────────────
  const { error: chunksErr } = await supabase.from("kb_chunks").insert(
    chunks.map((content, i) => ({
      document_id: doc.id,
      chunk_index: i,
      content,
      embedding: embeddings[i],
      token_count: Math.ceil(content.split(/\s+/).length * 1.3),
      metadata: { ...tax, file_id: doc.id, source: filename, file_type: format },
    }))
  );
  if (chunksErr) return fail(500, chunksErr.message);

  await supabase.from("kb_documents").update({ status: "completed" }).eq("id", doc.id);

  return NextResponse.json({
    ok: true,
    document_id: doc.id,
    chunks: chunks.length,
    chars: text.length,
    storage_path: storagePath,
  });
}
