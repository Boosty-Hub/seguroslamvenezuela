# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Qué es

**Seguros LAM — el agente de IA "Valentina"**, una corredora de seguros de salud de Venezuela que atiende leads por WhatsApp vía Kommo CRM. Construido **sobre el template `Boosty-Hub/Template-Agent-kommo`** (clasificación Haiku 4.5 + respuesta vía Anthropic Managed Agent Sonnet 4.6 + Memory Stores + Dreams + Outcomes) y **fusionado** con la base de conocimientos vectorizada (RAG) y el módulo de Precios Diarios que antes vivían en un proyecto aparte consumido por **n8n**.

Repo: `web/` (Next.js 14 dashboard + API routes) + `supabase/` (Postgres migrations + Edge Functions Deno) + `agent/` (system prompt; el prompt vivo de Valentina está en `runtime_config.SYSTEM_PROMPT`).

> Este repo es **un cliente concreto** (single-tenant, project ref Supabase `nhszqqqqlcwmcsjmgrmv`), NO el template genérico. La maquinaria descrita más abajo viene del template; lo **específico de Seguros LAM** está en la sección siguiente. El trabajo de fusión vive en la rama `fusion-template`.

## Seguros LAM — la fusión (lo específico de este cliente)

Regla casi absoluta: **todo se construyó SIN OpenAI** (embeddings = `gte-small` 384 de Supabase AI; visión/OCR/extracción de precios = **Claude**). **Única excepción**: la transcripción de notas de voz usa **OpenAI Whisper** (`whisper-1`) — ver sección Audio. Lo añadido sobre el template son las migraciones `0042`–`0056` y las Edge Functions `daily-price-sync` / `extract-prices` / `generar-cotizacion`. (Capas nuevas jun-2026: **0051** KB por vertical, **0052** género/edad del lead, **0053** extract-prices una vez al día, **0054** lista de etapas, **0055** entrega por plantilla+salesbot estilo n8n, **0056** tipo `aviso` para el módulo de Avisos.)

### Base de conocimiento enriquecida (módulo Contenido → pestaña "Base de conocimiento")
- Ingesta `web/src/app/api/kb/ingest`: además de PDF/DOCX/TXT/MD/SRT/VTT acepta **XLSX/CSV e imágenes**, con detección por **magic-bytes** (`web/src/lib/kb-parsers.ts: detectTrueType`).
- **OCR con Claude vision** (`web/src/lib/ocr-claude.ts`) para imágenes y PDF escaneado (fallback cuando `pdf-parse` no extrae texto). `OCR_MODEL` default `claude-haiku-4-5`.
- **Taxonomía** (`web/src/lib/collections.ts`): 8 aseguradoras (`collection`) + 13 tipos de póliza (`policy_type`), guardadas en `kb_documents`/`kb_chunks.metadata`. `search_kb` **filtra por taxonomía** (param `p_filter jsonb`, migración 0043).
- **Bucket privado** `knowledge-files` (migración 0044): guarda el binario original (preview/descarga vía signed URL). Estados de procesamiento + **re-etiquetado sin re-procesar** (RPC `retag_kb_document`, migración 0045).

### Precios Diarios (módulo nuevo → `(dashboard)/precios-diarios`)
- Tablas `cotizaciones_diarias` / `daily_plan_catalog` (con columna `subcategoria` GENERATED) / `daily_prices` (migración 0046). 8 subcategorías × 10 rangos de edad = 80 cotizaciones/día.
- `daily-price-sync`: scraper del cotizador externo `mspeed.yoestoyasegurado.co` (sin IA), cron `*/10` (migración 0047). `extract-prices`: lee los PDFs y extrae precios con **Claude vision + `output_config` json_schema** (`EXTRACT_PRICES_MODEL` default `claude-haiku-4-5`). **Optimizado (migración 0053):** corre **una vez al día** (08:00 UTC) y marca cada PDF como leído (`cotizaciones_diarias.prices_extracted_at`) para leerlo EXACTAMENTE una vez — antes marcaba "hecho" por presencia en `daily_prices`, así que un PDF que daba 0 filas se re-leía cada 10 min para siempre (era el mayor gasto de IA). Bearer vía setting de DB; ambas `verify_jwt=false`.
- Route handlers `/api/precios/{precios,cotizaciones,sync,extract}` + item en el nav.

