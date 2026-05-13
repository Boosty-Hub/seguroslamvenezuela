import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  FileText, RefreshCw, CalendarDays,
  CheckCircle2, XCircle, Clock, ExternalLink,
  TrendingUp, List, ChevronDown, ChevronUp,
} from "lucide-react";
import {
  usePreciosDiarios, usePlanCatalog,
  type DiaResumen, type CotizacionDiaria, type CategoriaKey, type Subcategoria,
  CATEGORIAS_ORDER, RANGOS_ORDER,
} from "@/hooks/usePreciosDiarios";
import { useToast } from "@/hooks/use-toast";

const ASEGURADORAS_LIST = [
  { id: 2,  nombre: "MERCANTIL SEGUROS" },
  { id: 3,  nombre: "SEGUROS CARACAS" },
  { id: 4,  nombre: "SEGUROS UNIVERSITAS" },
  { id: 5,  nombre: "ESTAR SEGUROS" },
  { id: 19, nombre: "LA INTERNACIONAL DE SEGUROS" },
  { id: 20, nombre: "SEGUROS VENEZUELA" },
];

const CATEGORIA_META: Record<CategoriaKey, { label: string; desc: string; color: string; badgeColor: string; icon: string }> = {
  asistencia_aps:      { label: "APS / Asistencia",    desc: "Consultas y atención ambulatoria",      color: "bg-teal-50 border-teal-200",     badgeColor: "bg-teal-100 text-teal-700",     icon: "🏥" },
  emergencias_medicas: { label: "Emergencias Médicas", desc: "Urgencias hasta $10.000",               color: "bg-red-50 border-red-200",        badgeColor: "bg-red-100 text-red-700",       icon: "🚨" },
  salud_basica_a:      { label: "Salud Básica A",      desc: "Hospitalización hasta $50k",            color: "bg-blue-50 border-blue-200",      badgeColor: "bg-blue-100 text-blue-700",     icon: "💙" },
  salud_basica_b:      { label: "Salud Básica B",      desc: "Estar Seguros hasta $50k",              color: "bg-sky-50 border-sky-200",        badgeColor: "bg-sky-100 text-sky-700",       icon: "💙" },
  salud_estandar:      { label: "Salud Estándar",      desc: "$51k – $100k",                          color: "bg-green-50 border-green-200",    badgeColor: "bg-green-100 text-green-700",   icon: "💚" },
  salud_media:         { label: "Salud Media",         desc: "$101k – $200k",                         color: "bg-amber-50 border-amber-200",    badgeColor: "bg-amber-100 text-amber-700",   icon: "💛" },
  salud_alta:          { label: "Salud Alta",          desc: "$201k – $500k",                         color: "bg-orange-50 border-orange-200",  badgeColor: "bg-orange-100 text-orange-700", icon: "🟠" },
  salud_premium:       { label: "Salud Premium",       desc: "Más de $500k",                          color: "bg-purple-50 border-purple-200",  badgeColor: "bg-purple-100 text-purple-700", icon: "💎" },
};

const TIPO_LABEL: Record<number, string> = {
  1: "Salud Individual",
  2: "Asistencia / APS",
  3: "Emergencias Médicas",
};

const GRUPOS_CATALOGO: Record<"basico"|"intermedio"|"premium", { label: string; badgeColor: string; color: string; subs: CategoriaKey[] }> = {
  basico:     { label: "Básico",     badgeColor: "bg-blue-100 text-blue-700 hover:bg-blue-100",     color: "bg-blue-50 border-blue-200",     subs: ["asistencia_aps","emergencias_medicas","salud_basica_a","salud_basica_b"] },
  intermedio: { label: "Intermedio", badgeColor: "bg-amber-100 text-amber-700 hover:bg-amber-100",  color: "bg-amber-50 border-amber-200",   subs: ["salud_estandar","salud_media"] },
  premium:    { label: "Premium",    badgeColor: "bg-purple-100 text-purple-700 hover:bg-purple-100", color: "bg-purple-50 border-purple-200", subs: ["salud_alta","salud_premium"] },
};

const SUB_LABEL: Record<Subcategoria, { label: string; icon: string }> = {
  asistencia_aps:      { label: "APS / Asistencia",            icon: "🏥" },
  emergencias_medicas: { label: "Emergencias Médicas",         icon: "🚨" },
  salud_basica_a:      { label: "Salud Básica A (hasta $50k)", icon: "💙" },
  salud_basica_b:      { label: "Salud Básica B (Estar)",      icon: "💙" },
  salud_estandar:      { label: "Salud Estándar ($51k–$100k)", icon: "💚" },
  salud_media:         { label: "Salud Media ($101k–$200k)",   icon: "💛" },
  salud_alta:          { label: "Salud Alta ($201k–$500k)",    icon: "🟠" },
  salud_premium:       { label: "Salud Premium (+$500k)",      icon: "💎" },
};

