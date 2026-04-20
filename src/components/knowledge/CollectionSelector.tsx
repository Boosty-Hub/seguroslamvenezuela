import { cn } from "@/lib/utils";
import { COLLECTIONS, POLICY_TYPES } from "@/lib/collections";
import { CheckCircle2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Props {
  collection: string;
  policyType: string;
  onCollectionChange: (v: string) => void;
  onPolicyTypeChange: (v: string) => void;
  disabled?: boolean;
}

export function CollectionSelector({
  collection,
  policyType,
  onCollectionChange,
  onPolicyTypeChange,
  disabled,
}: Props) {
  return (
    <div className="space-y-4">
      {/* Step 1: Company dropdown */}
      <div className="space-y-2">
        <p className="text-sm font-medium">
          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs font-bold mr-2">1</span>
          Selecciona la aseguradora
        </p>
        <Select value={collection} onValueChange={onCollectionChange} disabled={disabled}>
          <SelectTrigger className="w-72">
            <SelectValue placeholder="Elige una aseguradora..." />
          </SelectTrigger>
          <SelectContent>
            {COLLECTIONS.map((c) => (
              <SelectItem key={c.value} value={c.value}>
                {c.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Step 2: Policy type chips */}
      <div className="space-y-2">
        <p className="text-sm font-medium">
          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs font-bold mr-2">2</span>
          Tipo de poliza
        </p>
        <div className="flex flex-wrap gap-2">
          {POLICY_TYPES.map((p) => (
            <button
              key={p.value}
              type="button"
              disabled={disabled}
              onClick={() => onPolicyTypeChange(p.value)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs transition-colors",
                policyType === p.value
                  ? "border-primary bg-primary text-primary-foreground font-medium"
                  : "border-muted hover:border-primary/50 hover:bg-muted/40"
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Summary */}
      {collection && policyType && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/40 rounded-lg px-3 py-2">
          <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" />
          Archivos etiquetados como:
          <span className="font-medium text-foreground">
            {COLLECTIONS.find((c) => c.value === collection)?.label} · {POLICY_TYPES.find((p) => p.value === policyType)?.label}
          </span>
        </div>
      )}
    </div>
  );
}
