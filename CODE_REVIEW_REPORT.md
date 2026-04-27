# 🔍 Code Review Report - SPE-M
**Projeto:** Surgical Planning & Evaluation - Medical  
**Stack:** React 18 + TypeScript + Vite + Tailwind + Supabase + Zustand  
**Data:** 27/04/2026  
**Revisado por:** AI Code Reviewer

---

## 📋 Resumo Executivo

O projeto SPE-M demonstra **arquitetura moderna e bem estruturada** com multi-tenancy implementado corretamente, sistema de workflow clínico robusto e integrações de mensagens (WhatsApp) funcionais. Identificamos **3 problemas CRÍTICOS**, **4 de severidade ALTA** e vários pontos de melhoria em performance e segurança.

### Estatísticas Gerais
- **Total de arquivos fonte:** ~50 arquivos TypeScript/TSX
- **Cobertura de testes:** 61 testes em 3 arquivos (lib core)
- **TypeScript strict mode:** ✅ Habilitado
- **ESLint:** ⚠️ Configuração quebrada (v9 - bug pré-existente)

---

## 🔴 CRÍTICO - Requer Ação Imediata

### 1. Escalão de Score SPE-M Divergente
**Arquivo:** `src/lib/patientPipeline.ts:100`  
**Problema:** O frontend usa escala 0-10 (`spemScore < 6`) enquanto o trigger do banco usa 0-1 (`ratio < 0.6`). Camadas divergentes podem causar comportamento inconsistente no gate SC-12.

```typescript
// patientPipeline.ts - Escala 0-10 (PROBLEMA)
if (spemScore < 6) { ... }  // 6/10 = 60%

// Migration trigger - Escala 0-1 (CORRETO)
IF (ratio < 0.6) THEN  -- 60%
```

**Impacto:** Bloqueios indevidos ou liberações inseguras de cirurgias  
**Recomendação:** Unificar para escala 0-1 (ratio) em todas as camadas

---

### 2. SQL Injection Potencial em Filtros
**Arquivo:** `src/stores/patientStore.ts:60`  
**Problema:** Filtros de busca concatenam strings diretamente na query:

```typescript
query = query.or(`full_name.ilike.%${filters.search}%,cpf.ilike.%${filters.search}%`);
```

**Impacto:** Risco de SQL injection se `filters.search` não for sanitizado  
**Recomendação:** Usar `.or()` com parâmetros sanitizados ou validação regex pré-query

---

### 3. CORS Permissivo Demais em Edge Functions
**Arquivos:** Múltiplas Edge Functions (`send-whatsapp`, `complete-onboarding`, etc.)  
**Problema:** 

```typescript
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",  // ❌ Muito permissivo
};
```

**Impacto:** Vulnerabilidade a ataques CSRF/XSS em ambientes de produção  
**Recomendação:** Configurar CORS específico para domínios permitidos

---

## 🟠 ALTO - Requer Ação Prioritária

### 4. Falta de Rate Limiting nas Edge Functions
**Arquivos:** `supabase/functions/*/index.ts`  
**Problema:** Nenhuma Edge Function implementa rate limiting  
**Impacto:** Vulnerável a DDoS e brute-force  
**Recomendação:** Implementar rate limiting via Redis ou Supabase built-in

---

### 5. Validação de Webhook Stripe Sem Timestamp
**Arquivo:** `supabase/functions/stripe-webhook/index.ts:9-42`  
**Problema:** Função `verifyStripeSignature` não verifica se o timestamp está dentro de uma janela aceitável (tolerância de tempo)  
**Impacto:** Webhooks antigos/repetidos podem ser processados  
**Recomendação:** Verificar `t=` timestamp com tolerância de 5 minutos

---

### 6. Tratamento de Erros Inconsistente
**Arquivo:** `src/stores/authStore.ts:64-66`  
**Problema:** Erros de rede silenciados:

```typescript
try {
  const { data: { session } } = await supabase.auth.getSession();
  // ...
} catch {
  // Network failure — allow app to show login
}
```

**Impacto:** Falhas silenciosas dificultam debugging  
**Recomendação:** Logar erros com console.error ou serviço de monitoramento

---

### 7. Mock de IA em Produção
**Arquivo:** `supabase/functions/process-agent/index.ts:239-254`  
**Problema:** Função `callClaudeAPI` é apenas um mock que simula resposta:

```typescript
// Simulação de resposta
await new Promise(resolve => setTimeout(resolve, 500));
return `[Resposta gerada por ${model}]...`;
```

**Impacto:** Funcionalidade de AI não funciona em produção  
**Recomendação:** Integrar com API real da Anthropic ou desabilitar feature

---

## 🟡 MÉDIO - Melhorias Recomendadas

### 8. Ausência de Testes de Componentes/Integração
**Problema:** Apenas 3 arquivos de teste na pasta `lib/` (61 testes). Zero testes de:  
- Componentes React
- Stores Zustand  
- Edge Functions
- Integração Supabase

**Recomendação:** Adicionar React Testing Library + MSW para mock de API

---

### 9. Falta de Memoização em Componentes Pesados
**Arquivo:** `src/pages/PatientDetail.tsx`  
**Problema:** Componente faz múltiplas chamadas e recálculos sem `useMemo`:
- `calcBMI` chamado a cada render
- `getBMICategory` chamado a cada render
- Tabs complexos sem lazy loading

