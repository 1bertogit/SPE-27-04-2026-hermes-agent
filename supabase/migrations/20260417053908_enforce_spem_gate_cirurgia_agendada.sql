/*
  # SC-12: Enforce SPE-M score gate on transition to cirurgia_agendada

  Blocks UPDATE on patients when workflow_status is being changed to
  'cirurgia_agendada' and the most recent completed SPE-M evaluation
  has a ratio (total_score / max_score) < 0.6 (i.e., < 60%).

  Policy decisions:
  - Uses most recent evaluation (A2), ordered by completed_at then created_at
  - Threshold is ratio-based, robust to future criteria changes
  - Applies to all roles (no admin bypass)
  - Only fires when workflow_status actually changes to cirurgia_agendada
  - Cancel/terminate transitions are untouched
*/

CREATE OR REPLACE FUNCTION public.enforce_spem_gate_cirurgia_agendada()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total numeric;
  v_max numeric;
  v_ratio numeric;
BEGIN
  IF NEW.workflow_status IS DISTINCT FROM OLD.workflow_status
     AND NEW.workflow_status = 'cirurgia_agendada' THEN

    SELECT total_score, max_score
    INTO v_total, v_max
    FROM public.evaluations
    WHERE patient_id = NEW.id
      AND status = 'Concluído'
    ORDER BY completed_at DESC NULLS LAST, created_at DESC
    LIMIT 1;

    IF v_total IS NULL THEN
      RAISE EXCEPTION 'SC-12: paciente sem avaliacao SPE-M concluida. Agendamento cirurgico bloqueado.'
        USING ERRCODE = '23514';
    END IF;

    IF v_max IS NULL OR v_max = 0 THEN
      RAISE EXCEPTION 'SC-12: avaliacao SPE-M do paciente com max_score invalido. Agendamento cirurgico bloqueado.'
        USING ERRCODE = '23514';
    END IF;

    v_ratio := v_total / v_max;

    IF v_ratio < 0.6 THEN
      RAISE EXCEPTION 'SC-12: score SPE-M %/% (% porcento) abaixo do minimo clinico de 60 porcento. Agendamento cirurgico contraindicado.',
        v_total, v_max, round(v_ratio * 100, 1)
        USING ERRCODE = '23514';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS check_spem_gate_on_patients ON public.patients;

CREATE TRIGGER check_spem_gate_on_patients
  BEFORE UPDATE OF workflow_status ON public.patients
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_spem_gate_cirurgia_agendada();
