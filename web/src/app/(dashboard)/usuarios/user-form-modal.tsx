"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff } from "@/components/ui/icons";
import { inputCls } from "@/components/ui/styles";
import type { AppUser } from "./usuarios-manager";

export default function UserFormModal({
  open,
  editing,
  onClose,
  onSaved,
}: {
  open: boolean;
  editing: AppUser | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = editing !== null;
  const [email, setEmail] = useState(editing?.email ?? "");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"admin" | "editor">(editing?.role ?? "editor");
  const [show, setShow] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!isEdit) {
      if (!email.trim()) { setError("Email requerido"); return; }
      if (password.length < 8) { setError("La contraseña debe tener al menos 8 caracteres"); return; }
    } else if (password && password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres");
      return;
    }

    setBusy(true);
    try {
      const url = isEdit ? `/api/usuarios/${editing!.id}` : "/api/usuarios";
      const method = isEdit ? "PATCH" : "POST";
      const body = isEdit
        ? { role, ...(password ? { password } : {}) }
        : { email: email.trim().toLowerCase(), password, role };
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Error al guardar");
        return;
      }
      onSaved();
    } catch {
      setError("Error de red al guardar");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open={open}
      title={isEdit ? "Editar usuario" : "Nuevo usuario"}
      onClose={onClose}
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            Cancelar
          </Button>
          <Button variant="primary" busy={busy} onClick={submit}>
            {isEdit ? "Guardar" : "Crear"}
          </Button>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4">
        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 border border-red-200">{error}</p>
        )}

        <div className="space-y-1">
          <label className="text-xs font-medium text-neutral-700" htmlFor="u-email">
            Email
          </label>
          <input
            id="u-email"
            type="email"
            value={email}
            disabled={isEdit}
            onChange={(e) => setEmail(e.target.value)}
            className={`${inputCls}${isEdit ? " opacity-60" : ""}`}
            placeholder="persona@empresa.com"
            autoComplete="off"
          />
          {isEdit && <p className="text-[11px] text-neutral-400">El email no se puede cambiar.</p>}
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-neutral-700" htmlFor="u-pass">
            {isEdit ? "Nueva contraseña (opcional)" : "Contraseña"}
          </label>
          <div className="relative">
            <input
              id="u-pass"
              type={show ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`${inputCls} pr-10`}
              autoComplete="new-password"
              placeholder={isEdit ? "Dejar vacío para no cambiarla" : "Mínimo 8 caracteres"}
            />
            <button
              type="button"
              onClick={() => setShow((v) => !v)}
              aria-label={show ? "Ocultar contraseña" : "Mostrar contraseña"}
              className="absolute inset-y-0 right-0 flex items-center px-3 text-neutral-400 transition-colors hover:text-neutral-700"
            >
              {show ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-neutral-700">Rol</label>
          <div className="flex gap-2">
            {(["editor", "admin"] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRole(r)}
                className={[
                  "px-3 py-1.5 text-sm font-medium rounded-lg border transition-colors",
                  role === r
                    ? "border-neutral-900 bg-neutral-900 text-white"
                    : "border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50",
                ].join(" ")}
              >
                {r === "admin" ? "Admin" : "Editor"}
              </button>
            ))}
          </div>
          <p className="text-[11px] text-neutral-500">
            {role === "admin"
              ? "Acceso total, incluida Configuración y la gestión de usuarios."
              : "Operación (Inbox, Leads) y Contenido; sin Configuración."}
          </p>
        </div>
      </form>
    </Modal>
  );
}
