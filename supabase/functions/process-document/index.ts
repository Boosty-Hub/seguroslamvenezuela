import { createClient } from "npm:@supabase/supabase-js@2";
import OpenAI from "npm:openai";

// Browser handles ALL text extraction (PDF via pdfjs-dist, DOCX via mammoth, XLSX via xlsx).
// This Edge Function only receives:
//   - "text": pre-extracted text string (PDF/DOCX/XLSX/TXT)
//   - "file": binary image (JPEG/PNG/WebP) for OCR via OpenAI vision

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
  const openai = new OpenAI({ apiKey: Deno.env.get("OPENAI_API_KEY")! });
  let fileId: string | null = null;

  try {
    // ── Phase 1: parse form ────────────────────────────────────────────────────
    console.log("[phase1] Parsing form data...");
    const form = await req.formData();
    const collection = form.get("collection") as string;
    const policyType = (form.get("policy_type") as string) || "general";
    fileId = form.get("file_id") as string;
    const fileName = form.get("file_name") as string;
    const preExtractedText = form.get("text") as string | null;
    const imageFile = form.get("file") as File | null;

    console.log(`[phase1] collection=${collection} policyType=${policyType} fileId=${fileId} fileName=${fileName}`);
    console.log(`[phase1] mode=${preExtractedText ? "pre-extracted-text" : "image-ocr"} imageSize=${imageFile?.size ?? "n/a"}`);

    if ((!preExtractedText && !imageFile) || !collection || !fileId) {
      console.error("[phase1] Missing required fields");
      return new Response(JSON.stringify({ error: "Faltan campos requeridos" }), {
        status: 400, headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    // ── Phase 2: mark as processing ───────────────────────────────────────────
    console.log("[phase2] Marking file as processing...");
    await supabase.from("knowledge_files").update({ status: "processing" }).eq("id", fileId);

    // ── Phase 3: get text ─────────────────────────────────────────────────────
    let text: string;
    if (preExtractedText) {
      text = preExtractedText;
      console.log(`[phase3] Using pre-extracted text: ${text.length} chars`);
    } else {
      // Image OCR via OpenAI vision
      console.log(`[phase3] Image OCR for "${imageFile!.name}" (${imageFile!.size} bytes)...`);
      text = await extractImageViaVision(imageFile!, openai);
      console.log(`[phase3] OCR extracted: ${text.length} chars`);
    }

    if (!text.trim()) throw new Error("No se pudo extraer texto del archivo");

    // Strip markdown code fences and conversational prefixes OpenAI vision adds
    text = text.replace(/^```[\w]*\n?/gm, "").replace(/^```$/gm, "").trim();
    text = text.replace(/^[^\n]{0,120}(transcri|texto visible|siguiente texto|aquí (te |está|tienes))[^\n]*\n[-—\s]*/i, "").trim();
    text = text.replace(/^---\n?/, "").trim();

    // ── Phase 4: chunk ────────────────────────────────────────────────────────
    console.log(`[phase4] Chunking text (${text.length} chars)...`);
    const chunks = chunkText(text);
    console.log(`[phase4] ${chunks.length} chunks created`);
    if (!chunks.length) throw new Error("El archivo no contiene contenido útil");

    // ── Phase 5: embeddings ───────────────────────────────────────────────────
    console.log(`[phase5] Generating embeddings for ${chunks.length} chunks...`);
    const allEmbeddings: number[][] = [];
    for (let i = 0; i < chunks.length; i += 20) {
      const batch = chunks.slice(i, i + 20);
      console.log(`[phase5] Batch ${Math.floor(i / 20) + 1}/${Math.ceil(chunks.length / 20)} (${batch.length} chunks)...`);
      const resp = await openai.embeddings.create({
        model: "text-embedding-3-small",
        input: batch.map((t) => t.slice(0, 8000)),
      });
      allEmbeddings.push(...resp.data.map((d) => d.embedding));
    }
    console.log(`[phase5] Embeddings done: ${allEmbeddings.length} total`);

    // ── Phase 6: insert into Supabase ─────────────────────────────────────────
    const metadata = {
      collection, policy_type: policyType, file_id: fileId,
      source: fileName, file_type: fileName?.split(".").pop()?.toLowerCase(),
    };
    const rows = chunks.map((content, i) => ({
      content, metadata, embedding: JSON.stringify(allEmbeddings[i]),
    }));

    console.log(`[phase6] Inserting ${rows.length} rows into Supabase...`);
    for (let i = 0; i < rows.length; i += 50) {
      console.log(`[phase6] Batch ${Math.floor(i / 50) + 1}/${Math.ceil(rows.length / 50)}...`);
      const { error } = await supabase.from("documents").insert(rows.slice(i, i + 50));
      if (error) throw new Error(`Supabase insert: ${error.message}`);
    }

    // ── Phase 7: finalize ─────────────────────────────────────────────────────
    console.log("[phase7] Updating status to completed...");
    await supabase.from("knowledge_files")
      .update({ status: "completed", chunks_count: chunks.length }).eq("id", fileId);

    console.log(`[phase7] SUCCESS — ${chunks.length} chunks stored for "${fileName}"`);
    return new Response(JSON.stringify({ success: true, chunks: chunks.length }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack : "";
    console.error("[ERROR] Message:", msg);
    console.error("[ERROR] Stack:", stack);
    if (fileId) {
      await supabase.from("knowledge_files")
        .update({ status: "error", error_message: msg }).eq("id", fileId).catch(() => {});
    }
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});

// ── Image OCR via OpenAI vision (JPEG / PNG / WebP only) ─────────────────────

async function extractImageViaVision(file: File, openai: OpenAI): Promise<string> {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  const CHUNK = 8192;
  let binary = "";
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  const base64 = btoa(binary);
  const mime = file.type || "image/jpeg";

  console.log(`[extractImageViaVision] base64 length=${base64.length} mime=${mime}`);
  const resp = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{
      role: "user",
      content: [
        { type: "image_url", image_url: { url: `data:${mime};base64,${base64}` } },
        { type: "text", text: "Extrae y transcribe todo el texto visible. Mantén la estructura si es tabla o documento." },
      ],
    }],
    max_tokens: 4096,
  });
  return resp.choices[0].message.content ?? "";
}

// ── Chunking ──────────────────────────────────────────────────────────────────

function chunkText(text: string): string[] {
  const CHUNK = 1000, OVERLAP = 200;
  const norm = text.replace(/\s+/g, " ").trim();
  if (!norm) return [];
  const chunks: string[] = [];
  let start = 0;
  while (start < norm.length) {
    const end = Math.min(start + CHUNK, norm.length);
    let cut = end;
    if (end < norm.length) {
      const b = Math.max(norm.lastIndexOf(".", end), norm.lastIndexOf("\n", end));
      if (b > start + CHUNK / 2) cut = b + 1;
    }
    const chunk = norm.slice(start, cut).trim();
    if (chunk.length > 50) chunks.push(chunk);
    if (end >= norm.length) break;
    start = cut - OVERLAP;
    if (start >= norm.length) break;
  }
  return chunks;
}
