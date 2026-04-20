import { supabase } from "@/integrations/supabase/client";

export interface KnowledgeFile {
  id: string;
  name: string;
  type: string;
  collection: string;
  policy_type: string;
  size: number;
  chunks_count: number;
  status: "pending" | "processing" | "completed" | "error";
  error_message?: string;
  created_at: string;
}

// In dev, use Vite proxy to avoid CORS. In production (Lovable), call Supabase directly.
const EDGE_FUNCTION_URL = import.meta.env.DEV
  ? "/functions/v1/process-document"
  : `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/process-document`;

// ── Magic byte detection ──────────────────────────────────────────────────────

async function detectTrueType(file: File): Promise<"zip" | "pdf" | "image" | "text"> {
  const slice = await file.slice(0, 4).arrayBuffer();
  const b = new Uint8Array(slice);
  if (b[0] === 0x50 && b[1] === 0x4B) return "zip";   // PK → DOCX/XLSX
  if (b[0] === 0x25 && b[1] === 0x50) return "pdf";    // %PDF
  if (b[0] === 0xFF && b[1] === 0xD8) return "image";  // JPEG
  if (b[0] === 0x89 && b[1] === 0x50) return "image";  // PNG
  if (b[0] === 0x52 && b[1] === 0x49) return "image";  // WEBP (RIFF)
  return "text";
}

// ── Browser-side text extraction ─────────────────────────────────────────────

async function extractPdfInBrowser(file: File): Promise<string> {
  console.log(`[extractPdfInBrowser] Loading pdfjs-dist for "${file.name}"...`);
  const pdfjsLib = await import("pdfjs-dist");

  const workerUrl = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url,
  ).href;
  pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

  const buffer = await file.arrayBuffer();
  console.log(`[extractPdfInBrowser] Loaded ${buffer.byteLength} bytes — loading PDF document...`);
  const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(buffer) }).promise;
  console.log(`[extractPdfInBrowser] PDF has ${pdf.numPages} pages`);

  const pageTexts: string[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((item) => ("str" in item ? item.str : ""))
      .join(" ");
    pageTexts.push(pageText);
    console.log(`[extractPdfInBrowser] Page ${i}/${pdf.numPages}: ${pageText.length} chars`);
  }

  const fullText = pageTexts.join("\n\n").replace(/\s+/g, " ").trim();
  console.log(`[extractPdfInBrowser] Total extracted: ${fullText.length} chars`);

  // Scanned PDF — render pages to canvas and return as image Files for OCR
  if (!fullText) {
    console.log(`[extractPdfInBrowser] Scanned PDF detected — rendering pages to images for OCR...`);
    const images: File[] = [];
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale: 2 });
      const canvas = document.createElement("canvas");
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      await page.render({ canvasContext: canvas.getContext("2d")!, viewport }).promise;
      const blob = await new Promise<Blob>((res) => canvas.toBlob((b) => res(b!), "image/jpeg", 0.92));
      images.push(new File([blob], `${file.name}_page${i}.jpg`, { type: "image/jpeg" }));
      console.log(`[extractPdfInBrowser] Rendered page ${i}/${pdf.numPages} as image (${blob.size} bytes)`);
    }
    // Return marker so caller knows to use OCR path
    (extractPdfInBrowser as any)._scannedImages = images;
    return "";
  }

  return fullText;
}

async function extractZipInBrowser(file: File): Promise<string> {
  const mammoth = await import("mammoth");
  const buffer = await file.arrayBuffer();
  try {
    const result = await mammoth.extractRawText({ arrayBuffer: buffer });
    if (result.value.trim().length > 0) return result.value;
  } catch {
    // Not a valid DOCX — try as XLSX
  }
  const XLSX = await import("xlsx");
  const buffer2 = await file.arrayBuffer();
  const workbook = XLSX.read(buffer2, { type: "array" });
  return workbook.SheetNames.map((name: string) => {
    const csv = XLSX.utils.sheet_to_csv(workbook.Sheets[name]);
    return `=== Hoja: ${name} ===\n${csv}`;
  }).join("\n\n");
}

async function extractTextFileInBrowser(file: File): Promise<string> {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (["xlsx", "xls"].includes(ext)) {
    const XLSX = await import("xlsx");
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "array" });
    return workbook.SheetNames.map((name: string) => {
      const csv = XLSX.utils.sheet_to_csv(workbook.Sheets[name]);
      return `=== Hoja: ${name} ===\n${csv}`;
    }).join("\n\n");
  }
  return file.text();
}

// ── Main entry point ─────────────────────────────────────────────────────────

