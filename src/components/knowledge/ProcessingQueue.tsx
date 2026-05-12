import { CheckCircle, XCircle, Loader2, Clock, X } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { COLLECTIONS, POLICY_TYPES } from "@/lib/collections";

export interface QueueItem {
  file: File;
  status: "waiting" | "uploading" | "processing" | "done" | "error";
  progress: number;
  error?: string;
  chunks?: number;
  collection?: string;
  policyType?: string;
}

interface Props {
  items: QueueItem[];
  onRemove?: (index: number) => void;
}

const STATUS_LABEL: Record<QueueItem["status"], string> = {
  waiting: "En espera",
  uploading: "Enviando al servidor...",
  processing: "Procesando (extraccion + embeddings)...",
  done: "Completado",
  error: "Error",
};

export function ProcessingQueue({ items, onRemove }: Props) {
  if (!items.length) return null;

  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <div
          key={i}
          className={cn(
            "flex items-start gap-3 rounded-lg border bg-card p-3.5 border-l-[3px] transition-colors",
            item.status === "done"      && "border-l-green-400",
            item.status === "error"     && "border-l-red-400",
            item.status === "uploading" && "border-l-blue-400",
            item.status === "processing"&& "border-l-blue-400",
            item.status === "waiting"   && "border-l-muted-foreground/30",
          )}
        >
          <StatusIcon status={item.status} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium truncate">{item.file.name}</p>
              <span className={cn(
                "text-xs shrink-0",
                item.status === "done"  ? "text-green-600" :
                item.status === "error" ? "text-destructive" :
                "text-muted-foreground"
              )}>
                {STATUS_LABEL[item.status]}
                {item.status === "done" && item.chunks ? ` · ${item.chunks} chunks` : ""}
              </span>
            </div>
            <div className="flex items-center gap-1.5 mt-1.5">
              {item.collection && (
                <Badge variant="secondary" className="text-xs">
                  {COLLECTIONS.find((c) => c.value === item.collection)?.label ?? item.collection}
                </Badge>
              )}
              {item.policyType && (
                <Badge variant="outline" className="text-xs">
                  {POLICY_TYPES.find((p) => p.value === item.policyType)?.label ?? item.policyType}
                </Badge>
              )}
            </div>
            {item.status === "uploading" && <Progress value={40} className="h-1 mt-2" />}
            {item.status === "processing" && <Progress value={75} className="h-1 mt-2 animate-pulse" />}
            {item.status === "done" && <Progress value={100} className="h-1 mt-2" />}
            {item.error && <p className="text-xs text-destructive mt-1.5">{item.error}</p>}
          </div>
          {item.status === "waiting" && onRemove && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-muted-foreground hover:text-destructive shrink-0 -mt-0.5"
              onClick={() => onRemove(i)}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      ))}
    </div>
  );
}

function StatusIcon({ status }: { status: QueueItem["status"] }) {
  if (status === "done") return <CheckCircle className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />;
  if (status === "error") return <XCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />;
  if (status === "waiting") return <Clock className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />;
  return <Loader2 className="h-5 w-5 text-primary shrink-0 mt-0.5 animate-spin" />;
}
