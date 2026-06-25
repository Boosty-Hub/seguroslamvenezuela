import { createSupabaseServerClient } from "@/lib/supabase/server";
import { PageShell } from "@/components/ui";
import AvisosManager from "./avisos-manager";
import { type Promo } from "./promo-utils";

export const dynamic = "force-dynamic";

export default async function AvisosPage() {
  const supabase = createSupabaseServerClient();

  const { data: rawPromos } = await supabase
    .from("promotions")
    .select("id,name,content,kind,starts_at,ends_at,weekdays,enabled")
    .order("created_at", { ascending: false });

  const promos = (rawPromos ?? []) as Promo[];

  return (
    <PageShell
      title="Avisos y novedades"
      description="Eventos, promociones y situaciones transitorias que el agente debe conocer. Vencen solas por fecha; los avisos/situaciones el agente los considera siempre."
    >
      <AvisosManager promos={promos} />
    </PageShell>
  );
}
