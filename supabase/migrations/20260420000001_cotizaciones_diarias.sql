-- Enable extensions needed for cron + HTTP calls
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

CREATE TABLE public.cotizaciones_diarias (
  id              UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  fecha           DATE        NOT NULL DEFAULT CURRENT_DATE,
  id_cotizacion   INTEGER,
  codigo          TEXT,
  pdf_url         TEXT,
  pdf_filename    TEXT,
  total_planes    INTEGER     NOT NULL DEFAULT 0,
  aseguradoras    JSONB       NOT NULL DEFAULT '[]',
  status          TEXT        NOT NULL DEFAULT 'pendiente',
  error_message   TEXT,
  ejecutado_en    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.cotizaciones_diarias ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read"   ON public.cotizaciones_diarias FOR SELECT TO anon USING (true);
CREATE POLICY "Allow public insert" ON public.cotizaciones_diarias FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow public update" ON public.cotizaciones_diarias FOR UPDATE TO anon USING (true) WITH CHECK (true);

-- Schedule at 11:00 UTC = 07:00 Venezuela time (UTC-4, no DST)
SELECT cron.schedule(
  'daily-price-sync',
  '0 11 * * *',
  $$
  SELECT net.http_post(
    url     := 'https://nhszqqqqlcwmcsjmgrmv.supabase.co/functions/v1/daily-price-sync',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5oc3pxcXFxbGN3bWNzam1ncm12Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUxNjY0MjYsImV4cCI6MjA5MDc0MjQyNn0.uwi4m7-HC4AuSqm0GkCn_ixNY5VIK6-mETY0I6RwsXA"}'::jsonb,
    body    := '{}'::jsonb
  )
  $$
);
