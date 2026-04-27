/*
  # Optimize RLS Policies for Better Performance

  This migration optimizes all RLS policies by wrapping auth functions with SELECT statements.
  This prevents PostgreSQL from re-evaluating auth functions for each row during query execution.

  ## Why This Matters:
  - auth.uid() and auth.jwt() calls are expensive when re-evaluated per row
  - Using (SELECT auth.uid()) caches the result for the entire query
  - Significant performance improvement at scale (especially with large datasets)
  - Reduces CPU usage and query latency

  ## Tables Updated:
  - profiles (4 policies) - uses id = auth.uid()
  - evaluations (4 policies) - uses user_id = auth.uid()
  - evaluation_criteria (4 policies) - uses user_id from join
  - patient_photos (4 policies) - uses user_id = auth.uid()
  - patients (4 policies) - uses user_id = auth.uid()
  - patient_appointments (4 policies) - uses user_id = auth.uid()
  - checklists (4 policies) - uses user_id = auth.uid()
  - patient_documents (4 policies) - uses user_id = auth.uid()
  - checklist_items (4 policies) - uses user_id = auth.uid()
  - implant_records (4 policies) - uses user_id = auth.uid()
  - preop_exams (4 policies) - uses user_id = auth.uid()
  - surgical_records (4 policies) - uses user_id = auth.uid()
  - satisfaction_surveys (4 policies) - uses user_id = auth.uid()

  ## Security:
  - No security changes - policies remain equally restrictive
  - Only performance optimization via function result caching
*/

DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (id = (SELECT auth.uid()))
  WITH CHECK (id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can read own evaluations" ON evaluations;
CREATE POLICY "Users can read own evaluations"
  ON evaluations FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can insert own evaluations" ON evaluations;
CREATE POLICY "Users can insert own evaluations"
  ON evaluations FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can update own evaluations" ON evaluations;
CREATE POLICY "Users can update own evaluations"
  ON evaluations FOR UPDATE
  TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can delete own evaluations" ON evaluations;
CREATE POLICY "Users can delete own evaluations"
  ON evaluations FOR DELETE
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can read own evaluation criteria" ON evaluation_criteria;
CREATE POLICY "Users can read own evaluation criteria"
  ON evaluation_criteria FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM evaluations
      WHERE evaluations.id = evaluation_criteria.evaluation_id
      AND evaluations.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can insert own evaluation criteria" ON evaluation_criteria;
CREATE POLICY "Users can insert own evaluation criteria"
  ON evaluation_criteria FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM evaluations
      WHERE evaluations.id = evaluation_criteria.evaluation_id
      AND evaluations.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can update own evaluation criteria" ON evaluation_criteria;
CREATE POLICY "Users can update own evaluation criteria"
  ON evaluation_criteria FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM evaluations
      WHERE evaluations.id = evaluation_criteria.evaluation_id
      AND evaluations.user_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM evaluations
      WHERE evaluations.id = evaluation_criteria.evaluation_id
      AND evaluations.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can delete own evaluation criteria" ON evaluation_criteria;
CREATE POLICY "Users can delete own evaluation criteria"
  ON evaluation_criteria FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM evaluations
      WHERE evaluations.id = evaluation_criteria.evaluation_id
      AND evaluations.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can read own patient photos" ON patient_photos;
CREATE POLICY "Users can read own patient photos"
  ON patient_photos FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can insert own patient photos" ON patient_photos;
CREATE POLICY "Users can insert own patient photos"
  ON patient_photos FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can update own patient photos" ON patient_photos;
CREATE POLICY "Users can update own patient photos"
  ON patient_photos FOR UPDATE
  TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can delete own patient photos" ON patient_photos;
CREATE POLICY "Users can delete own patient photos"
  ON patient_photos FOR DELETE
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can read own patients" ON patients;
CREATE POLICY "Users can read own patients"
  ON patients FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can insert own patients" ON patients;
CREATE POLICY "Users can insert own patients"
  ON patients FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can update own patients" ON patients;
CREATE POLICY "Users can update own patients"
  ON patients FOR UPDATE
  TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can delete own patients" ON patients;
CREATE POLICY "Users can delete own patients"
  ON patients FOR DELETE
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Médico visualiza próprios agendamentos" ON patient_appointments;
CREATE POLICY "Médico visualiza próprios agendamentos"
  ON patient_appointments FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Médico cria próprios agendamentos" ON patient_appointments;
CREATE POLICY "Médico cria próprios agendamentos"
  ON patient_appointments FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Médico atualiza próprios agendamentos" ON patient_appointments;
CREATE POLICY "Médico atualiza próprios agendamentos"
  ON patient_appointments FOR UPDATE
  TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Médico remove próprios agendamentos" ON patient_appointments;
CREATE POLICY "Médico remove próprios agendamentos"
  ON patient_appointments FOR DELETE
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Médico visualiza próprios checklists" ON checklists;
CREATE POLICY "Médico visualiza próprios checklists"
  ON checklists FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Médico cria próprios checklists" ON checklists;
CREATE POLICY "Médico cria próprios checklists"
  ON checklists FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Médico atualiza próprios checklists" ON checklists;
CREATE POLICY "Médico atualiza próprios checklists"
  ON checklists FOR UPDATE
  TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Médico remove próprios checklists" ON checklists;
CREATE POLICY "Médico remove próprios checklists"
  ON checklists FOR DELETE
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Médico visualiza próprios documentos" ON patient_documents;
CREATE POLICY "Médico visualiza próprios documentos"
  ON patient_documents FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Médico cria próprios documentos" ON patient_documents;
CREATE POLICY "Médico cria próprios documentos"
  ON patient_documents FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Médico atualiza próprios documentos" ON patient_documents;
CREATE POLICY "Médico atualiza próprios documentos"
  ON patient_documents FOR UPDATE
  TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Médico remove próprios documentos" ON patient_documents;
CREATE POLICY "Médico remove próprios documentos"
  ON patient_documents FOR DELETE
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Médico visualiza próprios itens de checklist" ON checklist_items;
CREATE POLICY "Médico visualiza próprios itens de checklist"
  ON checklist_items FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Médico cria próprios itens de checklist" ON checklist_items;
CREATE POLICY "Médico cria próprios itens de checklist"
  ON checklist_items FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Médico atualiza próprios itens de checklist" ON checklist_items;
CREATE POLICY "Médico atualiza próprios itens de checklist"
  ON checklist_items FOR UPDATE
  TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Médico remove próprios itens de checklist" ON checklist_items;
CREATE POLICY "Médico remove próprios itens de checklist"
  ON checklist_items FOR DELETE
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Médico visualiza próprios implantes" ON implant_records;
CREATE POLICY "Médico visualiza próprios implantes"
  ON implant_records FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Médico cria próprios implantes" ON implant_records;
CREATE POLICY "Médico cria próprios implantes"
  ON implant_records FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Médico atualiza próprios implantes" ON implant_records;
CREATE POLICY "Médico atualiza próprios implantes"
  ON implant_records FOR UPDATE
  TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Médico remove próprios implantes" ON implant_records;
CREATE POLICY "Médico remove próprios implantes"
  ON implant_records FOR DELETE
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Médico visualiza próprios exames" ON preop_exams;
CREATE POLICY "Médico visualiza próprios exames"
  ON preop_exams FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Médico cria próprios exames" ON preop_exams;
CREATE POLICY "Médico cria próprios exames"
  ON preop_exams FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Médico atualiza próprios exames" ON preop_exams;
CREATE POLICY "Médico atualiza próprios exames"
  ON preop_exams FOR UPDATE
  TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Médico remove próprios exames" ON preop_exams;
CREATE POLICY "Médico remove próprios exames"
  ON preop_exams FOR DELETE
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Médico visualiza próprios registros cirúrgicos" ON surgical_records;
CREATE POLICY "Médico visualiza próprios registros cirúrgicos"
  ON surgical_records FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Médico cria próprios registros cirúrgicos" ON surgical_records;
CREATE POLICY "Médico cria próprios registros cirúrgicos"
  ON surgical_records FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Médico atualiza próprios registros cirúrgicos" ON surgical_records;
CREATE POLICY "Médico atualiza próprios registros cirúrgicos"
  ON surgical_records FOR UPDATE
  TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Médico remove próprios registros cirúrgicos" ON surgical_records;
CREATE POLICY "Médico remove próprios registros cirúrgicos"
  ON surgical_records FOR DELETE
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Médico visualiza próprias pesquisas" ON satisfaction_surveys;
CREATE POLICY "Médico visualiza próprias pesquisas"
  ON satisfaction_surveys FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Médico cria próprias pesquisas" ON satisfaction_surveys;
CREATE POLICY "Médico cria próprias pesquisas"
  ON satisfaction_surveys FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Médico atualiza próprias pesquisas" ON satisfaction_surveys;
CREATE POLICY "Médico atualiza próprias pesquisas"
  ON satisfaction_surveys FOR UPDATE
  TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Médico remove próprias pesquisas" ON satisfaction_surveys;
CREATE POLICY "Médico remove próprias pesquisas"
  ON satisfaction_surveys FOR DELETE
  TO authenticated
  USING (user_id = (SELECT auth.uid()));
