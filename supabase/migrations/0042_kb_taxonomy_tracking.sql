-- 0042_kb_taxonomy_tracking.sql
-- Taxonomía aseguradora/tipo-de-póliza (portada de Seguros LAM) + columnas de
-- tracking para la gestión de archivos KB (estados, bucket). El filtro real en
-- search_kb se agrega en 0043.

alter table kb_documents
  add column if not exists status        text not null default 'completed',  -- pending|processing|completed|error
  add column if not exists error_message text,
  add column if not exists storage_path  text,
  add column if not exists collection    text,   -- aseguradora (espejo de metadata->>'collection')
  add column if not exists policy_type   text;   -- tipo de poliza (espejo de metadata->>'policy_type')

create index if not exists kb_documents_collection_idx  on kb_documents(collection);
create index if not exists kb_documents_policy_type_idx on kb_documents(policy_type);
create index if not exists kb_documents_status_idx      on kb_documents(status);

-- Índice GIN sobre metadata de chunks para acelerar el filtro @> de search_kb (0043).
create index if not exists kb_chunks_metadata_gin_idx on kb_chunks using gin (metadata);
