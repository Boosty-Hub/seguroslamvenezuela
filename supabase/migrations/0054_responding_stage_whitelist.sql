-- 0054_responding_stage_whitelist.sql
-- Lista BLANCA de etapas de Kommo: si responding_stage_ids no está vacío, el
-- agente responde SOLO cuando el lead está en una de esas etapas (en cualquier
-- otra, calla). Complementa la lista negra existente (ignored_stage_ids).
-- Los valores concretos (status_id por cliente) se configuran operativamente.
alter table kommo_publish_config
  add column if not exists responding_stage_ids integer[] not null default '{}';
