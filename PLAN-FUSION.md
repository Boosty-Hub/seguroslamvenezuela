# Plan de Implementación — Fusión "Seguros LAM" sobre el Template Anthropic Managed Agent (Next.js 14 + Supabase + Kommo)

## A. Resumen ejecutivo de la fusión

El repositorio destino **Seguros LAM - Agente** es hoy una SPA React+Vite que hace RAG con OpenAI (embeddings `text-embedding-3-small` 1536, OCR `gpt-4o-mini`/`gpt-4o`) sobre una tabla genérica `documents` + RPC `match_documents`. Esta fusión lo **reconstruye sobre la base del template `Template-Agent-kommo`** (monorepo Next.js 14 App Router + Supabase Edge Functions Deno + Anthropic Managed Agent (CMA) + Kommo + dreams + memory stores + dashboard), y le **fusiona la riqueza propia de LAM**: la taxonomía de aseguradoras/tipos de póliza, el OCR de imágenes y PDF escaneado, el soporte XLSX/CSV, el bucket de archivos con preview, los estados de procesamiento, y el módulo **Precios Diarios** (scraping del cotizador externo + extracción de precios por visión).

La regla absoluta es **SIN OpenAI en ningún punto**:
- Embeddings = Edge Function `embed` del template (`Supabase.ai.Session("gte-small")`, 384 dims).
- OCR de imágenes / PDF escaneado y extracción de precios = **Claude vision** (Anthropic SDK), reusando el patrón ya existente en `process-inbound` del template (bloques `{type:"image"|"document"}` + `output_config.format` json_schema).
- Whisper / notas de voz entrantes = **fuera de alcance**.

El resultado es un único sistema en el repo Seguros LAM: dashboard Next.js con inbox/leads/contenido/precios-diarios, agente CMA que responde con `search_kb` filtrado por taxonomía, memoria por lead, dreams nocturnos, y el pipeline de Precios Diarios alimentando `daily_prices`.

---

## B. Premisa y decisiones cerradas (no se cuestionan)

| # | Decisión | Detalle |
|---|----------|---------|
| 1 | **Repo destino = Seguros LAM** | `C:/Users/marke/Desktop/Github Projects/Seguros LAM - Agente`. Todo el sistema fusionado vive aquí. |
| 2 | **Template = solo lectura** | `C:/Users/marke/Desktop/Github Projects/Template-Agent-kommo` NO se modifica. Se **copia** de él hacia el destino. |
| 3 | **Sin OpenAI** | Embeddings → `embed` (gte-small 384). OCR/precios → Claude vision. Se elimina la dependencia `openai` y todo `import OpenAI`. |
| 4 | **Taxonomía + filtro** | Portar 8 aseguradoras (`COLLECTIONS`) + 13 tipos de póliza (`POLICY_TYPES`) de `src/lib/collections.ts`; filtrar `search_kb` por metadata. |
| 5 | **Precios Diarios = EN alcance** | Módulo aparte: `daily-price-sync` (scraper sin IA) + `extract-prices` (reconvertido a Claude) + UI dashboard + crons. |
| 6 | **Voz = solo documentos/conocimiento** | La sección `/voz` (voice_samples = estilo de escritura) SÍ se usa. Audio entrante (Whisper) NO se porta. |
| 7 | **Gestor pnpm** | Se eliminan lockfiles bun/npm. Netlify usa `pnpm build`. |
| 8 | **Provisioning zero-CLI** | Toda migración/función debe vivir en `supabase/migrations|functions` del **repo destino** ANTES del build; `embed-provision.mjs` (predev/prebuild) las embebe y `/first-run` las despliega vía Management API. |

---

## C. Arquitectura objetivo (cómo queda el repo LAM ya fusionado)

```
Seguros LAM - Agente/  (Next.js 14 monorepo, ex-Vite)
├── package.json, netlify.toml, .env.example, .gitignore, CLAUDE.md, pnpm-lock.yaml   (del template)
├── agent/                       system-prompt.example.md (+ system-prompt.md por operador, gitignored)
├── web/                         DASHBOARD Next.js 14 App Router
│   ├── scripts/embed-provision.mjs        codegen: embebe migrations + functions en *.generated.ts
│   └── src/
│       ├── app/(dashboard)/     inbox, leads, contenido(voz|kb|promos), precios-diarios(NUEVO),
│       │                        verticales, outcomes, consumo, dreams, seguimiento, agent, tools, alerts, settings
│       ├── app/api/             kb/ingest, kb/document/[id], voz/*, promotions/*, precios/*(NUEVO), provision/*, setup/*
│       ├── lib/                 embed, kb-parsers, chunking, collections(NUEVO), precios(NUEVO),
│       │                        agent-prompt, sync-agent-tools, anthropic-managed, runtime-config, memory, supabase/*
│       └── components/          ui/* + knowledge/*(PORTADO de LAM, re-estilado)
└── supabase/
    ├── config.toml              project_id=nhszqqqqlcwmcsjmgrmv + verify_jwt=false (incl. daily-price-sync/extract-prices)
    ├── migrations/              0001-0041 (template core) + 0042+ (taxonomía, bucket, Precios Diarios, crons)
    └── functions/
        ├── _shared/             config, usage, exchange, kommo, business-hours...
        ├── embed/               gte-small 384 (ÚNICO generador de embeddings)
        ├── generate-response/   CMA + runSearchKb (EXTENDIDO con filtros taxonomía)
        ├── process-inbound/     clasificación Haiku + patrón Claude vision
        ├── dreams-run, alerts-scan, follow-up-scan, evaluate-outcomes, kommo-webhook, publish-to-kommo
        ├── daily-price-sync/    (PORTADO de LAM, scraper sin IA)
        └── extract-prices/      (PORTADO de LAM, RECONVERTIDO a Claude vision)
```

**Dos canales de "KB" distintos** (no confundir): `search_kb` (RAG Postgres `kb_chunks` vector 384) para datos factuales de LAM; y la carpeta `/kb//voice//dreams/` del **master Memory Store** (filesystem que el agente lee por grep) para voz/reglas destiladas.

---

## D. Grafo de dependencias entre fases

```
Fase 0 (esqueleto Next.js + pnpm + env + Supabase) ── base de todo
   │
   ├─► Fase 1 (limpiar Vite + adoptar package.json/config destino)
   │       │
   │       └─► Fase 2 (copiar supabase/ core del template + config.toml LAM + build verde con /first-run)
   │               │
   │               ├─► Fase 3 (taxonomía: collections.ts + metadata + ALTER kb)
   │               │       │
   │               │       ├─► Fase 4 (search_kb p_filter + agent_tools input_schema + runSearchKb + sync)
   │               │       │
   │               │       └─► Fase 5 (bucket + estados + OCR Claude en ingest + kb-parsers XLSX/imagen)
   │               │               │
   │               │               └─► Fase 6 (UI Contenido + knowledge/* portado: selector/lista/preview/cola)
   │               │
   │               ├─► Fase 7 (Precios Diarios: migraciones 0042+ + tablas + crons parametrizados)
   │               │       │
   │               │       └─► Fase 8 (extract-prices → Claude vision; daily-price-sync portado)
   │               │               │
   │               │               └─► Fase 9 (UI Precios Diarios + route handlers + nav)
   │               │
   │               └─► Fase 10 (validación E2E + apagar n8n + rotar anon key expuesta + go-live)
```

Fases 3-6 (cadena KB) y 7-9 (cadena Precios) son **paralelizables entre sí** una vez completada la Fase 2. La Fase 10 cierra todo.

---
---

## FASE 0 — Preparación: esqueleto Next.js, pnpm, env y Supabase (sin romper lo existente)

**Objetivo.** Traer el esqueleto del template al repo destino de forma reversible, instalar dependencias con pnpm, configurar variables de entorno mínimas y verificar conexión con el proyecto Supabase de LAM, **sin tocar todavía** la lógica de negocio ni borrar el SPA.

**Alcance.** Solo andamiaje. El SPA Vite sigue presente (se elimina en Fase 1). Nada de migraciones nuevas.

