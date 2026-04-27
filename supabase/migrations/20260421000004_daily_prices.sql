-- Stores extracted prices per plan, per subcategoria, per age range
CREATE TABLE IF NOT EXISTS public.daily_prices (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  fecha           date        NOT NULL,
  subcategoria    text        NOT NULL,
  rango_edad      text        NOT NULL,
  nombre_plan     text        NOT NULL,
  suma_asegurada  numeric     NOT NULL,
  prima_anual     numeric     NOT NULL,
  prima_mensual   numeric     NOT NULL,
  prima_semestral numeric     NOT NULL,
  prima_trimestral numeric    NOT NULL,
  ejecutado_en    timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_daily_prices_unique
  ON public.daily_prices (fecha, subcategoria, rango_edad, nombre_plan);

CREATE INDEX IF NOT EXISTS idx_daily_prices_lookup
  ON public.daily_prices (fecha DESC, subcategoria, rango_edad);

ALTER TABLE public.daily_prices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow read access" ON public.daily_prices
  FOR SELECT USING (true);
