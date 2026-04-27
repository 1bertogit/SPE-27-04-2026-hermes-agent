/*
  # Add unique constraint on evaluation_criteria

  1. Changes
    - Adds a unique constraint on `evaluation_criteria(evaluation_id, criterion_key)`
      to support upsert operations and prevent duplicate criteria per evaluation.
  
  2. Important Notes
    - This constraint enables safe upsert calls from the application,
      eliminating the need for delete-then-insert patterns that risk data loss.
    - Uses IF NOT EXISTS to be safe for re-runs.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'evaluation_criteria_evaluation_id_criterion_key_key'
  ) THEN
    ALTER TABLE evaluation_criteria
      ADD CONSTRAINT evaluation_criteria_evaluation_id_criterion_key_key
      UNIQUE (evaluation_id, criterion_key);
  END IF;
END $$;
