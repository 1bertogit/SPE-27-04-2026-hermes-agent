
/*
  # Adicionar sistema de procedimentos e fluxo clínico completo

  ## Resumo
  Migração que implementa as fases operacionais completas de uma clínica de cirurgia plástica,
  baseada no guia de implementação. Adiciona suporte a procedimentos, documentos, checklists,
  agendamentos, exames pré-operatórios, registros cirúrgicos e pesquisas de satisfação (NPS).

  ## Novas Tabelas

  ### 1. `patient_appointments` — Cronograma de Retornos
  - Agenda de consultas e retornos pós-operatórios por paciente
  - Tipos: Consulta Inicial, Pré-operatório, Pós-op 24-48h, 7 dias, 30 dias, 3-6 meses, 12 meses

  ### 2. `patient_documents` — Gestão de Documentos Legais
  - Controle de TCIs, contratos, autorizações de imagem, protocolos de preparo
  - Rastreamento de status de assinatura (Pendente, Assinado, Vencido)

  ### 3. `checklists` + `checklist_items` — Checklists Operacionais
  - Templates de checklist por fase e procedimento
  - Suporte a checklist OMS (Sign In / Time Out / Sign Out), pré-op, check-in, alta

  ### 4. `preop_exams` — Exames Pré-Operatórios
  - Rastreamento de exames por paciente/procedimento
  - Status por item: Solicitado, Realizado, Normal, Alterado

  ### 5. `surgical_records` — Registros Cirúrgicos
  - Registro intraoperatório: técnica, tempo, intercorrências, materiais
  - Rastreabilidade ANVISA de implantes (lote, fabricante, modelo)

  ### 6. `implant_records` — Rastreabilidade de Implantes
  - Separado para facilitar busca por lote (exigência ANVISA)

  ### 7. `satisfaction_surveys` — Pesquisa de Satisfação / NPS
  - NPS score 0-10 + respostas abertas
  - Vinculado a paciente e retorno específico

  ## Modificações em Tabelas Existentes

  ### `patients`
  - `weight_kg` — Peso em kg (para cálculo de IMC)
  - `height_cm` — Altura em cm (para cálculo de IMC)
  - `smoker` — Fumante (booleano)
  - `smoking_cessation_date` — Data de cessação do tabagismo
  - `how_found_clinic` — Como conheceu a clínica
  - `procedure_interest` — Procedimento de interesse inicial
  - `family_history` — Histórico familiar relevante

  ### `evaluations`
  - `procedure_type` — Tipo de procedimento associado

  ## Segurança
  - RLS habilitado em todas as novas tabelas
  - Todas as políticas verificam `auth.uid()` contra `user_id`
  - Políticas separadas para SELECT, INSERT, UPDATE, DELETE
*/

-- =============================================
-- MODIFICAÇÕES EM TABELAS EXISTENTES
-- =============================================

-- Adicionar campos ao patients
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'patients' AND column_name = 'weight_kg') THEN
    ALTER TABLE patients ADD COLUMN weight_kg numeric(5,2);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'patients' AND column_name = 'height_cm') THEN
    ALTER TABLE patients ADD COLUMN height_cm numeric(5,1);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'patients' AND column_name = 'smoker') THEN
    ALTER TABLE patients ADD COLUMN smoker boolean DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'patients' AND column_name = 'smoking_cessation_date') THEN
    ALTER TABLE patients ADD COLUMN smoking_cessation_date date;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'patients' AND column_name = 'how_found_clinic') THEN
    ALTER TABLE patients ADD COLUMN how_found_clinic text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'patients' AND column_name = 'procedure_interest') THEN
    ALTER TABLE patients ADD COLUMN procedure_interest text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'patients' AND column_name = 'family_history') THEN
    ALTER TABLE patients ADD COLUMN family_history text;
  END IF;
END $$;

-- Adicionar procedure_type ao evaluations
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'evaluations' AND column_name = 'procedure_type') THEN
    ALTER TABLE evaluations ADD COLUMN procedure_type text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'evaluations' AND column_name = 'notes') THEN
    ALTER TABLE evaluations ADD COLUMN notes text;
  END IF;