**Pasos concretos.**
1. Inicializar Git si no existe (`git init`) y commitear el estado actual de LAM como punto de retorno: rama `pre-fusion-backup`.
2. Crear rama de trabajo `fusion-template`.
3. Copiar la carpeta `web/` **completa** del template al destino (sin sobrescribir aún la raíz Vite): `web/next.config.mjs`, `web/package.json`, `web/pnpm-*.yaml`, `web/postcss.config.mjs`, `web/.eslintrc.json`, `web/tsconfig.json`, `web/.env.example`, `web/scripts/embed-provision.mjs`, `web/src/**`.
4. Copiar la carpeta `supabase/` del template a una ubicación temporal `supabase.template/` (se fusiona con la de LAM en Fase 2; LAM ya tiene `supabase/` con sus funciones y config).
5. Crear `web/.env.local` con las **3 variables obligatorias**:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://nhszqqqqlcwmcsjmgrmv.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon JWT legacy eyJ... — leer del dashboard Supabase>
   SUPABASE_SERVICE_ROLE_KEY=<service role — dashboard Supabase>
   ```
   El resto (`ANTHROPIC_API_KEY`, `ANTHROPIC_MEMORY_*`, `OPERATOR_NAME`, `KOMMO_*`) va en la tabla `runtime_config` vía `/setup`, **no** en `.env`. CERO variables OpenAI.
6. Instalar dependencias: `cd web && pnpm install`. (El `pnpm install` debe correr en la raíz si se adopta el `package.json` raíz del template, ver Fase 1; en Fase 0 basta `web/`.)
7. **Smoke test del codegen**: `node web/scripts/embed-provision.mjs`. Como `web/` ahora tiene un `../supabase` (el de LAM) **el script no debe fallar**; si falla por no encontrar funciones esperadas, anotarlo (se resuelve en Fase 2 al traer el core).

**Archivos a COPIAR DEL TEMPLATE.**
- `Template-Agent-kommo/web/` → `Seguros LAM - Agente/web/`
- `Template-Agent-kommo/supabase/` → temporal `Seguros LAM - Agente/supabase.template/`

**A CREAR.** `web/.env.local` (no commitear — está en `.gitignore`).

**MODIFICAR/ELIMINAR.** Ninguno todavía.

**Migraciones SQL.** Ninguna en esta fase.

**Verificación / criterios de aceptación.**
- [ ] `pnpm install` en `web/` termina sin errores.
- [ ] `web/.env.local` tiene exactamente las 3 vars; ninguna `OPENAI_*`.
- [ ] `node web/scripts/embed-provision.mjs` corre (aunque el set de funciones aún no sea el definitivo).
- [ ] Existe la rama `pre-fusion-backup` con el SPA intacto.

**Riesgos y mitigación.**
- *Riesgo:* `embed-provision.mjs` falla porque busca `../supabase` y la estructura aún es mixta. *Mitigación:* se resuelve en Fase 2; en Fase 0 solo se verifica que el script existe y corre.
- *Riesgo:* anon key incorrecta. *Mitigación:* validar con un `curl` a `${URL}/rest/v1/` con `apikey`.

**Dependencias.** Ninguna (fase base).

**Esfuerzo estimado.** 0.5 día.

---

## FASE 1 — Demolición del SPA Vite y adopción de la raíz del template

**Objetivo.** Eliminar la estructura Vite/SPA del destino y dejar la raíz del monorepo (package.json, netlify.toml, configs, lockfile pnpm) igual a la del template, conservando los activos de LAM que se portan después.

**Alcance.** Solo raíz y `src/` del SPA. NO se toca `supabase/functions/{daily-price-sync,extract-prices}` ni `supabase/migrations/*` de LAM (se reservan; se procesan en Fases 7-8). Se rescatan a un staging: `src/lib/collections.ts`, `src/pages/PreciosDiarios.tsx`, `src/hooks/usePreciosDiarios.ts`, `src/components/knowledge/*`, `public/logolam.png`.

**Pasos concretos.**
1. Crear carpeta de staging `_lam_port/` y **mover** (no borrar) los archivos a portar:
   - `src/lib/collections.ts`
   - `src/pages/PreciosDiarios.tsx`
   - `src/hooks/usePreciosDiarios.ts`
   - `src/components/knowledge/` (CollectionSelector, FileUploadZone, DocumentsList, ProcessingQueue, DocumentPreviewModal)
   - `src/lib/supabaseVector.ts`, `src/lib/fileExtractors.ts`, `src/lib/chunker.ts`, `src/lib/embeddings.ts` (solo como **referencia de lógica**; se descarta el proveedor OpenAI)
   - `public/logolam.png`
2. Copiar `public/logolam.png` a `web/public/logolam.png`.
3. **Eliminar** la estructura Vite del destino (lista exacta abajo).
4. Copiar a la raíz del destino los archivos raíz del template: `package.json`, `netlify.toml`, `.env.example`, `.gitignore`, `CLAUDE.md`, `README.md`, `SETUP-WITH-CLAUDE.md`, `pnpm-lock.yaml`, y `agent/` completo (incluye `from-n8n.md`, `system-prompt.example.md`; **no** `system-prompt.md`).
5. `pnpm install` en la **raíz** (monorepo).

**Archivos a COPIAR DEL TEMPLATE (raíz).**
- `package.json`, `netlify.toml`, `.env.example`, `.gitignore`, `CLAUDE.md`, `README.md`, `SETUP-WITH-CLAUDE.md`, `pnpm-lock.yaml`
- `agent/from-n8n.md`, `agent/system-prompt.example.md`

**A PORTAR DE LAM (a staging `_lam_port/`).** Los listados en el paso 1.

**A ELIMINAR (Vite SPA).**
```
index.html  vite.config.ts  vitest.config.ts  eslint.config.js
postcss.config.js  components.json  tailwind.config.ts  tsconfig.json
tsconfig.app.json  tsconfig.node.json  playwright.config.ts  playwright-fixture.ts
bun.lock  bun.lockb  package-lock.json  package.json(Vite raíz)  .env(raíz)
src/main.tsx  src/App.tsx  src/App.css  src/index.css  src/vite-env.d.ts
src/pages/*(salvo lo portado)  src/components/{Layout,NavLink,Sidebar,Quote*,Stats*,ui}/*
src/hooks/*(salvo usePreciosDiarios portado)  src/integrations/supabase/*
src/types/quote.ts  src/test/*  src/lib/embeddings.ts(OpenAI, PROHIBIDO)
```

**Migraciones SQL.** Ninguna.

**Verificación / criterios de aceptación.**
- [ ] No queda `vite.config.ts`, `index.html`, `bun.lockb`, `package-lock.json` ni `src/main.tsx` en el destino.
- [ ] La raíz tiene el `package.json` y `pnpm-lock.yaml` del template.
- [ ] `web/public/logolam.png` existe.
- [ ] `_lam_port/` contiene los 9 activos a portar; `supabase/functions/{daily-price-sync,extract-prices}` y `supabase/migrations/*` de LAM siguen intactos.
- [ ] `grep -ri "openai" web/ src/ package.json` no devuelve dependencias OpenAI (las referencias en `_lam_port/` son aceptables temporalmente).

**Riesgos y mitigación.**
- *Riesgo:* borrar por error un archivo aún necesario. *Mitigación:* `pre-fusion-backup` permite recuperar; mover-antes-de-borrar para los 9 activos.
- *Riesgo:* dependencia transitiva del SPA (react-router, react-query) usada por algún componente portado. *Mitigación:* la reescritura a App Router (Fases 6/9) elimina esas deps; en staging no compilan, no afecta el build de `web/`.

**Dependencias.** Fase 0.

**Esfuerzo estimado.** 0.5 día.

---

## FASE 2 — Base Supabase del template + config.toml de LAM + build verde y provisioning

**Objetivo.** Unificar `supabase/` para que contenga el core completo del template (migraciones 0001-0041 + funciones + `_shared`) **más** los activos reservados de LAM, con `config.toml` apuntando al proyecto real de LAM, y dejar el monorepo compilando y provisionable vía `/first-run` → `/setup`.

**Alcance.** Migraciones core 0001-0041, todas las Edge Functions del template, `_shared/*`, `config.toml`. NO se incluyen aún las migraciones de Precios Diarios ni de taxonomía (Fases 3 y 7). Shopify se copia **intacto** (para que compile/provisione); se poda después.

**Pasos concretos.**
1. Fusionar `supabase.template/migrations/` (0001-0041, 40 archivos — nota: no hay 0012) sobre `supabase/migrations/` del destino. Las migraciones de LAM con prefijo `20260*` quedan **fuera por ahora** (se renumeran en Fases 3 y 7); moverlas temporalmente a `_lam_port/migrations/`.
2. Fusionar `supabase.template/functions/` sobre `supabase/functions/`: traer `_shared/*` (ai-pricing, business-hours, config, exchange, kommo, shopify, usage) y las funciones `alerts-scan, dreams-run, embed, evaluate-outcomes, follow-up-scan, generate-response, kommo-webhook, process-inbound, publish-to-kommo`. **Conservar** las funciones de LAM `daily-price-sync` y `extract-prices` (se procesan en Fase 8); descartar `process-document` (absorbida por `api/kb/ingest`+`embed`).
3. Editar `supabase/config.toml` (copia del template): cambiar `project_id` a `nhszqqqqlcwmcsjmgrmv` y agregar bloques `verify_jwt=false` para las dos funciones de precios (las invoca pg_cron sin JWT de usuario):
   ```toml
   project_id = "nhszqqqqlcwmcsjmgrmv"

   [functions.daily-price-sync]
   verify_jwt = false

   [functions.extract-prices]
   verify_jwt = false
   ```
4. Eliminar `supabase.template/` (ya fusionado).
5. `node web/scripts/embed-provision.mjs` → debe generar `web/src/lib/provision/migrations.generated.ts` y `functions.generated.ts` sin error (encuentra `../supabase`).
6. `cd web && pnpm build` → build verde.
7. `pnpm --dir web dev`, abrir `/first-run`: ejecutar el wizard → `/api/provision/migrate` (aplica 0001-0041) y `/api/provision/functions/deploy` (despliega funciones).
8. `/setup`: cargar `ANTHROPIC_API_KEY`, `ANTHROPIC_MEMORY_*`, `OPERATOR_NAME`, `KOMMO_*` en `runtime_config`. Crear Environment + Managed Agent (`/api/setup/agent`).
9. Verificar login Supabase auth y que el dashboard carga (inbox, contenido, etc.).

**Archivos a COPIAR DEL TEMPLATE.**
- `supabase/config.toml` (luego MODIFICAR project_id + bloques functions)
- `supabase/.gitignore`
- `supabase/migrations/0001_init.sql` … `0041_follow_up_run_users.sql` (40 archivos)
- `supabase/functions/_shared/*`
- `supabase/functions/{embed,generate-response,process-inbound,dreams-run,evaluate-outcomes,follow-up-scan,alerts-scan,kommo-webhook,publish-to-kommo}/index.ts`

**A MODIFICAR.** `supabase/config.toml` (project_id + 2 bloques functions).

**A ELIMINAR.** `supabase/functions/process-document/` (no se porta); `supabase.template/`.

**Migraciones SQL.** Las 0001-0041 del template (sin DDL nuevo en esta fase).

**Verificación / criterios de aceptación.**
- [ ] `web/src/lib/provision/migrations.generated.ts` y `functions.generated.ts` se regeneran sin error.
- [ ] `pnpm --dir web build` verde.
- [ ] `/first-run` aplica migraciones y despliega funciones sin error 4xx/5xx.
- [ ] `config.toml` tiene `project_id="nhszqqqqlcwmcsjmgrmv"` y `verify_jwt=false` para `daily-price-sync` y `extract-prices`.
- [ ] Tablas core existen (`kb_documents`, `kb_chunks`, `agent_tools`, `runtime_config`, `voice_samples`, `promotions`, `messages`, `leads`).
- [ ] `search_kb` responde (aunque KB vacía).

**Riesgos y mitigación.**
- *Riesgo:* el codegen ordena lexicalmente; mezclar prefijos `20260*` de LAM con `00NN_` del template rompería el orden. *Mitigación:* sacar `20260*` a `_lam_port/migrations/` hasta renumerarlas como 0042+.
- *Riesgo:* Shopify provoca errores de provisioning. *Mitigación:* copiar intacto primero (sus migraciones son idempotentes); podar después deshabilitando sus tools.

**Dependencias.** Fase 1.

**Esfuerzo estimado.** 1 día.

---

## FASE 3 — Taxonomía: `collections.ts`, metadata en chunks, columnas de tracking

**Objetivo.** Llevar la taxonomía exacta de LAM (8 aseguradoras + 13 tipos) al destino y preparar el modelo de datos KB para almacenar y filtrar por ella, además de las columnas de tracking (estado de procesamiento, storage_path).

**Alcance.** `web/src/lib/collections.ts`, extensión de `api/kb/ingest` para escribir metadata, ALTER de `kb_documents`. El filtro en `search_kb` y el agente van en Fase 4.

**Taxonomía exacta (portar 1:1, value → label).**

ASEGURADORAS (`COLLECTIONS`, 8):
| value | label |
|---|---|
| `seguros_caracas` | Seguros Caracas |
| `seguros_mercantil` | Mercantil (Venezuela) |
| `seguros_mercantil_panama` | Mercantil (Panamá) |
| `seguros_universitas` | Seguros Universitas |
| `seguros_venezuela` | Seguros Venezuela |
| `estar_seguros` | Estar Seguros |
| `la_internacional` | La Internacional |
| `lam_corredora` | LAM Corredora (Interna) |

TIPOS DE PÓLIZA (`POLICY_TYPES`, 13):
| value | label |
|---|---|
| `salud` | Salud / HCM |
| `vida` | Vida |
| `auto` | Auto / Vehiculos |
| `hogar` | Hogar / Residencia |
| `funeraria` | Funeraria / Sepelio |
| `accidentes_personales` | Accidentes Personales |
| `responsabilidad_civil` | Responsabilidad Civil |
| `viaje` | Viaje |
| `empresarial` | Empresarial / Pymes |
| `mascotas` | Mascotas |
| `ciberseguridad` | Ciberseguridad |
| `fianza` | Fianza |
| `general` | General / Condicionados |

Defaults UI: `collection` inicial `seguros_caracas`, `policyType` inicial `salud`, fallback `general`.

**Pasos concretos.**
1. Crear `web/src/lib/collections.ts` copiando los valores 1:1 desde `_lam_port/collections.ts` (renombrar export a `taxonomy.ts` si se prefiere, pero mantener `COLLECTIONS`/`POLICY_TYPES`).
2. Crear migración `0042_kb_taxonomy_tracking.sql` que añade columnas de tracking a `kb_documents`.
3. Extender `web/src/app/api/kb/ingest/route.ts`: aceptar form fields `collection` y `policy_type`, validarlos contra `collections.ts` (rechazar 400 si no pertenecen a la lista), persistirlos en `kb_documents.metadata` **y propagarlos a cada `kb_chunks.metadata`** (hoy se inserta `{}`).

**A CREAR.**
- `web/src/lib/collections.ts`
- `supabase/migrations/0042_kb_taxonomy_tracking.sql`

**A MODIFICAR.**
- `web/src/app/api/kb/ingest/route.ts` (metadata por chunk)

**Migración SQL (DDL real).**
```sql
-- 0042_kb_taxonomy_tracking.sql
-- Columnas de tracking para gestión de archivos KB (estados, bucket).
alter table kb_documents
  add column if not exists status        text not null default 'completed',  -- pending|processing|completed|error
  add column if not exists error_message text,
  add column if not exists storage_path  text,
  add column if not exists collection    text,   -- aseguradora (espejo de metadata->>'collection')
  add column if not exists policy_type   text;   -- tipo de poliza (espejo de metadata->>'policy_type')

create index if not exists kb_documents_collection_idx  on kb_documents(collection);
create index if not exists kb_documents_policy_type_idx on kb_documents(policy_type);
create index if not exists kb_documents_status_idx      on kb_documents(status);

-- Índice GIN sobre metadata de chunks para acelerar el filtro @> de search_kb.
create index if not exists kb_chunks_metadata_gin_idx on kb_chunks using gin (metadata);
```

**Cambio en `api/kb/ingest` (approach del snippet).**
```ts
// tras validar collection/policy_type contra collections.ts:
const docMeta = { format, collection, policy_type };
// insert kb_documents: metadata: docMeta, collection, policy_type, status: 'completed'
const chunkMeta = { collection, policy_type, file_id: documentId, source: filename, file_type: format };
// insert kb_chunks: metadata: chunkMeta  (en lugar del {} actual)
```

**Verificación / criterios de aceptación.**
- [ ] `collections.ts` exporta 8 COLLECTIONS + 13 POLICY_TYPES con los strings exactos.
- [ ] Migración 0042 aplica vía `/first-run` (o re-provision) sin error.
- [ ] Subir un doc con `collection=seguros_caracas&policy_type=salud` → `kb_documents.metadata` y **cada** `kb_chunks.metadata` contienen `collection` y `policy_type`.
- [ ] Subir con collection inválida → 400.

**Riesgos y mitigación.**
- *Riesgo:* docs ya ingeridos sin taxonomía. *Mitigación:* re-etiquetado masivo (Fase 6) o re-ingesta (Fase 10).
- *Riesgo:* el GIN sobre `metadata` no se usa si el filtro es `->>'collection'` en vez de `@>`. *Mitigación:* en Fase 4 el RPC usa `@> p_filter` (aprovecha GIN).

**Dependencias.** Fase 2.

**Esfuerzo estimado.** 0.5 día.

---

## FASE 4 — `search_kb` con filtro de taxonomía: RPC + `agent_tools` + `runSearchKb` + sync

**Objetivo.** Hacer efectivo el filtro de taxonomía en la búsqueda del agente, con los **tres cambios coordinados** (RPC, input_schema, ejecutor) más la re-publicación del surface de tools a Anthropic y el redeploy de `generate-response`.

**Alcance.** Migración que recrea `search_kb` con `p_filter jsonb` y actualiza el `input_schema` de la fila system `search_kb`; modificación del handler `runSearchKb`; ejecución de `syncAgentTools`.

**Pasos concretos.**
1. Crear migración `0043_search_kb_taxonomy.sql` que recrea `search_kb` con parámetro `p_filter jsonb default '{}'` y la cláusula `c.metadata @> p_filter`, y hace `UPDATE agent_tools SET input_schema=...` para la fila `search_kb`.
2. Modificar `supabase/functions/generate-response/index.ts` (`runSearchKb`) para aceptar `collection`/`policy_type` y reenviarlos como `p_filter`.
3. Redeploy de `generate-response` (vía `/api/provision/functions/deploy`).
4. Disparar `syncAgentTools(actor)` (endpoint `/api/tools` o `/api/agent`) para que el nuevo `input_schema` llegue al Managed Agent y se persista `ANTHROPIC_AGENT_VERSION`.

**A CREAR.** `supabase/migrations/0043_search_kb_taxonomy.sql`

**A MODIFICAR.** `supabase/functions/generate-response/index.ts` (`runSearchKb`).

**Migración SQL (DDL real).**
```sql
-- 0043_search_kb_taxonomy.sql
create or replace function search_kb(
  p_query_embedding vector(384),
  p_query_text      text,
  p_limit           int  default 6,
  p_min_similarity  real default 0.0,
  p_filter          jsonb default '{}'::jsonb
)
returns table (
  chunk_id uuid, document_id uuid, document_title text,
  content text, metadata jsonb, similarity real, fts_rank real
) language sql stable as $$
  with vec as (
    select
      c.id            as chunk_id,
      c.document_id,
      d.title         as document_title,
      c.content,
      c.metadata,
      (1 - (c.embedding <=> p_query_embedding))::real as similarity,
      ts_rank(to_tsvector('spanish', c.content),
              plainto_tsquery('spanish', p_query_text))::real as fts_rank
    from kb_chunks c
    join kb_documents d on d.id = c.document_id
    where c.embedding is not null
      and (p_filter = '{}'::jsonb or c.metadata @> p_filter)
  )
  select * from vec
  where similarity >= p_min_similarity
  order by (similarity * 0.7 + fts_rank * 0.3) desc
  limit p_limit;
$$;

-- Extender el input_schema de la fila system 'search_kb' (NO recrearla; es tool_type='system').
update agent_tools
set input_schema = '{
  "type":"object",
  "properties":{
    "query":{"type":"string","description":"Consulta corta y específica."},
    "limit":{"type":"integer","description":"Número de chunks. Default 5, máx 12."},
    "collection":{"type":"string","description":"Filtra por aseguradora (opcional). Valores: seguros_caracas, seguros_mercantil, seguros_mercantil_panama, seguros_universitas, seguros_venezuela, estar_seguros, la_internacional, lam_corredora."},
    "policy_type":{"type":"string","description":"Filtra por tipo de póliza (opcional). Valores: salud, vida, auto, hogar, funeraria, accidentes_personales, responsabilidad_civil, viaje, empresarial, mascotas, ciberseguridad, fianza, general."}
  },
  "required":["query"]
}'::jsonb
where name = 'search_kb';
```

**`input_schema` literal extendido de `search_kb`** (lo que queda registrado):
```json
{
  "type": "object",
  "properties": {
    "query":       { "type": "string",  "description": "Consulta corta y específica." },
    "limit":       { "type": "integer", "description": "Número de chunks. Default 5, máx 12." },
    "collection":  { "type": "string",  "description": "Filtra por aseguradora (opcional)." },
    "policy_type": { "type": "string",  "description": "Filtra por tipo de póliza (opcional)." }
  },
  "required": ["query"]
}
```

**Cambio en `runSearchKb` (approach del snippet).**
```ts
// firma extendida
async function runSearchKb(input: {
  query: string; limit?: number; collection?: string; policy_type?: string;
}) {
  const { embeddings } = await embedQuery(input.query); // POST /functions/v1/embed {inputs:[query]}
  const p_filter: Record<string, string> = {};
  if (input.collection)  p_filter.collection  = input.collection;
  if (input.policy_type) p_filter.policy_type = input.policy_type;
  const { data, error } = await supabase.rpc("search_kb", {
    p_query_embedding: embeddings[0],
    p_query_text: input.query,
    p_limit: Math.min(input.limit ?? 5, 12),
    p_min_similarity: 0.15,
    p_filter,                       // {} => sin filtro (camino actual intacto)
  });
  // ...formateo "### Resultado N — [titulo] (similitud X.XX)" igual que hoy
}
```

**Niveles de propagación (no omitir ninguno).**
- Cambiar **solo** `input_schema` → basta `syncAgentTools` (publica a Anthropic).
- Cambiar el **RPC** → requiere correr la migración 0043.
- Cambiar el **ejecutor** `runSearchKb` → requiere **redeploy** de `generate-response`.

**Verificación / criterios de aceptación.**
- [ ] `select search_kb(<emb>, 'salud', 6, 0.15, '{"collection":"seguros_caracas"}'::jsonb)` devuelve solo chunks de esa aseguradora.
- [ ] `p_filter='{}'` reproduce el comportamiento previo (sin filtro).
- [ ] `agent_tools.input_schema` de `search_kb` incluye `collection` y `policy_type`, `required=["query"]`.
- [ ] Tras `syncAgentTools`, `ANTHROPIC_AGENT_VERSION` se incrementa.
- [ ] En una sesión real, el agente puede emitir `search_kb` con `collection`/`policy_type` y recibe resultados filtrados.

**Riesgos y mitigación.**
- *Riesgo:* olvidar uno de los tres cambios → filtro inerte. *Mitigación:* checklist de propagación.
- *Riesgo:* `@> p_filter` sin índice GIN sería lento. *Mitigación:* el GIN se creó en 0042.
- *Riesgo:* fila `search_kb` es `tool_type='system'` (la API CRUD rechaza recrearla con 403). *Mitigación:* usar `UPDATE`, mantener `required=["query"]`.

**Dependencias.** Fase 3.

**Esfuerzo estimado.** 1 día.

---

## FASE 5 — Bucket, estados de procesamiento y OCR Claude en la ingesta KB

**Objetivo.** Dar a la ingesta KB la riqueza de LAM que el template no tiene: bucket de archivos originales, soporte XLSX/CSV/imágenes, OCR de imágenes y PDF escaneado con **Claude vision** (sin OpenAI), y estados de procesamiento con limpieza de stale.

**Alcance.** Migración de bucket `knowledge-files` (anon→authenticated), extensión de `kb-parsers.ts` (XLSX/CSV + fallback Claude), extensión de `api/kb/ingest` (subir binario a Storage, estados, OCR). El re-etiquetado masivo y la UI van en Fase 6.

**Pasos concretos.**
1. Crear migración `0044_knowledge_files_bucket.sql`: bucket `knowledge-files` (50 MB) + 3 policies RLS para rol **authenticated** (insert/select/delete) sobre `bucket_id='knowledge-files'`. Decisión de seguridad: bucket **privado** + signed URLs (la KB de seguros es sensible; LAM lo dejó público por simplicidad — aquí se endurece).
2. Extender `web/src/lib/kb-parsers.ts`:
   - Añadir ramas XLSX/XLS/CSV (vía `xlsx` `sheet_to_csv` por hoja, encabezado `=== Hoja: <name> ===`).
   - Añadir `detectTrueType` (magic bytes) para no confiar en la extensión.
   - PDF: mantener `pdf-parse` (barato); si devuelve `<50 chars` → tratar como **PDF escaneado** y delegar a Claude `{type:"document"}`.
   - Imágenes (png/jpg/jpeg/webp): OCR Claude `{type:"image", source:{type:"base64",...}}`.
3. Crear helper `web/src/lib/ocr-claude.ts` reusando el patrón de `process-inbound` (Anthropic SDK, `output_config.format` json_schema o texto). Construir base64 con el **troceo de 8192 bytes** de LAM (evita stack overflow). Aplicar la **limpieza post-OCR** (quitar fences ```` ``` ````, prefijos conversacionales, `---` inicial).
4. Extender `web/src/app/api/kb/ingest/route.ts`: subir el binario original a Storage (`${collection}/${documentId}/${filename}`), guardar `storage_path`, manejar estados (`processing` al inicio, `completed`/`error` al final).
5. Añadir limpieza de stale: registros en `processing`/`pending` con `created_at > 10 min` → `error` "Proceso interrumpido (timeout)".

**A CREAR.**
- `supabase/migrations/0044_knowledge_files_bucket.sql`
- `web/src/lib/ocr-claude.ts`

**A MODIFICAR.**
- `web/src/lib/kb-parsers.ts` (XLSX/CSV + magic bytes + fallback Claude)
- `web/src/app/api/kb/ingest/route.ts` (Storage + estados + OCR)

**Migración SQL (DDL real).**
```sql
-- 0044_knowledge_files_bucket.sql
insert into storage.buckets (id, name, public, file_size_limit)
values ('knowledge-files', 'knowledge-files', false, 52428800)  -- PRIVADO, 50 MB
on conflict (id) do nothing;

-- RLS para authenticated (el template usa auth, NO anon como LAM).
drop policy if exists "kb_files_insert" on storage.objects;
create policy "kb_files_insert" on storage.objects
  for insert to authenticated with check (bucket_id = 'knowledge-files');

drop policy if exists "kb_files_select" on storage.objects;
create policy "kb_files_select" on storage.objects
  for select to authenticated using (bucket_id = 'knowledge-files');

drop policy if exists "kb_files_delete" on storage.objects;
create policy "kb_files_delete" on storage.objects
  for delete to authenticated using (bucket_id = 'knowledge-files');
```

**OCR Claude (approach del snippet) — reemplazo de OpenAI.**
```ts
// web/src/lib/ocr-claude.ts  — reusa patrón process-inbound, base64 (no url) para archivos subidos
import Anthropic from "@anthropic-ai/sdk";
const PROMPT = "Extrae y transcribe todo el texto visible. Mantén la estructura si es tabla o documento.";

function toBase64(bytes: Uint8Array): string {        // troceo 8192 (anti stack-overflow)
  let bin = "";
  for (let i = 0; i < bytes.length; i += 8192)
    bin += String.fromCharCode(...bytes.subarray(i, i + 8192));
  return btoa(bin);
}
export async function ocrWithClaude(buf: ArrayBuffer, mime: string, apiKey: string, model: string) {
  const data = toBase64(new Uint8Array(buf));
  const isPdf = mime === "application/pdf";
  const block = isPdf
    ? { type: "document", source: { type: "base64", media_type: "application/pdf", data } }
    : { type: "image",    source: { type: "base64", media_type: mime, data } };
  const res = await new Anthropic({ apiKey }).messages.create({
    model, max_tokens: 4096,
    messages: [{ role: "user", content: [block as any, { type: "text", text: PROMPT }] }],
  });
  const t = res.content.find((b: any) => b.type === "text");
  return cleanPostOcr(t ? (t as any).text : "");      // quita fences/prefijos/--- inicial
}
```
*Nota:* el `ANTHROPIC_API_KEY` y el modelo (`OCR_MODEL`, default `claude-haiku-4-5`) se resuelven server-side; en Edge se usa `loadConfig` (`_shared/config.ts`), en route handler Next se leen de `runtime_config`.

**Formatos aceptados (unión template + LAM).** `pdf, docx, txt, md, srt, vtt` (template) + `xlsx, xls, csv, png, jpg, jpeg, webp` (LAM).

**Verificación / criterios de aceptación.**
- [ ] Migración 0044 crea bucket privado + 3 policies authenticated.
- [ ] Subir un XLSX → se chunkea y se ingiere (no rechazado).
- [ ] Subir una imagen con texto → OCR Claude produce texto, se chunkea, se vectoriza con gte-small.
- [ ] Subir un PDF escaneado (pdf-parse vacío) → fallback Claude `document` block extrae texto.
- [ ] El binario original queda en `knowledge-files/<collection>/<id>/<file>` y `storage_path` se guarda.
- [ ] Registros stale (>10 min en processing) pasan a `error`.
- [ ] `grep -ri "openai" web/src/lib web/src/app/api/kb` = 0.

**Riesgos y mitigación.**
- *Riesgo:* `maxDuration=60` del ingest con OCR + embeddings de docs grandes. *Mitigación:* subir `BATCH_SIZE` de `embed.ts` hasta 8; el OCR usa Haiku (rápido); considerar mover OCR a la Edge si excede.
- *Riesgo:* `xlsx` tiene CVEs históricos. *Mitigación:* fijar versión parcheada; validar tamaño/tipo antes de parsear.
- *Riesgo:* media_type no soportado por Claude. *Mitigación:* whitelist image/jpeg|png|webp|gif; docx/xls → extracción de texto, no vision.

**Dependencias.** Fase 3 (taxonomía/metadata), Fase 2 (Anthropic SDK ya en el template).

**Esfuerzo estimado.** 1.5 días.

---

## FASE 6 — UI Contenido + componentes `knowledge/*` portados (selector, lista, preview, cola)

**Objetivo.** Montar la UI rica de gestión de KB: copiar la página Contenido del template y portar de LAM lo que el template no tiene (selector de taxonomía 2 niveles, lista con filtros/edición/borrado, modal de preview por tipo, cola multi-archivo), reescrito a Next.js App Router y al design system del template.

**Alcance.** Carpeta `(dashboard)/contenido/*` del template (copiar tal cual) + componentes `knowledge/*` portados de LAM (reescritura react-router→App Router, estilos del template). Endpoints `kb/ingest`, `kb/document/[id]`, `voz/*`, `promotions/*` (copiar/ya copiados).

**Pasos concretos.**
1. Copiar la carpeta `(dashboard)/contenido/` completa del template (page.tsx, content-tabs.tsx, kb-uploader.tsx, voice-uploader.tsx, document-row.tsx, sample-row.tsx, promo-card.tsx, promo-form-modal.tsx, promo-utils.ts). Copiar los redirects `(dashboard)/kb/page.tsx` y `(dashboard)/voz/page.tsx`. **NO** copiar la carpeta `kb/kb-uploader.tsx` ni `kb/document-row.tsx` (duplicados muertos).
2. Extender `kb-uploader.tsx` con los **selects de taxonomía** (aseguradora + tipo de póliza desde `collections.ts`); enviar `collection`/`policy_type` en el FormData. Mantener el contrato de respuesta `{chunks, chars}` para no tocar el resto de la UI.
3. Portar de `_lam_port/components/knowledge/`:
   - `CollectionSelector.tsx` → selector 2 niveles (dropdown aseguradora + chips tipo). Corazón de la taxonomía en UI.
   - `DocumentsList.tsx` → lista con filtros por aseguradora+tipo, badges, chunks_count, edición inline de metadata (**re-etiquetado sin re-procesar**), borrado con confirmación, preview, `StatusBadge` (completed/processing/pending/error).
   - `DocumentPreviewModal.tsx` → visor por tipo (imagen/PDF/XLSX-CSV/DOCX/txt-md) desde el bucket (signed URL).
   - `ProcessingQueue.tsx` → cola multi-archivo con estados/progress.
   - `FileUploadZone.tsx` → dropzone con `ACCEPTED`/`ACCEPTED_MIME` ampliado.
   Reescribir imports `@/` a la estructura del template, añadir `"use client"`, usar componentes shadcn del template (Button, Tabs, Select, Badge, Progress, Dialog).
4. Crear endpoint de re-etiquetado masivo `web/src/app/api/kb/document/[id]/retag/route.ts` (PATCH): actualiza `kb_documents.collection/policy_type/metadata` **y** `kb_chunks.metadata` de ese doc con un único UPDATE (mejora sobre el fila-a-fila de LAM):
   ```sql
   update kb_chunks
      set metadata = metadata || jsonb_build_object('collection', $1, 'policy_type', $2)
    where document_id = $3;
   ```
5. Integrar la lista/preview/cola en una pestaña de `/contenido?tab=kb` (o sub-tabs "Cargar"/"Documentos"), respetando `export const dynamic="force-dynamic"` + `router.refresh()` tras mutar.

**Archivos a COPIAR DEL TEMPLATE.**
- `web/src/app/(dashboard)/contenido/{page,content-tabs,kb-uploader,voice-uploader,document-row,sample-row,promo-card,promo-form-modal}.tsx`, `promo-utils.ts`
- `web/src/app/(dashboard)/kb/page.tsx`, `web/src/app/(dashboard)/voz/page.tsx` (redirects)

**A PORTAR DE LAM.**
- `_lam_port/components/knowledge/{CollectionSelector,DocumentsList,DocumentPreviewModal,ProcessingQueue,FileUploadZone}.tsx` → `web/src/components/knowledge/`
- `_lam_port/pages/KnowledgeBase.tsx` → integrar su orquestación en `(dashboard)/contenido`

**A CREAR.** `web/src/app/api/kb/document/[id]/retag/route.ts`

**A MODIFICAR.** `web/src/app/(dashboard)/contenido/kb-uploader.tsx` (selects taxonomía).

**Migraciones SQL.** Ninguna (usa lo de Fases 3-5).

**Verificación / criterios de aceptación.**
- [ ] `/contenido?tab=kb` muestra uploader con selects de aseguradora/tipo poblados desde `collections.ts`.
- [ ] La lista de documentos muestra badges de aseguradora/tipo, estado y chunks.
- [ ] Editar la taxonomía de un doc re-etiqueta **todos** sus chunks (verificar `kb_chunks.metadata`).
- [ ] Preview abre imagen/PDF/XLSX/DOCX/txt vía signed URL.
- [ ] Cola muestra múltiples archivos con progreso.
- [ ] No se copiaron los duplicados muertos de `kb/`.

**Riesgos y mitigación.**
- *Riesgo:* componentes LAM dependen de react-router/react-query. *Mitigación:* reescribir a Server/Client Components; fetch a route handlers; no arrastrar esas deps.
- *Riesgo:* divergencia de design system. *Mitigación:* adaptar a clases del template (page-shell, section-card, stat-card); no traer `tailwind.config.ts` del SPA.
- *Riesgo:* bucket privado rompe `<img>`/`<object>`. *Mitigación:* generar signed URL en el route handler antes de renderizar.

**Dependencias.** Fases 3, 4, 5.

**Esfuerzo estimado.** 2 días.

---

## FASE 7 — Precios Diarios: migraciones (0042+ renumeradas), tablas y crons parametrizados

**Objetivo.** Portar el modelo de datos completo del módulo Precios Diarios (3 tablas + columnas generadas + crons pg_cron/pg_net) renumerado para aplicarse después del core, con el cron parametrizado (sin anon key hardcodeada en SQL).

**Alcance.** Las 10 migraciones `20260*` de LAM relevantes a precios, renumeradas a `0045+`. Se **descarta** `20260402220208` (cotizaciones demo MX) y `20260422000003` (match_documents 1536). `knowledge_files_storage` ya cubierto en Fase 5 (solo el bucket).

**Mapeo de renumeración (orden cronológico preservado).**
| Origen LAM | Destino | Contenido |
|---|---|---|
| `20260420000001_cotizaciones_diarias` | `0045` | extensiones pg_cron/pg_net + `cotizaciones_diarias` + RLS + cron inicial (histórico) |
| `20260421000001_plan_catalog_and_categorias` | `0046` | `daily_plan_catalog` + columna `categoria` |
| `20260421000002_plan_subcategoria` | `0047` | columna generada `subcategoria` (CASE) |
| `20260421000003_cotizaciones_rango_edad` | `0048` | columna `rango_edad` |
| `20260421000004_daily_prices` | `0049` | `daily_prices` |
| `20260421000005_fix_daily_prices` | `0050` | `nombre_plan` deja NOT NULL; idx intermedio |
| `20260422000001_fix_daily_prices_unique_plan` | `0051` | índice único FINAL |
| `20260422000002_add_aseguradora_to_daily_prices` | `0052` | columna `aseguradora` |
| `20260427000001_setup_cron_sync` | `0053` | crons `*/10` (parametrizar) |
| `20260427000002_cleanup_cron_and_dedupe` | `0054` | unschedule viejo + dedupe + UNIQUE + `list_cron_jobs()` |

**Pasos concretos.**
1. Renumerar cada archivo según el mapeo. Aplicar las migraciones **en orden** (el `onConflict` del upsert de Fase 8 depende del índice único FINAL de 0051).
2. **Parametrizar el cron** (0053/0054): reemplazar el `Authorization: Bearer <ANON_KEY hardcodeado>` y la URL con project ref incrustado. Como pg_cron corre en la base, leer la clave de una tabla de config o usar `vault`/setting de DB. Opción recomendada: guardar la key en `runtime_config` y construir el header con un setting de Postgres (`current_setting`) o, dado que ambas funciones tienen `verify_jwt=false` (Fase 2), invocarlas con la `anon` key del proyecto pero **resuelta desde Vault**, no en texto plano.
3. Mantener `subcategoria` GENERATED ALWAYS STORED **idéntica** (la lógica CASE de `salud_basica_b` depende de `id_aseguradora=5` o `19 con suma=50000`).
4. Aplicar vía re-provision (`/first-run` o `/api/provision/migrate`).

**A PORTAR DE LAM (renumerados).** Los 10 archivos del mapeo.

**A ELIMINAR.** `20260402220208_*.sql` (demo MX), `20260422000003_match_documents_function.sql` (1536 OpenAI).

**Migraciones SQL (DDL real — estado final consolidado).**
```sql
-- 0045..0048: cotizaciones_diarias + daily_plan_catalog (estado final)
create extension if not exists pg_cron;
create extension if not exists pg_net;