### Tools de precios del agente
- `buscar_precios_seguros` (tool http → RPC PostgREST `buscar_precios_seguros`, migración 0048/0049): precios del día por subcategoría+rango **con `id_plan`** (join a `daily_plan_catalog`).
- `generar_cotizacion` (tool http → Edge Function `generar-cotizacion`, migración 0049): genera la **cotización OFICIAL en PDF** vía `cotizar.php` (titular + beneficiarios + planes; calcula `fecha_nacimiento` desde la edad). Replica la tool `apidaniel` del flujo n8n; devuelve `pdf_url` **y un `cotizacion_url` propio** (`<APP_BASE_URL>/cotizacion/<nombre-cliente>-<id>` → ruta pública Next con marca Seguros LAM + PDF embebido). El system prompt obliga a compartir el `cotizacion_url` (presentable/confiable), NUNCA el `pdf_url` crudo. `APP_BASE_URL` en runtime_config (la URL de Netlify del cliente).

### Poda (migración 0050)
- Shopify deshabilitado (`buscar_producto`/`consultar_pedido`/`crear_link_pago`/`ver_categorias` → `enabled=false`). **BCV (`tasa_bcv`) y las tools CRM de Kommo se mantienen.**
- RLS endurecido: las 3 tablas de precios quedan solo con policy `authenticated` (quitadas las `anon`/public legacy de LAM).

### KB por vertical (migración 0051)
- `kb_documents.vertical` etiqueta cada documento; `search_kb` filtra por `vertical` (vía `metadata @> p_filter` en `runSearchKb` — no se cambió la RPC, solo se mete `vertical` en el metadata de los chunks y se extendió el `input_schema` de la tool). UI: panel de KB (uploader + listado + borrar) **dentro del editor de cada vertical** (`web/src/app/(dashboard)/verticales/vertical-kb-panel.tsx`) + API `GET /api/kb/by-vertical`. 4 verticales nuevas: **vida, hogar, ciberseguridad, empresarial**.
- La KB legacy de LAM (`documents`, 3457 chunks OpenAI 1536 + `knowledge_files`, 160 archivos) fue **re-vectorizada** a `kb_documents`/`kb_chunks` (gte-small 384) mapeando `policy_type`→vertical. **Las tablas viejas (`documents`/`knowledge_files`) siguen INTACTAS** (n8n las usaba).

### Trato por género y edad (migración 0052)
- El preclasificador (Haiku, `process-inbound`) infiere `gender` del **NOMBRE** del lead y `age` si la persona la declara; se guardan en `leads.gender`/`leads.age` y se inyectan en el contexto del agente (`buildContext`). Visible en el inbox (badge ♀/♂ + edad; 55+ en ámbar).
- **Framing clave**: Haiku se NIEGA a "inferir género" con el framing directo (devuelve "desconocido"); funciona pidiéndole "normalización gramatical para concordancia (bienvenido/a)". Si tocas esa instrucción, mantené ese encuadre.
- El system prompt adapta el registro: **55+ → usted** (formal, pausado, explicativo); **<30 → tuteo casual**; 30-54/desconocida → tuteo profesional. Concordancia de género (formas neutras si es desconocido).

### Modelo y dialecto del agente
- `AGENT_MODEL` está en **`claude-sonnet-4-6`** (se cambió de Haiku porque Haiku producía **voseo argentino** imitando el historial del lead, pese al prompt). Editable en `/consumo` (panel "Modelos por componente").
- El `SYSTEM_PROMPT` lleva una **"REGLA DE DIALECTO INNEGOCIABLE"**: español venezolano (tuteo, o usted con mayores); PROHIBIDO el voseo; y **no imitar el dialecto del historial/memoria**. Las memorias de lead con voseo residual se limpiaron.

