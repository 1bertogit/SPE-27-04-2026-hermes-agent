/*
  # Create evaluations and evaluation_criteria tables

  1. New Tables
    - `evaluations`
      - `id` (uuid, primary key)
      - `patient_id` (uuid, FK to patients)
      - `user_id` (uuid, FK to auth.users)
      - `status` (text - Pendente/Em Andamento/Concluido)
      - `total_score` (numeric)
      - `max_score` (numeric)
      - `current_step` (integer)
      - `started_at` (timestamptz)
      - `completed_at` (timestamptz, nullable)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `evaluation_criteria`
      - `id` (uuid, primary key)
      - `evaluation_id` (uuid, FK to evaluations)
      - `criterion_key` (text - unique identifier for the criterion)
      - `criterion_group` (text - which step/group it belongs to)
      - `criterion_label` (text - display name)
      - `selected_option` (text - what was selected)
      - `score` (numeric - the score for this selection)
      - `max_score` (numeric - maximum possible score)
      - `step_number` (integer)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on both tables
    - Users can only access evaluations for their own patients

  3. Indexes
    - patient_id, user_id, status for evaluations
    - evaluation_id for criteria
*/

CREATE TABLE IF NOT EXISTS evaluations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'Pendente',
  total_score numeric NOT NULL DEFAULT 0,
  max_score numeric NOT NULL DEFAULT 0,
  current_step integer NOT NULL DEFAULT 0,
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE evaluations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own evaluations"
  ON evaluations FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own evaluations"
  ON evaluations FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own evaluations"
  ON evaluations FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own evaluations"
  ON evaluations FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX idx_evaluations_patient_id ON evaluations(patient_id);
CREATE INDEX idx_evaluations_user_id ON evaluations(user_id);
CREATE INDEX idx_evaluations_status ON evaluations(status);
CREATE INDEX idx_evaluations_created_at ON evaluations(created_at DESC);

CREATE TABLE IF NOT EXISTS evaluation_criteria (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  evaluation_id uuid NOT NULL REFERENCES evaluations(id) ON DELETE CASCADE,
  criterion_key text NOT NULL,
  criterion_group text NOT NULL,
  criterion_label text NOT NULL,
  selected_option text NOT NULL DEFAULT '',
  score numeric NOT NULL DEFAULT 0,
  max_score numeric NOT NULL DEFAULT 0,
  step_number integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE evaluation_criteria ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own evaluation criteria"
  ON evaluation_criteria FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM evaluations
      WHERE evaluations.id = evaluation_criteria.evaluation_id
      AND evaluations.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own evaluation criteria"
  ON evaluation_criteria FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM evaluations
      WHERE evaluations.id = evaluation_criteria.evaluation_id
      AND evaluations.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own evaluation criteria"
  ON evaluation_criteria FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM evaluations
      WHERE evaluations.id = evaluation_criteria.evaluation_id
      AND evaluations.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM evaluations
      WHERE evaluations.id = evaluation_criteria.evaluation_id
      AND evaluations.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own evaluation criteria"
  ON evaluation_criteria FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM evaluations
      WHERE evaluations.id = evaluation_criteria.evaluation_id
      AND evaluations.user_id = auth.uid()
    )
  );

CREATE INDEX idx_eval_criteria_evaluation_id ON evaluation_criteria(evaluation_id);
