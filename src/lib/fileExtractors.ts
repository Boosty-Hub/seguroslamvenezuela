import * as pdfjsLib from "pdfjs-dist";
import PdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import * as XLSX from "xlsx";
import { extractTextFromImage } from "./embeddings";

pdfjsLib.GlobalWorkerOptions.workerSrc = PdfWorker;

export async function extractText(file: File): Promise<string> {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";

  if (ext === "pdf") return extractPdf(file);
  if (ext === "docx") return extractDocx(file);
  if (["xlsx", "xls"].includes(ext)) return extractExcel(file);
  if (ext === "csv") return extractCsv(file);
  if (["png", "jpg", "jpeg", "webp"].includes(ext)) return extractImage(file);
  if (["txt", "md"].includes(ext)) return extractPlainText(file);

  throw new Error(`Formato no soportado: .${ext}`);
}

async function extractPdf(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
  const pages: string[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const text = content.items
      .map((item: unknown) => ("str" in (item as object) ? (item as { str: string }).str : ""))
      .join(" ");
    pages.push(text);
  }

  return pages.join("\n\n");
}

async function extractDocx(file: File): Promise<string> {
  const mammoth = await import("mammoth");
  const buffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer: buffer });
  return result.value;
}

async function extractExcel(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });
  const lines: string[] = [];

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const csv = XLSX.utils.sheet_to_csv(sheet);
    lines.push(`=== Hoja: ${sheetName} ===\n${csv}`);
  }

  return lines.join("\n\n");
}

async function extractCsv(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as string ?? "");
    reader.onerror = reject;
    reader.readAsText(file, "utf-8");
  });
}

async function extractPlainText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as string ?? "");
    reader.onerror = reject;
    reader.readAsText(file, "utf-8");
  });
}

async function extractImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const dataUrl = e.target?.result as string;
        const base64 = dataUrl.split(",")[1];
        const text = await extractTextFromImage(base64, file.type);
        resolve(text);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
