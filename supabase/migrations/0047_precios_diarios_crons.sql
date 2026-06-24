-- 0047_precios_diarios_crons.sql
-- Crons */10 de Precios Diarios PARAMETRIZADOS: el bearer NO va en texto plano en
-- el SQL versionado; se resuelve de un setting de DB (app.functions_bearer),
-- configurado operativamente con:
--   alter database postgres set app.functions_bearer = '<anon key>';
-- Ambas funciones tienen verify_jwt=false (config.toml), asi que un bearer vacio
-- tambien funciona. Reemplaza los crons de LAM (que llevaban la anon key embebida).

-- Limpiar jobs previos (LAM + cualquier variante), idempotente.
select cron.unschedule(jobname) from cron.job
  where jobname in ('daily-price-sync', 'daily-price-sync-loop', 'extract-prices-loop');

select cron.schedule('daily-price-sync-loop', '*/10 * * * *', $cron$
  select net.http_post(
    url     := 'https://nhszqqqqlcwmcsjmgrmv.supabase.co/functions/v1/daily-price-sync',
    headers := jsonb_build_object(
                 'Content-Type', 'application/json',
                 'Authorization', 'Bearer ' || coalesce(current_setting('app.functions_bearer', true), '')),
    body    := '{}'::jsonb);
$cron$);

select cron.schedule('extract-prices-loop', '*/10 * * * *', $cron$
  select net.http_post(
    url     := 'https://nhszqqqqlcwmcsjmgrmv.supabase.co/functions/v1/extract-prices',
    headers := jsonb_build_object(
                 'Content-Type', 'application/json',
                 'Authorization', 'Bearer ' || coalesce(current_setting('app.functions_bearer', true), '')),
    body    := '{}'::jsonb);
$cron$);

create or replace function public.list_cron_jobs()
returns table (jobid bigint, jobname text, schedule text, active boolean, command text)
language sql security definer set search_path = cron, public
as $$ select jobid, jobname, schedule, active, command from cron.job order by jobid; $$;
grant execute on function public.list_cron_jobs() to service_role;