export default function PreciosDiarios() {
  const { toast } = useToast();
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");
  const [syncing, setSyncing]           = useState(false);
  const [extracting, setExtracting]     = useState(false);
  const [syncStatus, setSyncStatus]     = useState("");
  const [catAseg, setCatAseg]       = useState<number | undefined>();
  const [catTipo, setCatTipo]       = useState<number | undefined>();

  const { dias, loading, refetch, triggerSync, triggerExtractPrices } = usePreciosDiarios({
    fechaDesde: fechaDesde || undefined,
    fechaHasta: fechaHasta || undefined,
  });

  const { planes, loading: loadingPlanes } = usePlanCatalog({
    id_aseguradora: catAseg,
    tipo:           catTipo,
  });

  const handleSync = async () => {
    setSyncing(true);
    setSyncStatus("Generando cotizaciones...");
    try {
      // Loop sync until all 80 cotizaciones are done
      let syncTotal = 0;
      for (let i = 0; i < 15; i++) {
        const r = await triggerSync();
        syncTotal = r.total ?? syncTotal;
        if (r.message || r.pendientes === 0) break;
        setSyncStatus(`Cotizaciones: ${syncTotal}/80...`);
      }
      setSyncStatus("Extrayendo precios de PDFs...");

      // Loop extract until all prices are done
      let extractDone = false;
      for (let i = 0; i < 30; i++) {
        const r = await triggerExtractPrices();
        if (r.message || r.pendientes === 0) { extractDone = true; break; }
        setSyncStatus(`Precios: faltan ${r.pendientes}...`);
      }

      await refetch();
      toast({
        title: "Sincronización completa",
        description: `${syncTotal}/80 cotizaciones · Precios ${extractDone ? "extraídos" : "parciales"}`,
      });
    } catch {
      toast({ title: "Error de conexión", variant: "destructive" });
    } finally {
      setSyncing(false);
      setSyncStatus("");
    }
  };

  const handleExtract = async () => {
    setExtracting(true);
    try {
      const result = await triggerExtractPrices();
      if (result.success) {
        const msg = result.pendientes > 0
          ? `${result.extraidos} extraídos · ${result.pendientes} pendientes`
          : `${result.extraidos} extraídos · Todo listo`;
        toast({ title: "Extracción de precios", description: msg });
      } else if (result.message) {
        toast({ title: "Aviso", description: result.message });
      } else {
        toast({ title: "Error", description: JSON.stringify(result), variant: "destructive" });
      }
    } catch {
      toast({ title: "Error de conexión", variant: "destructive" });
    } finally {
      setExtracting(false);
    }
  };

  const ultimoDia   = dias[0];
  const totalDias   = dias.length;
  const totalPdfs   = ultimoDia
    ? Object.values(ultimoDia.categorias).reduce((acc, rangos) =>
        acc + Object.values(rangos).filter(c => c.status === "success").length, 0)
    : 0;

  return (
    <div className="flex-1 overflow-auto">
      <div className="hidden md:flex border-b bg-card px-6 h-14 items-center">
        <h1 className="text-base font-semibold">Precios del Día</h1>
        <span className="ml-3 text-sm text-muted-foreground">Cotizaciones diarias del mercado</span>
      </div>

      <main className="container py-4 sm:py-6 space-y-4 sm:space-y-6">

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="border-l-[3px] border-l-blue-400">
            <CardHeader className="pb-1 pt-4 px-4">
              <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-2">
                <div className="h-6 w-6 rounded-md bg-blue-100 flex items-center justify-center shrink-0">
                  <CalendarDays className="h-3.5 w-3.5 text-blue-600" />
                </div>
                Días registrados
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4"><p className="text-3xl font-bold">{totalDias}</p></CardContent>
          </Card>
          <Card className="border-l-[3px] border-l-green-400">
            <CardHeader className="pb-1 pt-4 px-4">
              <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-2">
                <div className="h-6 w-6 rounded-md bg-green-100 flex items-center justify-center shrink-0">
                  <FileText className="h-3.5 w-3.5 text-green-600" />
                </div>
                PDFs hoy
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <p className="text-3xl font-bold text-green-600">{totalPdfs}<span className="text-base font-normal text-muted-foreground">/80</span></p>
            </CardContent>
          </Card>
          <Card className="border-l-[3px] border-l-violet-400">
            <CardHeader className="pb-1 pt-4 px-4">
              <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-2">
                <div className="h-6 w-6 rounded-md bg-violet-100 flex items-center justify-center shrink-0">
                  <TrendingUp className="h-3.5 w-3.5 text-violet-600" />
                </div>
                Subcategorías
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4"><p className="text-3xl font-bold">8</p></CardContent>
          </Card>
          <Card className="border-l-[3px] border-l-amber-400">
            <CardHeader className="pb-1 pt-4 px-4">
              <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-2">
                <div className="h-6 w-6 rounded-md bg-amber-100 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="h-3.5 w-3.5 text-amber-600" />
                </div>
                Rangos de edad
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4"><p className="text-3xl font-bold">10</p></CardContent>
          </Card>
        </div>

        {/* Toolbar */}
        <div className="flex flex-col gap-3">
          <div className="rounded-lg border bg-card/60 px-3 py-2 flex gap-3 items-end">
            <div className="space-y-1 flex-1 min-w-0">
              <label className="text-xs font-medium text-muted-foreground">Desde</label>
              <Input type="date" className="w-full h-8 text-sm" value={fechaDesde} onChange={e => setFechaDesde(e.target.value)} />
            </div>
            <div className="space-y-1 flex-1 min-w-0">
              <label className="text-xs font-medium text-muted-foreground">Hasta</label>
              <Input type="date" className="w-full h-8 text-sm" value={fechaHasta} onChange={e => setFechaHasta(e.target.value)} />
            </div>
            {(fechaDesde || fechaHasta) && (
              <Button variant="ghost" size="sm" className="h-8 text-xs shrink-0" onClick={() => { setFechaDesde(""); setFechaHasta(""); }}>
                Limpiar
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleExtract} disabled={extracting} size="sm" className="flex-1 sm:flex-none">
              <FileText className={`h-4 w-4 mr-1.5 ${extracting ? "animate-pulse" : ""}`} />
              {extracting ? "Extrayendo..." : "Extraer precios"}
            </Button>
            <Button onClick={handleSync} disabled={syncing} className="flex-1 sm:flex-none">
              <RefreshCw className={`h-4 w-4 mr-1.5 ${syncing ? "animate-spin" : ""}`} />
              {syncing ? (syncStatus || "Sincronizando...") : "Sincronizar ahora"}
            </Button>
          </div>
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
              <div className="space-y-6">
                {dias.map(dia => <DiaCard key={dia.fecha} dia={dia} />)}
              </div>
            )}
          </TabsContent>

          {/* ── TAB: CATÁLOGO ── */}
          <TabsContent value="catalogo" className="mt-4 space-y-4">
            <div className="flex flex-col sm:flex-row flex-wrap gap-3 items-start sm:items-end">
              <div className="space-y-1 w-full sm:w-auto">
                <label className="text-xs text-muted-foreground">Aseguradora</label>
                <select
                  className="h-9 rounded-md border border-input bg-background px-3 text-sm w-full sm:w-52"
                  value={catAseg ?? ""}
                  onChange={e => setCatAseg(e.target.value ? Number(e.target.value) : undefined)}
                >
                  <option value="">Todas las aseguradoras</option>
                  {ASEGURADORAS_LIST.map(a => (
                    <option key={a.id} value={a.id}>{a.nombre}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1 w-full sm:w-auto">
                <label className="text-xs text-muted-foreground">Tipo de plan</label>
                <select
                  className="h-9 rounded-md border border-input bg-background px-3 text-sm w-full sm:w-48"
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

            {loadingPlanes ? (
              <p className="text-center text-muted-foreground py-12">Cargando...</p>
            ) : planes.length === 0 ? (
              <p className="text-center text-muted-foreground py-12">Sin datos — sincroniza primero.</p>
            ) : (
              <div className="space-y-6">
                {(Object.entries(GRUPOS_CATALOGO) as [string, typeof GRUPOS_CATALOGO["basico"]][]).map(([grupoKey, grupo]) => {
                  const planesGrupo = planes.filter(p => grupo.subs.includes(p.subcategoria));
                  if (planesGrupo.length === 0) return null;
                  return (
                    <div key={grupoKey} className={`rounded-lg border p-4 ${grupo.color}`}>
                      <div className="flex items-center gap-2 mb-3">
                        <Badge className={`${grupo.badgeColor} font-semibold`}>{grupo.label}</Badge>
                        <span className="text-xs text-muted-foreground">{planesGrupo.length} planes</span>
                      </div>
                      <div className="space-y-4">
                        {grupo.subs.map(sub => {
                          const planesSub = planesGrupo.filter(p => p.subcategoria === sub);
                          if (planesSub.length === 0) return null;
                          const meta = SUB_LABEL[sub];
                          return (
                            <div key={sub}>
                              <p className="text-xs font-semibold text-muted-foreground mb-1.5">
                                {meta.icon} {meta.label} <span className="font-normal">({planesSub.length})</span>
                              </p>
                              <div className="rounded-md border bg-card overflow-hidden">
                                <Table>
                                  <TableHeader>
                                    <TableRow>
                                      <TableHead className="text-xs">Aseguradora</TableHead>
                                      <TableHead className="text-xs">Plan</TableHead>
                                      <TableHead className="text-xs text-right">Suma asegurada</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {planesSub.map(plan => (
                                      <TableRow key={plan.id}>
                                        <TableCell className="text-sm font-medium">{plan.nombre_aseguradora}</TableCell>
                                        <TableCell className="text-sm">{plan.nombre_plan}</TableCell>
                                        <TableCell className="text-right font-mono text-sm">
                                          {plan.suma_asegurada > 0 ? `$${plan.suma_asegurada.toLocaleString()}` : "—"}
                                        </TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
                <p className="text-xs text-muted-foreground text-right">{planes.length} planes · catálogo del día más reciente</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

function DiaCard({ dia }: { dia: DiaResumen }) {
  const totalOk = Object.values(dia.categorias).reduce((acc, rangos) =>
    acc + Object.values(rangos).filter(c => c.status === "success").length, 0
  );
  const pct = Math.round((totalOk / 80) * 100);
  return (
    <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
      <div className="px-4 py-3 flex items-center justify-between gap-3 border-b bg-muted/30">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-muted-foreground" />
          <span className="font-semibold text-sm">{dia.fecha}</span>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 flex-1 justify-end">
          <div className="flex items-center gap-2 flex-1 max-w-[120px] sm:max-w-[140px]">
            <Progress value={pct} className="h-1.5 flex-1" />
            <span className="text-xs text-muted-foreground tabular-nums shrink-0">{pct}%</span>
          </div>
          <Badge className={`text-xs shrink-0 ${totalOk === 80 ? "bg-green-100 text-green-700" : totalOk > 0 ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"}`}>
            {totalOk}/80
          </Badge>
        </div>
      </div>
      <div className="p-3 sm:p-4 grid grid-cols-1 md:grid-cols-2 gap-2 sm:gap-3 items-start">
        {CATEGORIAS_ORDER.map(cat => (
          <SubcategoriaCard key={cat} cat={cat} rangos={dia.categorias[cat] ?? {}} />
        ))}
      </div>
    </div>
  );
}

function SubcategoriaCard({ cat, rangos }: { cat: CategoriaKey; rangos: Record<string, CotizacionDiaria> }) {
  const [open, setOpen] = useState(false);
  const meta = CATEGORIA_META[cat];
  const total    = RANGOS_ORDER.length;
  const exitosos = RANGOS_ORDER.filter(r => rangos[r]?.status === "success").length;
  const pct = Math.round((exitosos / total) * 100);

  return (
    <div className={`rounded-lg border p-3 space-y-2 ${meta.color}`}>
      <button
        type="button"
        className="w-full flex items-center justify-between gap-2"
        onClick={e => { e.stopPropagation(); setOpen(o => !o); }}
      >
        <div className="flex items-center gap-2.5">
          <span className="text-lg leading-none">{meta.icon}</span>
          <div className="text-left">
            <p className="text-sm font-semibold leading-tight">{meta.label}</p>
            <p className="text-xs text-muted-foreground leading-tight mt-0.5">{meta.desc}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Badge className={`${meta.badgeColor} text-xs tabular-nums`}>{exitosos}/{total}</Badge>
          {open ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
        </div>
      </button>

      <Progress value={pct} className="h-1 opacity-70" />

      {open && (
        <div className="pt-2 border-t space-y-0.5">
          {RANGOS_ORDER.map(rango => {
            const cot = rangos[rango];
            return (
              <div key={rango} className="flex items-center justify-between py-1.5 px-2 rounded-md bg-background/70 hover:bg-background/90 transition-colors">
                <span className="text-xs font-medium text-muted-foreground w-16">{rango} años</span>
                {cot?.status === "success" && cot.pdf_url ? (
                  <a href={cot.pdf_url} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-primary hover:underline text-xs font-medium">
                    <FileText className="h-3 w-3" /> Ver PDF <ExternalLink className="h-3 w-3" />
                  </a>
                ) : cot?.status === "error" ? (
                  <span className="text-xs text-red-500 flex items-center gap-1"><XCircle className="h-3 w-3" /> Error</span>
                ) : (
                  <span className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" /> Pendiente</span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function CategoriaBadge({ sumaAsegurada, tipo }: { sumaAsegurada: number; tipo: number }) {
  if (tipo === 2 || tipo === 3 || sumaAsegurada <= 50000)
    return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 text-xs">Básico</Badge>;
  if (sumaAsegurada <= 300000)
    return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 text-xs">Intermedio</Badge>;
  return <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-100 text-xs">Premium</Badge>;
}
