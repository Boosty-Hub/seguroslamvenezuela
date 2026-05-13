import { useState, useEffect } from "react";
import { Trash2, FileText, RefreshCw, Filter, Pencil, Check, X, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getKnowledgeFiles, deleteKnowledgeFile, updateKnowledgeFile, type KnowledgeFile } from "@/lib/supabaseVector";
import { COLLECTIONS, POLICY_TYPES } from "@/lib/collections";
import { useToast } from "@/hooks/use-toast";
import { DocumentPreviewModal } from "./DocumentPreviewModal";

interface Props {
  refreshTrigger?: number;
}

export function DocumentsList({ refreshTrigger }: Props) {
  const [files, setFiles] = useState<KnowledgeFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [editCollection, setEditCollection] = useState("");
  const [editPolicyType, setEditPolicyType] = useState("");
  const [saving, setSaving] = useState(false);
  const [filterCollection, setFilterCollection] = useState("all");
  const [filterPolicyType, setFilterPolicyType] = useState("all");
  const [previewFile, setPreviewFile] = useState<KnowledgeFile | null>(null);
  const { toast } = useToast();

  const load = async () => {
    setLoading(true);
    try {
      setFiles(await getKnowledgeFiles());
    } catch {
      toast({ title: "Error cargando documentos", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [refreshTrigger]);

  const handleDelete = async (file: KnowledgeFile) => {
    setDeleting(file.id);
    setConfirmDelete(null);
    try {
      await deleteKnowledgeFile(file.id, file.collection, file.storage_path);
      setFiles((prev) => prev.filter((f) => f.id !== file.id));
      toast({ title: "Documento eliminado" });
    } catch (e: unknown) {
      toast({ title: "Error al eliminar", description: String(e), variant: "destructive" });
    } finally {
      setDeleting(null);
    }
  };

  const startEdit = (file: KnowledgeFile) => {
    setEditing(file.id);
    setEditCollection(file.collection);
    setEditPolicyType(file.policy_type);
  };

  const cancelEdit = () => setEditing(null);

  const saveEdit = async (file: KnowledgeFile) => {
    if (editCollection === file.collection && editPolicyType === file.policy_type) {
      setEditing(null);
      return;
    }
    setSaving(true);
    try {
      await updateKnowledgeFile(file.id, file.collection, {
        collection: editCollection,
        policy_type: editPolicyType,
      });
      setFiles((prev) =>
        prev.map((f) =>
          f.id === file.id ? { ...f, collection: editCollection, policy_type: editPolicyType } : f
        )
      );
      setEditing(null);
      toast({ title: "Metadatos actualizados" });
    } catch (e: unknown) {
      toast({ title: "Error al guardar", description: String(e), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const label = (arr: { value: string; label: string }[], val: string) =>
    arr.find((c) => c.value === val)?.label ?? val;

  const filtered = files.filter((f) => {
    if (filterCollection !== "all" && f.collection !== filterCollection) return false;
    if (filterPolicyType !== "all" && f.policy_type !== filterPolicyType) return false;
    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground gap-2">
        <RefreshCw className="h-4 w-4 animate-spin" />
        Cargando documentos...
      </div>
    );
  }

  return (
    <>
    <div className="space-y-4">
      {/* Filters */}
      <div className="rounded-lg border bg-card px-3 py-2.5 flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-2">
        <div className="flex items-center gap-2">
          <Filter className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <span className="text-xs font-medium text-muted-foreground sm:hidden">Filtrar por</span>
        </div>
        <Select value={filterCollection} onValueChange={setFilterCollection}>
          <SelectTrigger className="w-full sm:w-48 h-8 text-xs">
            <SelectValue placeholder="Todas las aseguradoras" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las aseguradoras</SelectItem>
            {COLLECTIONS.map((c) => (
              <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterPolicyType} onValueChange={setFilterPolicyType}>
          <SelectTrigger className="w-full sm:w-44 h-8 text-xs">
            <SelectValue placeholder="Todos los tipos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los tipos</SelectItem>
            {POLICY_TYPES.map((p) => (
              <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex items-center justify-between sm:contents gap-2">
          {(filterCollection !== "all" || filterPolicyType !== "all") && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs text-muted-foreground"
              onClick={() => { setFilterCollection("all"); setFilterPolicyType("all"); }}
            >
              Limpiar filtros
            </Button>
          )}
          <span className="text-xs text-muted-foreground sm:ml-auto">
            {filtered.length} de {files.length} documento{files.length !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      {/* List */}
      {!filtered.length ? (
        <div className="rounded-lg border bg-card/50 flex flex-col items-center justify-center py-14 text-muted-foreground gap-3">
          <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
            <FileText className="h-6 w-6" />
          </div>
          <p className="text-sm">{files.length ? "Sin resultados para los filtros seleccionados" : "No hay documentos cargados aún"}</p>
          {!files.length && <p className="text-xs">Sube archivos en la pestaña «Cargar archivos»</p>}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((file) => (
            <div
              key={file.id}
              className={`rounded-lg border bg-card p-3 space-y-2 border-l-[3px] transition-colors ${
                file.status === "completed"  ? "border-l-green-400" :
                file.status === "error"      ? "border-l-red-400"   :
                file.status === "processing" ? "border-l-blue-400"  :
                "border-l-amber-400"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-md bg-muted flex items-center justify-center shrink-0">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{file.name}</p>
                  {editing !== file.id && (
                    <div className="flex items-center flex-wrap gap-1.5 mt-1">
                      <Badge variant="secondary" className="text-xs">{label(COLLECTIONS, file.collection)}</Badge>
                      <Badge variant="outline" className="text-xs">{label(POLICY_TYPES, file.policy_type)}</Badge>
                      <span className="text-xs text-muted-foreground">{file.chunks_count} chunks</span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(file.created_at).toLocaleDateString("es-VE")}
                      </span>
                    </div>
                  )}
                </div>
                <StatusBadge status={file.status} errorMessage={file.error_message} />

                {editing !== file.id && confirmDelete !== file.id && (
                  <>
                    {/* Preview / download */}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0 text-muted-foreground hover:text-primary"
                      title={file.storage_path ? "Ver / descargar archivo" : "Archivo original no disponible (subido antes de esta versión)"}
                      disabled={!!deleting}
                      onClick={() => setPreviewFile(file)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>

                    {/* Edit metadata */}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-primary shrink-0"
                      disabled={!!deleting}
                      onClick={() => { startEdit(file); setConfirmDelete(null); }}
                      title="Editar aseguradora / tipo"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>

                    {/* Delete — requires confirm */}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0"
                      disabled={deleting === file.id}
                      onClick={() => setConfirmDelete(file.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </>
                )}

                {/* Inline delete confirmation */}
                {confirmDelete === file.id && (
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-xs text-destructive font-medium hidden sm:inline">¿Eliminar?</span>
                    <Button
                      variant="destructive"
                      size="sm"
                      className="h-7 px-2.5 text-xs"
                      disabled={deleting === file.id}
                      onClick={() => handleDelete(file)}
                    >
                      {deleting === file.id ? <RefreshCw className="h-3 w-3 animate-spin" /> : "Sí"}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2.5 text-xs"
                      onClick={() => setConfirmDelete(null)}
                    >
                      No
                    </Button>
                  </div>
                )}
              </div>

              {editing === file.id && (
                <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-2">
                  <Select value={editCollection} onValueChange={setEditCollection}>
                    <SelectTrigger className="w-full sm:w-52 h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {COLLECTIONS.map((c) => (
                        <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={editPolicyType} onValueChange={setEditPolicyType}>
                    <SelectTrigger className="w-full sm:w-44 h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {POLICY_TYPES.map((p) => (
                        <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="h-8 gap-1 flex-1 sm:flex-none"
                      disabled={saving}
                      onClick={() => saveEdit(file)}
                    >
                      <Check className="h-3.5 w-3.5" />
                      {saving ? "Guardando..." : "Guardar"}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 gap-1 flex-1 sm:flex-none"
                      disabled={saving}
                      onClick={cancelEdit}
                    >
                      <X className="h-3.5 w-3.5" />
                      Cancelar
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>

    <DocumentPreviewModal file={previewFile} onClose={() => setPreviewFile(null)} />
    </>
  );
}

function StatusBadge({ status, errorMessage }: { status: KnowledgeFile["status"]; errorMessage?: string }) {
  const map: Record<string, { label: string; className: string }> = {
    completed: { label: "Listo", className: "bg-green-100 text-green-700" },
    processing: { label: "Procesando", className: "bg-blue-100 text-blue-700" },
    pending: { label: "Pendiente", className: "bg-yellow-100 text-yellow-700" },
    error: { label: "Error", className: "bg-red-100 text-red-700" },
  };
  const { label, className } = map[status] ?? map.pending;
  return (
    <Badge className={className} title={errorMessage}>
      {label}
    </Badge>
  );
}
