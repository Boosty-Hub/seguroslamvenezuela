"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// Combina apagar/prender + frecuencia en un solo control. "Desactivado" apaga
// el aprendizaje automático; cualquier otra opción lo prende con esa cadencia.
const OPTIONS: { value: string; label: string }[] = [
  { value: "off", label: "Desactivado" },
  { value: "1", label: "Diario" },
  { value: "2", label: "Cada 2 días" },
  { value: "3", label: "Cada 3 días" },
  { value: "7", label: "Semanal" },
  { value: "14", label: "Cada 14 días" },
  { value: "30", label: "Mensual (30 días)" },
];

export default function ScheduleSelector({
  enabled,
  everyDays,
}: {
  enabled: boolean;
  everyDays: number;
}) {
  const router = useRouter();
  const initial = !enabled ? "off" : String(everyDays);
  const [value, setValue] = useState(OPTIONS.some((o) => o.value === initial) ? initial : "1");
  const [busy, setBusy] = useState(false);

  async function change(next: string) {
    const prev = value;
    setValue(next);
    setBusy(true);
    try {
      const payload =
        next === "off" ? { enabled: false } : { enabled: true, everyDays: Number(next) };
      const res = await fetch("/api/dreams/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      router.refresh();
    } catch {
      setValue(prev);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-neutral-700">Aprendizaje automático</label>
      <select
        value={value}
        disabled={busy}
        onChange={(e) => change(e.target.value)}
        className="rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-sm text-neutral-800 focus:border-neutral-900 focus:outline-none focus:ring-1 focus:ring-neutral-900 disabled:opacity-50"
      >
        {OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <p className="max-w-xs text-[11px] leading-snug text-neutral-500">
        {value === "off"
          ? "El análisis automático está apagado. Puedes correrlo manualmente con «Generar»."
          : "Cada cuánto el agente analiza las conversaciones y destila aprendizajes solo."}
      </p>
    </div>
  );
}
