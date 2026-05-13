import { useState, useEffect } from "react";
import {
  Dialog, DialogContent, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Download, RefreshCw, FileText, ImageIcon, Table2,
  FileCode, AlertCircle, ExternalLink,
} from "lucide-react";
import { getKnowledgeFileDownloadUrl, type KnowledgeFile } from "@/lib/supabaseVector";

interface Props {
  file: KnowledgeFile | null;
  onClose: () => void;
}

type PreviewState =
  | { type: "idle" }
  | { type: "loading" }
  | { type: "error"; message: string }
  | { type: "pdf"; url: string }
  | { type: "image"; url: string }
  | { type: "table"; html: string; info: string }
  | { type: "doc"; html: string }
  | { type: "text"; content: string }
  | { type: "unsupported" };

function ext(name: string) {
  return name.split(".").pop()?.toLowerCase() ?? "";
}

function formatBytes(b: number) {
  if (b < 1024) return `${b} B`;
  if (b < 1048576) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1048576).toFixed(1)} MB`;
}

function FileTypeIcon({ name, className }: { name: string; className?: string }) {
  const e = ext(name);
  if (["png", "jpg", "jpeg", "webp", "gif"].includes(e)) return <ImageIcon className={className} />;
  if (["xlsx", "xls", "csv"].includes(e)) return <Table2 className={className} />;
  if (["txt", "md"].includes(e)) return <FileCode className={className} />;
  return <FileText className={className} />;
}

export function DocumentPreviewModal({ file, onClose }: Props) {
  const [state, setState] = useState<PreviewState>({ type: "idle" });

  useEffect(() => {
    if (!file) { setState({ type: "idle" }); return; }
    loadPreview(file);
  }, [file?.id]);

  const publicUrl = file?.storage_path
    ? getKnowledgeFileDownloadUrl(file.storage_path)
    : null;

  const handleDownload = () => {
    if (!publicUrl || !file) return;
    const a = document.createElement("a");
    a.href = publicUrl;
    a.download = file.name;
    a.target = "_blank";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const loadPreview = async (f: KnowledgeFile) => {
    if (!f.storage_path) { setState({ type: "unsupported" }); return; }
    setState({ type: "loading" });

    const url = getKnowledgeFileDownloadUrl(f.storage_path);
    const e = ext(f.name);

    try {
      // ── Images ────────────────────────────────────────────────────
      if (["png", "jpg", "jpeg", "webp", "gif"].includes(e)) {
        setState({ type: "image", url });
        return;
      }

      // ── PDF ───────────────────────────────────────────────────────
      if (e === "pdf") {
        setState({ type: "pdf", url });
        return;
      }

      // ── Excel / CSV ───────────────────────────────────────────────
      if (["xlsx", "xls", "csv"].includes(e)) {
        const resp = await fetch(url);
        const XLSX = await import("xlsx");
        let workbook: ReturnType<typeof XLSX.read>;
        if (e === "csv") {
          const text = await resp.text();
          workbook = XLSX.read(text, { type: "string" });
        } else {
          const buf = await resp.arrayBuffer();
          workbook = XLSX.read(buf, { type: "array" });
        }
        const sheetName = workbook.SheetNames[0];
        const rawHtml = XLSX.utils.sheet_to_html(workbook.Sheets[sheetName]);
        // Extract just the <table> from the generated HTML document
        const parser = new DOMParser();
        const doc = parser.parseFromString(rawHtml, "text/html");
        const tableHtml = doc.querySelector("table")?.outerHTML ?? "<p>Sin datos</p>";
        const info = workbook.SheetNames.length > 1
          ? `${sheetName} · ${workbook.SheetNames.length} hojas`
          : sheetName;
        setState({ type: "table", html: tableHtml, info });
        return;
      }

      // ── Word DOCX ─────────────────────────────────────────────────
      if (e === "docx") {
        const resp = await fetch(url);
        const buf = await resp.arrayBuffer();
        const mammoth = await import("mammoth");
        const result = await mammoth.convertToHtml({ arrayBuffer: buf });
        setState({ type: "doc", html: result.value });
        return;
      }

      // ── Plain text / Markdown ─────────────────────────────────────
      if (["txt", "md"].includes(e)) {
        const resp = await fetch(url);
        const text = await resp.text();
        setState({ type: "text", content: text });
        return;
      }

      setState({ type: "unsupported" });
    } catch (err) {
      setState({ type: "error", message: String(err) });
    }
  };

  return (
    <Dialog open={!!file} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-[95vw] sm:max-w-5xl p-0 flex flex-col h-[92vh] overflow-hidden rounded-xl">
        <DialogTitle className="sr-only">{file?.name ?? "Vista previa"}</DialogTitle>
        <DialogDescription className="sr-only">Visualizador de documentos</DialogDescription>

        {/* ── Header ───────────────────────────────────────────────── */}
        <div className="flex items-center gap-2 sm:gap-3 px-4 py-3 border-b shrink-0 pr-12 bg-card">
          <FileTypeIcon
            name={file?.name ?? ""}
            className="h-4 w-4 shrink-0 text-muted-foreground"
          />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate leading-tight">{file?.name}</p>
            {file && (
              <p className="text-xs text-muted-foreground leading-tight">
                {formatBytes(file.size)}
                {state.type === "table" && (
                  <span className="ml-2 text-primary">{state.info}</span>
                )}
              </p>
            )}
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={handleDownload}
            disabled={!publicUrl}
            className="shrink-0 gap-1.5"
          >
            <Download className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Descargar</span>
          </Button>
        </div>

        {/* ── Preview area ─────────────────────────────────────────── */}
        <div className="flex-1 min-h-0 overflow-hidden">

          {/* Loading */}
          {state.type === "loading" && (
            <div className="flex items-center justify-center h-full gap-3 text-muted-foreground">
              <RefreshCw className="h-5 w-5 animate-spin" />
              <span className="text-sm">Cargando vista previa...</span>
            </div>
          )}

          {/* Error */}
          {state.type === "error" && (
            <div className="flex flex-col items-center justify-center h-full gap-3 px-6 text-center">
              <AlertCircle className="h-10 w-10 text-destructive" />
              <p className="text-sm font-medium">Error al cargar la vista previa</p>
              <p className="text-xs text-muted-foreground max-w-sm break-all">{state.message}</p>
              <Button size="sm" onClick={handleDownload} disabled={!publicUrl}>
                <Download className="h-4 w-4 mr-1.5" /> Descargar archivo
              </Button>
            </div>
          )}

          {/* PDF */}
          {state.type === "pdf" && (
            <object data={state.url} type="application/pdf" className="w-full h-full">
              {/* Fallback — shown on iOS Safari and other browsers that don't embed PDFs */}
              <div className="flex flex-col items-center justify-center h-full gap-4 px-6 text-center">
                <FileText className="h-14 w-14 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Vista previa no disponible en este navegador</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Tu navegador no admite PDFs embebidos
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 justify-center">
                  <Button size="sm" onClick={handleDownload}>
                    <Download className="h-4 w-4 mr-1.5" /> Descargar
                  </Button>
                  <Button size="sm" variant="outline" asChild>
                    <a href={state.url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4 mr-1.5" /> Abrir pestaña
                    </a>
                  </Button>
                </div>
              </div>
            </object>
          )}

          {/* Image */}
          {state.type === "image" && (
            <div className="w-full h-full overflow-auto flex items-center justify-center p-4 bg-[#f0f0f0] dark:bg-[#1a1a1a]">
              <img
                src={state.url}
                alt={file?.name}
                className="max-w-full max-h-full object-contain rounded shadow-lg"
              />
            </div>
          )}

          {/* Excel / CSV table */}
          {state.type === "table" && (
            <div
              className="w-full h-full overflow-auto p-3 text-xs
                [&_table]:border-collapse [&_table]:min-w-full
                [&_td]:border [&_td]:border-border [&_td]:px-2.5 [&_td]:py-1.5 [&_td]:whitespace-nowrap
                [&_th]:border [&_th]:border-border [&_th]:px-2.5 [&_th]:py-2 [&_th]:font-semibold [&_th]:bg-muted [&_th]:sticky [&_th]:top-0
                [&_tr:hover_td]:bg-accent/40"
              dangerouslySetInnerHTML={{ __html: state.html }}
            />
          )}

          {/* DOCX document */}
          {state.type === "doc" && (
            <div
              className="w-full h-full overflow-auto p-6 sm:p-8 text-sm leading-relaxed
                [&_h1]:text-xl [&_h1]:font-bold [&_h1]:mb-3 [&_h1]:mt-5
                [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:mb-2 [&_h2]:mt-4
                [&_h3]:text-base [&_h3]:font-semibold [&_h3]:mb-2 [&_h3]:mt-3
                [&_p]:mb-3 [&_p]:text-foreground
                [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-3
                [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:mb-3
                [&_li]:mb-1
                [&_strong]:font-semibold
                [&_table]:border-collapse [&_table]:w-full [&_table]:mb-3
                [&_td]:border [&_td]:border-border [&_td]:px-2 [&_td]:py-1
                [&_th]:border [&_th]:border-border [&_th]:px-2 [&_th]:py-1.5 [&_th]:font-semibold [&_th]:bg-muted
                max-w-3xl mx-auto"
              dangerouslySetInnerHTML={{ __html: state.html }}
            />
          )}

          {/* Plain text */}
          {state.type === "text" && (
            <pre className="w-full h-full overflow-auto p-4 text-xs font-mono whitespace-pre-wrap text-foreground leading-relaxed">
              {state.content}
            </pre>
          )}

          {/* Unsupported */}
          {(state.type === "unsupported" || state.type === "idle") && file && (
            <div className="flex flex-col items-center justify-center h-full gap-4 px-6 text-center">
              <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center">
                <FileTypeIcon name={file.name} className="h-8 w-8 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium">
                  {file.storage_path ? "Vista previa no disponible" : "Archivo original no disponible"}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {file.storage_path
                    ? `Los archivos .${ext(file.name).toUpperCase()} no tienen vista previa`
                    : "Este archivo fue subido antes de que se habilitara el almacenamiento"}
                </p>
              </div>
              {file.storage_path && (
                <Button size="sm" onClick={handleDownload}>
                  <Download className="h-4 w-4 mr-1.5" /> Descargar archivo
                </Button>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
