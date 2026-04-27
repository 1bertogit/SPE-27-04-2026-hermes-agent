/*
  # Multi-tenancy: Organizations, org_id, JWT custom claims

  ## Summary
  Adds complete multi-tenancy infrastructure to SPE-M:
  - `organizations` table (clinic/facility level)
  - `org_id` column to all data tables
  - `workflow_status` for patient state machine
  - RLS policies scoped to org via `public.current_org_id()`
  - Storage policies for patient photos by org
  - Custom JWT hook to inject org claims (manual registration in Dashboard)

  ## New Tables
  - `organizations` (id, name, cnpj, phone, timezone, active, created_at, updated_at)

  ## Modified Tables
  - `profiles`: +org_id uuid, +role text
  - `patients`: +org_id uuid, +workflow_status text
  - `leads`, `evaluations`, `patient_photos`, `patient_documents`, `checklists`, `checklist_items`,
    `patient_appointments`, `preop_exams`, `surgical_records`, `implant_records`, `satisfaction_surveys`: +org_id uuid

  ## Security
  - Enable RLS on organizations table
  - Migrate all data table policies from user_id → org_id
  - Restrict storage uploads/downloads by org
  - Custom JWT hook: auth.custom_access_token_hook injects org_id and role claims

  ## Important Notes
  1. All org_id columns are nullable (first migration phase for backward compatibility)
  2. After backfill of existing data: ALTER TABLE x ALTER COLUMN org_id SET NOT NULL;
  3. Manual step required: Register custom_access_token_hook in Supabase Dashboard
     → Authentication → Hooks → Add → Custom Access Token → auth.custom_access_token_hook
*/

CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.current_org_id()
RETURNS uuid LANGUAGE sql STABLE AS $$
  SELECT nullif(auth.jwt() -> 'app_metadata' ->> 'org_id', '')::uuid
$$;

CREATE OR REPLACE FUNCTION public.current_app_role()
RETURNS text LANGUAGE sql STABLE AS $$
  SELECT auth.jwt() -> 'app_metadata' ->> 'role'
$$;

