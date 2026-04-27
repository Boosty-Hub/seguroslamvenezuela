-- Update unique index to include nombre_plan now that we extract plan names properly
-- Old index was (fecha, subcategoria, rango_edad, suma_asegurada, prima_anual)
-- New index: (fecha, subcategoria, rango_edad, nombre_plan, suma_asegurada)
-- This correctly identifies a plan: same name + same coverage = same row

DROP INDEX IF EXISTS idx_daily_prices_unique;

CREATE UNIQUE INDEX IF NOT EXISTS idx_daily_prices_unique
  ON public.daily_prices (fecha, subcategoria, rango_edad, nombre_plan, suma_asegurada);
