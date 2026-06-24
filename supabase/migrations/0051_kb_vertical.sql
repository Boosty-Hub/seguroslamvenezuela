-- 0051_kb_vertical.sql
-- KB por vertical: cada documento puede pertenecer a una vertical (ramo). El
-- agente, al identificar la vertical del mensaje, filtra search_kb por ella.
--   - kb_documents.vertical: columna nueva (espeja collection/policy_type).
--   - El filtro real lo hace search_kb vía metadata @> p_filter (0043): el
--     ingest escribe {vertical} en kb_chunks.metadata, no hace falta tocar la fn.
--   - Se extiende el input_schema de la tool 'search_kb' con el parámetro vertical.
--   - Se crean 4 verticales nuevas (vida, hogar, ciberseguridad, empresarial)
--     para los ramos que ya tienen documentación pero no tenían categoría.

-- ── Columna + índice ────────────────────────────────────────────────────────
alter table kb_documents add column if not exists vertical text;
create index if not exists kb_documents_vertical_idx on kb_documents (vertical);

-- ── Verticales nuevas (idempotente) ─────────────────────────────────────────
insert into verticals (slug, name, description, system_prompt, auto_reply, requires_review)
values
  (
    'vida',
    'Vida',
    'Consultas sobre seguros de vida: cobertura por fallecimiento, invalidez, ahorro y beneficiarios.',
    'Seguro de vida. Usa search_kb (vertical=vida) para coberturas, sumas aseguradas, requisitos y exclusiones. Ante datos de salud o edad del titular, máxima prudencia: no prometas aceptación ni emisión sin confirmar en la base.',
    true,
    false
  ),
  (
    'hogar',
    'Hogar / Residencia',
    'Consultas sobre seguros de hogar o residencia: incendio, robo, daños, combinado residencial y empresarial.',
    'Seguro de hogar/residencia. Usa search_kb (vertical=hogar) para coberturas, sumas y exclusiones. Pide tipo de inmueble y valor a asegurar cuando aplique.',
    true,
    false
  ),
  (
    'ciberseguridad',
    'Ciberseguridad',
    'Consultas sobre seguros de ciberseguridad o riesgos cibernéticos.',
    'Seguro de ciberseguridad. Usa search_kb (vertical=ciberseguridad) para coberturas y condiciones. Es un producto de nicho; si la base no cubre el caso, ofrece continuidad con un asesor humano.',
    true,
    false
  ),
  (
    'empresarial',
    'Empresarial / Pymes',
    'Consultas de seguros para empresas y pymes: patrimoniales, colectivos, responsabilidad civil empresarial.',
    'Seguro empresarial/pymes. Usa search_kb (vertical=empresarial) para coberturas. Suele requerir asesoría a medida: recoge rubro y tamaño y propón continuidad con un asesor cuando convenga.',
    true,
    false
  )
on conflict (slug) do nothing;

-- ── Extender input_schema de search_kb con el parámetro vertical ────────────
-- (tool_type='system'; la API CRUD rechaza recrearla → UPDATE. required=["query"].)
update agent_tools
set input_schema = '{
  "type":"object",
  "properties":{
    "query":{"type":"string","description":"Consulta corta y específica."},
    "limit":{"type":"integer","description":"Número de chunks. Default 5, máx 12."},
    "vertical":{"type":"string","description":"Filtra por vertical/ramo (opcional pero recomendado una vez identificado el ramo del cliente). Valores: salud, vehiculo, viaje, funeraria, accidentes_personales, fianzas, mascotas, vida, hogar, ciberseguridad, empresarial, cliente_existente, general."},
    "collection":{"type":"string","description":"Filtra por aseguradora (opcional). Valores: seguros_caracas, seguros_mercantil, seguros_mercantil_panama, seguros_universitas, seguros_venezuela, estar_seguros, la_internacional, lam_corredora."},
    "policy_type":{"type":"string","description":"Filtra por tipo de póliza (opcional). Valores: salud, vida, auto, hogar, funeraria, accidentes_personales, responsabilidad_civil, viaje, empresarial, mascotas, ciberseguridad, fianza, general."}
  },
  "required":["query"]
}'::jsonb
where name = 'search_kb';
