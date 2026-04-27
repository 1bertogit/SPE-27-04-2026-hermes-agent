/*
  # Add Indexes for Unindexed Foreign Keys

  This migration adds covering indexes for all foreign key columns that were flagged as unindexed.
  These indexes improve query performance when filtering, joining, or ordering by foreign key columns.

  ## Tables Affected:
  1. checklist_items - user_id FK
  2. checklists - evaluation_id FK
  3. implant_records - surgical_record_id FK, user_id FK
  4. patient_appointments - evaluation_id FK
  5. patient_documents - evaluation_id FK
  6. patient_photos - evaluation_id FK
  7. preop_exams - evaluation_id FK
  8. satisfaction_surveys - appointment_id FK, evaluation_id FK
  9. surgical_records - evaluation_id FK, user_id FK

  ## Performance Impact:
  - Faster lookups when filtering by FK columns
  - Better JOIN performance
  - Optimized ORDER BY operations on FK columns
  - Minimal write performance impact (standard index overhead)

  ## Notes:
  - Indexes are created as CONCURRENTLY to avoid blocking writes
  - Index names follow convention: idx_[table]_[column]
*/

CREATE INDEX IF NOT EXISTS idx_checklist_items_user_id ON checklist_items(user_id);
CREATE INDEX IF NOT EXISTS idx_checklists_evaluation_id ON checklists(evaluation_id);
CREATE INDEX IF NOT EXISTS idx_implant_records_surgical_record_id ON implant_records(surgical_record_id);
CREATE INDEX IF NOT EXISTS idx_implant_records_user_id_2 ON implant_records(user_id);
CREATE INDEX IF NOT EXISTS idx_patient_appointments_evaluation_id ON patient_appointments(evaluation_id);
CREATE INDEX IF NOT EXISTS idx_patient_documents_evaluation_id ON patient_documents(evaluation_id);
CREATE INDEX IF NOT EXISTS idx_patient_photos_evaluation_id ON patient_photos(evaluation_id);
CREATE INDEX IF NOT EXISTS idx_preop_exams_evaluation_id ON preop_exams(evaluation_id);
CREATE INDEX IF NOT EXISTS idx_satisfaction_surveys_appointment_id ON satisfaction_surveys(appointment_id);
CREATE INDEX IF NOT EXISTS idx_satisfaction_surveys_evaluation_id ON satisfaction_surveys(evaluation_id);
CREATE INDEX IF NOT EXISTS idx_surgical_records_evaluation_id ON surgical_records(evaluation_id);
CREATE INDEX IF NOT EXISTS idx_surgical_records_user_id ON surgical_records(user_id);
