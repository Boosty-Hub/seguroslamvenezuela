-- Add categoria to cotizaciones_diarias
ALTER TABLE public.cotizaciones_diarias
  ADD COLUMN IF NOT EXISTS categoria TEXT NOT NULL DEFAULT 'todos';

-- Create daily plan catalog
CREATE TABLE public.daily_plan_catalog (
  id               UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  fecha            DATE        NOT NULL DEFAULT CURRENT_DATE,
  id_aseguradora   INTEGER     NOT NULL,
  nombre_aseguradora TEXT      NOT NULL,
  id_plan          INTEGER     NOT NULL,
  nombre_plan      TEXT        NOT NULL,
  suma_asegurada   NUMERIC     NOT NULL DEFAULT 0,
  tipo             INTEGER     NOT NULL,
  ejecutado_en     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.daily_plan_catalog ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read"   ON public.daily_plan_catalog FOR SELECT TO anon USING (true);
CREATE POLICY "Allow public insert" ON public.daily_plan_catalog FOR INSERT TO anon WITH CHECK (true);

CREATE INDEX idx_plan_catalog_fecha       ON public.daily_plan_catalog (fecha DESC);
CREATE INDEX idx_plan_catalog_aseguradora ON public.daily_plan_catalog (id_aseguradora);
CREATE INDEX idx_cotizaciones_diarias_cat ON public.cotizaciones_diarias (fecha DESC, categoria);
