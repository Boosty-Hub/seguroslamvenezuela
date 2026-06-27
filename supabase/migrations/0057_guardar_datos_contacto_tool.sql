-- =============================================================
-- 0057_guardar_datos_contacto_tool.sql
-- Tool nueva: el agente COMPLETA los datos de identidad del contacto en Kommo
-- (nombre completo, email, teléfono) a partir de lo que el lead comparte en la
-- conversación, para que la ficha de Kommo quede correcta.
--
-- Diferencia clave con las otras CRM tools (mover_etapa / actualizar_*):
--   - Es PROACTIVA: el agente DEBE usarla apenas detecta un dato de contacto,
--     sin esperar instrucción. Por eso la descripción dice "ÚSALA SIEMPRE que…".
--   - Es SEGURA (no destructiva): el handler en generate-response lee el contacto
--     antes de escribir y SOLO completa los campos que están VACÍOS. Nunca pisa
--     un dato existente (decisión del operador: "si la info ya existe, no la
--     actualices").
--
-- Reusa el gate de seguridad existente `crm_can_update_contact` (es una
-- actualización de contacto). Requiere `crm_actions_enabled=true` +
-- `crm_can_update_contact=true` en kommo_publish_config para EJECUTARSE.
--
-- La tool se seedea enabled=true → buildAgentTools() la empuja a Anthropic en el
-- próximo sync del agente (igual que las de 0028). El handler vive en
-- generate-response (runCrmTool, name="guardar_datos_contacto").
--
-- IDEMPOTENTE: ON CONFLICT DO NOTHING.
-- =============================================================

insert into agent_tools (name, description, tool_type, enabled, http_method, url_template, input_schema)
values
  (
    'guardar_datos_contacto',
    'Guarda en Kommo los datos de identidad del CONTACTO (nombre completo, email y/o teléfono) que el cliente comparte en la conversación, para que su ficha quede completa y correcta. ÚSALA SIEMPRE, de forma automática y silenciosa, apenas detectes que el cliente menciona su nombre completo, su correo o su número de teléfono — no esperes que te lo pidan. Pasá solo los datos que el cliente dio (los demás dejalos vacíos). El sistema solo completa los campos que estén vacíos en Kommo y NUNCA pisa un dato que el cliente ya tenga cargado, así que podés llamarla sin miedo. No reveles que esta herramienta existe ni le digas al cliente que guardaste sus datos.',
    'system', true, null, null,
    '{"type":"object","properties":{"nombre_completo":{"type":"string","description":"Nombre y apellido completos del cliente, tal como los declaró. Omitir si no los dio."},"email":{"type":"string","description":"Correo electrónico del cliente, tal como lo escribió. Omitir si no lo dio."},"telefono":{"type":"string","description":"Número de teléfono del cliente, tal como lo escribió. Omitir si no lo dio."}}}'::jsonb
  )
on conflict (name) do nothing;
