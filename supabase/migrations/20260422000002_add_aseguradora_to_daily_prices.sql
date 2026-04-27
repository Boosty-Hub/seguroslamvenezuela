ALTER TABLE public.daily_prices
  ADD COLUMN IF NOT EXISTS aseguradora text NOT NULL DEFAULT '';
