-- Migration: Review findings fixes - multi-tenancy, SC-13 and NPS public flow
-- Created: 2026-04-28

-- Remove permissive user_id policies that can coexist with org_id policies.
-- Postgres combines permissive RLS policies with OR, so legacy policies must be
-- explicitly removed after the multi-tenant migration.
DROP POLICY IF EXISTS "Users can read own patients" ON patients;
DROP POLICY IF EXISTS "Users can insert own patients" ON patients;
DROP POLICY IF EXISTS "Users can update own patients" ON patients;
DROP POLICY IF EXISTS "Users can delete own patients" ON patients;
DROP POLICY IF EXISTS "Users can view own patients" ON patients;

DROP POLICY IF EXISTS "Users can read own evaluations" ON evaluations;
DROP POLICY IF EXISTS "Users can insert own evaluations" ON evaluations;
DROP POLICY IF EXISTS "Users can update own evaluations" ON evaluations;
DROP POLICY IF EXISTS "Users can delete own evaluations" ON evaluations;

DROP POLICY IF EXISTS "Users can read own evaluation criteria" ON evaluation_criteria;
DROP POLICY IF EXISTS "Users can insert own evaluation criteria" ON evaluation_criteria;
DROP POLICY IF EXISTS "Users can update own evaluation criteria" ON evaluation_criteria;
DROP POLICY IF EXISTS "Users can delete own evaluation criteria" ON evaluation_criteria;

DROP POLICY IF EXISTS "Users can read own patient photos" ON patient_photos;
DROP POLICY IF EXISTS "Users can insert own patient photos" ON patient_photos;
DROP POLICY IF EXISTS "Users can update own patient photos" ON patient_photos;
DROP POLICY IF EXISTS "Users can delete own patient photos" ON patient_photos;

DROP POLICY IF EXISTS "Medico visualiza proprios agendamentos" ON patient_appointments;
DROP POLICY IF EXISTS "Médico visualiza próprios agendamentos" ON patient_appointments;
DROP POLICY IF EXISTS "Médico cria próprios agendamentos" ON patient_appointments;
DROP POLICY IF EXISTS "Médico atualiza próprios agendamentos" ON patient_appointments;
DROP POLICY IF EXISTS "Médico remove próprios agendamentos" ON patient_appointments;

DROP POLICY IF EXISTS "Médico visualiza próprios checklists" ON checklists;
DROP POLICY IF EXISTS "Médico cria próprios checklists" ON checklists;
DROP POLICY IF EXISTS "Médico atualiza próprios checklists" ON checklists;
DROP POLICY IF EXISTS "Médico remove próprios checklists" ON checklists;

DROP POLICY IF EXISTS "Médico visualiza próprios documentos" ON patient_documents;
DROP POLICY IF EXISTS "Médico cria próprios documentos" ON patient_documents;
DROP POLICY IF EXISTS "Médico atualiza próprios documentos" ON patient_documents;
DROP POLICY IF EXISTS "Médico remove próprios documentos" ON patient_documents;

DROP POLICY IF EXISTS "Médico visualiza próprios itens de checklist" ON checklist_items;
DROP POLICY IF EXISTS "Médico cria próprios itens de checklist" ON checklist_items;
DROP POLICY IF EXISTS "Médico atualiza próprios itens de checklist" ON checklist_items;
DROP POLICY IF EXISTS "Médico remove próprios itens de checklist" ON checklist_items;

DROP POLICY IF EXISTS "Médico visualiza próprios implantes" ON implant_records;
DROP POLICY IF EXISTS "Médico cria próprios implantes" ON implant_records;
DROP POLICY IF EXISTS "Médico atualiza próprios implantes" ON implant_records;
DROP POLICY IF EXISTS "Médico remove próprios implantes" ON implant_records;

DROP POLICY IF EXISTS "Médico visualiza próprios exames" ON preop_exams;
DROP POLICY IF EXISTS "Médico cria próprios exames" ON preop_exams;
DROP POLICY IF EXISTS "Médico atualiza próprios exames" ON preop_exams;
DROP POLICY IF EXISTS "Médico remove próprios exames" ON preop_exams;

DROP POLICY IF EXISTS "Médico visualiza próprios registros cirúrgicos" ON surgical_records;
DROP POLICY IF EXISTS "Médico cria próprios registros cirúrgicos" ON surgical_records;
DROP POLICY IF EXISTS "Médico atualiza próprios registros cirúrgicos" ON surgical_records;
DROP POLICY IF EXISTS "Médico remove próprios registros cirúrgicos" ON surgical_records;

DROP POLICY IF EXISTS "Médico visualiza próprias pesquisas" ON satisfaction_surveys;
DROP POLICY IF EXISTS "Médico cria próprias pesquisas" ON satisfaction_surveys;
DROP POLICY IF EXISTS "Médico atualiza próprias pesquisas" ON satisfaction_surveys;
DROP POLICY IF EXISTS "Médico remove próprias pesquisas" ON satisfaction_surveys;

-- NPS cache functions and public submission flow need an explicit completion flag.
ALTER TABLE satisfaction_surveys
  ADD COLUMN IF NOT EXISTS completed boolean NOT NULL DEFAULT false;

-- SC-13: advancing to cirurgia_realizada requires a surgical record with CIO Sign Out.
CREATE OR REPLACE FUNCTION public.enforce_cio_sign_out_gate_cirurgia_realizada()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_has_signed_out_record boolean;
BEGIN
  IF NEW.workflow_status IS DISTINCT FROM OLD.workflow_status
     AND NEW.workflow_status = 'cirurgia_realizada' THEN

    SELECT EXISTS (
      SELECT 1
      FROM public.surgical_records sr
      WHERE sr.patient_id = NEW.id
        AND sr.oms_sign_out_done IS TRUE
        AND (NEW.org_id IS NULL OR sr.org_id = NEW.org_id)
    )
    INTO v_has_signed_out_record;

    IF NOT v_has_signed_out_record THEN
      RAISE EXCEPTION 'SC-13: cirurgia realizada requer registro cirurgico com CIO Sign Out assinado.'
        USING ERRCODE = '23514';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS check_cio_sign_out_gate_on_patients ON public.patients;

CREATE TRIGGER check_cio_sign_out_gate_on_patients
  BEFORE UPDATE OF workflow_status ON public.patients
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_cio_sign_out_gate_cirurgia_realizada();
