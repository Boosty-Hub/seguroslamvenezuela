import { PageShell } from "@/components/ui";
import PreciosClient from "./precios-client";

export const dynamic = "force-dynamic";

function ComoFunciona() {
  return (
    <details className="group rounded-xl border border-neutral-200 bg-white shadow-card" open>
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-5 py-3.5 text-sm font-semibold text-neutral-900 select-none">
        ¿Cómo funciona Precios Diarios?
        <span className="text-xs font-normal text-neutral-400 transition-transform group-open:rotate-180">▾</span>
      </summary>

      <div className="space-y-4 border-t border-neutral-100 px-5 py-4 text-sm text-neutral-600">
        <p>
          Cada día se arman los precios de salud del mercado venezolano de forma automática, en{" "}
          <strong className="text-neutral-900">tres pasos</strong>:
        </p>

        <ol className="space-y-3">
          <li className="flex gap-3">
            <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-[11px] font-semibold text-white">1</span>
            <div>
              <p className="font-medium text-neutral-900">Scraping del cotizador (sin IA)</p>
              <p>
                La función <code className="rounded bg-neutral-100 px-1 py-0.5 font-mono text-[11px]">daily-price-sync</code> consulta el cotizador
                oficial de LAM en{" "}
                <code className="rounded bg-neutral-100 px-1 py-0.5 font-mono text-[11px]">mspeed.yoestoyasegurado.co/app/lam</code>{" "}
                (endpoints <code className="rounded bg-neutral-100 px-1 py-0.5 font-mono text-[11px]">planes.php</code> y{" "}
                <code className="rounded bg-neutral-100 px-1 py-0.5 font-mono text-[11px]">cotizar.php</code>). Trae el catálogo de planes de las{" "}
                <strong className="text-neutral-900">6 aseguradoras</strong> (Mercantil, Caracas, Universitas, Estar, La Internacional y Seguros Venezuela)
                y genera <strong className="text-neutral-900">80 cotizaciones de referencia</strong> = 8 subcategorías de plan × 10 rangos de edad. Cada
                cotización devuelve un <strong className="text-neutral-900">PDF oficial</strong>.
              </p>
            </div>
          </li>
          <li className="flex gap-3">
            <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-[11px] font-semibold text-white">2</span>
            <div>
              <p className="font-medium text-neutral-900">Extracción de precios (Claude visión)</p>
              <p>
                La función <code className="rounded bg-neutral-100 px-1 py-0.5 font-mono text-[11px]">extract-prices</code> lee esos PDFs con{" "}
                Claude (visión + JSON estructurado) y extrae los números —prima mensual/anual y suma asegurada por plan— a la tabla de precios del día.
              </p>
            </div>
          </li>
          <li className="flex gap-3">
            <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-[11px] font-semibold text-white">3</span>
            <div>
              <p className="font-medium text-neutral-900">Consulta del agente</p>
              <p>
                Valentina usa la tool <code className="rounded bg-neutral-100 px-1 py-0.5 font-mono text-[11px]">buscar_precios_seguros</code> para
                leer esos precios (los de la última fecha disponible) cuando un cliente pide una cotización de salud en el chat.
              </p>
            </div>
          </li>
        </ol>

        <p className="rounded-lg bg-neutral-50 px-3 py-2 text-xs text-neutral-500">
          🔄 Corre solo: dos tareas programadas cada 10 minutos completan el día y luego no repiten lo ya hecho (idempotente por fecha).
          Los botones de arriba lo disparan manualmente si quieres adelantarlo.
        </p>
      </div>
    </details>
  );
}

export default function PreciosDiariosPage() {
  return (
    <PageShell
      title="Precios Diarios"
      description="Cotizaciones de salud del mercado venezolano: scraping del cotizador oficial de LAM + extracción de precios con Claude visión. El agente también las consulta vía la tool buscar_precios_seguros."
    >
      <div className="space-y-6">
        <ComoFunciona />
        <PreciosClient />
      </div>
    </PageShell>
  );
}
