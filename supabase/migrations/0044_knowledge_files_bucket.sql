-- 0044_knowledge_files_bucket.sql
-- Bucket privado para los archivos originales de la KB (preview/descarga vía
-- signed URLs). A diferencia de Seguros LAM (bucket público + RLS anon), aquí se
-- endurece: PRIVADO + policies para el rol authenticated (el template usa auth).

insert into storage.buckets (id, name, public, file_size_limit)
values ('knowledge-files', 'knowledge-files', false, 52428800)  -- PRIVADO, 50 MB
-- LAM dejó este bucket público; endurecer a privado aunque ya exista.
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit;

drop policy if exists "kb_files_insert" on storage.objects;
create policy "kb_files_insert" on storage.objects
  for insert to authenticated with check (bucket_id = 'knowledge-files');

drop policy if exists "kb_files_select" on storage.objects;
create policy "kb_files_select" on storage.objects
  for select to authenticated using (bucket_id = 'knowledge-files');

drop policy if exists "kb_files_delete" on storage.objects;
create policy "kb_files_delete" on storage.objects
  for delete to authenticated using (bucket_id = 'knowledge-files');
