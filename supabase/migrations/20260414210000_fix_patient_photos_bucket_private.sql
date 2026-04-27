UPDATE storage.buckets SET public = false WHERE id = 'patient-photos';

UPDATE patient_photos
SET file_url = regexp_replace(
  file_url,
  '^https://[^/]+/storage/v1/object/public/patient-photos/',
  ''
)
WHERE file_url LIKE 'https://%';

DROP POLICY IF EXISTS "Authenticated users can upload photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update own photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete own photos" ON storage.objects;
DROP POLICY IF EXISTS "Public read access for patient photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can view own photos" ON storage.objects;
DROP POLICY IF EXISTS "Give users access to own folder" ON storage.objects;
DROP POLICY IF EXISTS photos_storage_upload ON storage.objects;
DROP POLICY IF EXISTS photos_storage_select ON storage.objects;

CREATE POLICY photos_storage_select ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'patient-photos' AND
    (storage.foldername(name))[1] = (public.current_org_id())::text
  );

CREATE POLICY photos_storage_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'patient-photos' AND
    (storage.foldername(name))[1] = (public.current_org_id())::text
  );

CREATE POLICY photos_storage_update ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'patient-photos' AND
    (storage.foldername(name))[1] = (public.current_org_id())::text
  )
  WITH CHECK (
    bucket_id = 'patient-photos' AND
    (storage.foldername(name))[1] = (public.current_org_id())::text
  );

CREATE POLICY photos_storage_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'patient-photos' AND
    (storage.foldername(name))[1] = (public.current_org_id())::text
  );
