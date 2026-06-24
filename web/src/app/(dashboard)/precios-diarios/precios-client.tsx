"use client";

import { useCallback, useEffect, useState } from "react";
import { Button, Badge } from "@/components/ui";
import {
  SUBCATEGORIAS, RANGOS_EDAD, SUB_LABEL, TOTAL_ESPERADO, fmtMoney,
  type DailyPriceRow,
} from "@/lib/precios";

type Status = { fecha: string | null; total: number; esperado: number; con_precios: number };

const selectCls =
  "rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 focus:outline-none";

export default function PreciosClient() {
  const [status, setStatus] = useState<Status | null>(null);
  const [subcategoria, setSubcategoria] = useState<string>("salud_estandar");
  const [rango, setRango] = useState<string>("30-39");
  const [rows, setRows] = useState<DailyPriceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<"sync" | "extract" | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const loadStatus = useCallback(async () => {
    const r = await fetch("/api/precios/cotizaciones");
    if (r.ok) setStatus(await r.json());
  }, []);

  const loadPrecios = useCallback(async () => {
    setLoading(true);
    const r = await fetch(`/api/precios/precios?subcategoria=${subcategoria}&rango_edad=${encodeURIComponent(rango)}`);
    if (r.ok) setRows((await r.json()).rows ?? []);
    setLoading(false);
  }, [subcategoria, rango]);

  useEffect(() => { loadStatus(); }, [loadStatus]);
  useEffect(() => { loadPrecios(); }, [loadPrecios]);

  async function trigger(kind: "sync" | "extract") {
    setBusy(kind);
    setMsg(null);
    const r = await fetch(`/api/precios/${kind}`, { method: "POST" });
    const j = await r.json().catch(() => ({}));
    setBusy(null);
    if (!r.ok) { setMsg(`Error: ${j.error ?? "fallo"}`); return; }
    if (kind === "sync") setMsg(j.message ?? `Sincronización lanzada (${j.completadas ?? "?"}/${TOTAL_ESPERADO})`);
    else setMsg(j.message ?? `Extracción: ${j.extraidos ?? 0} cotizaciones procesadas`);
    await loadStatus();
    if (kind === "extract") await loadPrecios();
  }

  const pct = status && status.esperado ? Math.round((status.total / status.esperado) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Estado + acciones */}
      <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-neutral-900">
              Cotizaciones del día {status?.fecha ?? "—"}
            </p>
            <p className="text-xs text-neutral-500">
              {status ? `${status.total}/${status.esperado} scrapeadas · ${status.con_precios} con precios extraídos` : "cargando…"}
            </p>
            <div className="mt-2 h-1.5 w-56 overflow-hidden rounded-full bg-neutral-100">
              <div className="h-full rounded-full bg-brand transition-all" style={{ width: `${pct}%` }} />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" disabled={busy !== null} onClick={() => trigger("sync")}>
              {busy === "sync" ? "Sincronizando…" : "Sincronizar ahora"}
            </Button>
            <Button variant="primary" size="sm" disabled={busy !== null} onClick={() => trigger("extract")}>
              {busy === "extract" ? "Extrayendo…" : "Extraer precios (Claude)"}
            </Button>
          </div>
        </div>
        {msg && <p className="mt-3 text-xs text-neutral-600">{msg}</p>}
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <label className="text-xs font-medium text-neutral-600">Subcategoría</label>
          <select value={subcategoria} onChange={(e) => setSubcategoria(e.target.value)} className={selectCls}>
            {SUBCATEGORIAS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-neutral-600">Rango de edad</label>
          <select value={rango} onChange={(e) => setRango(e.target.value)} className={selectCls}>
            {RANGOS_EDAD.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
      </div>

      {/* Tabla de precios */}
      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-neutral-900">
          {SUB_LABEL[subcategoria] ?? subcategoria} · {rango} ({rows.length} planes)
        </h2>
        <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-card">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[680px]">
              <thead className="bg-neutral-50/60 text-left">
                <tr>
                  <th className="px-4 py-2.5 text-[11px] font-medium uppercase tracking-wider text-neutral-400">Aseguradora</th>
                  <th className="px-4 py-2.5 text-[11px] font-medium uppercase tracking-wider text-neutral-400">Plan</th>
                  <th className="px-4 py-2.5 text-right text-[11px] font-medium uppercase tracking-wider text-neutral-400">Suma aseg.</th>
                  <th className="px-4 py-2.5 text-right text-[11px] font-medium uppercase tracking-wider text-neutral-400">Prima mensual</th>
                  <th className="px-4 py-2.5 text-right text-[11px] font-medium uppercase tracking-wider text-neutral-400">Prima anual</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {loading ? (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-neutral-400">Cargando…</td></tr>
                ) : rows.length === 0 ? (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-neutral-500">Sin precios para esta combinación. Prueba «Extraer precios».</td></tr>
                ) : (
                  rows.map((r, i) => (
                    <tr key={i} className="hover:bg-neutral-50">
                      <td className="px-4 py-3"><Badge color="blue" variant="ring">{r.aseguradora}</Badge></td>
                      <td className="px-4 py-3 font-medium text-neutral-900">{r.nombre_plan}</td>
                      <td className="px-4 py-3 text-right text-neutral-600">{fmtMoney(r.suma_asegurada)}</td>
                      <td className="px-4 py-3 text-right font-medium text-neutral-900">{fmtMoney(r.prima_mensual)}</td>
                      <td className="px-4 py-3 text-right text-neutral-600">{fmtMoney(r.prima_anual)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}
