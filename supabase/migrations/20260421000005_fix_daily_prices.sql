-- Drop nombre_plan NOT NULL constraint (we match by suma_asegurada instead)
ALTER TABLE public.daily_prices ALTER COLUMN nombre_plan SET DEFAULT '';
ALTER TABLE public.daily_prices ALTER COLUMN nombre_plan DROP NOT NULL;

-- Replace unique index: use (fecha, subcategoria, rango_edad, suma_asegurada, prima_anual)
-- to handle plans with same coverage but different premiums
DROP INDEX IF EXISTS idx_daily_prices_unique;
CREATE UNIQUE INDEX IF NOT EXISTS idx_daily_prices_unique
  ON public.daily_prices (fecha, subcategoria, rango_edad, suma_asegurada, prima_anual);
