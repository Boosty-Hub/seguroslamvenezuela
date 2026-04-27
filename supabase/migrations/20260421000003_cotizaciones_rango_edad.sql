-- Add rango_edad column to cotizaciones_diarias
ALTER TABLE public.cotizaciones_diarias
  ADD COLUMN IF NOT EXISTS rango_edad TEXT NOT NULL DEFAULT 'referencia';

-- Index for fast lookup by fecha + categoria + rango_edad
CREATE INDEX IF NOT EXISTS idx_cotizaciones_rango
  ON public.cotizaciones_diarias (fecha DESC, categoria, rango_edad);
