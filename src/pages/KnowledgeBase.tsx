import { useState, useRef } from "react";
import { Link } from "react-router-dom";
import { ShieldCheck, ArrowLeft, Upload, BookOpen } from "lucide-react";
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
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container flex items-center gap-3 py-4">
          <div className="flex items-center gap-2 text-primary">
            <ShieldCheck className="h-7 w-7" />
            <h1 className="text-xl font-bold tracking-tight">CotiSeguro</h1>
          </div>
          <span className="h-5 w-px bg-border" />
          <span className="text-sm font-medium text-muted-foreground">Base de Conocimiento</span>
          <div className="ml-auto">
            <Button variant="ghost" size="sm" asChild>
              <Link to="/">
                <ArrowLeft className="h-4 w-4 mr-1.5" />
                Volver
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="container py-6 max-w-3xl space-y-6">
        <div>
          <h2 className="text-2xl font-bold">Base de Conocimiento</h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Los archivos se procesan en el servidor (Supabase Edge Function) — no colapsa el navegador.
            El agente en N8N filtra por <code className="bg-muted px-1 rounded text-xs">collection</code> + <code className="bg-muted px-1 rounded text-xs">policy_type</code>.
          </p>
        </div>

        <Tabs defaultValue="upload">
          <TabsList>
            <TabsTrigger value="upload" className="gap-1.5">
              <Upload className="h-4 w-4" />
              Cargar archivos
            </TabsTrigger>
            <TabsTrigger value="documents" className="gap-1.5">
              <BookOpen className="h-4 w-4" />
              Documentos
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="space-y-5 mt-4">
            {/* Two-level selector */}
            <div className="rounded-xl border bg-card p-4 space-y-4">
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
                <ProcessingQueue
                  items={queue}
                  onRemove={(i) => setQueue((prev) => prev.filter((_, idx) => idx !== i))}
                />
                <div className="flex items-center gap-3">
                  <Button
                    onClick={processQueue}
                    disabled={processing || pendingCount === 0}
                    className="gap-1.5"
                  >
                    {processing ? (
                      "Procesando en servidor..."
                    ) : (
                      <>
                        <Upload className="h-4 w-4" />
                        Procesar {pendingCount > 0 ? `${pendingCount} archivo${pendingCount > 1 ? "s" : ""}` : ""}
                      </>
                    )}
                  </Button>
                  {!processing && (
                    <Button variant="ghost" size="sm" onClick={() => setQueue([])}>
                      Limpiar lista
                    </Button>
                  )}
                </div>
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
