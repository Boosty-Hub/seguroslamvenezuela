import { NextResponse } from "next/server";
import { getSessionRole } from "@/lib/auth-role";
import { createServiceClient } from "@/lib/supabase/service";

// PATCH /api/usuarios/[id] — cambia rol y/o contraseña (admin-only).
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const session = await getSessionRole();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (session.role !== "admin") return NextResponse.json({ error: "forbidden: requiere rol admin" }, { status: 403 });

  const body = await request.json().catch(() => ({}));
  const attrs: { app_metadata?: { role: "admin" | "editor" }; password?: string } = {};

  if (body.role !== undefined) {
    const role = body.role === "editor" ? "editor" : "admin";
    // No permitir auto-degradarse (evita quedarse sin admins por accidente).
    if (params.id === session.userId && role !== "admin")
      return NextResponse.json({ error: "No podés cambiar tu propio rol" }, { status: 400 });
    attrs.app_metadata = { role };
  }
  if (body.password) {
    if (String(body.password).length < 8)
      return NextResponse.json({ error: "La contraseña debe tener al menos 8 caracteres" }, { status: 400 });
    attrs.password = String(body.password);
  }
  if (!attrs.app_metadata && !attrs.password)
    return NextResponse.json({ error: "Nada para actualizar" }, { status: 400 });

  const service = createServiceClient();
  const { error } = await service.auth.admin.updateUserById(params.id, attrs);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}

// DELETE /api/usuarios/[id] — borra un usuario (admin-only; no a vos mismo).
export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const session = await getSessionRole();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (session.role !== "admin") return NextResponse.json({ error: "forbidden: requiere rol admin" }, { status: 403 });
  if (params.id === session.userId)
    return NextResponse.json({ error: "No podés borrarte a vos mismo" }, { status: 400 });

  const service = createServiceClient();
  const { error } = await service.auth.admin.deleteUser(params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
