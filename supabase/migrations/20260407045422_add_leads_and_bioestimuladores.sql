/*
  # Add Leads Table and Bioestimuladores Fields

  1. New Tables
    - `leads`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `full_name` (text) - Lead name
      - `phone` (text) - Contact phone
      - `email` (text, nullable) - Contact email
      - `lead_source` (text) - How they found the clinic (Instagram, Google, etc.)
      - `lead_source_utm` (text, nullable) - UTM tracking parameter
      - `procedure_interest` (text, nullable) - Procedure of interest
      - `has_previous_surgery` (boolean) - Whether they had surgery before
      - `previous_surgery_notes` (text, nullable) - Notes about previous surgeries
      - `has_bioestimulador` (boolean) - Whether they have bioestimulators
      - `bioestimulador_notes` (text, nullable) - Bioestimulator details
      - `status` (text) - Lead status (Novo, Qualificado, Agendado, Convertido, Perdido)
      - `notes` (text, nullable) - General notes
      - `converted_patient_id` (uuid, nullable) - If converted to patient
      - `created_at`, `updated_at` timestamps

  2. Changes to Patients Table
    - Add `bioestimuladores` (jsonb) - Array of bioestimulator records
    - Add `lead_id` (uuid, nullable) - Reference to original lead
    - Add `workflow_phase` (text) - Current workflow phase

  3. Security
    - Enable RLS on leads table
    - Add policies for authenticated users to manage their own leads
*/

-- Create leads table
CREATE TABLE IF NOT EXISTS leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  email text,
  lead_source text NOT NULL DEFAULT 'Outro',
  lead_source_utm text,
  procedure_interest text,
  has_previous_surgery boolean DEFAULT false,
  previous_surgery_notes text,
  has_bioestimulador boolean DEFAULT false,
  bioestimulador_notes text,
  status text NOT NULL DEFAULT 'Novo',
  notes text,
  converted_patient_id uuid REFERENCES patients(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create index on user_id for leads
CREATE INDEX IF NOT EXISTS idx_leads_user_id ON leads(user_id);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at DESC);

-- Enable RLS on leads
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

-- RLS policies for leads
CREATE POLICY "Users can view own leads"
  ON leads FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own leads"
  ON leads FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own leads"
  ON leads FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own leads"
  ON leads FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Add new columns to patients table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'patients' AND column_name = 'bioestimuladores'
  ) THEN
    ALTER TABLE patients ADD COLUMN bioestimuladores jsonb DEFAULT '[]'::jsonb;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'patients' AND column_name = 'lead_id'
  ) THEN
    ALTER TABLE patients ADD COLUMN lead_id uuid REFERENCES leads(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'patients' AND column_name = 'workflow_phase'
  ) THEN
    ALTER TABLE patients ADD COLUMN workflow_phase text DEFAULT 'Captacao';
  END IF;
END $$;

-- Create index for workflow_phase
CREATE INDEX IF NOT EXISTS idx_patients_workflow_phase ON patients(workflow_phase);
CREATE INDEX IF NOT EXISTS idx_patients_lead_id ON patients(lead_id);