### Gating por etapa + handoff al asesor (migración 0054)
- `kommo_publish_config` tiene `responding_stage_ids` (lista blanca) e `ignored_stage_ids` (lista negra); ambas se evalúan en `pickLeadBatch` de `generate-response`. **Operativamente se usa la lista NEGRA** porque la UI `/agent → filtros → Etapas de Kommo` la gestiona: se **pausan todas las etapas menos** donde responde el agente (Incoming/Leads Entrantes + Conver. IA de **VENTAS ANA y VENTAS MARIA** + **PERDIDOS** 143). La lista blanca quedó en código pero vacía (evita 2 fuentes de verdad en la UI).
- **Handoff**: cuando el cliente confirma que quiere **contratar/adquirir un plan**, el agente mueve el lead a **"VIENE DEL AGENTE IA (ATENDER)"** con `mover_etapa` (acción autorizada explícitamente en el prompt para este caso); esa etapa está en pausa → el agente deja de responder. `mover_etapa` desambigua por el **pipeline ACTUAL** del lead (la etapa existe en Ana y Maria). `process-inbound` ahora procesa `leads.update` → mantiene fresca `leads.kommo_stage_id`.

### Entrega: mecanismo n8n por plantilla+salesbot (migración 0055)
- El flujo legacy de n8n NO usa custom field: escribe la respuesta en una **plantilla de chat** (`PATCH /api/v4/chats/templates`) y corre un **salesbot** que la envía, **rotando aleatoriamente entre 5 pares** `{template, salesbot}` (anti-colisión). El template por defecto usaba custom field + salesbot que lo lee — incompatible con esos salesbots.
- `publish-to-kommo` soporta ambos: si `kommo_publish_config.salesbot_template_pairs` tiene pares → mecanismo n8n (`patchChatTemplate` + `runSalesbot` con rotación); si no → custom field (`response_custom_field_id` + `salesbot_id`). **LAM (jun-2026) usa el custom field**: campo "Mensaje variable" `1209950` + salesbot `59541`; los 5 pares n8n se vaciaron (`salesbot_template_pairs=[]`) porque `pairs.length>0` los priorizaba e ignoraba el campo (síntoma: "los mensajes no se envían" aunque el campo/salesbot estén bien). La UI `/settings` NO gestiona `salesbot_template_pairs` → si hay que limpiarlos, es por SQL.
- **Gotcha utf8mb3 (emojis)**: los custom fields de Kommo guardan en `utf8mb3` → un emoji (4 bytes) **trunca el valor en el primer emoji** (verificado contra la API: "A😀B" → "A"; saltos de línea y acentos ≤3 bytes se conservan, largo ≥648 OK). `patchLeadField` corre `sanitizeForKommoField` antes de escribir (quita chars >U+FFFF). Sin esto, los mensajes con emoji llegan cortados.

### Avisos / novedades transitorias (migración 0056)
- Módulo `(dashboard)/avisos` — **item propio en el sidebar** (icono megáfono, grupo "Contenido y calidad"). Gestiona eventos, promos y **avisos/situaciones** que el agente conoce en vivo. **Reusa la tabla `promotions`** (la pestaña de promos se sacó de Contenido y se mudó acá); `kind` acepta `'promo'|'evento'|'aviso'` (0056 amplía el CHECK; componentes en `(dashboard)/avisos/`).
- Inyección en `generate-response` (`buildPromoContext`→`buildContext`): los **avisos activos hoy** entran en un bloque `avisos_importantes` del `[CONTEXTO]` con instrucción "DEBES tener en cuenta SIEMPRE" (vs promos = "menciónalas solo si vienen al caso"; eventos = además se anticipan 7 días). Vigencia por `starts_at`/`ends_at` (inclusive) / `weekdays`, igual que promos. Ej: terremoto/cierre por emergencia = un `aviso` con `ends_at=hoy`.

### Dreams: programación configurable
- `DREAMS_ENABLED` (on/off) + `DREAMS_EVERY_DAYS` (cada cuántos días) en runtime_config; `dreams-run` se **auto-saltea** según la cadencia (el cron sigue diario, pero la función decide; el run manual fuerza con `force:true`). Selector en `/dreams`. Esto es independiente de `DREAMS_AUTO_ACTIVATE` (qué se activa solo).

### UX / performance del dashboard
- **Barra de progreso de navegación** (`(dashboard)/nav-progress.tsx`, montada en el layout) para feedback instantáneo al clic. **`fetchPipelinesCached`** (`unstable_cache` 5 min) evita pegarle a Kommo en cada render del inbox. Inbox: **alerta animada** (triángulo rojo pulsante) en conversaciones que el agente no respondió (revisión humana / hostil).

