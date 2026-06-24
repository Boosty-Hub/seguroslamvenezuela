-- 0043_search_kb_taxonomy.sql
-- Filtro opcional por taxonomía (aseguradora / tipo de póliza) en search_kb +
-- extensión del input_schema de la tool system 'search_kb'. El GIN sobre
-- kb_chunks.metadata (0042) acelera el operador de contención @>.

-- Eliminar la firma anterior (4 args) para no dejar un overload muerto.
drop function if exists search_kb(vector, text, int, real);

create or replace function search_kb(
  p_query_embedding vector(384),
  p_query_text      text,
  p_limit           int  default 6,
  p_min_similarity  real default 0.0,
  p_filter          jsonb default '{}'::jsonb
)
returns table (
  chunk_id uuid,
  document_id uuid,
  document_title text,
  content text,
  metadata jsonb,
  similarity real,
  fts_rank real
) language sql stable as $$
  with vec as (
    select
      c.id            as chunk_id,
      c.document_id,
      d.title         as document_title,
      c.content,
      c.metadata,
      (1 - (c.embedding <=> p_query_embedding))::real as similarity,
      ts_rank(to_tsvector('spanish', c.content),
              plainto_tsquery('spanish', p_query_text))::real as fts_rank
    from kb_chunks c
    join kb_documents d on d.id = c.document_id
    where c.embedding is not null
      and (p_filter = '{}'::jsonb or c.metadata @> p_filter)
  )
  select * from vec
  where similarity >= p_min_similarity
  order by (similarity * 0.7 + fts_rank * 0.3) desc
  limit p_limit;
$$;

-- Extender el input_schema de la fila system 'search_kb' (UPDATE; es
-- tool_type='system' y la API CRUD rechaza recrearla). Mantener required=["query"].
update agent_tools
set input_schema = '{
  "type":"object",
  "properties":{
    "query":{"type":"string","description":"Consulta corta y específica."},
    "limit":{"type":"integer","description":"Número de chunks. Default 5, máx 12."},
    "collection":{"type":"string","description":"Filtra por aseguradora (opcional). Valores: seguros_caracas, seguros_mercantil, seguros_mercantil_panama, seguros_universitas, seguros_venezuela, estar_seguros, la_internacional, lam_corredora."},
    "policy_type":{"type":"string","description":"Filtra por tipo de póliza (opcional). Valores: salud, vida, auto, hogar, funeraria, accidentes_personales, responsabilidad_civil, viaje, empresarial, mascotas, ciberseguridad, fianza, general."}
  },
  "required":["query"]
}'::jsonb
where name = 'search_kb';
