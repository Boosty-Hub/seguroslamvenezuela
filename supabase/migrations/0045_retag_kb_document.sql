-- 0045_retag_kb_document.sql
-- Re-etiquetado de un documento KB (aseguradora / tipo de póliza) SIN re-procesar
-- ni re-vectorizar: actualiza kb_documents y propaga a TODOS sus kb_chunks en una
-- sola llamada (mejora sobre el fila-a-fila del proyecto original).

create or replace function retag_kb_document(
  p_doc          uuid,
  p_collection   text,
  p_policy_type  text
) returns void language plpgsql as $$
declare
  add jsonb := '{}'::jsonb
    || case when p_collection  is not null then jsonb_build_object('collection',  p_collection)  else '{}'::jsonb end
    || case when p_policy_type is not null then jsonb_build_object('policy_type', p_policy_type) else '{}'::jsonb end;
begin
  update kb_documents
     set collection  = p_collection,
         policy_type = p_policy_type,
         metadata    = (coalesce(metadata, '{}'::jsonb) - 'collection' - 'policy_type') || add
   where id = p_doc;

  update kb_chunks
     set metadata = (coalesce(metadata, '{}'::jsonb) - 'collection' - 'policy_type') || add
   where document_id = p_doc;
end;
$$;
