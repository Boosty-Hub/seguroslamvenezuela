
CREATE TABLE public.cotizaciones (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_name TEXT NOT NULL,
  client_email TEXT NOT NULL DEFAULT '',
  client_phone TEXT NOT NULL DEFAULT '',
  insurance_type TEXT NOT NULL,
  insurer TEXT NOT NULL,
  premium NUMERIC NOT NULL DEFAULT 0,
  coverage TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pendiente',
  notes TEXT NOT NULL DEFAULT '',
  created_at DATE NOT NULL DEFAULT CURRENT_DATE
);

-- Allow public read/write for now (no auth yet)
CREATE POLICY "Allow public read" ON public.cotizaciones FOR SELECT TO anon USING (true);
CREATE POLICY "Allow public insert" ON public.cotizaciones FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow public update" ON public.cotizaciones FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow public delete" ON public.cotizaciones FOR DELETE TO anon USING (true);

-- Insert sample data
INSERT INTO public.cotizaciones (client_name, client_email, client_phone, insurance_type, insurer, premium, coverage, status, notes, created_at) VALUES
  ('María García López', 'maria.garcia@email.com', '+52 55 1234 5678', 'Auto', 'GNP Seguros', 12500, 'Cobertura amplia con deducible 5%', 'pendiente', 'Cliente interesada en incluir conductor menor de 25 años', '2026-03-28'),
  ('Carlos Rodríguez', 'carlos.r@email.com', '+52 33 9876 5432', 'Vida', 'MetLife', 8900, 'Suma asegurada $2,000,000 MXN', 'aprobada', '', '2026-03-25'),
  ('Ana Martínez Soto', 'ana.mtz@email.com', '+52 81 5555 1234', 'Hogar', 'AXA Seguros', 6750, 'Contenidos + Estructura + RC', 'rechazada', 'El cliente prefirió otra aseguradora', '2026-03-20'),
  ('Roberto Hernández', 'roberto.h@email.com', '+52 55 4321 8765', 'Salud', 'Seguros Monterrey', 15200, 'Plan familiar, tabulador alto', 'pendiente', 'Espera comparar con otra cotización', '2026-04-01');
