# System Constraints — SPE-M

Regras invioláveis do sistema. Qualquer código (humano ou AI) que viole uma SC deve ser bloqueado em code review.

## SC-01: RLS obrigatória em todas as tabelas (org_id)

Toda tabela de dados DEVE ter coluna `org_id` com foreign key para `organizations(id)`.
Toda tabela DEVE ter RLS habilitado com políticas restritivas scoped a `org_id = public.current_org_id()`.
Nenhuma query deve bypassar RLS (sem `service_role` no client-side).

**Verificação:** migration review — toda nova tabela deve incluir `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` e pelo menos uma policy por operação (SELECT, INSERT, UPDATE, DELETE).

## SC-02: AUI assinada antes de qualquer upload de foto

Upload de fotos para o bucket `patient-photos` só é permitido se o paciente tiver documento de Autorização de Uso de Imagem (AUI) com status `signed`.

**Verificação:** `documentStore.hasSignedAUI(patientId)` deve retornar `true` antes de qualquer chamada de upload. Frontend bloqueia o botão; backend valida via RLS/policy.

## SC-03: Bucket patient-photos sempre privado

O bucket `patient-photos` DEVE ser privado (não-público). Acesso a fotos DEVE ser via signed URLs com expiração.

**Verificação:** Supabase Dashboard → Storage → `patient-photos` → Policies. Nunca configurar como public bucket.

## SC-04: Keyword check ANTES de qualquer chamada AI

Na Fase 4+, toda mensagem de paciente DEVE passar por `checkCriticalKeywords()` ANTES de ser enviada a qualquer LLM/AI.
Se `critical === true`, a mensagem gera alerta imediato ao médico — não é processada por AI primeiro.

**Verificação:** code review — nenhum call para AI/LLM pode receber texto de paciente sem keyword check prévio. Testes unitários cobrem `keywordCheck.ts` com 100% dos keywords.

## SC-05: agent_logs imutáveis (sem DELETE, sem UPDATE)

A tabela `agent_logs` (Fase 4) é append-only. Nenhuma operação DELETE ou UPDATE é permitida.
RLS deve ter apenas políticas de SELECT e INSERT.

**Verificação:** migration review — a tabela `agent_logs` não deve ter policy de UPDATE ou DELETE. Nenhum store deve ter método que faça `.delete()` ou `.update()` nessa tabela.
