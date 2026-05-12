import { useState, useRef } from "react";
import { Upload, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CollectionSelector } from "@/components/knowledge/CollectionSelector";
import { FileUploadZone } from "@/components/knowledge/FileUploadZone";
import { ProcessingQueue, type QueueItem } from "@/components/knowledge/ProcessingQueue";
import { DocumentsList } from "@/components/knowledge/DocumentsList";
import { processDocument } from "@/lib/supabaseVector";
import { useToast } from "@/hooks/use-toast";

export default function KnowledgeBase() {
  const [collection, setCollection] = useState("seguros_caracas");
  const [policyType, setPolicyType] = useState("salud");
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [processing, setProcessing] = useState(false);
  const [refreshDocs, setRefreshDocs] = useState(0);
  const { toast } = useToast();
  const processingRef = useRef(false);

  const updateItem = (index: number, patch: Partial<QueueItem>) =>
    setQueue((prev) => prev.map((item, i) => (i === index ? { ...item, ...patch } : item)));

  const handleFiles = (files: File[]) => {
    const newItems: QueueItem[] = files.map((file) => ({
      file,
      status: "waiting",
      progress: 0,
      collection,
      policyType,
    }));
    setQueue((prev) => [...prev, ...newItems]);
  };

  const processQueue = async () => {
    if (processingRef.current) return;
    processingRef.current = true;
    setProcessing(true);

    // Capture current queue snapshot
    const snapshot = [...queue];

    for (let i = 0; i < snapshot.length; i++) {
      if (snapshot[i].status === "done" || snapshot[i].status === "error") continue;

      try {
        updateItem(i, { status: "uploading", progress: 30 });

        const { chunks } = await processDocument(
          snapshot[i].file,
          collection,
          policyType,
          (status) => {
            if (status === "uploading") updateItem(i, { status: "uploading", progress: 40 });
          }
        );

        updateItem(i, { status: "done", progress: 100, chunks });
      } catch (err: unknown) {
        updateItem(i, { status: "error", error: err instanceof Error ? err.message : String(err) });
      }
    }

    processingRef.current = false;
    setProcessing(false);
    setRefreshDocs((n) => n + 1);
    toast({ title: "Procesamiento completado" });
  };

  const pendingCount = queue.filter((i) => i.status === "waiting").length;

  return (
    <div className="flex-1 overflow-auto">
      <div className="border-b bg-card px-6 h-14 flex items-center">
        <h1 className="text-base font-semibold">Base de Conocimiento</h1>
      </div>

      <main className="container py-6 max-w-3xl space-y-6">
        <div>
          <h2 className="text-2xl font-bold">Base de Conocimiento</h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Procesamiento en servidor · El agente filtra por{" "}
            <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono">collection</code>{" "}+{" "}
            <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono">policy_type</code>
          </p>
        </div>

        <Tabs defaultValue="upload">
          <TabsList className="h-9">
            <TabsTrigger value="upload" className="gap-1.5 text-sm">
              <Upload className="h-3.5 w-3.5" />
              Cargar archivos
            </TabsTrigger>
            <TabsTrigger value="documents" className="gap-1.5 text-sm">
              <BookOpen className="h-3.5 w-3.5" />
              Documentos
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="space-y-4 mt-5">
            {/* Two-level selector */}
            <div className="rounded-xl border bg-card p-5 space-y-4">
              <p className="text-sm font-semibold text-foreground">Configurar etiquetas</p>
              <CollectionSelector
                collection={collection}
                policyType={policyType}
                onCollectionChange={setCollection}
                onPolicyTypeChange={setPolicyType}
                disabled={processing}
              />
            </div>

            {/* Drop zone */}
            <FileUploadZone onFiles={handleFiles} disabled={processing} />

            {/* Queue */}
            {queue.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">Cola de archivos <span className="text-muted-foreground font-normal">({queue.length})</span></p>
                  {!processing && (
                    <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground" onClick={() => setQueue([])}>
                      Limpiar lista
                    </Button>
                  )}
                </div>
                <ProcessingQueue
                  items={queue}
                  onRemove={(i) => setQueue((prev) => prev.filter((_, idx) => idx !== i))}
                />
                <Button
                  onClick={processQueue}
                  disabled={processing || pendingCount === 0}
                  className="gap-1.5 w-full sm:w-auto"
                >
                  {processing ? (
                    <>
                      <Upload className="h-4 w-4 animate-pulse" />
                      Procesando en servidor...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4" />
                      Procesar {pendingCount > 0 ? `${pendingCount} archivo${pendingCount > 1 ? "s" : ""}` : ""}
                    </>
                  )}
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="documents" className="mt-4">
            <DocumentsList refreshTrigger={refreshDocs} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