export async function processDocument(
  file: File,
  collection: string,
  policyType: string,
): Promise<{ chunks: number }> {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";

  // Detect true file type via magic bytes (extension can lie, e.g. .docx.pdf)
  const trueType = await detectTrueType(file);
  console.log(`[processDocument] ext=.${ext} trueType=${trueType} file=${file.name} size=${file.size}`);

  // Create file record
  const { data: row, error: insertError } = await supabase
    .from("knowledge_files")
    .insert({
      name: file.name,
      type: ext,
      collection,
      policy_type: policyType,
      size: file.size,
      chunks_count: 0,
      status: "pending",
    })
    .select("id")
    .single();

  if (insertError) throw new Error(insertError.message);
  const fileId = row.id;

  const formData = new FormData();
  formData.append("collection", collection);
  formData.append("policy_type", policyType);
  formData.append("file_id", fileId);
  formData.append("file_name", file.name);

  if (trueType === "image") {
    // Only images go to server (need vision OCR)
    console.log(`[processDocument] Image → sending binary to server for OCR`);
    formData.append("file", file);
  } else {
    // PDF, DOCX, XLSX, TXT — extract text in browser
    console.log(`[processDocument] trueType=${trueType} → extracting text in browser...`);
    let text = "";
    if (trueType === "pdf") {
      text = await extractPdfInBrowser(file);
      // Scanned PDF — send each rendered page as image for OCR
      if (!text.trim()) {
        const images: File[] = (extractPdfInBrowser as any)._scannedImages ?? [];
        if (!images.length) throw new Error("No se pudo extraer texto del archivo. El documento puede estar vacío.");
        console.log(`[processDocument] Scanned PDF — sending ${images.length} page(s) as images for OCR`);
        let totalChunks = 0;
        for (let i = 0; i < images.length; i++) {
          const pageForm = new FormData();
          pageForm.append("collection", collection);
          pageForm.append("policy_type", policyType);
          pageForm.append("file_id", fileId);
          pageForm.append("file_name", file.name);
          pageForm.append("file", images[i]);
          const r = await fetch(EDGE_FUNCTION_URL, {
            method: "POST",
            headers: {
              apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
              Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
            },
            body: pageForm,
          });
          const json = await r.json();
          if (!r.ok) throw new Error(json.error || `Error ${r.status}`);
          totalChunks += json.chunks as number;
          console.log(`[processDocument] Page ${i + 1}/${images.length} OCR done — ${json.chunks} chunks`);
        }
        return { chunks: totalChunks };
      }
    } else if (trueType === "zip") {
      text = await extractZipInBrowser(file);
    } else {
      text = await extractTextFileInBrowser(file);
    }
    console.log(`[processDocument] Browser extracted ${text.length} chars from "${file.name}"`);
    if (!text.trim()) throw new Error("No se pudo extraer texto del archivo. El documento puede estar vacío o ser un PDF escaneado (imagen). Intente convertirlo a DOCX o subir las páginas como imagen PNG/JPG.");
    formData.append("text", text);
  }

  console.log(`[processDocument] → ${EDGE_FUNCTION_URL} | file_id=${fileId}`);

  const resp = await fetch(EDGE_FUNCTION_URL, {
    method: "POST",
    headers: {
      apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
    },
    body: formData,
  });

  console.log(`[processDocument] Response: ${resp.status} ${resp.statusText}`);
  const rawText = await resp.text();
  console.log(`[processDocument] Body: ${rawText.slice(0, 300)}`);

  let result: Record<string, unknown>;
  try {
    result = JSON.parse(rawText);
  } catch {
    throw new Error(`Respuesta inesperada del servidor (${resp.status}): ${rawText.slice(0, 150)}`);
  }

  if (!resp.ok) throw new Error((result.error as string) || `Error ${resp.status}`);
  return { chunks: result.chunks as number };
}

// ── Read / delete helpers ─────────────────────────────────────────────────────

export async function getKnowledgeFiles(): Promise<KnowledgeFile[]> {
  // Mark stale "processing" records (>10 min) as error before fetching
  const staleThreshold = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  await supabase
    .from("knowledge_files")
    .update({ status: "error", error_message: "Proceso interrumpido (timeout)" })
    .in("status", ["processing", "pending"])
    .lt("created_at", staleThreshold);

  const { data, error } = await supabase
    .from("knowledge_files")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data as KnowledgeFile[];
}

export async function updateKnowledgeFile(
  id: string,
  oldCollection: string,
  patch: { collection?: string; policy_type?: string },
): Promise<void> {
  // 1. Update knowledge_files row
  const { error: kfError } = await supabase
    .from("knowledge_files")
    .update(patch)
    .eq("id", id);
  if (kfError) throw new Error(kfError.message);

  // 2. Update every chunk's JSONB metadata in documents
  // We can't do a single UPDATE … SET metadata = metadata || $patch WHERE metadata->>'file_id' = id
  // via the JS client directly, so we use a raw RPC if available, or update row-by-row.
  // Easiest: fetch affected doc ids then patch each one.
  const { data: docs, error: fetchError } = await supabase
    .from("documents")
    .select("id, metadata")
    .contains("metadata", { file_id: id, collection: oldCollection });
  if (fetchError) throw new Error(fetchError.message);

  for (const doc of docs ?? []) {
    const newMeta = { ...doc.metadata, ...patch };
    const { error } = await supabase
      .from("documents")
      .update({ metadata: newMeta })
      .eq("id", doc.id);
    if (error) throw new Error(error.message);
  }
}

export async function deleteKnowledgeFile(id: string, collection: string): Promise<void> {
  const { error: docError } = await supabase
    .from("documents")
    .delete()
    .contains("metadata", { file_id: id, collection });

  if (docError) throw new Error(docError.message);

  const { error } = await supabase.from("knowledge_files").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