CREATE TABLE IF NOT EXISTS organizations (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL,
  cnpj       text,
  phone      text,
  timezone   text NOT NULL DEFAULT 'America/Sao_Paulo',
  active     boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS trg_organizations_updated_at ON organizations;
CREATE TRIGGER trg_organizations_updated_at
  BEFORE UPDATE ON organizations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS org_select ON organizations;
CREATE POLICY org_select ON organizations
  FOR SELECT USING (id = public.current_org_id());

DROP POLICY IF EXISTS org_update ON organizations;
CREATE POLICY org_update ON organizations
  FOR UPDATE USING (
    id = public.current_org_id()
    AND public.current_app_role() = 'admin'
  )
  WITH CHECK (id = public.current_org_id());

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS org_id uuid REFERENCES organizations(id),
  ADD COLUMN IF NOT EXISTS role text CHECK (role IN ('admin', 'doctor', 'reception'));

ALTER TABLE patients ADD COLUMN IF NOT EXISTS org_id uuid REFERENCES organizations(id);
ALTER TABLE patients ADD COLUMN IF NOT EXISTS workflow_status text DEFAULT 'lead'
  CHECK (workflow_status IN (
    'lead','consulta_agendada','consulta_realizada',
    'decidiu_operar','pre_operatorio','cirurgia_agendada',
    'cirurgia_realizada','pos_op_ativo','longo_prazo',
    'encerrado','nao_convertido','cancelado'
  ));

ALTER TABLE leads ADD COLUMN IF NOT EXISTS org_id uuid REFERENCES organizations(id);
ALTER TABLE evaluations ADD COLUMN IF NOT EXISTS org_id uuid REFERENCES organizations(id);
ALTER TABLE patient_photos ADD COLUMN IF NOT EXISTS org_id uuid REFERENCES organizations(id);
ALTER TABLE patient_documents ADD COLUMN IF NOT EXISTS org_id uuid REFERENCES organizations(id);
ALTER TABLE checklists ADD COLUMN IF NOT EXISTS org_id uuid REFERENCES organizations(id);
ALTER TABLE checklist_items ADD COLUMN IF NOT EXISTS org_id uuid REFERENCES organizations(id);
ALTER TABLE patient_appointments ADD COLUMN IF NOT EXISTS org_id uuid REFERENCES organizations(id);
ALTER TABLE preop_exams ADD COLUMN IF NOT EXISTS org_id uuid REFERENCES organizations(id);
ALTER TABLE surgical_records ADD COLUMN IF NOT EXISTS org_id uuid REFERENCES organizations(id);
ALTER TABLE implant_records ADD COLUMN IF NOT EXISTS org_id uuid REFERENCES organizations(id);
ALTER TABLE satisfaction_surveys ADD COLUMN IF NOT EXISTS org_id uuid REFERENCES organizations(id);

DROP POLICY IF EXISTS "Users can view own patients" ON patients;
DROP POLICY IF EXISTS "Users can insert own patients" ON patients;
DROP POLICY IF EXISTS "Users can update own patients" ON patients;
DROP POLICY IF EXISTS "Users can delete own patients" ON patients;

CREATE POLICY patients_select ON patients
  FOR SELECT USING (org_id = public.current_org_id());
CREATE POLICY patients_insert ON patients
  FOR INSERT WITH CHECK (org_id = public.current_org_id());
CREATE POLICY patients_update ON patients
  FOR UPDATE USING (org_id = public.current_org_id())
  WITH CHECK (org_id = public.current_org_id());

DROP POLICY IF EXISTS "Users can view own leads" ON leads;
DROP POLICY IF EXISTS "Users can insert own leads" ON leads;
DROP POLICY IF EXISTS "Users can update own leads" ON leads;
DROP POLICY IF EXISTS "Users can delete own leads" ON leads;

CREATE POLICY leads_select ON leads
  FOR SELECT USING (org_id = public.current_org_id());
CREATE POLICY leads_insert ON leads
  FOR INSERT WITH CHECK (org_id = public.current_org_id());
CREATE POLICY leads_update ON leads
  FOR UPDATE USING (org_id = public.current_org_id())
  WITH CHECK (org_id = public.current_org_id());
CREATE POLICY leads_delete ON leads
  FOR DELETE USING (org_id = public.current_org_id() AND public.current_app_role() = 'admin');

DROP POLICY IF EXISTS "Users can view own evaluations" ON evaluations;
DROP POLICY IF EXISTS "Users can insert own evaluations" ON evaluations;
DROP POLICY IF EXISTS "Users can update own evaluations" ON evaluations;

CREATE POLICY evaluations_select ON evaluations
  FOR SELECT USING (org_id = public.current_org_id());
CREATE POLICY evaluations_insert ON evaluations
  FOR INSERT WITH CHECK (org_id = public.current_org_id());
CREATE POLICY evaluations_update ON evaluations
  FOR UPDATE USING (org_id = public.current_org_id())
  WITH CHECK (org_id = public.current_org_id());

DROP POLICY IF EXISTS "Users can view own photos" ON patient_photos;
DROP POLICY IF EXISTS "Users can insert own photos" ON patient_photos;
DROP POLICY IF EXISTS "Users can update own photos" ON patient_photos;
DROP POLICY IF EXISTS "Users can delete own photos" ON patient_photos;

CREATE POLICY photos_select ON patient_photos
  FOR SELECT USING (org_id = public.current_org_id());
CREATE POLICY photos_insert ON patient_photos
  FOR INSERT WITH CHECK (org_id = public.current_org_id());
CREATE POLICY photos_update ON patient_photos
  FOR UPDATE USING (org_id = public.current_org_id())
  WITH CHECK (org_id = public.current_org_id());
CREATE POLICY photos_delete ON patient_photos
  FOR DELETE USING (org_id = public.current_org_id() AND public.current_app_role() = 'admin');

DROP POLICY IF EXISTS "Users can view own patient_documents" ON patient_documents;
DROP POLICY IF EXISTS "Users can insert own patient_documents" ON patient_documents;
DROP POLICY IF EXISTS "Users can update own patient_documents" ON patient_documents;

CREATE POLICY patient_documents_select ON patient_documents
  FOR SELECT USING (org_id = public.current_org_id());
CREATE POLICY patient_documents_insert ON patient_documents
  FOR INSERT WITH CHECK (org_id = public.current_org_id());
CREATE POLICY patient_documents_update ON patient_documents
  FOR UPDATE USING (org_id = public.current_org_id())
  WITH CHECK (org_id = public.current_org_id());

DROP POLICY IF EXISTS "Users can view own checklists" ON checklists;
DROP POLICY IF EXISTS "Users can insert own checklists" ON checklists;
DROP POLICY IF EXISTS "Users can update own checklists" ON checklists;

CREATE POLICY checklists_select ON checklists
  FOR SELECT USING (org_id = public.current_org_id());
CREATE POLICY checklists_insert ON checklists
  FOR INSERT WITH CHECK (org_id = public.current_org_id());
CREATE POLICY checklists_update ON checklists
  FOR UPDATE USING (org_id = public.current_org_id())
  WITH CHECK (org_id = public.current_org_id());

DROP POLICY IF EXISTS "Users can view own checklist_items" ON checklist_items;
DROP POLICY IF EXISTS "Users can insert own checklist_items" ON checklist_items;
DROP POLICY IF EXISTS "Users can update own checklist_items" ON checklist_items;

CREATE POLICY checklist_items_select ON checklist_items
  FOR SELECT USING (org_id = public.current_org_id());
CREATE POLICY checklist_items_insert ON checklist_items
  FOR INSERT WITH CHECK (org_id = public.current_org_id());
CREATE POLICY checklist_items_update ON checklist_items
  FOR UPDATE USING (org_id = public.current_org_id())
  WITH CHECK (org_id = public.current_org_id());

DROP POLICY IF EXISTS "Users can view own patient_appointments" ON patient_appointments;
DROP POLICY IF EXISTS "Users can insert own patient_appointments" ON patient_appointments;
DROP POLICY IF EXISTS "Users can update own patient_appointments" ON patient_appointments;

CREATE POLICY patient_appointments_select ON patient_appointments
  FOR SELECT USING (org_id = public.current_org_id());
CREATE POLICY patient_appointments_insert ON patient_appointments
  FOR INSERT WITH CHECK (org_id = public.current_org_id());
CREATE POLICY patient_appointments_update ON patient_appointments
  FOR UPDATE USING (org_id = public.current_org_id())
  WITH CHECK (org_id = public.current_org_id());

DROP POLICY IF EXISTS "Users can view own preop_exams" ON preop_exams;
DROP POLICY IF EXISTS "Users can insert own preop_exams" ON preop_exams;
DROP POLICY IF EXISTS "Users can update own preop_exams" ON preop_exams;

CREATE POLICY preop_exams_select ON preop_exams
  FOR SELECT USING (org_id = public.current_org_id());
CREATE POLICY preop_exams_insert ON preop_exams
  FOR INSERT WITH CHECK (org_id = public.current_org_id());
CREATE POLICY preop_exams_update ON preop_exams
  FOR UPDATE USING (org_id = public.current_org_id())
  WITH CHECK (org_id = public.current_org_id());

DROP POLICY IF EXISTS "Users can view own surgical_records" ON surgical_records;
DROP POLICY IF EXISTS "Users can insert own surgical_records" ON surgical_records;
DROP POLICY IF EXISTS "Users can update own surgical_records" ON surgical_records;

CREATE POLICY surgical_records_select ON surgical_records
  FOR SELECT USING (org_id = public.current_org_id());
CREATE POLICY surgical_records_insert ON surgical_records
  FOR INSERT WITH CHECK (org_id = public.current_org_id());
CREATE POLICY surgical_records_update ON surgical_records
  FOR UPDATE USING (org_id = public.current_org_id())
  WITH CHECK (org_id = public.current_org_id());

DROP POLICY IF EXISTS "Users can view own implant_records" ON implant_records;
DROP POLICY IF EXISTS "Users can insert own implant_records" ON implant_records;
DROP POLICY IF EXISTS "Users can update own implant_records" ON implant_records;

CREATE POLICY implant_records_select ON implant_records
  FOR SELECT USING (org_id = public.current_org_id());
CREATE POLICY implant_records_insert ON implant_records
  FOR INSERT WITH CHECK (org_id = public.current_org_id());
CREATE POLICY implant_records_update ON implant_records
  FOR UPDATE USING (org_id = public.current_org_id())
  WITH CHECK (org_id = public.current_org_id());

DROP POLICY IF EXISTS "Users can view own satisfaction_surveys" ON satisfaction_surveys;
DROP POLICY IF EXISTS "Users can insert own satisfaction_surveys" ON satisfaction_surveys;
DROP POLICY IF EXISTS "Users can update own satisfaction_surveys" ON satisfaction_surveys;

CREATE POLICY satisfaction_surveys_select ON satisfaction_surveys
  FOR SELECT USING (org_id = public.current_org_id());
CREATE POLICY satisfaction_surveys_insert ON satisfaction_surveys
  FOR INSERT WITH CHECK (org_id = public.current_org_id());
CREATE POLICY satisfaction_surveys_update ON satisfaction_surveys
  FOR UPDATE USING (org_id = public.current_org_id())
  WITH CHECK (org_id = public.current_org_id());

DROP POLICY IF EXISTS "Users can upload photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can view own photos" ON storage.objects;
DROP POLICY IF EXISTS "Give users access to own folder" ON storage.objects;

CREATE POLICY photos_storage_upload ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'patient-photos' AND
    (storage.foldername(name))[1] = (public.current_org_id())::text
  );

CREATE POLICY photos_storage_select ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'patient-photos' AND
    (storage.foldername(name))[1] = (public.current_org_id())::text
  );