### Estado del corte (cutover) — EN VIVO (jun-2026)
Se **salió de modo sombra**: `agent_enabled=true`, `publishing_enabled=true`, `bypass_review=true` (publica todo sin pasar por revisión automática; el botón manual de revisión sí queda `pending`). `publish_from` se fijó al go-live y los ~54 borradores viejos de sombra quedaron `rejected` para que NO se dispararan al activar el envío (⚠️ si algún día se activa publishing con `publish_from=null`, se enviarían todos los `approved` viejos a clientes reales — siempre fijar `publish_from`). La entrega usa el **mecanismo de custom field** (campo `1209950` + salesbot `59541`; los pares n8n se vaciaron — ver sección Entrega). **Dependencia operativa crítica:** el flujo **n8n legacy debe estar APAGADO** — si sigue activo, ambos sistemas responden (mensajes duplicados). Pendiente menor: rotar la anon key expuesta.

## Desplegar un cliente nuevo (zero-CLI — todo desde el navegador)

El flujo es **single-tenant**: un clon = un cliente. Cada cliente tiene su propio Supabase, su propia conexión Kommo y su propia cuenta/API key de Anthropic. La personalización por cliente vive en la tabla `runtime_config` (DB), editable desde el dashboard — NO se edita código.

1. **Crear infra externa** (manual, irreducible): un proyecto Supabase nuevo, una API key de Anthropic, una integración long-lived token en Kommo.
2. **Deployar en Netlify/Vercel** (import from Git, una vez): en **Netlify es zero-config** — `netlify.toml` ya fija `base = "web"`, `command = "pnpm build"`, `publish = ".next"`, Node 20 y `@netlify/plugin-nextjs`. En Vercel: root directory = `web/`, build `pnpm build`. El host hace checkout del repo **completo** (no solo `web/`) para que el codegen lea `../supabase/` en el build. El **primer deploy FALLA** hasta cargar las env vars — es esperado.
3. **Configurar las 3 variables en el host** (Netlify: Site configuration → Environment variables · Vercel: Project Settings → Environment Variables), luego **redesplegar**. Las tres salen del proyecto Supabase nuevo en **Project Settings → API**. ⚠️ Usar las keys **LEGACY JWT** (empiezan con `eyJ`), NO las nuevas `sb_publishable_`/`sb_secret_` (PostgREST rechaza las nuevas):
   - `NEXT_PUBLIC_SUPABASE_URL` — Project URL (`https://<ref>.supabase.co`)
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Legacy API keys → `anon (public)`
   - `SUPABASE_SERVICE_ROLE_KEY` — Legacy API keys → `service_role (secret)`
4. **Abrir la URL** → el wizard `/first-run` detecta el estado y guía el siguiente paso.
5. **Wizard `/first-run`**: paso Conectar (ya hecho) → paso Inicializar (pegás un Personal Access Token `sbp_...` de `supabase.com/dashboard/account/tokens`; el wizard aplica las migraciones + deploya las Edge Functions con progreso en vivo) → paso Crear usuario (email + contraseña; bloquea registros adicionales). **Acá el onboarding crea/provisiona todo el proyecto solo.**
6. **Wizard `/setup`**: Anthropic credentials + Memory Stores + Managed Agent + Kommo. Idempotente.
7. **`/agent`**: editás voz/identidad/branding cuando quieras; al guardar sincroniza el system prompt con Anthropic (sube versión).

> **Guía paso-a-paso completa** (para humanos, con cada wizard detallado): `README.md` (Pasos 1-7) y `SETUP-WITH-CLAUDE.md` (Fase 4 deploy Netlify/Vercel · Fase 5 env vars + `/first-run`). Mantené estas tres en sync si cambia el flujo.

### Codegen automático

`pnpm dev` y `pnpm build` corren automáticamente `node scripts/embed-provision.mjs` (hooks `predev`/`prebuild`). El script embebe todas las migraciones SQL y el source de las 8 Edge Functions en archivos TypeScript generados (`web/src/lib/provision/*.generated.ts`, gitignoreados). Esto permite que el wizard `/first-run` aplique migraciones y despliegue funciones sin acceso al filesystem en runtime. **Si el directorio `../supabase/` no existe, el build falla intencionalmente** — diseñado para que el build no pase en silencio con un provisioner vacío.

