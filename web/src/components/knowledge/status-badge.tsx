import { Badge, type BadgeColor } from "@/components/ui";

const MAP: Record<string, { color: BadgeColor; label: string }> = {
  completed: { color: "green", label: "Listo" },
  processing: { color: "amber", label: "Procesando" },
  pending: { color: "blue", label: "Pendiente" },
  error: { color: "red", label: "Error" },
};

export function StatusBadge({ status }: { status?: string | null }) {
  const s = MAP[status ?? "completed"] ?? { color: "neutral" as BadgeColor, label: status ?? "—" };
  return (
    <Badge color={s.color} variant="ring">
      {s.label}
    </Badge>
  );
}
