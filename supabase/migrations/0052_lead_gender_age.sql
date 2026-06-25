-- 0052_lead_gender_age.sql
-- Trato personalizado: el preclasificador infiere el género (del nombre) y la
-- edad (si la persona la menciona). Se guardan en el lead para que el agente
-- adapte el trato (concordancia de género; usted/explicación para mayores 55+,
-- tuteo casual para <30) y para que sean visibles en el inbox.
alter table leads add column if not exists gender text;  -- 'masculino' | 'femenino' | 'desconocido' | null
alter table leads add column if not exists age int;       -- edad declarada por la persona; null = desconocida
