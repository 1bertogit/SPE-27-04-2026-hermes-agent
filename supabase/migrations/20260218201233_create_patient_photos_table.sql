/*
  # Create patient_photos table

  1. New Tables
    - `patient_photos`
      - `id` (uuid, primary key)
      - `patient_id` (uuid, FK to patients)
      - `user_id` (uuid, FK to auth.users)
      - `evaluation_id` (uuid, FK to evaluations, nullable)
      - `viewport` (text - Frontal/Lateral_L/Lateral_R/Oblique_L/Oblique_R)
      - `file_url` (text)
      - `annotations_json` (jsonb - canvas drawing data)
      - `uploaded_at` (timestamptz)

  2. Security
    - Enable RLS
    - Users can only access photos for their own patients

  3. Indexes
    - patient_id, user_id for lookups
*/

CREATE TABLE IF NOT EXISTS patient_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  evaluation_id uuid REFERENCES evaluations(id) ON DELETE SET NULL,
  viewport text NOT NULL DEFAULT 'Frontal',
  file_url text NOT NULL,
  annotations_json jsonb DEFAULT '[]'::jsonb,
  uploaded_at timestamptz DEFAULT now()
);

ALTER TABLE patient_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own patient photos"
  ON patient_photos FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own patient photos"
  ON patient_photos FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own patient photos"
  ON patient_photos FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own patient photos"
  ON patient_photos FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX idx_photos_patient_id ON patient_photos(patient_id);
CREATE INDEX idx_photos_user_id ON patient_photos(user_id);
CREATE INDEX idx_photos_viewport ON patient_photos(viewport);
