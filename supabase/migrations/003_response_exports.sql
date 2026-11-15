-- Private, bounded response exports. Signed URL expiry does NOT delete objects.
INSERT INTO storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
VALUES ('cartridge-exports','cartridge-exports',false,10485760,ARRAY['application/json'])
ON CONFLICT (id) DO UPDATE SET public=false, file_size_limit=10485760,
  allowed_mime_types=ARRAY['application/json'];

CREATE POLICY cartridge_exports_insert ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id='cartridge-exports' AND (storage.foldername(name))[1]=auth.uid()::text);
CREATE POLICY cartridge_exports_select ON storage.objects FOR SELECT TO authenticated
USING (bucket_id='cartridge-exports' AND (storage.foldername(name))[1]=auth.uid()::text);
CREATE POLICY cartridge_exports_delete ON storage.objects FOR DELETE TO authenticated
USING (bucket_id='cartridge-exports' AND (storage.foldername(name))[1]=auth.uid()::text);
-- No UPDATE/upsert permission. UUID filenames prevent accidental overwrites.
-- Delete expired exports through the Storage API, never by deleting storage.objects rows.
