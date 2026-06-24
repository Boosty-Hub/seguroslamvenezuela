"use client";

import { useCallback, useEffect, useState } from "react";
import { Button, inputCls } from "@/components/ui";
import TaxonomySelects from "@/components/knowledge/taxonomy-selects";
import { collectionLabel, policyTypeLabel } from "@/lib/collections";

type KbDoc = {
  id: string;
  title: string;
  source_filename: string | null;
  collection: string | null;
  policy_type: string | null;
  total_chunks: number | null;
  status: string;
  created_at: string;
};

// Panel de base de conocimiento de UNA vertical. Lista los documentos asignados
// y permite subir archivos nuevos que quedan etiquetados con esta vertical (el
// agente filtra search_kb por ella al identificar el ramo del mensaje).
export default function VerticalKbPanel({ slug }: { slug: string }) {
  const [docs, setDocs] = useState<KbDoc[]>([]);
  const [loading, setLoading] = useState(true);

  // Form de subida
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [content, setContent] = useState("");
  const [collection, setCollection] = useState("");
  const [policyType, setPolicyType] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/kb/by-vertical?vertical=${encodeURIComponent(slug)}`);
    if (res.ok) setDocs((await res.json()).documents ?? []);
    setLoading(false);
  }, [slug]);

  useEffect(() => { load(); }, [load]);

  async function upload(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResult(null);
    if (!title.trim()) return setError("Título requerido");
    if (!file && !content.trim()) return setError("Sube un archivo o pega contenido");

    setBusy(true);
    const form = new FormData();
    form.set("title", title);
    form.set("vertical", slug);
    if (file) form.set("file", file);
    if (content.trim()) form.set("content", content);
    if (collection) form.set("collection", collection);
    if (policyType) form.set("policy_type", policyType);

    const res = await fetch("/api/kb/ingest", { method: "POST", body: form });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setError(json.error ?? "error");

    setResult(`✓ ${json.chunks} chunks indexados`);
    setTitle(""); setContent(""); setFile(null);
    const f = document.getElementById(`kb-file-${slug}`) as HTMLInputElement | null;
    if (f) f.value = "";
    load();
  }

  async function remove(id: string) {
    setDocs((d) => d.filter((x) => x.id !== id));
    await fetch(`/api/kb/document/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div className="space-y-4 rounded-lg border border-neutral-200 bg-neutral-50/60 p-4">
      <div>
        <p className="text-sm font-medium text-neutral-900">Base de conocimiento de esta vertical</p>
        <p className="text-xs text-neutral-500">
          Sube las explicaciones, condicionados y tarifarios de este ramo. Se vectorizan (gte-small 384) y
          el agente los consulta al identificar la vertical.
        </p>
      </div>

      {/* Listado */}
      <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
        {loading ? (
          <p className="px-3 py-4 text-center text-xs text-neutral-400">Cargando…</p>
        ) : docs.length === 0 ? (
          <p className="px-3 py-4 text-center text-xs text-neutral-400">Sin documentos en esta vertical todavía.</p>
        ) : (
          <ul className="divide-y divide-neutral-100">
            {docs.map((d) => (
              <li key={d.id} className="flex items-center justify-between gap-3 px-3 py-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-neutral-900">{d.title}</p>
                  <p className="truncate text-[11px] text-neutral-500">
                    {[
                      d.collection ? collectionLabel(d.collection) : null,
                      d.policy_type ? policyTypeLabel(d.policy_type) : null,
                      d.total_chunks ? `${d.total_chunks} chunks` : null,
                      d.status !== "completed" ? d.status : null,
                    ].filter(Boolean).join(" · ")}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => remove(d.id)}
                  className="shrink-0 text-[11px] font-medium text-red-600 hover:text-red-700"
                >
                  Borrar
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Uploader compacto */}
      <form onSubmit={upload} className="space-y-3 rounded-lg border border-neutral-200 bg-white p-3">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Título del documento"
          className={inputCls}
        />
        <TaxonomySelects
          collection={collection}
          policyType={policyType}
          onChange={({ collection, policyType }) => {
            setCollection(collection);
            setPolicyType(policyType);
          }}
          idPrefix={`vkb-${slug}`}
        />
        <input
          id={`kb-file-${slug}`}
          type="file"
          accept=".pdf,.docx,.txt,.md,.srt,.vtt,.xlsx,.xls,.csv,.png,.jpg,.jpeg,.webp,.gif"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="block w-full text-sm text-neutral-600 file:mr-3 file:rounded-lg file:border-0 file:bg-neutral-900 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-white hover:file:bg-neutral-800"
        />
        <textarea
          rows={3}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="… o pega contenido (markdown)"
          className={`${inputCls} font-mono`}
        />
        {error && <p className="text-xs text-red-600">{error}</p>}
        {result && <p className="text-xs text-emerald-700">{result}</p>}
        <Button type="submit" variant="primary" size="sm" busy={busy} disabled={busy}>
          {busy ? "Procesando…" : "Indexar en esta vertical"}
        </Button>
      </form>
    </div>
  );
}