END $$;

-- =============================================
-- 1. AGENDAMENTOS / RETORNOS
-- =============================================

CREATE TABLE IF NOT EXISTS patient_appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  evaluation_id uuid REFERENCES evaluations(id) ON DELETE SET NULL,
  appointment_type text NOT NULL DEFAULT 'Consulta Inicial',
  scheduled_date timestamptz,
  completed_date timestamptz,
  status text NOT NULL DEFAULT 'Agendado',
  notes text,
  procedure_type text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE patient_appointments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Médico visualiza próprios agendamentos"
  ON patient_appointments FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Médico cria próprios agendamentos"
  ON patient_appointments FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Médico atualiza próprios agendamentos"
  ON patient_appointments FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Médico remove próprios agendamentos"
  ON patient_appointments FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_appointments_patient_id ON patient_appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_user_id ON patient_appointments(user_id);
CREATE INDEX IF NOT EXISTS idx_appointments_scheduled_date ON patient_appointments(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON patient_appointments(status);

-- =============================================
-- 2. DOCUMENTOS
-- =============================================

CREATE TABLE IF NOT EXISTS patient_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  evaluation_id uuid REFERENCES evaluations(id) ON DELETE SET NULL,
  document_type text NOT NULL,
  procedure_type text,
  title text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'Pendente',
  signed_at timestamptz,
  file_url text,
  notes text,
  is_mandatory boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE patient_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Médico visualiza próprios documentos"
  ON patient_documents FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Médico cria próprios documentos"
  ON patient_documents FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Médico atualiza próprios documentos"
  ON patient_documents FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Médico remove próprios documentos"
  ON patient_documents FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_documents_patient_id ON patient_documents(patient_id);
CREATE INDEX IF NOT EXISTS idx_documents_user_id ON patient_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_documents_status ON patient_documents(status);

-- =============================================
-- 3. CHECKLISTS
-- =============================================

CREATE TABLE IF NOT EXISTS checklists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  evaluation_id uuid REFERENCES evaluations(id) ON DELETE SET NULL,
  checklist_type text NOT NULL,
  procedure_type text,
  title text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'Pendente',
  completed_at timestamptz,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE checklists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Médico visualiza próprios checklists"
  ON checklists FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Médico cria próprios checklists"
  ON checklists FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Médico atualiza próprios checklists"
  ON checklists FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Médico remove próprios checklists"
  ON checklists FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS checklist_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  checklist_id uuid NOT NULL REFERENCES checklists(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  label text NOT NULL DEFAULT '',
  is_mandatory boolean DEFAULT false,
  is_completed boolean DEFAULT false,
  completed_at timestamptz,
  item_type text NOT NULL DEFAULT 'Recomendado',
  sort_order integer DEFAULT 0,
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE checklist_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Médico visualiza próprios itens de checklist"
  ON checklist_items FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Médico cria próprios itens de checklist"
  ON checklist_items FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Médico atualiza próprios itens de checklist"
  ON checklist_items FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Médico remove próprios itens de checklist"
  ON checklist_items FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_checklists_patient_id ON checklists(patient_id);
CREATE INDEX IF NOT EXISTS idx_checklists_user_id ON checklists(user_id);
CREATE INDEX IF NOT EXISTS idx_checklist_items_checklist_id ON checklist_items(checklist_id);

-- =============================================
-- 4. EXAMES PRÉ-OPERATÓRIOS
-- =============================================

CREATE TABLE IF NOT EXISTS preop_exams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  evaluation_id uuid REFERENCES evaluations(id) ON DELETE SET NULL,
  exam_name text NOT NULL DEFAULT '',
  exam_type text NOT NULL DEFAULT 'Base',
  procedure_type text,
  status text NOT NULL DEFAULT 'Solicitado',
  requested_at timestamptz DEFAULT now(),
  result_at timestamptz,
  result_value text,
  is_altered boolean DEFAULT false,
  is_mandatory boolean DEFAULT true,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE preop_exams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Médico visualiza próprios exames"
  ON preop_exams FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Médico cria próprios exames"
  ON preop_exams FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Médico atualiza próprios exames"
  ON preop_exams FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Médico remove próprios exames"
  ON preop_exams FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_preop_exams_patient_id ON preop_exams(patient_id);
CREATE INDEX IF NOT EXISTS idx_preop_exams_user_id ON preop_exams(user_id);
CREATE INDEX IF NOT EXISTS idx_preop_exams_status ON preop_exams(status);

-- =============================================
-- 5. REGISTROS CIRÚRGICOS
-- =============================================

CREATE TABLE IF NOT EXISTS surgical_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  evaluation_id uuid REFERENCES evaluations(id) ON DELETE SET NULL,
  procedure_type text NOT NULL DEFAULT '',
  surgery_date date,
  technique_used text,
  surgical_time_minutes integer,
  anesthesia_time_minutes integer,
  anesthesia_type text,
  complications text,
  complications_management text,
  materials_used text,
  sutures_used text,
  notes text,
  oms_sign_in_done boolean DEFAULT false,
  oms_time_out_done boolean DEFAULT false,
  oms_sign_out_done boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE surgical_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Médico visualiza próprios registros cirúrgicos"
  ON surgical_records FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Médico cria próprios registros cirúrgicos"
  ON surgical_records FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Médico atualiza próprios registros cirúrgicos"
  ON surgical_records FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Médico remove próprios registros cirúrgicos"
  ON surgical_records FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- =============================================
-- 6. IMPLANTES (RASTREABILIDADE ANVISA)
-- =============================================

CREATE TABLE IF NOT EXISTS implant_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  surgical_record_id uuid NOT NULL REFERENCES surgical_records(id) ON DELETE CASCADE,
  patient_id uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  implant_type text NOT NULL DEFAULT '',
  manufacturer text NOT NULL DEFAULT '',
  model text,
  volume_ml numeric(6,2),
  lot_number text NOT NULL DEFAULT '',
  implant_side text,
  surgery_date date,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE implant_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Médico visualiza próprios implantes"
  ON implant_records FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Médico cria próprios implantes"
  ON implant_records FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Médico atualiza próprios implantes"
  ON implant_records FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Médico remove próprios implantes"
  ON implant_records FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_implants_patient_id ON implant_records(patient_id);
CREATE INDEX IF NOT EXISTS idx_implants_lot_number ON implant_records(lot_number);
CREATE INDEX IF NOT EXISTS idx_surgical_records_patient_id ON surgical_records(patient_id);

-- =============================================
-- 7. PESQUISA DE SATISFAÇÃO / NPS
-- =============================================

CREATE TABLE IF NOT EXISTS satisfaction_surveys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  evaluation_id uuid REFERENCES evaluations(id) ON DELETE SET NULL,
  appointment_id uuid REFERENCES patient_appointments(id) ON DELETE SET NULL,
  procedure_type text,
  nps_score integer CHECK (nps_score >= 0 AND nps_score <= 10),
  what_went_well text,
  what_could_improve text,
  would_recommend boolean,
  overall_rating integer CHECK (overall_rating >= 1 AND overall_rating <= 5),
  survey_date date DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE satisfaction_surveys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Médico visualiza próprias pesquisas"
  ON satisfaction_surveys FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Médico cria próprias pesquisas"
  ON satisfaction_surveys FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Médico atualiza próprias pesquisas"
  ON satisfaction_surveys FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Médico remove próprias pesquisas"
  ON satisfaction_surveys FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_surveys_patient_id ON satisfaction_surveys(patient_id);
CREATE INDEX IF NOT EXISTS idx_surveys_user_id ON satisfaction_surveys(user_id);
CREATE INDEX IF NOT EXISTS idx_surveys_nps_score ON satisfaction_surveys(nps_score);