create table if not exists public.cotizaciones_diarias (
  id            uuid        primary key default gen_random_uuid(),
  fecha         date        not null default current_date,
  id_cotizacion integer,
  codigo        text,
  pdf_url       text,
  pdf_filename  text,
  total_planes  integer     not null default 0,
  aseguradoras  jsonb       not null default '[]',
  status        text        not null default 'pendiente',   -- success|error|pendiente
  error_message text,
  ejecutado_en  timestamptz not null default now(),
  categoria     text        not null default 'todos',        -- = subcategoria key
  rango_edad    text        not null default 'referencia'    -- ej "30-39"
);
alter table public.cotizaciones_diarias enable row level security;
-- RLS: se ALINEA al template -> authenticated + service_role (ver Temas transversales)
create policy "cot_diarias_auth_all" on public.cotizaciones_diarias
  for all to authenticated using (true) with check (true);
create index if not exists idx_cot_diarias_cat   on public.cotizaciones_diarias (fecha desc, categoria);
create index if not exists idx_cot_diarias_rango on public.cotizaciones_diarias (fecha desc, categoria, rango_edad);
alter table public.cotizaciones_diarias
  add constraint cotizaciones_diarias_unique_per_day unique (fecha, categoria, rango_edad);

create table if not exists public.daily_plan_catalog (
  id                 uuid        primary key default gen_random_uuid(),
  fecha              date        not null default current_date,
  id_aseguradora     integer     not null,
  nombre_aseguradora text        not null,
  id_plan            integer     not null,
  nombre_plan        text        not null,
  suma_asegurada     numeric     not null default 0,
  tipo               integer     not null,    -- 1=Salud Individual,2=Asistencia/APS,3=Emergencias
  ejecutado_en       timestamptz not null default now(),
  subcategoria       text generated always as (
    case
      when tipo = 2 then 'asistencia_aps'
      when tipo = 3 then 'emergencias_medicas'
      when tipo = 1 and suma_asegurada <= 50000
           and (id_aseguradora = 5 or (id_aseguradora = 19 and suma_asegurada = 50000))
        then 'salud_basica_b'
      when tipo = 1 and suma_asegurada <= 50000  then 'salud_basica_a'
      when tipo = 1 and suma_asegurada <= 100000 then 'salud_estandar'
      when tipo = 1 and suma_asegurada <= 200000 then 'salud_media'
      when tipo = 1 and suma_asegurada <= 500000 then 'salud_alta'
      when tipo = 1                              then 'salud_premium'
      else 'otros'
    end
  ) stored
);
alter table public.daily_plan_catalog enable row level security;
create policy "plan_catalog_auth_all" on public.daily_plan_catalog
  for all to authenticated using (true) with check (true);
