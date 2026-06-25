// Rol de sesión (admin | editor). El rol vive en Supabase Auth `app_metadata.role`
// (server-controlled; el usuario NO puede cambiárselo). Un usuario SIN rol
// explícito —el master creado en /first-run— se trata como **admin** para no
// perder acceso. Los usuarios creados desde el módulo /usuarios siempre llevan rol.
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type Role = "admin" | "editor";

export async function getSessionRole(): Promise<{ userId: string; email: string; role: Role } | null> {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const raw = (user.app_metadata as Record<string, unknown> | null)?.role;
  const role: Role = raw === "editor" ? "editor" : "admin";
  return { userId: user.id, email: user.email ?? "", role };
}
