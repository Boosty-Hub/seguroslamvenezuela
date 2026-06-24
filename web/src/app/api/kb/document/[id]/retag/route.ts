import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { isValidCollection, isValidPolicyType } from "@/lib/collections";

export const runtime = "nodejs";

// Re-etiqueta un documento (aseguradora / tipo de póliza) sin re-procesarlo.
// Propaga a kb_documents + kb_chunks vía la función SQL retag_kb_document (0045).
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }

  const collection = typeof body.collection === "string" && body.collection.trim() ? body.collection.trim() : null;
  const policyType = typeof body.policy_type === "string" && body.policy_type.trim() ? body.policy_type.trim() : null;
  if (collection && !isValidCollection(collection))
    return NextResponse.json({ error: `collection inválida: ${collection}` }, { status: 400 });
  if (policyType && !isValidPolicyType(policyType))
    return NextResponse.json({ error: `policy_type inválido: ${policyType}` }, { status: 400 });

  const svc = createServiceClient();
  const { error } = await svc.rpc("retag_kb_document", {
    p_doc: params.id,
    p_collection: collection,
    p_policy_type: policyType,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, collection, policy_type: policyType });
}
