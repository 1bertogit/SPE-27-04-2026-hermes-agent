/*
  # Create patient-photos storage bucket

  1. New Storage
    - Creates a `patient-photos` storage bucket for patient photo uploads
    - Bucket is public for read access so getPublicUrl() returns working URLs
    - File size limited to 10MB
    - Only image MIME types are allowed

  2. Security
    - Authenticated users can upload files to their own folder (user_id prefix)
    - Authenticated users can update/delete their own files
    - Public read access for all files in the bucket
*/

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'patient-photos',
  'patient-photos',
  true,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Authenticated users can upload photos"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'patient-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Authenticated users can update own photos"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'patient-photos' AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'patient-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Authenticated users can delete own photos"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'patient-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Public read access for patient photos"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'patient-photos');
