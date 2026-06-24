"use client";

// Selector de taxonomía (aseguradora + tipo de póliza) reutilizable por el
// uploader y el re-etiquetado. Valores desde lib/collections.ts.
import { COLLECTIONS, POLICY_TYPES } from "@/lib/collections";

const selectCls =
  "w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 focus:outline-none";

export default function TaxonomySelects({
  collection,
  policyType,
  onChange,
  idPrefix = "tax",
}: {
  collection: string;
  policyType: string;
  onChange: (next: { collection: string; policyType: string }) => void;
  idPrefix?: string;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="space-y-2">
        <label htmlFor={`${idPrefix}-collection`} className="text-sm font-medium text-neutral-700">
          Aseguradora
        </label>
        <select
          id={`${idPrefix}-collection`}
          value={collection}
          onChange={(e) => onChange({ collection: e.target.value, policyType })}
          className={selectCls}
        >
          <option value="">— Sin asignar —</option>
          {COLLECTIONS.map((c) => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>
      </div>
      <div className="space-y-2">
        <label htmlFor={`${idPrefix}-policy`} className="text-sm font-medium text-neutral-700">
          Tipo de póliza
        </label>
        <select
          id={`${idPrefix}-policy`}
          value={policyType}
          onChange={(e) => onChange({ collection, policyType: e.target.value })}
          className={selectCls}
        >
          <option value="">— Sin asignar —</option>
          {POLICY_TYPES.map((p) => (
            <option key={p.value} value={p.value}>{p.label}</option>
          ))}
        </select>
      </div>
    </div>
  );
}
