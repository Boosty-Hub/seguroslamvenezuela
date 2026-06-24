-- 0049_generar_cotizacion_tool.sql
-- (1) buscar_precios_seguros ahora devuelve id_plan (join con daily_plan_catalog),
--     que el agente necesita para pedir la cotizacion oficial.
-- (2) tool 'generar_cotizacion': replica la tool 'apidaniel' del flujo n8n. El
--     agente la invoca para generar la cotizacion OFICIAL en PDF (cotizar.php)
--     con titular + beneficiarios + planes. Apunta a la edge function
--     generar-cotizacion (que arma el payload y llama al cotizador externo).

drop function if exists public.buscar_precios_seguros(text, text);
create or replace function public.buscar_precios_seguros(
  p_subcategoria text,
  p_rango_edad   text
)
returns table (
  id_plan        integer,
  aseguradora    text,
  nombre_plan    text,
  suma_asegurada numeric,
  prima_mensual  numeric,
  prima_anual    numeric,
  fecha          date
)
language sql security definer set search_path = public
as $$
  with f as (
    select max(fecha) as fecha from public.daily_prices
    where subcategoria = p_subcategoria and rango_edad = p_rango_edad
  )
  select pc.id_plan, dp.aseguradora, dp.nombre_plan, dp.suma_asegurada,
         dp.prima_mensual, dp.prima_anual, dp.fecha
  from public.daily_prices dp
  cross join f
  left join public.daily_plan_catalog pc
    on pc.fecha = dp.fecha
   and pc.nombre_plan = dp.nombre_plan
   and pc.suma_asegurada = dp.suma_asegurada
   and pc.nombre_aseguradora = dp.aseguradora
  where dp.subcategoria = p_subcategoria
    and dp.rango_edad = p_rango_edad
    and dp.fecha = f.fecha
  order by dp.prima_mensual asc nulls last;
$$;
grant execute on function public.buscar_precios_seguros(text, text) to anon, authenticated, service_role;

-- Tool del agente: generar la cotizacion oficial en PDF.
insert into agent_tools (name, description, tool_type, enabled, http_method, url_template, headers, body_template, input_schema, timeout_ms)
values (
  'generar_cotizacion',
  'Genera la cotizacion OFICIAL de salud en PDF (titular + TODOS los familiares + uno o varios planes en un mismo PDF). Úsala SOLO cuando el cliente confirmo querer la cotizacion oficial o pidio comparar planes. REGLA CRITICA: si el cliente menciono CUALQUIER familiar (esposa, esposo, hijos, padres, etc.) DEBES incluir TODOS en beneficiarios (no omitas ninguno). Obtén los id_plan con la tool buscar_precios_seguros.',
  'http', true, 'POST',
  'https://nhszqqqqlcwmcsjmgrmv.supabase.co/functions/v1/generar-cotizacion',
  '[{"name":"Content-Type","value":"application/json"},{"name":"Authorization","value":"Bearer {{SUPABASE_ANON_KEY}}"}]'::jsonb,
  '{"nombre":"{{nombre}}","apellido":"{{apellido}}","cedula":"{{cedula}}","edad":"{{edad}}","sexo":"{{sexo}}","email":"{{email}}","telefono":"{{telefono}}","planes":"{{planes}}","beneficiarios":"{{beneficiarios}}"}'::jsonb,
  '{
    "type":"object",
    "properties":{
      "nombre":{"type":"string","description":"Nombre del titular (sin apellido)."},
      "apellido":{"type":"string","description":"Apellido del titular. Vacio si no lo dio."},
      "cedula":{"type":"string","description":"Cedula V12345678 o E12345678. Vacio si no la dio."},
      "edad":{"type":"number","description":"Edad del titular como numero entero (ej: 35)."},
      "sexo":{"type":"string","description":"Masculino o Femenino."},
      "email":{"type":"string","description":"Email del titular. Vacio si no lo dio."},
      "telefono":{"type":"string","description":"Telefono del titular. Vacio si no lo dio."},
      "planes":{"type":"string","description":"IDs de planes (de buscar_precios_seguros) separados por coma. Ej: \"156\" o \"156,27,8\". Varios = PDF comparativo."},
      "beneficiarios":{"type":"string","description":"Array JSON (como string) de familiares; \"[]\" si no hay. Cada uno: {\"parentesco\":\"Esposa|Esposo|Hijo|Hija|Madre|Padre\",\"nombres\":\"\",\"apellidos\":\"\",\"cedula\":\"\",\"edad\":30,\"genero\":\"Masculino|Femenino\",\"telefono\":\"\"}. Incluye a TODOS los familiares mencionados."}
    },
    "required":["nombre","edad","planes"]
  }'::jsonb,
  20000
)
on conflict (name) do update set
  description   = excluded.description,
  http_method   = excluded.http_method,
  url_template  = excluded.url_template,
  headers       = excluded.headers,
  body_template = excluded.body_template,
  input_schema  = excluded.input_schema,
  enabled       = true;
