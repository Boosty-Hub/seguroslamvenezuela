// Parsers para documentos de KB. Unión template + Seguros LAM:
//   PDF, DOCX, TXT, MD, SRT, VTT (template) + XLSX/XLS/CSV + imágenes (LAM).
// Las imágenes y los PDF escaneados NO se parsean aquí: parseDocument devuelve
// texto vacío y el route handler hace el OCR con Claude (lib/ocr-claude.ts).

import mammoth from "mammoth";
import * as XLSX from "xlsx";

export type KbFormat =
  | "pdf" | "docx" | "txt" | "md" | "srt" | "vtt" | "xlsx" | "csv" | "image";

export type ParsedDocument = { text: string; format: KbFormat };

// Extensiones aceptadas (unión template + LAM).
export const ACCEPTED_EXT = new Set([
  "pdf", "docx", "txt", "md", "srt", "vtt",      // template
  "xlsx", "xls", "csv",                            // hojas de cálculo (LAM)
  "png", "jpg", "jpeg", "webp", "gif",             // imágenes (OCR Claude)
]);

const EXT_IMAGE_MIME: Record<string, string> = {
  png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", webp: "image/webp", gif: "image/gif",
};

// Detección por magic-bytes (no confiar solo en la extensión). Devuelve el mime
// canónico y banderas isImage / isPdf que el route usa para decidir OCR.
export function detectTrueType(
  buffer: ArrayBuffer,
  filename: string
): { ext: string; mime: string; isImage: boolean; isPdf: boolean } {
  const b = new Uint8Array(buffer);
  const ext = filename.toLowerCase().split(".").pop() ?? "";
  const sig = (n: number[]) => n.every((v, i) => b[i] === v);

  let mime = "";
  if (sig([0x25, 0x50, 0x44, 0x46])) mime = "application/pdf";                 // %PDF
  else if (sig([0x89, 0x50, 0x4e, 0x47])) mime = "image/png";                 // PNG
  else if (sig([0xff, 0xd8, 0xff])) mime = "image/jpeg";                       // JPEG
  else if (sig([0x47, 0x49, 0x46, 0x38])) mime = "image/gif";                 // GIF8
  else if (
    b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 &&        // RIFF
    b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50         // WEBP
  ) mime = "image/webp";

  // ZIP (50 4B) cubre docx y xlsx — no se pueden distinguir por bytes: se usa ext.
  if (!mime) {
    if (ext === "pdf") mime = "application/pdf";
    else if (EXT_IMAGE_MIME[ext]) mime = EXT_IMAGE_MIME[ext];
    else if (ext === "docx") mime = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    else if (ext === "xlsx" || ext === "xls") mime = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    else if (ext === "csv") mime = "text/csv";
    else mime = "text/plain";
  }

  const isImage = mime.startsWith("image/");
  const isPdf = mime === "application/pdf";
  return { ext, mime, isImage, isPdf };
}

export async function parseDocument(
  buffer: ArrayBuffer,
  filename: string
): Promise<ParsedDocument> {
  const lower = filename.toLowerCase();
  const { isImage } = detectTrueType(buffer, filename);

  // Imágenes → sin texto aquí; el route hace OCR con Claude.
  if (isImage) {
    return { text: "", format: "image" };
  }

  if (lower.endsWith(".pdf")) {
    const { PDFParse } = await import("pdf-parse");
    const parser = new PDFParse({ data: Buffer.from(buffer) });
    const result = await parser.getText();
    return { text: result.text, format: "pdf" };
  }

  if (lower.endsWith(".docx")) {
    const result = await mammoth.extractRawText({ buffer: Buffer.from(buffer) });
    return { text: result.value, format: "docx" };
  }

  if (lower.endsWith(".xlsx") || lower.endsWith(".xls")) {
    const wb = XLSX.read(new Uint8Array(buffer), { type: "array" });
    const parts: string[] = [];
    for (const name of wb.SheetNames) {
      const csv = XLSX.utils.sheet_to_csv(wb.Sheets[name]);
      if (csv.trim()) parts.push(`=== Hoja: ${name} ===\n${csv}`);
    }
    return { text: parts.join("\n\n"), format: "xlsx" };
  }

  // Texto plano (incluye csv): utf-8
  const raw = new TextDecoder("utf-8").decode(buffer);

  if (lower.endsWith(".csv")) return { text: raw, format: "csv" };
  if (lower.endsWith(".srt")) return { text: stripSrt(raw), format: "srt" };
  if (lower.endsWith(".vtt")) return { text: stripVtt(raw), format: "vtt" };
  if (lower.endsWith(".md")) return { text: raw, format: "md" };
  return { text: raw, format: "txt" };
}

function stripSrt(raw: string): string {
  return raw
    .replace(/^\d+\s*$/gm, "")
    .replace(/^\d{2}:\d{2}:\d{2},\d{3}\s+-->\s+\d{2}:\d{2}:\d{2},\d{3}.*$/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function stripVtt(raw: string): string {
  return raw
    .replace(/^WEBVTT.*$/m, "")
    .replace(/^\d{2}:\d{2}:\d{2}\.\d{3}\s+-->\s+\d{2}:\d{2}:\d{2}\.\d{3}.*$/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// Chunker simple para KB: por palabras, con overlap, respetando párrafos/oraciones.
export function chunkText(
  text: string,
  opts: { maxTokens?: number; overlapTokens?: number } = {}
): string[] {
  const maxTokens = opts.maxTokens ?? 400;
  const overlapTokens = opts.overlapTokens ?? 60;
  const wordsPerChunk = Math.floor(maxTokens / 1.3);
  const overlapWords = Math.floor(overlapTokens / 1.3);

  const paragraphs = text.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  const sentences: string[] = [];
  for (const p of paragraphs) {
    if (countWords(p) <= wordsPerChunk) {
      sentences.push(p);
    } else {
      const parts = p.split(/(?<=[.!?])\s+/);
      sentences.push(...parts);
    }
  }

  const chunks: string[] = [];
  let buffer: string[] = [];
  let bufferWords = 0;

  for (const s of sentences) {
    const w = countWords(s);
    if (bufferWords + w > wordsPerChunk && buffer.length > 0) {
      chunks.push(buffer.join(" "));
      const overlap: string[] = [];
      let used = 0;
      for (let i = buffer.length - 1; i >= 0 && used < overlapWords; i--) {
        overlap.unshift(buffer[i]);
        used += countWords(buffer[i]);
      }
      buffer = overlap;
      bufferWords = used;
    }
    buffer.push(s);
    bufferWords += w;
  }
  if (buffer.length > 0) chunks.push(buffer.join(" "));
  return chunks.filter((c) => c.trim().length > 20);
}

function countWords(s: string): number {
  return s.split(/\s+/).filter(Boolean).length;
}
