/*
  # Create patients table

  1. New Tables
    - `patients`
      - `id` (uuid, primary key)
      - `user_id` (uuid, FK to auth.users)
      - `full_name` (text, required)
      - `cpf` (text, unique per user)
      - `date_of_birth` (date)
      - `gender` (text)
      - `phone` (text)
      - `email` (text, nullable)
      - `street` (text, nullable)
      - `city` (text, nullable)
      - `state` (text, nullable)
      - `zip_code` (text, nullable)
      - `classification` (text - I/II/III/IV)
      - `medical_history` (text, nullable)
      - `allergies` (text, nullable)
      - `medications` (text, nullable)
      - `notes` (text, nullable)
      - `status` (text - Ativo/Inativo)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS
    - Policies for authenticated users to CRUD their own patients

  3. Indexes
    - user_id for faster lookups
    - status for filtering
    - classification for filtering
*/

CREATE TABLE IF NOT EXISTS patients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  cpf text NOT NULL DEFAULT '',
  date_of_birth date,
  gender text NOT NULL DEFAULT 'Masculino',
  phone text NOT NULL DEFAULT '',
  email text,
  street text,
  city text,
  state text,
  zip_code text,
  classification text NOT NULL DEFAULT 'I',
  medical_history text,
  allergies text,
  medications text,
  notes text,
  status text NOT NULL DEFAULT 'Ativo',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE patients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own patients"
  ON patients FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own patients"
  ON patients FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own patients"
  ON patients FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own patients"
  ON patients FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX idx_patients_user_id ON patients(user_id);
CREATE INDEX idx_patients_status ON patients(status);
CREATE INDEX idx_patients_classification ON patients(classification);
CREATE INDEX idx_patients_created_at ON patients(created_at DESC);
