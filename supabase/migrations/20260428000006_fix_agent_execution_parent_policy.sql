-- Fase 4: corrigir referencia ao parent_execution_id na policy de INSERT.

DROP POLICY IF EXISTS "agent_executions_org_insert" ON public.agent_executions;
CREATE POLICY "agent_executions_org_insert" ON public.agent_executions
  FOR INSERT
  WITH CHECK (
    org_id = public.current_org_id()
    AND (
      patient_id IS NULL
      OR EXISTS (
        SELECT 1
        FROM public.patients p
        WHERE p.id = agent_executions.patient_id
          AND p.org_id = public.current_org_id()
      )
    )
    AND (
      parent_execution_id IS NULL
      OR EXISTS (
        SELECT 1
        FROM public.agent_executions parent
        WHERE parent.id = agent_executions.parent_execution_id
          AND parent.org_id = public.current_org_id()
      )
    )
  );