create index if not exists idx_plan_catalog_fecha        on public.daily_plan_catalog (fecha desc);
create index if not exists idx_plan_catalog_aseguradora  on public.daily_plan_catalog (id_aseguradora);
create index if not exists idx_plan_catalog_subcategoria on public.daily_plan_catalog (fecha desc, subcategoria);
```
```sql
-- 0049..0052: daily_prices (estado final)
create table if not exists public.daily_prices (
  id               uuid        primary key default gen_random_uuid(),
  fecha            date        not null,
  subcategoria     text        not null,
  rango_edad       text        not null,
  nombre_plan      text        default '',
  suma_asegurada   numeric     not null,
  prima_anual      numeric     not null,
  prima_mensual    numeric     not null,
  prima_semestral  numeric     not null,
  prima_trimestral numeric     not null,
  aseguradora      text        not null default '',
  ejecutado_en     timestamptz not null default now()
);
create unique index if not exists idx_daily_prices_unique
  on public.daily_prices (fecha, subcategoria, rango_edad, nombre_plan, suma_asegurada);
create index if not exists idx_daily_prices_lookup
  on public.daily_prices (fecha desc, subcategoria, rango_edad);
alter table public.daily_prices enable row level security;
create policy "daily_prices_read_auth" on public.daily_prices
  for select to authenticated using (true);
