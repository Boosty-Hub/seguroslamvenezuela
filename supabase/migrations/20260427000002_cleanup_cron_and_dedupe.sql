-- Drop the old daily cron job (was running at 11:00 UTC, hitting timeout)
SELECT cron.unschedule('daily-price-sync');

-- Prevent future duplicates: only one cotizacion per (fecha, categoria, rango_edad)
-- First clean existing duplicates: keep the row with the smallest id_cotizacion
DELETE FROM public.cotizaciones_diarias d1
USING public.cotizaciones_diarias d2
WHERE d1.fecha = d2.fecha
  AND d1.categoria = d2.categoria
  AND d1.rango_edad = d2.rango_edad
  AND d1.id_cotizacion > d2.id_cotizacion;

ALTER TABLE public.cotizaciones_diarias
  ADD CONSTRAINT cotizaciones_diarias_unique_per_day
  UNIQUE (fecha, categoria, rango_edad);

-- RPC for auditing cron jobs via REST API (service_role only)
CREATE OR REPLACE FUNCTION public.list_cron_jobs()
RETURNS TABLE (
  jobid     bigint,
  jobname   text,
  schedule  text,
  active    boolean,
  command   text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = cron, public
AS $$
  SELECT jobid, jobname, schedule, active, command
  FROM cron.job
  ORDER BY jobid;
$$;

GRANT EXECUTE ON FUNCTION public.list_cron_jobs() TO service_role;
