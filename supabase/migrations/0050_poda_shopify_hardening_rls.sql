-- 0050_poda_shopify_hardening_rls.sql
-- Poda: Seguros LAM no usa Shopify -> deshabilitar sus tools del agente.
-- BCV (tasa_bcv) y las tools CRM de Kommo se MANTIENEN.
update agent_tools set enabled = false
  where name in ('buscar_producto', 'consultar_pedido', 'crear_link_pago', 'ver_categorias');

-- Hardening RLS: quitar las policies anon/public legacy de LAM en las tablas de
-- Precios Diarios (solo existian en el proyecto original de LAM; en un deploy
-- nuevo no existen, por eso drop-if-exists es idempotente). Quedan las policies
-- 'authenticated' (dashboard) + el bypass service_role de las edge functions.
drop policy if exists "Allow public insert" on public.cotizaciones_diarias;
drop policy if exists "Allow public read"   on public.cotizaciones_diarias;
drop policy if exists "Allow public update" on public.cotizaciones_diarias;
drop policy if exists "Allow public insert" on public.daily_plan_catalog;
drop policy if exists "Allow public read"   on public.daily_plan_catalog;
drop policy if exists "Allow read access"   on public.daily_prices;
