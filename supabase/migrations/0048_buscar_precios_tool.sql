-- 0048_buscar_precios_tool.sql
-- Tool del agente para COTIZAR precios de salud en la conversación (decisión B).
-- RPC SECURITY DEFINER que devuelve los precios de la última fecha para una
-- subcategoría + rango de edad, expuesto vía PostgREST y registrado como tool
-- 'http' del agente (lo ejecuta runHttpTool en generate-response, sin tocar codigo).

create or replace function public.buscar_precios_seguros(
  p_subcategoria text,
  p_rango_edad   text
)
returns table (
  aseguradora    text,
  nombre_plan    text,
  suma_asegurada numeric,
  prima_mensual  numeric,
  prima_anual    numeric,
  fecha          date
)
language sql
security definer
set search_path = public
as $$
  select aseguradora, nombre_plan, suma_asegurada, prima_mensual, prima_anual, fecha
  from public.daily_prices
  where subcategoria = p_subcategoria
    and rango_edad   = p_rango_edad
    and fecha = (
      select max(fecha) from public.daily_prices
      where subcategoria = p_subcategoria and rango_edad = p_rango_edad
    )
  order by prima_mensual asc nulls last;
$$;

grant execute on function public.buscar_precios_seguros(text, text) to anon, authenticated, service_role;

-- Registrar la tool http del agente (idempotente).
insert into agent_tools (name, description, tool_type, enabled, http_method, url_template, headers, body_template, input_schema, timeout_ms)
values (
  'buscar_precios_seguros',
  'Cotiza precios de seguros de SALUD del mercado venezolano. Devuelve, para una subcategoría de plan y un rango de edad, los precios (prima mensual/anual y suma asegurada) de las 6 aseguradoras, de la última fecha disponible. Úsalo SOLO cuando el lead pide precios/cotización de salud.',
  'http', true, 'POST',
  'https://nhszqqqqlcwmcsjmgrmv.supabase.co/rest/v1/rpc/buscar_precios_seguros',
  '[{"name":"apikey","value":"{{SUPABASE_ANON_KEY}}"},{"name":"Authorization","value":"Bearer {{SUPABASE_ANON_KEY}}"},{"name":"Content-Type","value":"application/json"}]'::jsonb,
  '{"p_subcategoria":"{{subcategoria}}","p_rango_edad":"{{rango_edad}}"}'::jsonb,
  '{
    "type":"object",
    "properties":{
      "subcategoria":{"type":"string","description":"Tipo de plan de salud.","enum":["asistencia_aps","emergencias_medicas","salud_basica_a","salud_basica_b","salud_estandar","salud_media","salud_alta","salud_premium"]},
      "rango_edad":{"type":"string","description":"Rango de edad del asegurado.","enum":["0-9","10-29","30-39","40-49","50-54","55-59","60-64","65-69","70-74","75+"]}
    },
    "required":["subcategoria","rango_edad"]
  }'::jsonb,
  8000
)
on conflict (name) do update set
  description   = excluded.description,
  http_method   = excluded.http_method,
  url_template  = excluded.url_template,
  headers       = excluded.headers,
  body_template = excluded.body_template,
  input_schema  = excluded.input_schema,
  enabled       = true;
