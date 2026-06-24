"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Badge, Button, ConfirmDialog } from "@/components/ui";
import { StatusBadge } from "@/components/knowledge/status-badge";
import TaxonomySelects from "@/components/knowledge/taxonomy-selects";
import { collectionLabel, policyTypeLabel } from "@/lib/collections";

export default function DocumentRow({
  id,
  title,
  sourceType,
  totalChunks,
  createdAt,
  collection,
  policyType,
  status,
  hasOriginal,
}: {
  id: string;
  title: string;
  sourceType: string;
  totalChunks: number;
  createdAt: string;
  collection: string | null;
  policyType: string | null;
  status: string | null;
  hasOriginal: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Re-etiquetado
  const [editing, setEditing] = useState(false);
  const [coll, setColl] = useState(collection ?? "");
  const [pol, setPol] = useState(policyType ?? "");
  const [savingTag, setSavingTag] = useState(false);

  async function handleDelete() {
    setDeleting(true);
    const res = await fetch(`/api/kb/document/${id}`, { method: "DELETE" });
    setDeleting(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error ?? "error");
      setConfirming(false);
      return;
    }
    setConfirming(false);
    startTransition(() => router.refresh());
  }

  async function handleRetag() {
    setSavingTag(true);
    setError(null);
    const res = await fetch(`/api/kb/document/${id}/retag`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ collection: coll || null, policy_type: pol || null }),
    });
    setSavingTag(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error ?? "error al re-etiquetar");
      return;
    }
    setEditing(false);
    startTransition(() => router.refresh());
  }

  return (
    <>
      <tr className={"hover:bg-neutral-50 " + (pending ? "opacity-50" : "")}>
        <td className="px-4 py-3 align-top">
          <Badge color="neutral">{sourceType}</Badge>
        </td>
        <td className="px-4 py-3 align-top">
          <div className="font-medium text-neutral-900">{title}</div>
          <div className="mt-1 flex flex-wrap gap-1">
            {collection && <Badge color="blue" variant="ring">{collectionLabel(collection)}</Badge>}
            {policyType && <Badge color="violet" variant="ring">{policyTypeLabel(policyType)}</Badge>}
            {!collection && !policyType && <span className="text-xs text-neutral-400">sin etiquetar</span>}
          </div>
        </td>
        <td className="px-4 py-3 align-top">
          <StatusBadge status={status} />
        </td>
        <td className="px-4 py-3 align-top text-neutral-600">{totalChunks}</td>
        <td className="px-4 py-3 align-top text-neutral-600">{new Date(createdAt).toLocaleString()}</td>
        <td className="px-4 py-3 align-top text-right">
          <div className="flex items-center justify-end gap-3">
            {hasOriginal && (
              <a
                href={`/api/kb/document/${id}/original`}
                target="_blank"
                rel="noreferrer"
                className="text-xs font-medium text-neutral-700 transition-colors hover:text-neutral-900 hover:underline"
              >
                Original
              </a>
            )}
            <button
              type="button"
              onClick={() => setEditing((v) => !v)}
              className="text-xs font-medium text-neutral-700 transition-colors hover:text-neutral-900 hover:underline"
            >
              Etiquetar
            </button>
            <a
              href={`/api/kb/document/${id}`}
              download
              className="text-xs font-medium text-neutral-700 transition-colors hover:text-neutral-900 hover:underline"
            >
              Texto
            </a>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setConfirming(true)}
              disabled={pending}
              className="text-red-600 hover:text-red-700"
            >
              Borrar
            </Button>
          </div>
          {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
        </td>
      </tr>

      {editing && (
        <tr className="bg-neutral-50/60">
          <td colSpan={6} className="px-4 py-4">
            <div className="space-y-3">
              <p className="text-xs font-medium text-neutral-600">
                Re-etiquetar sin re-procesar (actualiza el documento y todos sus fragmentos).
              </p>
              <TaxonomySelects
                collection={coll}
                policyType={pol}
                onChange={({ collection, policyType }) => {
                  setColl(collection);
                  setPol(policyType);
                }}
                idPrefix={`retag-${id}`}
              />
              <div className="flex items-center gap-2">
                <Button variant="primary" size="sm" onClick={handleRetag} disabled={savingTag}>
                  {savingTag ? "Guardando…" : "Guardar etiquetas"}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setEditing(false)} disabled={savingTag}>
                  Cancelar
                </Button>
              </div>
            </div>
          </td>
        </tr>
      )}

      <ConfirmDialog
        open={confirming}
        title="Borrar documento de base de conocimiento"
        description={`Se eliminarán "${title}" y sus ${totalChunks} fragmentos indexados. Esta acción no se puede deshacer.`}
        confirmLabel="Borrar"
        tone="danger"
        busy={deleting}
        onConfirm={handleDelete}
        onCancel={() => setConfirming(false)}
      />
    </>
  );
}