```
```sql
-- 0053..0054: crons (PARAMETRIZADOS — sin anon key en texto plano)
-- La key se guarda en Vault; se resuelve con vault.read o un setting de DB.
-- Ejemplo con setting de DB (alter database ... set app.functions_bearer = '<anon>'):
select cron.unschedule('daily-price-sync')  where exists (select 1 from cron.job where jobname='daily-price-sync');

select cron.schedule('daily-price-sync-loop', '*/10 * * * *', $cron$
  select net.http_post(
    url     := 'https://nhszqqqqlcwmcsjmgrmv.supabase.co/functions/v1/daily-price-sync',
    headers := jsonb_build_object(
                 'Content-Type','application/json',
                 'Authorization','Bearer ' || current_setting('app.functions_bearer', true)),
    body    := '{}'::jsonb);
$cron$);

select cron.schedule('extract-prices-loop', '*/10 * * * *', $cron$
  select net.http_post(
    url     := 'https://nhszqqqqlcwmcsjmgrmv.supabase.co/functions/v1/extract-prices',
    headers := jsonb_build_object(
                 'Content-Type','application/json',
                 'Authorization','Bearer ' || current_setting('app.functions_bearer', true)),
    body    := '{}'::jsonb);
$cron$);

create or replace function public.list_cron_jobs()
returns table (jobid bigint, jobname text, schedule text, active boolean, command text)
language sql security definer set search_path = cron, public
as $$ select jobid, jobname, schedule, active, command from cron.job order by jobid; $$;
grant execute on function public.list_cron_jobs() to service_role;
```

**Taxonomía interna del módulo (no es la de KB).** 8 subcategorías (`asistencia_aps, emergencias_medicas, salud_basica_a, salud_basica_b, salud_estandar, salud_media, salud_alta, salud_premium`) × 10 rangos (`0-9 … 75+`) = **80** cotizaciones/día.

**Verificación / criterios de aceptación.**
- [ ] Migraciones 0045-0054 aplican en orden vía provisioning.
- [ ] `cotizaciones_diarias`, `daily_plan_catalog`, `daily_prices` existen con sus índices únicos exactos.
- [ ] `subcategoria` GENERATED produce `salud_basica_b` solo para ESTAR (id 5) o La Internacional (id 19, suma 50000).
- [ ] `select * from list_cron_jobs()` muestra los dos jobs `*/10`; no existe el job viejo `0 11 * * *`.
- [ ] El `Authorization` del cron **no** contiene un JWT en texto plano en el SQL versionado.

**Riesgos y mitigación.**
- *Riesgo:* RLS `anon` de LAM vs `authenticated` del template. *Mitigación:* alinear a `authenticated` + `service_role` (las funciones escriben con service role; los crons con `verify_jwt=false`).
- *Riesgo:* aplicar migraciones fuera de orden rompe el upsert. *Mitigación:* renumeración estricta 0045→0054.
- *Riesgo:* `current_setting` no definido. *Mitigación:* documentar el `alter database ... set app.functions_bearer=...` como paso operativo, o usar Supabase Vault.

**Dependencias.** Fase 2.

**Esfuerzo estimado.** 1 día.

---

## FASE 8 — `extract-prices` → Claude vision; `daily-price-sync` portado

**Objetivo.** Reconvertir la extracción de precios de OpenAI `gpt-4o` a **Claude vision** (Anthropic SDK, document block base64 + json_schema), resolviendo la key vía `loadConfig`, y portar `daily-price-sync` tal cual (no usa IA), parametrizando project ref/keys.

**Alcance.** Las dos Edge Functions del módulo. Prompt reusado tal cual (es agnóstico del proveedor). Registro de consumo con `recordUsage`.

**Pasos concretos.**
1. `daily-price-sync`: portar tal cual (scraper `cotizar.php`/`planes.php`). Parametrizar cualquier URL/token hardcodeado; no usa LLM. Confirmar `verify_jwt=false` (Fase 2). Mantener idempotencia (`TOTAL_ESPERADO=80`, skip de combos ya hechos, `PARALLEL=1`).
2. `extract-prices`: reemplazar el bloque OpenAI por Anthropic:
   - `import Anthropic from "npm:@anthropic-ai/sdk@0.95.1"`.
   - Key vía `loadConfig(supabase)` → `cfg.require("ANTHROPIC_API_KEY")`. **Eliminar** `OPENAI_API_KEY`.
   - Modelo configurable `cfg.getOr("EXTRACT_PRICES_MODEL", "claude-haiku-4-5")`.
   - Bloque `{type:"document", source:{type:"base64", media_type:"application/pdf", data}}` (el PDF ya se descarga para el batch).
   - `output_config.format` json_schema (NO `response_format` de OpenAI).
   - Leer `response.content.find(b=>b.type==="text")` → `JSON.parse(...).planes`.
   - `recordUsage(supabase, {component:"extract-prices", model, inputTokens, outputTokens, ...})`.
   - Mantener: `BATCH_SIZE=10`, dedupe por `${nombre_plan}__${suma_asegurada}`, **upsert onConflict exacto** `"fecha,subcategoria,rango_edad,nombre_plan,suma_asegurada"`, normalización `Number()||0`, filtro `prima_anual>0 || prima_mensual>0`, troceo base64 8192.
   - **Reusar el prompt tal cual** (catálogo→aseguradora como fuente de verdad).
3. Redeploy de ambas funciones vía `/api/provision/functions/deploy`.

**A PORTAR DE LAM.**
- `supabase/functions/daily-price-sync/index.ts` (tal cual, parametrizado)

**A MODIFICAR.**
- `supabase/functions/extract-prices/index.ts` (OpenAI → Anthropic)

**Migraciones SQL.** Ninguna (usa tablas de Fase 7).

**Reemplazo OpenAI → Claude (approach del snippet).**
```ts
// extract-prices: extractPricesFromPDF reconvertido
import Anthropic from "npm:@anthropic-ai/sdk@0.95.1";
const cfg   = await loadConfig(supabase);
const apiKey = cfg.require("ANTHROPIC_API_KEY");
const model  = cfg.getOr("EXTRACT_PRICES_MODEL", "claude-haiku-4-5");

