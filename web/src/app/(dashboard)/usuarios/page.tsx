import { redirect } from "next/navigation";
import { PageShell } from "@/components/ui";
import { createServiceClient } from "@/lib/supabase/service";
import { getSessionRole } from "@/lib/auth-role";
import UsuariosManager, { type AppUser } from "./usuarios-manager";

export const dynamic = "force-dynamic";

export default async function UsuariosPage() {
  // Solo-admin (el middleware ya bloquea, esto es defensa adicional + el currentUserId).
  const session = await getSessionRole();
  if (!session) redirect("/login");
  if (session.role !== "admin") redirect("/inbox");

  const service = createServiceClient();
  const { data } = await service.auth.admin.listUsers({ page: 1, perPage: 200 });
  const users: AppUser[] = (data?.users ?? []).map((u) => ({
    id: u.id,
    email: u.email ?? "",
    role: (u.app_metadata as Record<string, unknown> | null)?.role === "editor" ? "editor" : "admin",
    createdAt: u.created_at,
    lastSignInAt: u.last_sign_in_at ?? null,
  }));

  return (
    <PageShell
      title="Usuarios"
      description="Crea y gestiona quién entra al panel, con rol admin o editor."
    >
      <UsuariosManager users={users} currentUserId={session.userId} />
    </PageShell>
  );
}
