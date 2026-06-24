import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { setConfigValues } from "@/lib/runtime-config";

// Programación del aprendizaje automático (Dreams). Vive en runtime_config:
//   DREAMS_ENABLED    "true" | "false"  → prende/apaga las corridas del cron
//   DREAMS_EVERY_DAYS entero >= 1       → cada cuántos días corre el análisis diario
// El gating real lo aplica la Edge Function dreams-run (el cron sigue disparando
// a diario, pero la función se auto-salta según esta config). El run manual fuerza.
export async function POST(request: Request) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body: { enabled?: unknown; everyDays?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }

  const updates: Record<string, string> = {};

  if (body.enabled !== undefined) {
    if (typeof body.enabled !== "boolean")
      return NextResponse.json({ error: "enabled debe ser boolean" }, { status: 400 });
    updates.DREAMS_ENABLED = body.enabled ? "true" : "false";
  }

  if (body.everyDays !== undefined) {
    const n = Number(body.everyDays);
    if (!Number.isInteger(n) || n < 1 || n > 30)
      return NextResponse.json({ error: "everyDays debe ser un entero entre 1 y 30" }, { status: 400 });
    updates.DREAMS_EVERY_DAYS = String(n);
  }

  if (Object.keys(updates).length === 0)
    return NextResponse.json({ error: "nada para actualizar" }, { status: 400 });

  await setConfigValues(updates, user.email ?? "dashboard");
  return NextResponse.json({ ok: true, ...updates });
}