### Precedencia de config (clave)

`runtime_config` es la **single source of truth**. Web y Edge Functions resuelven cada key **DB-first / env-fallback**: si la fila existe y `value` no es NULL ni `""` → se usa; si no → variable de entorno; si no → undefined. Los lectores: `web/src/lib/runtime-config.ts` (React `cache()` por request) y `supabase/functions/_shared/config.ts` (cache TTL 60s, lectura en runtime). Tras escribir config desde el dashboard, las Edge Functions la toman dentro de 60s sin redeploy.

```bash
# Front (desde web/)
cd web && pnpm install
pnpm dev            # dev server :3000; corre codegen automáticamente al arrancar
pnpm build
npx tsc --noEmit    # typecheck — correr SIEMPRE tras editar el front (no hay test suite)

# Re-deploy de una Edge Function puntual
SUPABASE_ACCESS_TOKEN=<token> npx supabase functions deploy <fn> --project-ref <ref>
```

> No hay `pnpm bootstrap`, `pnpm migrate` ni `pnpm user:master`. Esos scripts fueron eliminados. Todo sucede desde el browser vía `/first-run`. Para desarrollo local, el codegen corre automáticamente en `predev`.

No hay tests ni linter más allá de `eslint-config-next`. Verificación de cada cambio del front: `npx tsc --noEmit`. Para Edge Functions no hay typecheck local (Deno); validar desplegando y golpeando la función.

## Arquitectura — el pipeline (lo más importante)

Mensaje entra a Kommo → llega al sistema y fluye así, **todo desacoplado por la tabla `inbound_queue` + Edge Functions encadenadas**:

```
Kommo webhook ──> kommo-webhook ──> inbound_queue (pending)
                                          │ (waitUntil)
                                          ▼
                   process-inbound: parsea payload, upsert leads, inserta
                   messages, clasifica inbound con Haiku 4.5 (vertical +
                   intent/urgency/toxicity/requires_human_review)
                                          │ (waitUntil, modo cola sin message_id)
                                          ▼
                   generate-response: DEBOUNCE 45s por lead → batch de
                   TODOS los mensajes sin responder del lead → sesión CMA
                   (Sonnet 4.6) con Memory Stores montados → 1 draft
                                          │ (si approved)
                                          ▼
                   publish-to-kommo: PATCH custom field configurado +
                   corre salesbot → evaluate-outcomes (graders)
```

Resiliencia: `pg_cron` barre cada minuto `process-inbound`, `generate-response`, `publish-to-kommo` (migraciones 0006/0007/0013) por si el fire-and-forget se corta. `dreams-run` (daily/weekly) y `evaluate-outcomes`/`alerts-scan` (cada 5 min) también por cron.

### Invariantes críticos (romperlos rompe producción)

1. **`verify_jwt = false` para TODAS las Edge Functions.** Kommo postea sin JWT; con `verify_jwt=true` da 401 y nada entra. En deploys por CLI, está fijado en `supabase/config.toml` bajo `[functions.*]`. En deploys desde el browser (wizard `/first-run`), se fuerza vía la metadata del API call: `{ verify_jwt: false }` en cada llamada a `POST /v1/projects/{ref}/functions/deploy` (ver `web/src/lib/provision/management.ts`). **Nunca quitar ninguno de los dos mecanismos.**

2. **El trabajo lento del agente va dentro de `EdgeRuntime.waitUntil()`.** `generate-response` crea el draft `pending`, devuelve **202 de inmediato**, y corre el agente (~60-80s) en `waitUntil`. Si se hiciera antes de responder, el runtime mata la función al desconectarse el cliente (pg_net/fire-and-forget) → draft `pending` eterno. Mismo patrón en `kommo-webhook`→`process-inbound` y `process-inbound`→`generate-response`.

3. **Debounce + batching.** `process-inbound` dispara `generate-response` en **modo cola** (sin `message_id`) para que aplique el debounce. `generate-response` espera 45s de silencio desde el último inbound del lead y responde TODOS sus mensajes pendientes en UN solo draft (resuelve los "3 mensajes cortados = una idea"). `messages.answered_by_draft_id` marca todo el batch como cubierto (FK `on delete set null` → si el draft se borra por stale, se reprocesan). Drafts `pending` con `agent_metadata.generating=true` >8min se consideran runs muertos: un barrido global al inicio del modo cola los borra (el FK libera su batch para reprocesar). El umbral es holgado adrede — runs vivos con muchos tool calls llegan a ~2.5min, y borrar un run vivo solo duplica trabajo (las guardas `status='pending'` en delete/update evitan perder o duplicar respuestas).

