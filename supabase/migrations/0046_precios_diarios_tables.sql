-- 0046_precios_diarios_tables.sql
-- Modulo Precios Diarios (portado de Seguros LAM, estado FINAL consolidado de
-- 10 migraciones 20260*). Tablas + columna generada subcategoria + indices
-- unicos. RLS alineado al template (authenticated; las edge functions escriben
-- con service_role). Los crons se crean en 0047 (Fase 8), tras convertir
-- extract-prices a Claude.

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- ── cotizaciones_diarias ──────────────────────────────────────────────────────
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
  categoria     text        not null default 'todos',
  rango_edad    text        not null default 'referencia'
);
alter table public.cotizaciones_diarias enable row level security;
drop policy if exists "cot_diarias_auth_all" on public.cotizaciones_diarias;
create policy "cot_diarias_auth_all" on public.cotizaciones_diarias
  for all to authenticated using (true) with check (true);
create index if not exists idx_cot_diarias_cat   on public.cotizaciones_diarias (fecha desc, categoria);
create index if not exists idx_cot_diarias_rango on public.cotizaciones_diarias (fecha desc, categoria, rango_edad);
-- Unicidad final: una cotizacion por (fecha, categoria, rango_edad).
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'cotizaciones_diarias_unique_per_day') then
    alter table public.cotizaciones_diarias
      add constraint cotizaciones_diarias_unique_per_day unique (fecha, categoria, rango_edad);
  end if;
end $$;

-- ── daily_plan_catalog ────────────────────────────────────────────────────────
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
      when tipo = 1 and suma_asegurada <= 50000   then 'salud_basica_a'
      when tipo = 1 and suma_asegurada <= 100000  then 'salud_estandar'
      when tipo = 1 and suma_asegurada <= 200000  then 'salud_media'
      when tipo = 1 and suma_asegurada <= 500000  then 'salud_alta'
      when tipo = 1                               then 'salud_premium'
      else 'otros'
    end
  ) stored
);
alter table public.daily_plan_catalog enable row level security;
drop policy if exists "plan_catalog_auth_all" on public.daily_plan_catalog;
create policy "plan_catalog_auth_all" on public.daily_plan_catalog
  for all to authenticated using (true) with check (true);
create index if not exists idx_plan_catalog_fecha        on public.daily_plan_catalog (fecha desc);
create index if not exists idx_plan_catalog_aseguradora  on public.daily_plan_catalog (id_aseguradora);
create index if not exists idx_plan_catalog_subcategoria on public.daily_plan_catalog (fecha desc, subcategoria);

-- ── daily_prices ──────────────────────────────────────────────────────────────
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
drop policy if exists "daily_prices_read_auth" on public.daily_prices;
create policy "daily_prices_read_auth" on public.daily_prices
  for select to authenticated using (true);
