"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import PromoCard from "./promo-card";
import PromoFormModal from "./promo-form-modal";
import { SectionCard, EmptyState, Button } from "@/components/ui";
import { Megaphone, Plus } from "@/components/ui/icons";
import { type Promo } from "./promo-utils";

export default function AvisosManager({ promos }: { promos: Promo[] }) {
  const router = useRouter();
  const [modal, setModal] = useState<{ open: boolean; editing: Promo | null }>({
    open: false,
    editing: null,
  });

  const openCreate = () => setModal({ open: true, editing: null });
  const openEdit = (p: Promo) => setModal({ open: true, editing: p });
  const closeModal = () => setModal({ open: false, editing: null });

  async function handleToggle(id: string, next: boolean) {
    await fetch(`/api/promotions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: next }),
    });
    router.refresh();
  }

  async function handleDelete(id: string) {
    await fetch(`/api/promotions/${id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <SectionCard
        icon={<Megaphone size={18} />}
        title="Nuevo aviso, promo o evento"
        description="Información transitoria que el agente conoce en vivo, con vigencia por fechas o días de la semana."
        action={
          <Button variant="primary" size="sm" leftIcon={<Plus size={14} />} onClick={openCreate}>
            Nuevo
          </Button>
        }
      >
        <ul className="space-y-1 text-xs text-neutral-500">
          <li>
            <span className="font-medium text-amber-700">Aviso / situación</span> — el agente lo tiene en
            cuenta <span className="font-semibold">siempre</span> al responder (ej: cierre por emergencia,
            feriado imprevisto).
          </li>
          <li>
            <span className="font-medium text-neutral-700">Promo</span> — el agente la menciona solo si viene
            al caso de lo que pregunta el lead.
          </li>
          <li>
            <span className="font-medium text-violet-700">Evento</span> — como la promo, y además puede
            anticiparlo si empieza dentro de los próximos 7 días.
          </li>
        </ul>
      </SectionCard>

      {promos.length === 0 ? (
        <EmptyState
          icon={<Megaphone size={24} />}
          title="Sin avisos, promos ni eventos"
          description="Crea el primero para que el agente lo conozca al responder."
          action={
            <Button variant="primary" size="sm" leftIcon={<Plus size={14} />} onClick={openCreate}>
              Crear el primero
            </Button>
          }
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {promos.map((promo) => (
            <PromoCard
              key={promo.id}
              promo={promo}
              onToggle={handleToggle}
              onEdit={openEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      <PromoFormModal
        key={modal.editing?.id ?? "new"}
        open={modal.open}
        initial={modal.editing}
        onClose={closeModal}
        onSaved={() => {
          closeModal();
          router.refresh();
        }}
      />
    </div>
  );
}
