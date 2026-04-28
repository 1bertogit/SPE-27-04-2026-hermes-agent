-- Fase 4: permitir que usuarios autenticados criem execucoes de agentes da propria org.

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
        WHERE p.id = patient_id
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

COMMENT ON POLICY "agent_executions_org_insert" ON public.agent_executions
  IS 'Usuarios autenticados podem iniciar execucoes apenas na propria org, com patient/parent da mesma org.';
