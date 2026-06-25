-- 0053_extract_prices_once_daily.sql
-- Optimiza extract-prices (era el mayor costo de IA):
--   (1) Marca cada PDF como leído (prices_extracted_at) para NO re-extraerlo —
--       antes, un PDF que daba 0 filas nunca se marcaba "hecho" y se re-leía
--       cada 10 min para siempre, quemando visión. Ahora se lee EXACTAMENTE una vez.
--   (2) El cron pasa de cada 10 min a UNA VEZ AL DÍA.

-- (1) Marca de extracción por cotización.
alter table cotizaciones_diarias add column if not exists prices_extracted_at timestamptz;

-- Backfill: marcar como ya-extraído todo lo histórico y lo que ya tiene precios,
-- para que el optimizador NO intente re-leer miles de PDFs viejos en la 1ª corrida.
update cotizaciones_diarias c
set prices_extracted_at = coalesce(c.prices_extracted_at, now())
where c.fecha < current_date
   or exists (
     select 1 from daily_prices dp
     where dp.fecha = c.fecha and dp.subcategoria = c.categoria and dp.rango_edad = c.rango_edad
   );

create index if not exists cotizaciones_diarias_pendientes_idx
  on cotizaciones_diarias (fecha) where prices_extracted_at is null;

-- (2) Reprogramar el cron: extract-prices UNA VEZ AL DÍA (08:00 UTC ≈ 04:00 Vzla,
-- ya con los PDFs del día generados por daily-price-sync). daily-price-sync se
-- mantiene (genera los PDFs; no consume IA).
select cron.unschedule(jobname) from cron.job where jobname = 'extract-prices-loop';

select cron.schedule('extract-prices-daily', '0 8 * * *', $cron$
  select net.http_post(
    url     := 'https://nhszqqqqlcwmcsjmgrmv.supabase.co/functions/v1/extract-prices',
    headers := jsonb_build_object(
                 'Content-Type', 'application/json',
                 'Authorization', 'Bearer ' || coalesce(current_setting('app.functions_bearer', true), '')),
    body    := '{}'::jsonb);
$cron$);
