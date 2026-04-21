import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, ShieldCheck, BookOpen, TrendingUp } from "lucide-react";
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
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container flex items-center gap-3 py-4">
          <div className="flex items-center gap-2 text-primary">
            <ShieldCheck className="h-7 w-7" />
            <h1 className="text-xl font-bold tracking-tight">CotiSeguro</h1>
          </div>
          <span className="text-sm text-muted-foreground hidden sm:inline">
            Gestión de cotizaciones de seguros
          </span>
          <div className="ml-auto flex gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link to="/precios-diarios">
                <TrendingUp className="h-4 w-4 mr-1.5" />
                Precios del Día
              </Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link to="/base-conocimiento">
                <BookOpen className="h-4 w-4 mr-1.5" />
                Base de Conocimiento
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="container py-6 space-y-6">
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
