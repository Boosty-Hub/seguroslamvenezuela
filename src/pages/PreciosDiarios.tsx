import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  ShieldCheck, FileText, RefreshCw, CalendarDays,
  CheckCircle2, XCircle, Clock, ExternalLink,
  BookOpen, LayoutDashboard, TrendingUp, List,
} from "lucide-react";
import { usePreciosDiarios, usePlanCatalog, type DiaResumen, type CotizacionDiaria } from "@/hooks/usePreciosDiarios";
import { useToast } from "@/hooks/use-toast";

const ASEGURADORAS_LIST = [
  { id: 2,  nombre: "MERCANTIL SEGUROS" },
  { id: 3,  nombre: "SEGUROS CARACAS" },
  { id: 4,  nombre: "SEGUROS UNIVERSITAS" },
  { id: 5,  nombre: "ESTAR SEGUROS" },
  { id: 19, nombre: "LA INTERNACIONAL DE SEGUROS" },
  { id: 20, nombre: "SEGUROS VENEZUELA" },
];

const CATEGORIA_LABEL: Record<string, { label: string; color: string; desc: string }> = {
  basico:     { label: "Básico",     color: "bg-blue-100 text-blue-700",   desc: "Emergencias, APS y planes hasta $50.000" },
  intermedio: { label: "Intermedio", color: "bg-amber-100 text-amber-700", desc: "Planes individuales $51k–$300.000" },
  premium:    { label: "Premium",    color: "bg-purple-100 text-purple-700", desc: "Planes de alta cobertura +$300.000" },
};

const TIPO_LABEL: Record<number, string> = {
  1: "Salud Individual",
  2: "Asistencia / APS",
  3: "Emergencias Médicas",
};

