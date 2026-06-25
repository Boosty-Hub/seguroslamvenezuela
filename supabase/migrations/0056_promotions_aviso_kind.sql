-- =============================================================
-- 0056_promotions_aviso_kind.sql
-- Amplía promotions.kind con 'aviso': situaciones/avisos transitorios que el
-- agente debe tener en cuenta SIEMPRE al responder (no solo "si viene al caso"
-- como las promos). Ej: cierre por emergencia, feriado imprevisto, terremoto.
-- IDEMPOTENT: quita cualquier check constraint sobre `kind` (sea cual sea su
-- nombre) y re-crea el correcto con los 3 valores.
-- =============================================================
do $$
declare c text;
begin
  for c in
    select conname from pg_constraint
    where conrelid = 'promotions'::regclass and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%kind%'
  loop
    execute format('alter table promotions drop constraint %I', c);
  end loop;
end $$;

alter table promotions
  add constraint promotions_kind_check check (kind in ('promo','evento','aviso'));
