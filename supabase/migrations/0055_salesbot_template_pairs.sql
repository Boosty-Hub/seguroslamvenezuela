-- 0055_salesbot_template_pairs.sql
-- Mecanismo de entrega estilo n8n: pares {plantilla de chat, salesbot}. Cuando
-- está configurado, publish-to-kommo escribe la respuesta en una plantilla de
-- chat de Kommo (PATCH /api/v4/chats/templates) y corre el salesbot pareado
-- (rotando aleatoriamente para evitar colisiones), en vez de usar un custom
-- field del lead. Reutiliza los salesbots/plantillas ya probados en producción.
-- Los valores concretos (IDs por cliente) se configuran operativamente.
alter table kommo_publish_config
  add column if not exists salesbot_template_pairs jsonb not null default '[]'::jsonb;
