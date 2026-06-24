import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// Lista los documentos de KB asignados a una vertical. Lo consume el panel de
// KB dentro del editor de cada vertical (vertical-kb-panel.tsx).
export async function GET(request: Request) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const vertical = new URL(request.url).searchParams.get("vertical")?.trim();
  if (!vertical) return NextResponse.json({ error: "vertical requerido" }, { status: 400 });

  const { data, error } = await supabase
    .from("kb_documents")
    .select("id, title, source_filename, collection, policy_type, total_chunks, status, created_at")
    .eq("vertical", vertical)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ documents: data ?? [] });
}
