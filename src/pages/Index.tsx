import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search } from "lucide-react";
import { useQuotes } from "@/hooks/useQuotes";
import { QuotesTable } from "@/components/QuotesTable";
import { QuoteFormDialog } from "@/components/QuoteFormDialog";
import { StatsCards } from "@/components/StatsCards";
import type { Quote } from "@/types/quote";
import { useToast } from "@/hooks/use-toast";

const Index = () => {
  const { quotes, addQuote, updateQuote, deleteQuote } = useQuotes();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Quote | undefined>();

  const filtered = useMemo(() => {
    if (!search.trim()) return quotes;
    const q = search.toLowerCase();
    return quotes.filter(
      (item) =>
        item.clientName.toLowerCase().includes(q) ||
        item.insurer.toLowerCase().includes(q) ||
        item.insuranceType.toLowerCase().includes(q) ||
        item.status.includes(q)
    );
  }, [quotes, search]);

  const handleEdit = (quote: Quote) => {
    setEditing(quote);
    setDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    deleteQuote(id);
    toast({ title: "Cotización eliminada" });
  };

  const handleSubmit = (data: Omit<Quote, "id" | "createdAt">) => {
    if (editing) {
      updateQuote(editing.id, data);
      toast({ title: "Cotización actualizada" });
    } else {
      addQuote(data);
      toast({ title: "Cotización creada" });
    }
    setEditing(undefined);
  };

  return (
    <div className="flex-1 overflow-auto">
      <div className="hidden md:flex border-b bg-card px-6 h-14 items-center">
        <h1 className="text-base font-semibold">Cotizaciones</h1>
        <span className="ml-3 text-sm text-muted-foreground">Gestión de cotizaciones de seguros</span>
      </div>

      <main className="container py-4 sm:py-6 space-y-4 sm:space-y-6">
        <StatsCards quotes={quotes} />

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por cliente, aseguradora..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Button
            className="w-full sm:w-auto"
            onClick={() => {
              setEditing(undefined);
              setDialogOpen(true);
            }}
          >
            <Plus className="h-4 w-4 mr-1.5" />
            Nueva cotización
          </Button>
        </div>

        <QuotesTable quotes={filtered} onEdit={handleEdit} onDelete={handleDelete} />
      </main>

      <QuoteFormDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setEditing(undefined);
        }}
        onSubmit={handleSubmit}
        initial={editing}
      />
    </div>
  );

};

export default Index;
