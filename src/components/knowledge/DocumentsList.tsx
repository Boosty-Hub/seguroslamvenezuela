import { useState, useEffect } from "react";
import { Trash2, FileText, RefreshCw, Filter, Pencil, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getKnowledgeFiles, deleteKnowledgeFile, updateKnowledgeFile, type KnowledgeFile } from "@/lib/supabaseVector";
import { COLLECTIONS, POLICY_TYPES } from "@/lib/collections";
import { useToast } from "@/hooks/use-toast";

interface Props {
  refreshTrigger?: number;
}

export function DocumentsList({ refreshTrigger }: Props) {
  const [files, setFiles] = useState<KnowledgeFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [editCollection, setEditCollection] = useState("");
  const [editPolicyType, setEditPolicyType] = useState("");
  const [saving, setSaving] = useState(false);
  const [filterCollection, setFilterCollection] = useState("all");
  const [filterPolicyType, setFilterPolicyType] = useState("all");
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
    try {
      await deleteKnowledgeFile(file.id, file.collection);
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
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
        <Select value={filterCollection} onValueChange={setFilterCollection}>
          <SelectTrigger className="w-48 h-8 text-xs">
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
          <SelectTrigger className="w-44 h-8 text-xs">
            <SelectValue placeholder="Todos los tipos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los tipos</SelectItem>
            {POLICY_TYPES.map((p) => (
              <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
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
        <span className="text-xs text-muted-foreground ml-auto">
          {filtered.length} de {files.length} documentos
        </span>
      </div>

      {/* List */}
      {!filtered.length ? (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2">
          <FileText className="h-8 w-8" />
          <p>{files.length ? "Sin resultados para los filtros seleccionados" : "No hay documentos cargados aun"}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((file) => (
            <div key={file.id} className="rounded-lg border bg-card p-3 space-y-2">
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
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
                {editing !== file.id && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-primary shrink-0"
                    disabled={!!deleting}
                    onClick={() => startEdit(file)}
                    title="Editar aseguradora / tipo"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0"
                  disabled={deleting === file.id || editing === file.id}
                  onClick={() => handleDelete(file)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>

              {editing === file.id && (
                <div className="flex flex-wrap items-center gap-2 pl-8">
                  <Select value={editCollection} onValueChange={setEditCollection}>
                    <SelectTrigger className="w-52 h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {COLLECTIONS.map((c) => (
                        <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={editPolicyType} onValueChange={setEditPolicyType}>
                    <SelectTrigger className="w-44 h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {POLICY_TYPES.map((p) => (
                        <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    size="sm"
                    className="h-8 gap-1"
                    disabled={saving}
                    onClick={() => saveEdit(file)}
                  >
                    <Check className="h-3.5 w-3.5" />
                    {saving ? "Guardando..." : "Guardar"}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 gap-1"
                    disabled={saving}
                    onClick={cancelEdit}
                  >
                    <X className="h-3.5 w-3.5" />
                    Cancelar
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
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
