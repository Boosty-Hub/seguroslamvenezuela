import { PageShell } from "@/components/ui";
import PreciosClient from "./precios-client";

export const dynamic = "force-dynamic";

export default function PreciosDiariosPage() {
  return (
    <PageShell
      title="Precios Diarios"
      description="Cotizaciones de salud del mercado venezolano: scraping del cotizador + extracción de precios con Claude vision. El agente también las consulta vía la tool buscar_precios_seguros."
    >
      <PreciosClient />
    </PageShell>
  );
}