**Recomendação:**
```typescript
const bmi = useMemo(() => calcBMI(weight, height), [weight, height]);
const bmiCategory = useMemo(() => getBMICategory(bmi), [bmi]);
```

---

### 10. Zustand Stores Sem Persistência Seletiva
**Arquivo:** `src/stores/*Store.ts`  
**Problema:** Stores recarregam dados do zero a cada refresh  
**Recomendação:** Implementar `persist` middleware para dados que não mudam frequentemente (ex: lista de pacientes com cache de 5min)

---

### 11. Error Boundary Básico
**Arquivo:** `src/components/ui/ErrorBoundary.tsx`  
**Problema:** Apenas log de erro no console, sem report para serviço externo  
**Recomendação:** Integrar com Sentry, LogRocket ou similar

---

### 12. Verificação de Telefone Insegura
**Arquivo:** `supabase/functions/webhook-whatsapp/index.ts:128`  
**Problema:** Busca paciente por últimos 8 dígitos do telefone:

```typescript
const patientRes = await fetch(
  `${supabaseUrl}/rest/v1/patients?phone=like.*${phone.slice(-8)}...`
);
```

**Impacto:** Colisão possível entre pacientes com mesmos 8 dígitos finais  
**Recomendação:** Usar hash completo ou validação adicional

---

## 🟢 BAIXO - Refinamentos

### 13. ESLint v9 Configuração Quebrada
**Arquivo:** `eslint.config.js`  
**Problema:** `@typescript-eslint/no-unused-expressions` reportando falsos positivos  
**Solução:** Bug pré-existente documentado, não bloqueante

---

### 14. Unused Imports
**Padrão:** Múltiplos arquivos importam `lucide-react` icons que não são usados  
**Recomendação:** Rodar `eslint --fix` após correção da configuração

---

### 15. Inline Styles vs Tailwind
**Padrão:** Alguns componentes misturam abordagens  
**Recomendação:** Consistência com Tailwind, evitar inline styles

---

## ✅ Pontos Positivos

### Arquitetura & Organização
- ✅ **Multi-tenancy bem implementado** com `org_id` em todas as tabelas
- ✅ **RLS policies otimizadas** com `SELECT auth.uid()` caching
- ✅ **JWT custom claims** via hook `custom_access_token_hook`
- ✅ **Workflow state machine** robusto com `patientPipeline.ts`
- ✅ **Separação clara** entre stores, components e lib

### Segurança
- ✅ **Storage privado** para fotos de pacientes (signed URLs)
- ✅ **Constant-time comparison** em webhooks (`constantTimeEquals`)
- ✅ **Gate SC-12** em trigger PostgreSQL (SECURITY DEFINER)
- ✅ **AUI validation** antes de upload de fotos

### Performance
- ✅ **Query optimization** com RLS caching
- ✅ **Lazy loading** de componentes pesados via roteamento
- ✅ **Pagination** implementada em listas

### Código
- ✅ **TypeScript strict mode** habilitado
- ✅ **Zero any types** detectados
- ✅ **Zod validation** em formulários
- ✅ **61 testes unitários** passando

---

## 📊 Matriz de Severidade

| Categoria | CRÍTICO | ALTO | MÉDIO | BAIXO |
|-----------|---------|------|-------|-------|
| Segurança | 2 | 1 | 1 | 0 |
| Performance | 0 | 0 | 2 | 1 |
| Bugs Lógicos | 1 | 1 | 0 | 0 |
| Arquitetura | 0 | 1 | 1 | 1 |
| Testes | 0 | 0 | 1 | 1 |
| Código | 0 | 1 | 2 | 1 |
| **Total** | **3** | **4** | **7** | **4** |

---

## 🎯 Plano de Ação Recomendado

### Sprint 1 (Semana 1-2) - CRÍTICO
1. [ ] Unificar escalão SPE-M (frontend e trigger)
2. [ ] Sanitizar filtros SQL em patientStore
3. [ ] Restrict CORS headers nas Edge Functions

### Sprint 2 (Semana 3-4) - ALTO
4. [ ] Implementar rate limiting
5. [ ] Verificar timestamp em webhooks Stripe
6. [ ] Integrar API Claude real ou desativar feature
7. [ ] Melhorar logging de erros

### Sprint 3 (Semana 5-6) - MÉDIO
8. [ ] Adicionar testes de integração
9. [ ] Implementar memoização em PatientDetail
10. [ ] Melhorar estratégia de identificação de telefone

---

## 🔐 Checklist de Segurança

- [x] RLS habilitado em todas as tabelas
- [x] Storage policies configuradas
- [x] JWT claims para multi-tenancy
- [x] HTTPS em todas as comunicações
- [x] Service keys apenas em Edge Functions
- [ ] Rate limiting implementado
- [ ] Input sanitization completo
- [ ] Penetration testing realizado

---

## 📈 Métricas de Qualidade

| Métrica | Valor | Status |
|---------|-------|--------|
| Testes passando | 61/61 | ✅ |
| Type errors | 0 | ✅ |
| ESLint errors | 1 (config) | ⚠️ |
| Acessibilidade | N/A | ❓ |
| Cobertura de testes | ~15% | ❌ |

---

**Conclusão:** O projeto tem uma base sólida com boas práticas de segurança e arquitetura. Os problemas críticos são pontuais e facilmente corrigíveis. A principal preocupação é a divergência de escalão SPE-M e a falta de rate limiting em APIs públicas.

---
*Gerado em 27/04/2026 - SPE-M Code Review*
