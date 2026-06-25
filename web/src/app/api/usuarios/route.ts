import { NextResponse } from "next/server";
import { getSessionRole } from "@/lib/auth-role";
import { createServiceClient } from "@/lib/supabase/service";

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

// POST /api/usuarios — crea un usuario (admin-only). El email queda confirmado
// (email_confirm: true) → puede loguearse de una, sin flujo de email.
export async function POST(request: Request) {
  const session = await getSessionRole();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (session.role !== "admin") return NextResponse.json({ error: "forbidden: requiere rol admin" }, { status: 403 });

  const body = await request.json().catch(() => ({}));
  const email = String(body.email ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");
  const role = body.role === "editor" ? "editor" : "admin";

  if (!EMAIL_RE.test(email)) return NextResponse.json({ error: "Email inválido" }, { status: 400 });
  if (password.length < 8) return NextResponse.json({ error: "La contraseña debe tener al menos 8 caracteres" }, { status: 400 });

  const service = createServiceClient();
  const { error } = await service.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    app_metadata: { role },
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