4. **Tres switches en `kommo_publish_config` (singleton `is_active=true`):**
   - `agent_enabled` — kill switch; si `false` `generate-response` no genera nada.
   - `publishing_enabled` — si `false`, drafts se generan pero NO se publican (shadow/validación).
   - `bypass_review` — si `true` (y `publishing_enabled=true`), el agente responde y publica TODO aunque entre a review. No afecta el botón de revisión humana (forceReview siempre queda `pending`).
   - Combinación de validación inicial: `agent_enabled=true, publishing_enabled=false`.

5. **Migraciones con `${SUPABASE_URL}` placeholder.** Las migraciones que crean cron jobs (0006, 0007, 0009, 0010, 0011, 0013) usan `'${SUPABASE_URL}/functions/v1/<fn>'` en lugar de URLs hardcoded. La sustitución ocurre **en runtime** dentro de `web/src/app/api/provision/migrate/route.ts` antes de ejecutar cada SQL. El placeholder viaja intacto en los archivos `.sql` y en el archivo generado `migrations.generated.ts`. **No reemplazar el placeholder con la URL real en los archivos SQL** — dejá el placeholder para que el repo siga siendo reusable.

### Memoria y aprendizaje (Anthropic Managed Agents)

- Dos Memory Stores montados como filesystem en la sesión CMA. Sus nombres reales se configuran vía env vars (`MEMORY_STORE_MASTER_NAME` / `MEMORY_STORE_LEADS_NAME`):
  - **master** (read-only, global a todos los leads): `/voice/` (voz), `/kb/` (KB destilada), `/dreams/` (aprendizajes).
  - **leads** (read-write, por lead): `/<lead_id>/conversation.md` + `learnings.md`.
- En el código (web + edge) usamos los labels semánticos `"master"` y `"leads"` para no acoplar el schema a un nombre específico de store. El ID real viene de `ANTHROPIC_MEMORY_MASTER_ID` / `_LEADS_ID`.
- **Dreams**: `dreams-run` analiza conversaciones (24h/7d), Sonnet destila learnings y los escribe como `.md` en `<master>/dreams/`. El system prompt del agente obliga a leer `/dreams/` con **prioridad mayor que la voz base** antes de redactar. No es reentrenamiento: es retrieval en vivo. Cada learning lleva `severity` (sugerencia|advertencia|error, codificada también en el filename como `sug|adv|err`) y la política `runtime_config.DREAMS_AUTO_ACTIVATE` decide qué se activa solo: `all` (default), `error` (solo errores se auto-activan = autocorrección; el resto espera aprobación) o `none`. Lo no activado va a `/dreams-pending/` (el agente NO lo lee) y se aprueba/descarta desde `/dreams`. Todo dream `error` genera una alerta (`kind=dream_error`). El dashboard permite borrar activos (borra el archivo del Memory Store → el agente deja de adoptarlo).
- **Audio (notas de voz)**: `process-inbound` (`transcribeAudio`) transcribe con Whisper (`whisper-1`) si `respond_to_audio=true` y hay `OPENAI_API_KEY`. **En Seguros LAM (jun-2026) el audio está PRENDIDO** (`respond_to_audio=true` + `OPENAI_API_KEY` cargada — la única excepción al "sin OpenAI", solo para STT). **Gotcha del download (clave)**: Kommo (amojo) sirve el audio detrás de un `301` hacia una URL firmada de Google Storage; `transcribeAudio` **sigue el redirect a mano revalidando el host de cada salto** (`fetchFollowingRedirects`, anti-SSRF: amojo/kommo/`*.googleapis.com`/`*.amazonaws.com`, nunca IPs) — NUNCA `redirect:"error"` o **ningún audio se transcribe** (era el bug: 0 audios transcritos jamás). El nombre que da Kommo (`file.ogg`) miente (suele ser m4a/mp4): la extensión para Whisper se deriva del `content-type` (`whisperFilename`). El recover path (`recoverFailedClassifications`) también re-transcribe audio y reemplaza el placeholder `[Audio …]` por `🎙️ <transcripción>`.
- `search_kb` es un custom tool del agente: embeddings gte-small 384d (`embed` function) + RPC `search_kb` (vector 0.7 + FTS español 0.3) **+ filtro opcional por metadata `collection`/`policy_type`** (taxonomía aseguradora/tipo de póliza — específico de Seguros LAM, migración 0043). Junto a él, las tools de precios `buscar_precios_seguros` y `generar_cotizacion` (ver sección Seguros LAM).
- Captura de mensajes salientes manuales de Kommo: **no resuelto**. El webhook `leads.add` no trae texto; los mensajes tecleados a mano viven en el sistema de chat de Kommo (amojo, credenciales aparte). Lo único recuperable vía API es lo que pasa por el custom field configurado (eventos `/api/v4/events`).