const pdfBytes = new Uint8Array(await (await fetch(pdf_url)).arrayBuffer());
let bin = "";
for (let i = 0; i < pdfBytes.length; i += 8192) bin += String.fromCharCode(...pdfBytes.subarray(i, i + 8192));
const base64 = btoa(bin);

const res = await new Anthropic({ apiKey }).messages.create({
  model, max_tokens: 2000,
  messages: [{ role: "user", content: [
    { type: "document", source: { type: "base64", media_type: "application/pdf", data: base64 } },
    { type: "text", text: PROMPT /* el de LAM con ${subcategoria} y ${catalogoTexto} */ },
  ]}],
  output_config: { format: { type: "json_schema", schema: {
    type: "object", additionalProperties: false,
    properties: { planes: { type: "array", items: {
      type: "object", additionalProperties: false,
      properties: {
        nombre_plan:      { type: "string" },
        aseguradora:      { type: "string", enum: [
          "MERCANTIL SEGUROS","SEGUROS CARACAS","SEGUROS UNIVERSITAS",
          "ESTAR SEGUROS","LA INTERNACIONAL DE SEGUROS","SEGUROS VENEZUELA" ] },
        suma_asegurada:   { type: "number" },
        prima_anual:      { type: "number" },
        prima_mensual:    { type: "number" },
        prima_semestral:  { type: "number" },
        prima_trimestral: { type: "number" },
      },
      required: ["nombre_plan","aseguradora","suma_asegurada","prima_anual","prima_mensual","prima_semestral","prima_trimestral"],
    }}},
    required: ["planes"],
  }}},
});
const block  = res.content.find((b: any) => b.type === "text");
const planes = JSON.parse((block as any).text).planes;
await recordUsage(supabase, { component: "extract-prices", model,
  inputTokens: res.usage.input_tokens, outputTokens: res.usage.output_tokens });
