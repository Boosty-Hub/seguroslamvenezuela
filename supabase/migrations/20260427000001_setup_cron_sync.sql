-- Setup pg_cron to call daily-price-sync every 10 minutes
-- The function is idempotent: skips already-done combos, returns fast when all 80 complete.
-- With PARALLEL=1 (~18 cotizaciones per 150s call), 5 calls cover all 80 in ~50 minutes.
-- extract-prices runs every 10 minutes as well, picking up newly generated PDFs.

-- Remove existing jobs if they exist (safe to re-run)
SELECT cron.unschedule(jobname)
FROM cron.job
WHERE jobname IN ('daily-price-sync-loop', 'extract-prices-loop');

-- daily-price-sync: every 10 minutes — processes ~18 pending cotizaciones per call
SELECT cron.schedule(
  'daily-price-sync-loop',
  '*/10 * * * *',
  $$
  SELECT net.http_post(
    url     := 'https://nhszqqqqlcwmcsjmgrmv.supabase.co/functions/v1/daily-price-sync',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5oc3pxcXFxbGN3bWNzam1ncm12Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUxNjY0MjYsImV4cCI6MjA5MDc0MjQyNn0.uwi4m7-HC4AuSqm0GkCn_ixNY5VIK6-mETY0I6RwsXA'
    ),
    body    := '{}'::jsonb
  );
  $$
);

-- extract-prices: every 10 minutes — extracts prices from newly available PDFs
SELECT cron.schedule(
  'extract-prices-loop',
  '*/10 * * * *',
  $$
  SELECT net.http_post(
    url     := 'https://nhszqqqqlcwmcsjmgrmv.supabase.co/functions/v1/extract-prices',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5oc3pxcXFxbGN3bWNzam1ncm12Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUxNjY0MjYsImV4cCI6MjA5MDc0MjQyNn0.uwi4m7-HC4AuSqm0GkCn_ixNY5VIK6-mETY0I6RwsXA'
    ),
    body    := '{}'::jsonb
  );
  $$
);