### System prompt del agente

El system prompt vivo está en `runtime_config.SYSTEM_PROMPT` (DB), editable desde el dashboard en `/agent`. Soporta placeholders que se sustituyen al sincronizar con Anthropic:
- `{{OPERATOR_NAME}}` — de `runtime_config.OPERATOR_NAME`.
- `{{MASTER_PATH}}` / `{{LEADS_PATH}}` — `/mnt/memory/<MEMORY_STORE_*_NAME>`.
- `{{MEMORY_STORE_MASTER}}` / `{{MEMORY_STORE_LEADS}}` — nombres de los stores.

La sustitución y la lista de tools viven en `web/src/lib/agent-prompt.ts` (compartidas por `/api/agent` y `/api/setup/agent`). Guardar en `/agent` llama `anthropic.beta.agents.update()` y persiste la versión nueva en `runtime_config.ANTHROPIC_AGENT_VERSION`. `agent/system-prompt.example.md` (commiteado) es el template de partida para copiar/pegar al wizard; el prompt vivo está en `runtime_config.SYSTEM_PROMPT`.

### Front (Next.js App Router)

- **Resilient boot**: el middleware (`src/middleware.ts` → `lib/supabase/middleware.ts`) detecta la ausencia de env vars de Supabase y redirige todo (excepto `/first-run/**`, `/api/provision/**`, `/_next/**`, `/favicon.ico`) al wizard de configuracion inicial. Nunca lanza un 500 aunque el entorno esté vacío.
- **`/first-run/` invariante**: ningún archivo bajo `web/src/app/first-run/` ni bajo `web/src/app/api/provision/` puede importar `@/lib/runtime-config` ni `@/lib/supabase/service` — ambos módulos lanzan si las vars de entorno no están presentes. Los componentes y routes de provision construyen sus clientes inline con `createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, ...)`.
- Single-user: usuario master se loguea; el `(dashboard)/layout.tsx` hace `getUser()` (hay 2 round-trips de auth por navegación — optimización pendiente conocida).
- Todas las páginas del dashboard son `export const dynamic = "force-dynamic"`. Hay `loading.tsx` (grupo + inbox) que dan feedback instantáneo vía Suspense.
- **Realtime**: `messages`/`drafts`/`leads`/`alerts` publicados (migración 0008/0011); componentes `realtime-refresher`/`realtime` hacen `router.refresh()` con debounce.
- Filtros Inbox/Leads: server-side por `searchParams`, componente compartido `(dashboard)/inbox/filters.tsx` (prop `collapsible` para el inbox). Inbox preserva los filtros en los links de conversación vía `filterQS`.
- RLS en todas las tablas: `authenticated` tiene acceso total (solo el master entra); `service_role` (Edge Functions) bypassea.
- Branding: el título del dashboard se resuelve **DB-first** (`runtime_config.NEXT_PUBLIC_AGENT_LABEL`, editable en `/agent`) en `(dashboard)/layout.tsx` y se pasa como prop al `nav` — NO depende del inlining build-time de `NEXT_PUBLIC_AGENT_LABEL`. Fallback al env var y, si no, default "Agente". El login sí usa el env var build-time.

## Convenciones y gotchas