```

**Aseguradoras (id externo → nombre).** 2=MERCANTIL SEGUROS, 3=SEGUROS CARACAS, 4=SEGUROS UNIVERSITAS, 5=ESTAR SEGUROS, 19=LA INTERNACIONAL DE SEGUROS, 20=SEGUROS VENEZUELA.

**Verificación / criterios de aceptación.**
- [ ] `grep -ri "openai\|api.openai.com\|OPENAI_API_KEY" supabase/functions/extract-prices` = 0.
- [ ] Invocar `extract-prices` con un PDF real → `daily_prices` se puebla con primas correctas y `aseguradora` ∈ las 6 permitidas.
- [ ] El upsert no falla (onConflict coincide con `idx_daily_prices_unique`).
- [ ] `recordUsage` registra el consumo del modelo.
- [ ] `daily-price-sync` genera cotizaciones (pdf_url) sin LLM.
- [ ] Ambas funciones desplegadas con `verify_jwt=false`.

**Riesgos y mitigación.**
- *Riesgo:* el cotizador externo cambia su API. *Mitigación:* aislar URLs/contratos; loggear `status='error'` con `error_message`.
- *Riesgo:* json_schema demasiado estricto rechaza filas válidas. *Mitigación:* `additionalProperties:false` + normalización tolerante; testear con PDFs reales de varias aseguradoras.
- *Riesgo:* el modelo Haiku falla en tablas densas. *Mitigación:* `EXTRACT_PRICES_MODEL` configurable → subir a Sonnet 4.6 si baja la fidelidad.

**Dependencias.** Fase 7 (tablas), Fase 2 (Anthropic SDK + `_shared/config.ts`/`usage.ts`).

**Esfuerzo estimado.** 1.5 días.

---

## FASE 9 — UI Precios Diarios: route handlers, página dashboard y nav

**Objetivo.** Reconstruir la página Precios Diarios en Next.js App Router sobre los route handlers server-side (eliminando la anon key hardcodeada del hook), añadir un tab que muestre `daily_prices`, y agregar el item al nav.

**Alcance.** `web/src/lib/precios.ts` (tipos/constantes), 4 route handlers, la página `(dashboard)/precios-diarios/page.tsx`, item en `nav.tsx`.

**Pasos concretos.**
1. Crear `web/src/lib/precios.ts` con tipos/constantes portados del hook: `CategoriaKey`, `CATEGORIAS_ORDER` (8), `RANGOS_ORDER` (10), `ASEGURADORAS` (6), `CATEGORIA_META`, `GRUPOS_CATALOGO`, `SUB_LABEL`, `TIPO_LABEL`. La lógica de agrupación `DiaResumen` se mueve aquí (util compartido).
2. Crear route handlers (patrón: `supabase.auth.getUser()` → 401; fetch a Edge con `SERVICE_ROLE`):
   - `GET /api/precios/cotizaciones?desde&hasta` → lee `cotizaciones_diarias`, agrupa en `DiaResumen[]`.
   - `GET /api/precios/catalogo?fecha&id_aseguradora&tipo` → lee `daily_plan_catalog`.
   - `GET /api/precios/precios?fecha&subcategoria&rango_edad` → lee `daily_prices` (tab nuevo, output más valioso).
   - `POST /api/precios/sync` → server fetch a `/functions/v1/daily-price-sync` con `Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}`.
   - `POST /api/precios/extract` → idem a `/functions/v1/extract-prices`.
3. Crear `web/src/app/(dashboard)/precios-diarios/page.tsx` (`"use client"` en los hijos interactivos): 3 tabs — **Cotizaciones** (stats X/80, filtros fecha, botones Sincronizar/Extraer con los loops 15/30), **Catálogo** (filtros aseguradora/tipo), **Precios** (NUEVO, lee `daily_prices`). Reusar shadcn del template (Button, Input, Badge, Card, Progress, Tabs, Table).
4. Reemplazar `usePreciosDiarios` por hooks que hacen fetch a los route handlers; **eliminar** la anon key del cliente.
5. Modificar `(dashboard)/nav.tsx`: agregar item "Precios Diarios".

**A CREAR.**
- `web/src/lib/precios.ts`
- `web/src/app/api/precios/{cotizaciones,catalogo,precios,sync,extract}/route.ts`
- `web/src/app/(dashboard)/precios-diarios/page.tsx`

**A PORTAR DE LAM.** `_lam_port/pages/PreciosDiarios.tsx` (metadata UI + estructura de 2 tabs), `_lam_port/hooks/usePreciosDiarios.ts` (solo tipos/constantes).

**A MODIFICAR.** `web/src/app/(dashboard)/nav.tsx`.

**A ELIMINAR.** `usePreciosDiarios.ts` original (anon key hardcodeada).

**Migraciones SQL.** Ninguna.

**Verificación / criterios de aceptación.**
- [ ] `/precios-diarios` carga los 3 tabs; nav muestra el item.
- [ ] "Sincronizar ahora" dispara `daily-price-sync` server-side; progreso X/80 avanza.
- [ ] "Extraer precios" dispara `extract-prices`; el tab Precios muestra filas de `daily_prices`.
- [ ] `grep -ri "nhszqqqqlcwmcsjmgrmv\|eyJ" web/src` (cliente) = 0 (sin anon key/ref hardcodeados en cliente).
- [ ] Route handlers exigen sesión (`401` sin login).

**Riesgos y mitigación.**
- *Riesgo:* loops 15/30 en el cliente sobrecargan. *Mitigación:* mantener idempotencia server-side; mostrar progreso real desde `cotizaciones_diarias`.
- *Riesgo:* `'80'` hardcodeado en dos sitios. *Mitigación:* centralizar `TOTAL_ESPERADO` en `precios.ts` y reusar en función y UI.

**Dependencias.** Fases 7, 8.

**Esfuerzo estimado.** 2 días.

---

## FASE 10 — Validación end-to-end, apagado de n8n y rotación de la anon key expuesta

**Objetivo.** Validar el sistema fusionado de punta a punta, desplegar a Netlify, apagar el flujo legacy de n8n, **rotar la anon key de LAM** (que estuvo hardcodeada en cliente y SQL) y re-embeber el corpus KB con el pipeline nuevo.

**Alcance.** Pruebas E2E, deploy, corte de n8n, rotación de secretos, migración de datos KB, poda de Shopify.

**Pasos concretos.**
1. **Deploy Netlify**: base=`web`, build=`pnpm build`, publish=`.next`, plugin `@netlify/plugin-nextjs`, `NODE_VERSION=20`. Verificar que el checkout incluye la **raíz** (no solo `web/`) para que `embed-provision.mjs` encuentre `../supabase`. Cargar `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` en Netlify env.
2. **E2E KB**: subir docs reales de varias aseguradoras (PDF texto, PDF escaneado, imagen, XLSX) con taxonomía → verificar chunks vectorizados (gte-small 384), filtro `search_kb` por collection/policy_type, preview y re-etiquetado.
3. **E2E Agente**: mensaje inbound vía Kommo → `process-inbound` clasifica (Haiku) → `generate-response` (CMA Sonnet) usa `search_kb` filtrado → draft → `publish-to-kommo`. Verificar memory stores (master read-only, leads read-write) y dreams nocturno.
4. **E2E Precios**: ejecutar `daily-price-sync` hasta 80/80 → `extract-prices` (Claude) puebla `daily_prices` → UI muestra precios.
5. **Re-embeber corpus**: como LAM usaba 1536/OpenAI y el destino usa 384/gte-small, la KB previa **no es reutilizable**. Re-ingestar todo el corpus de LAM por el pipeline nuevo (con taxonomía). La tabla `documents`/`match_documents` queda muerta (no se migra).
6. **Apagar n8n**: deshabilitar los workflows de n8n que orquestaban el flujo previo (clasificación/respuesta/KB) para evitar doble-respuesta. Confirmar que el único orquestador es `generate-response`. Verificar el kill switch `kommo_publish_config.agent_enabled`.
7. **Rotar la anon key expuesta**: la anon JWT de LAM (`nhszqqqqlcwmcsjmgrmv`) estuvo en `usePreciosDiarios.ts`, en las migraciones de cron y en el SPA público. Regenerar las API keys del proyecto en Supabase; actualizar `NEXT_PUBLIC_SUPABASE_ANON_KEY` (Netlify + `.env.local`), el setting de DB `app.functions_bearer` (Fase 7), y cualquier integración. Confirmar que la key vieja queda revocada.
8. **Podar Shopify**: deshabilitar las tools Shopify (`buscar_producto`, etc.) en `agent_tools` (enabled=false); las migraciones 0029/0030 quedan idempotentes (no se borran para no romper provisioning). Evaluar retiro de la tool BCV si no aplica.
9. **Apagar audio**: confirmar toggle de audio entrante apagado y sin `OPENAI_API_KEY` en runtime_config.

**A MODIFICAR/ELIMINAR.**
- `agent_tools`: Shopify/BCV `enabled=false` (vía `/api/tools` + `syncAgentTools`).
- n8n: workflows legacy desactivados (fuera del repo).
- Supabase: API keys rotadas.

**Migraciones SQL.** Ninguna nueva; opcional `0055_disable_legacy.sql` para `update agent_tools set enabled=false where name in (...shopify...)` si se prefiere versionar la poda.

**Verificación / criterios de aceptación (checklist global).**
- [ ] Deploy Netlify verde; `/first-run` y `/setup` completados en prod.
- [ ] `grep -ri "openai\|api.openai.com\|text-embedding\|gpt-4o" supabase/ web/src/` = 0.
- [ ] `search_kb` filtra por las 8 aseguradoras y 13 tipos.
- [ ] Flujo Kommo end-to-end produce respuesta del agente con KB factual.
- [ ] `daily_prices` se puebla por Claude vision; UI Precios funcional.
- [ ] n8n apagado; sin doble-respuesta.
- [ ] anon key vieja **revocada**; ninguna key/ref en cliente.
- [ ] Shopify/BCV deshabilitados; audio off.
- [ ] Corpus KB re-embebido con gte-small 384 + taxonomía.

**Riesgos y mitigación.**
- *Riesgo:* doble-respuesta n8n + CMA durante la transición. *Mitigación:* apagar n8n **antes** de habilitar publish; usar kill switch.
- *Riesgo:* rotar la anon key rompe integraciones activas. *Mitigación:* rotar en ventana de mantenimiento; actualizar todos los consumidores en un solo paso.
- *Riesgo:* `embed-provision.mjs` falla en Netlify si el checkout es solo `web/`. *Mitigación:* base=`web` pero repo completo en el checkout; validar en preview deploy.

**Dependencias.** Todas las fases anteriores.

**Esfuerzo estimado.** 1.5 días.

---
---

## E. Temas transversales

### Seguridad / RLS / secrets en `runtime_config`
- **Secrets en runtime, no en `.env`**: solo 3 vars obligatorias en entorno (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`). `ANTHROPIC_API_KEY`, `ANTHROPIC_MEMORY_*`, `OPERATOR_NAME`, `KOMMO_*`, `EXTRACT_PRICES_MODEL`, `OCR_MODEL`, `CLASSIFY_MODEL`, `DREAMS_MODEL` viven en `runtime_config` (DB-first vía `loadConfig`/`_shared/config.ts`). CERO vars OpenAI.
- **RLS alineado**: las tablas de LAM usaban policies `anon`; el destino usa `authenticated_all` + `service_role` bypass. Todas las tablas portadas (precios, KB) se alinean a `authenticated` (lectura dashboard) y escritura por service role / funciones. Bucket `knowledge-files` privado + signed URLs.
- **Edge Functions de precios**: `verify_jwt=false` (las llama pg_cron sin JWT de usuario); por eso es crítico que su lógica no exponga datos sensibles y que la key del cron salga de Vault/setting, no de texto plano.
- **Rotación obligatoria** de la anon key de LAM (Fase 10): estuvo expuesta en cliente público y SQL versionado.