export default function PreciosDiarios() {
  const { toast } = useToast();
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");
  const [syncing, setSyncing] = useState(false);

  // Catalog filters
  const [catAseg, setCatAseg]   = useState<number | undefined>();
  const [catTipo, setCatTipo]   = useState<number | undefined>();

  const { dias, loading, triggerSync } = usePreciosDiarios({
    fechaDesde: fechaDesde || undefined,
    fechaHasta: fechaHasta || undefined,
  });

  const { planes, loading: loadingPlanes } = usePlanCatalog({
    id_aseguradora: catAseg,
    tipo:           catTipo,
  });

  const handleSync = async () => {
    setSyncing(true);
    try {
      const result = await triggerSync();
      if (result.success) {
        toast({ title: "Sincronización exitosa", description: `Fecha: ${result.fecha}` });
      } else if (result.message) {
        toast({ title: "Aviso", description: result.message });
      } else {
        toast({ title: "Error", description: JSON.stringify(result), variant: "destructive" });
      }
    } catch {
      toast({ title: "Error de conexión", variant: "destructive" });
    } finally {
      setSyncing(false);
    }
  };

  const totalDias   = dias.length;
  const diasExito   = dias.filter(d => d.basico?.status === "success").length;
  const ultimoDia   = dias[0];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container flex items-center gap-3 py-4">
          <div className="flex items-center gap-2 text-primary">
            <ShieldCheck className="h-7 w-7" />
            <h1 className="text-xl font-bold tracking-tight">CotiSeguro</h1>
          </div>
          <span className="text-sm text-muted-foreground hidden sm:inline">Precios diarios</span>
          <div className="ml-auto flex gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link to="/"><LayoutDashboard className="h-4 w-4 mr-1.5" />Cotizaciones</Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link to="/base-conocimiento"><BookOpen className="h-4 w-4 mr-1.5" />Base de Conocimiento</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="container py-6 space-y-6">

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                <CalendarDays className="h-4 w-4" /> Días registrados
              </CardTitle>
            </CardHeader>
            <CardContent><p className="text-2xl font-bold">{totalDias}</p></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-green-500" /> Días completos
              </CardTitle>
            </CardHeader>
            <CardContent><p className="text-2xl font-bold text-green-600">{diasExito}</p></CardContent>
          </Card>
          {(["basico", "intermedio", "premium"] as const).map((cat) => (
            ultimoDia?.[cat] ? (
              <Card key={cat}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                    <FileText className="h-4 w-4" /> Último {CATEGORIA_LABEL[cat].label}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {ultimoDia[cat]?.pdf_url ? (
                    <a href={ultimoDia[cat]!.pdf_url!} target="_blank" rel="noopener noreferrer"
                      className="text-sm text-primary underline flex items-center gap-1">
                      {ultimoDia.fecha} <ExternalLink className="h-3 w-3" />
                    </a>
                  ) : (
                    <p className="text-sm text-muted-foreground">Sin datos</p>
                  )}
                </CardContent>
              </Card>
            ) : null
          ))}
        </div>

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-end justify-between">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Desde</label>
              <Input type="date" className="w-40" value={fechaDesde} onChange={e => setFechaDesde(e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Hasta</label>
              <Input type="date" className="w-40" value={fechaHasta} onChange={e => setFechaHasta(e.target.value)} />
            </div>
            {(fechaDesde || fechaHasta) && (
              <Button variant="ghost" size="sm" onClick={() => { setFechaDesde(""); setFechaHasta(""); }}>
                Limpiar
              </Button>
            )}
          </div>
          <Button onClick={handleSync} disabled={syncing}>
            <RefreshCw className={`h-4 w-4 mr-1.5 ${syncing ? "animate-spin" : ""}`} />
            {syncing ? "Sincronizando..." : "Sincronizar ahora"}
          </Button>
        </div>

        <Tabs defaultValue="cotizaciones">
          <TabsList>
            <TabsTrigger value="cotizaciones" className="gap-1.5">
              <TrendingUp className="h-4 w-4" /> Cotizaciones diarias
            </TabsTrigger>
            <TabsTrigger value="catalogo" className="gap-1.5">
              <List className="h-4 w-4" /> Catálogo de planes
            </TabsTrigger>
          </TabsList>

          {/* ── TAB: COTIZACIONES ── */}
          <TabsContent value="cotizaciones" className="mt-4">
            {loading ? (
              <p className="text-center text-muted-foreground py-12">Cargando...</p>
            ) : dias.length === 0 ? (
              <p className="text-center text-muted-foreground py-12">
                No hay registros. Haz clic en "Sincronizar ahora".
              </p>
            ) : (
              <div className="space-y-4">
                {dias.map(dia => <DiaCard key={dia.fecha} dia={dia} />)}
              </div>
            )}
          </TabsContent>

          {/* ── TAB: CATÁLOGO ── */}
          <TabsContent value="catalogo" className="mt-4 space-y-4">
            {/* Catalog filters */}
            <div className="flex flex-wrap gap-3 items-end">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Aseguradora</label>
                <select
                  className="h-9 rounded-md border border-input bg-background px-3 text-sm w-52"
                  value={catAseg ?? ""}
                  onChange={e => setCatAseg(e.target.value ? Number(e.target.value) : undefined)}
                >
                  <option value="">Todas las aseguradoras</option>
                  {ASEGURADORAS_LIST.map(a => (
                    <option key={a.id} value={a.id}>{a.nombre}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Tipo de plan</label>
                <select
                  className="h-9 rounded-md border border-input bg-background px-3 text-sm w-48"
                  value={catTipo ?? ""}
                  onChange={e => setCatTipo(e.target.value ? Number(e.target.value) : undefined)}
                >
                  <option value="">Todos los tipos</option>
                  <option value="1">Salud Individual</option>
                  <option value="2">Asistencia / APS</option>
                  <option value="3">Emergencias Médicas</option>
                </select>
              </div>
            </div>

            <div className="rounded-md border bg-card">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Aseguradora</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead className="text-right">Suma asegurada</TableHead>
                    <TableHead>Categoría</TableHead>
                    <TableHead>Fecha catálogo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingPlanes ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-10 text-muted-foreground">Cargando...</TableCell></TableRow>
                  ) : planes.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-10 text-muted-foreground">Sin datos — sincroniza primero.</TableCell></TableRow>
                  ) : planes.map(plan => (
                    <TableRow key={plan.id}>
                      <TableCell className="font-medium text-sm">{plan.nombre_aseguradora}</TableCell>
                      <TableCell className="text-sm">{plan.nombre_plan}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {TIPO_LABEL[plan.tipo] ?? `Tipo ${plan.tipo}`}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {plan.suma_asegurada > 0
                          ? `$${plan.suma_asegurada.toLocaleString()}`
                          : "—"}
                      </TableCell>
                      <TableCell>
                        <CategoriaBadge sumaAsegurada={plan.suma_asegurada} tipo={plan.tipo} />
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{plan.fecha}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {planes.length > 0 && (
              <p className="text-xs text-muted-foreground text-right">{planes.length} planes · catálogo del día más reciente</p>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

function DiaCard({ dia }: { dia: DiaResumen }) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex items-center gap-2 mb-3">
        <CalendarDays className="h-4 w-4 text-muted-foreground" />
        <span className="font-semibold">{dia.fecha}</span>
        <DiaStatusBadge dia={dia} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {(["basico", "intermedio", "premium"] as const).map(cat => (
          <CategoriaCard key={cat} cat={cat} cot={dia[cat]} />
        ))}
      </div>
    </div>
  );
}

function CategoriaCard({ cat, cot }: { cat: "basico" | "intermedio" | "premium"; cot: CotizacionDiaria | null }) {
  const meta = CATEGORIA_LABEL[cat];
  return (
    <div className="rounded-md border p-3 space-y-2">
      <div className="flex items-center justify-between">
        <Badge className={`${meta.color} hover:${meta.color} text-xs font-semibold`}>
          {meta.label}
        </Badge>
        {cot ? <StatusIcon status={cot.status} /> : <Clock className="h-4 w-4 text-muted-foreground" />}
      </div>
      <p className="text-xs text-muted-foreground">{meta.desc}</p>
      {cot ? (
        <>
          <p className="text-xs text-muted-foreground">{cot.total_planes} planes</p>
          {cot.pdf_url ? (
            <a href={cot.pdf_url} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-primary hover:underline text-sm font-medium">
              <FileText className="h-4 w-4" /> Ver PDF <ExternalLink className="h-3 w-3" />
            </a>
          ) : cot.error_message ? (
            <p className="text-xs text-red-500 line-clamp-2">{cot.error_message}</p>
          ) : null}
        </>
      ) : (
        <p className="text-xs text-muted-foreground italic">Sin datos</p>
      )}
    </div>
  );
}

function StatusIcon({ status }: { status: string }) {
  if (status === "success") return <CheckCircle2 className="h-4 w-4 text-green-500" />;
  if (status === "error")   return <XCircle className="h-4 w-4 text-red-500" />;
  return <Clock className="h-4 w-4 text-muted-foreground" />;
}

function DiaStatusBadge({ dia }: { dia: DiaResumen }) {
  const cats   = [dia.basico, dia.intermedio, dia.premium];
  const ok     = cats.filter(c => c?.status === "success").length;
  const total  = cats.filter(Boolean).length;
  if (ok === 3)       return <Badge className="bg-green-100 text-green-700 hover:bg-green-100 text-xs">Completo</Badge>;
  if (ok > 0)         return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 text-xs">{ok}/3 OK</Badge>;
  if (total > 0)      return <Badge variant="destructive" className="text-xs">Error</Badge>;
  return null;
}

function CategoriaBadge({ sumaAsegurada, tipo }: { sumaAsegurada: number; tipo: number }) {
  if (tipo === 2 || tipo === 3 || sumaAsegurada <= 50000)
    return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 text-xs">Básico</Badge>;
  if (sumaAsegurada <= 300000)
    return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 text-xs">Intermedio</Badge>;
  return <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-100 text-xs">Premium</Badge>;
}
