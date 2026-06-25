"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { SectionCard, EmptyState, Button, Badge } from "@/components/ui";
import { Users, Plus, Edit, Trash } from "@/components/ui/icons";
import UserFormModal from "./user-form-modal";

export type AppUser = {
  id: string;
  email: string;
  role: "admin" | "editor";
  createdAt: string;
  lastSignInAt: string | null;
};

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat("es", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(iso));
  } catch {
    return "—";
  }
}

export default function UsuariosManager({ users, currentUserId }: { users: AppUser[]; currentUserId: string }) {
  const router = useRouter();
  const [modal, setModal] = useState<{ open: boolean; editing: AppUser | null }>({ open: false, editing: null });
  const [confirm, setConfirm] = useState<AppUser | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete(u: AppUser) {
    setDeleting(true);
    await fetch(`/api/usuarios/${u.id}`, { method: "DELETE" });
    setDeleting(false);
    setConfirm(null);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <SectionCard
        icon={<Users size={18} />}
        title="Accesos al dashboard"
        description="Crea y gestiona quién entra al panel."
        action={
          <Button variant="primary" size="sm" leftIcon={<Plus size={14} />} onClick={() => setModal({ open: true, editing: null })}>
            Nuevo usuario
          </Button>
        }
      >
        <p className="text-xs text-neutral-500">
          <span className="font-medium text-neutral-700">Admin</span> hace todo. {" "}
          <span className="font-medium text-blue-700">Editor</span> usa Operación (Inbox, Leads) y Contenido/Avisos/Precios,
          pero NO entra a Configuración (Agente, Tools, Seguimiento, Alertas, Settings, Usuarios).
        </p>
      </SectionCard>

      {users.length === 0 ? (
        <EmptyState
          icon={<Users size={24} />}
          title="Sin usuarios"
          description="Creá el primer acceso al panel."
          action={
            <Button variant="primary" size="sm" leftIcon={<Plus size={14} />} onClick={() => setModal({ open: true, editing: null })}>
              Nuevo usuario
            </Button>
          }
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-card">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[640px]">
              <thead className="bg-neutral-50/60 text-left">
                <tr>
                  <th className="px-4 py-2.5 text-[11px] font-medium uppercase tracking-wider text-neutral-400">Email</th>
                  <th className="px-4 py-2.5 text-[11px] font-medium uppercase tracking-wider text-neutral-400">Rol</th>
                  <th className="px-4 py-2.5 text-[11px] font-medium uppercase tracking-wider text-neutral-400">Último acceso</th>
                  <th className="px-4 py-2.5 text-[11px] font-medium uppercase tracking-wider text-neutral-400">Creado</th>
                  <th className="px-4 py-2.5 text-[11px] font-medium uppercase tracking-wider text-neutral-400 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {users.map((u) => (
                  <tr key={u.id}>
                    <td className="px-4 py-3 text-neutral-900">
                      {u.email}
                      {u.id === currentUserId && <span className="ml-2 text-[11px] text-neutral-400">(vos)</span>}
                    </td>
                    <td className="px-4 py-3">
                      <Badge color={u.role === "admin" ? "violet" : "blue"}>{u.role === "admin" ? "Admin" : "Editor"}</Badge>
                    </td>
                    <td className="px-4 py-3 text-neutral-500">{fmtDate(u.lastSignInAt)}</td>
                    <td className="px-4 py-3 text-neutral-500">{fmtDate(u.createdAt)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="sm" aria-label="Editar" className="p-1.5" onClick={() => setModal({ open: true, editing: u })}>
                          <Edit size={15} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          aria-label="Borrar"
                          disabled={u.id === currentUserId}
                          className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 disabled:opacity-40"
                          onClick={() => setConfirm(u)}
                        >
                          <Trash size={15} />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <UserFormModal
        key={modal.editing?.id ?? "new"}
        open={modal.open}
        editing={modal.editing}
        onClose={() => setModal({ open: false, editing: null })}
        onSaved={() => {
          setModal({ open: false, editing: null });
          router.refresh();
        }}
      />

      <ConfirmDialog
        open={confirm !== null}
        title="Borrar usuario"
        description={confirm ? `Se eliminará el acceso de ${confirm.email}. Esta acción es irreversible.` : ""}
        confirmLabel="Borrar"
        cancelLabel="Cancelar"
        tone="danger"
        busy={deleting}
        onCancel={() => setConfirm(null)}
        onConfirm={() => confirm && handleDelete(confirm)}
      />
    </div>
  );
}