### Variables de entorno
| Variable | Dónde | Notas |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | env (Netlify + .env.local) | `https://nhszqqqqlcwmcsjmgrmv.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | env | JWT legacy `eyJ...` — **rotar en Fase 10** |
| `SUPABASE_SERVICE_ROLE_KEY` | env | bypass RLS en route handlers/funciones |
| `ANTHROPIC_API_KEY`, `ANTHROPIC_MEMORY_*`, `KOMMO_*`, `OPERATOR_NAME`, modelos | `runtime_config` | vía `/setup` |
| `app.functions_bearer` | setting DB / Vault | header de los crons (no en SQL plano) |

### Deploy Netlify
- `netlify.toml` del template: `base="web"`, `command="pnpm build"`, `publish=".next"`, plugin `@netlify/plugin-nextjs`, `NODE_VERSION=20`.
- El repo completo (raíz) debe estar en el checkout porque `embed-provision.mjs` (predev/prebuild) lee `../supabase`. Si solo se publica `web/`, el build falla.
- Provisioning se hace post-deploy desde el navegador (`/first-run` → Management API), no por CLI.

### Migración de datos / re-embebido del corpus
- **Incompatibilidad de dimensiones**: LAM=1536 (OpenAI), destino=384 (gte-small). Los embeddings previos **no se migran**; la tabla `documents`/`match_documents` queda muerta.
- **Re-ingesta completa** del corpus LAM por el pipeline nuevo (Fase 10), etiquetando con la taxonomía (collection/policy_type) para que el filtro de `search_kb` sea efectivo.
- Las cotizaciones demo MX (`20260402220208`) **no se migran**.
- Los datos de `cotizaciones_diarias`/`daily_prices` se regeneran por el cron (no requieren migración de filas históricas; se acumulan desde el go-live).

---

## F. Preguntas abiertas / supuestos

**Supuestos explícitos (no verificados, asumidos del contexto):**
1. **Project ref destino = `nhszqqqqlcwmcsjmgrmv`** (el real de LAM, confirmado en `supabase/config.toml`). Se asume que la fusión sigue usando ese mismo proyecto Supabase, no uno nuevo. *Si se crea un proyecto nuevo, cambiar ref + keys en todos los puntos.*
2. **Las funciones de precios pueden invocarse con `verify_jwt=false`** y la idempotencia del lado de la función previene duplicados; se asume que el cotizador externo `mspeed.yoestoyasegurado.co` sigue operativo con los contratos documentados.
3. **`current_setting('app.functions_bearer')` o Vault** es viable para parametrizar el header del cron sin exponer la key. *Si la versión de Supabase no lo soporta como se describe, usar Supabase Vault explícitamente.*
4. **El SDK `@anthropic-ai/sdk@0.95.1` soporta `output_config.format` json_schema y bloques `document` base64** tal como los usa `process-inbound` — verificado en los hallazgos del template, asumido estable para `extract-prices`/OCR.
5. **El re-etiquetado masivo de chunks** (`update kb_chunks set metadata = metadata || ...`) es seguro porque los chunks no se re-vectorizan al cambiar metadata (el embedding no depende de collection/policy_type).
6. **n8n vive fuera del repo** (no hay archivos en el destino que lo configuren); su apagado es operativo, no de código.
7. **Voz = solo `voice_samples`** (estilo de escritura). Se asume que LAM no requiere el audio entrante; el toggle de audio queda apagado.

**Preguntas abiertas (requieren decisión del operador):**
- **A.** ¿Se mantiene el bucket KB **privado** (recomendado, signed URLs) o **público** (como LAM)? El plan asume privado.
- **B.** ¿`daily_prices` debe ser **legible por el agente** como tool (HTTP data-driven nueva) para responder precios en conversación, o solo visible en el dashboard? El plan deja `daily_prices` en el dashboard (Fase 9); la tool del agente para precios es una extensión opcional post-go-live.
- **C.** ¿`EXTRACT_PRICES_MODEL` arranca en Haiku (barato) o Sonnet (más fiel en tablas densas)? El plan arranca en Haiku, configurable.
- **D.** ¿Se versiona la poda de Shopify (`0055_disable_legacy.sql`) o se hace solo vía `/api/tools`? El plan permite ambas; preferible versionar para reproducibilidad.
- **E.** ¿Se conserva `pdf-parse` para PDFs con texto (barato) y se cae a Claude solo si `<50 chars`, o se delega **todo** PDF a Claude? El plan recomienda el híbrido (pdf-parse + fallback Claude).
- **F.** ¿El cron de precios sigue en `pg_cron`/`pg_net` (como LAM) o migra a Supabase Cron del template? El plan mantiene `pg_cron`/`pg_net` (ya probado), parametrizando la key.