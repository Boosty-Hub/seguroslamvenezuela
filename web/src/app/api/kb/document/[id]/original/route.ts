import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

// Devuelve (redirige a) una signed URL del binario original en el bucket privado
// knowledge-files. Vale 5 min. Si el doc no tiene binario (p.ej. contenido inline)
// → 404.
export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data: doc, error } = await supabase
    .from("kb_documents")
    .select("storage_path")
    .eq("id", params.id)
    .single();
  if (error || !doc?.storage_path) {
    return NextResponse.json({ error: "este documento no tiene archivo original" }, { status: 404 });
  }

  const { data: signed, error: signErr } = await supabase.storage
    .from("knowledge-files")
    .createSignedUrl(doc.storage_path, 300);
  if (signErr || !signed) {
    return NextResponse.json({ error: signErr?.message ?? "no se pudo firmar la URL" }, { status: 500 });
  }

  return NextResponse.redirect(signed.signedUrl);
}
