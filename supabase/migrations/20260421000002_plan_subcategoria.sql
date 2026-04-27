-- Add subcategoria as a stored generated column (auto-computed, no edge function changes needed)
ALTER TABLE public.daily_plan_catalog
  ADD COLUMN IF NOT EXISTS subcategoria TEXT GENERATED ALWAYS AS (
    CASE
      WHEN tipo = 2 THEN 'asistencia_aps'
      WHEN tipo = 3 THEN 'emergencias_medicas'
      WHEN tipo = 1 AND suma_asegurada <= 50000
           AND (id_aseguradora = 5 OR (id_aseguradora = 19 AND suma_asegurada = 50000))
        THEN 'salud_basica_b'
      WHEN tipo = 1 AND suma_asegurada <= 50000   THEN 'salud_basica_a'
      WHEN tipo = 1 AND suma_asegurada <= 100000  THEN 'salud_estandar'
      WHEN tipo = 1 AND suma_asegurada <= 200000  THEN 'salud_media'
      WHEN tipo = 1 AND suma_asegurada <= 500000  THEN 'salud_alta'
      WHEN tipo = 1                               THEN 'salud_premium'
      ELSE 'otros'
    END
  ) STORED;

CREATE INDEX IF NOT EXISTS idx_plan_catalog_subcategoria
  ON public.daily_plan_catalog (fecha DESC, subcategoria);