- **`runtime_config` es la single source of truth** para credenciales e identidad por cliente (migración 0017/0018). Web y Edge leen DB-first/env-fallback; ya NO hace falta publicar secrets de Anthropic/Kommo vía Management API ni mantener los mismos valores en `web/.env.local` y en secrets de Supabase — el wizard `/first-run` + `/setup` los escribe una vez en DB. Lo único irreducible en el host como env vars: los 3 secretos de arranque de Supabase (URL, anon, service-role) que se necesitan para leer la DB. **Tradeoff de seguridad**: las credenciales en `runtime_config` están en texto plano, protegidas solo por RLS (acceso `authenticated` + `service_role`). Cifrado pgcrypto queda diferido a una iteración futura.
- Las nuevas keys de Supabase (`sb_publishable_*` / `sb_secret_*`) **no** funcionan con la REST API PostgREST (espera JWT de 3 partes). Para llamar la REST API usar las legacy JWT keys (`/v1/projects/<ref>/api-keys`).
- Edge Functions: Deno, imports por URL/`npm:`; el cron las invoca vía `net.http_post` (pg_net). Status `drafts`: `pending|approved|sent|rejected|auto_sent|failed`.
- Tras cambiar `web/.env.local` hay que **reiniciar** `pnpm dev` (Next lee env al arrancar). Cambiar secrets de Edge Functions NO requiere redeploy (se leen en runtime).
- UI en español, light theme. Sistema de diseño: tarjetas `rounded-xl border border-neutral-200 bg-white shadow-sm`, botón primario `bg-neutral-900 text-white rounded-lg`, badges `rounded-full text-[11px]`, tablas con `overflow-x-auto min-w-[640px]`, responsive a 375px (sidebar → drawer móvil en `(dashboard)/nav.tsx`).
- Migraciones: numeradas `00NN_nombre.sql`, idempotentes (`if not exists`), registradas en tabla `_migrations`. URLs absolutas usan `${SUPABASE_URL}` que sustituye el route handler de migrate en runtime.
- **Embed `drafts`↔`messages` ambiguo (PostgREST)**: hay DOS FKs entre ambas (`drafts.message_id` y `messages.answered_by_draft_id` del batching), así que un `.select("…messages(…)")` desde `drafts` tira `Could not embed because more than one relationship was found`. **Desambiguar con el FK explícito**: `messages!drafts_message_id_fkey(…)`. Afecta `publish-to-kommo`/`evaluate-outcomes`/`alerts-scan` (caían con 500 en cada cron → drafts `approved` sin enviar) y rutas del front que embeben mensajes desde drafts.
- **Updates/deploys = se manejan acá (Claude + token), NO desde el dashboard**: se quitó el `UpdatesBanner` del layout. Migraciones y (re)deploy de Edge Functions se aplican vía el Management API con un PAT `sbp_...` (NO caduca salvo que se cree con expiración o se revoque; se guarda en `runtime_config.SUPABASE_ACCESS_TOKEN`). El runtime del agente NO depende del PAT (usa la service-role key) — aunque el PAT muera, Valentina sigue respondiendo.
- **Lecturas de provisión con `cache:"no-store"`**: `config-token.ts`/`management.ts`/`function-hashes.ts` fuerzan `no-store` — sin esto, Next cachea la lectura del token en `.next/cache` (sobrevive reinicios) y sirve un token **viejo** tras rotarlo → 401 del Management API → 502 en `/api/provision/migrate`.

## Customización por proyecto

| Cosa | Dónde |
|---|---|
| Voz / system prompt del operador | Dashboard `/agent` (→ `runtime_config.SYSTEM_PROMPT`) |
| Identidad del agente (operador, nombre, branding) | Dashboard `/agent` o wizard `/setup` (→ `runtime_config`) |
| Aprovisionar Memory Stores + Agent + Kommo | Dashboard `/setup` (wizard idempotente) |
| Verticales (categorías de mensajes) | Dashboard `/verticales` (o `supabase/migrations/0002_seed.sql` antes del primer migrate) |
| Prompts de graders | Dashboard `/outcomes` |
| Custom field y salesbot de Kommo | Dashboard `/settings` |
| Modelo (Sonnet vs otro) | Wizard `/setup` (→ `runtime_config.AGENT_MODEL`, default `claude-sonnet-4-6`) |
| Secretos de arranque (irreducibles) | Host env vars: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` |
