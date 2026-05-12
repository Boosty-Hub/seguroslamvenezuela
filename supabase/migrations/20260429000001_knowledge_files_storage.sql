-- Add storage_path to track original uploaded file
ALTER TABLE public.knowledge_files
  ADD COLUMN IF NOT EXISTS storage_path TEXT;

-- Create bucket for original files (50 MB limit, public access)
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('knowledge-files', 'knowledge-files', true, 52428800)
ON CONFLICT (id) DO NOTHING;

-- RLS: allow anon to upload
CREATE POLICY "knowledge_files_anon_insert" ON storage.objects
  FOR INSERT TO anon
  WITH CHECK (bucket_id = 'knowledge-files');

-- RLS: allow anon to read (public bucket)
CREATE POLICY "knowledge_files_anon_select" ON storage.objects
  FOR SELECT TO anon
  USING (bucket_id = 'knowledge-files');

-- RLS: allow anon to delete
CREATE POLICY "knowledge_files_anon_delete" ON storage.objects
  FOR DELETE TO anon
  USING (bucket_id = 'knowledge-files');
