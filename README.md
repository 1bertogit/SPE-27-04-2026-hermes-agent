# SPE-M -- Sistema de Planejamento e Avaliacao Cirurgica

Plataforma web medica para avaliacao pre-operatoria estruturada com score de precisao em tempo real. Desenvolvida para profissionais de saude que necessitam conduzir avaliacoes clinicas sistematizadas em 5 etapas, gerenciar prontuarios de pacientes, registrar fotos clinicas com anotacoes, acompanhar metricas de desempenho, comunicar-se com pacientes via WhatsApp em pos-operatorio e gerenciar indicações de pacientes satisfeitos.

---

## Stack Tecnologica

| Camada | Tecnologia |
|---|---|
| Framework | React 18 + TypeScript + Vite 5 |
| Estilizacao | Tailwind CSS 3 (design system editorial com dark mode) |
| Componentes UI | Radix UI (Dialog, Tabs, Accordion, Select, Tooltip, Popover, Progress, Radio Group, Dropdown Menu) |
| Icones | Lucide React |
| Gerenciamento de Estado | Zustand 5 (12 stores: auth, patient, evaluation, checklist, document, surgical, appointment, preopExam, survey, alert, theme, ui) |
| Formularios | React Hook Form + Zod 4 |
| Graficos | Recharts 3 |
| Backend | Supabase (PostgreSQL + Auth + Storage) |
| Manipulacao de Datas | date-fns (pt-BR) |
| Roteamento | React Router DOM 7 |
| Testes | Vitest (61 testes: keywordCheck, patientPipeline, NPSAnalyzer) |
| Hooks | Husky pre-commit (typecheck + test) |

---

## Inicio Rapido

```bash
npm install
```

Requer as variaveis de ambiente `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` configuradas no arquivo `.env`.

---

## Funcionalidades Principais

### Score SPE-M -- Avaliacao em 5 Etapas

Wizard guiado com 22 criterios clinicos distribuidos em 5 etapas. Pontuacao maxima: **64 pontos**.

| Etapa | Criterios | Pts Max | Descricao |
|---|---|---|---|---|
| 1. Anamnese | 5 | 14 | Queixa principal, historico cirurgico, comorbidades, medicamentos, alergias |
| 2. Exame Fisico | 5 | 14 | Estado geral, IMC, qualidade da pele, simetria, cicatrizacao |
| 3. Classificacao de Risco | 4 | 13 | ASA, Mallampati, risco tromboembolico, risco cardiaco (Goldman) |
| 4. Planejamento Cirurgico | 4 | 12 | Complexidade, tempo estimado, tipo de anestesia, expectativas |
| 5. Revisao Final | 4 | 11 | Exames laboratoriais, consentimento, preparo pre-op, decisao final |

**Classificacao de risco por score:**

| Score | Nivel | Cor |
|---|---|---|
| >= 80% | Risco Baixo / Apto | Verde |
| >= 60% | Risco Moderado / Avaliar | Ambar |
| >= 40% | Risco Alto / Cautela | Laranja |
| < 40% | Risco Muito Alto / Contraindicado | Vermelho |

O sidebar lateral exibe em tempo real: score total com indicador circular SVG, nivel de risco com cor contextual e breakdown por etapa com barras de progresso individuais.

### Fotos Clinicas com Anotacao

- 5 viewports anatomicos: Frontal, Lateral Esquerda/Direita, Obliqua Esquerda/Direita
- Upload com drag-and-drop ou clique por viewport
- Canvas HTML5 com ferramentas de desenho: caneta (4 cores), borracha, 3 larguras de linha
- Undo/Redo com historico completo e limpar tudo
- Anotacoes persistidas como JSON (tipo, cor, largura, pontos)
- Armazenamento via Supabase Storage (bucket `patient-photos`)
- **Gate AUI:** upload bloqueado sem Autorizacao de Uso de Imagem assinada

### Canvas Anatomico

Disponivel na etapa de Classificacao de Risco do wizard:
- Desenho sobre diagrama corporal (cabeca, torso, membros)
- Ferramentas: caneta, borracha, 5 cores, 3 larguras
- Undo/Redo completo e responsivo ao container

### Alertas WhatsApp Pos-operatorios (Fase 3)

Pipeline de comunicacao automatica com pacientes em pos-operatorio via WhatsApp:

- **Edge Functions deployed:** `send-whatsapp` (envio outbound), `webhook-whatsapp` (entregas + msgs inbound), `process-alerts` (cron 15min)
- **Bridge Baileys** (repo separado `spe-m-whatsapp-bridge`) com chip dedicado e endpoint `POST /send`
- **Autenticacao do webhook:** `Authorization: Bearer WEBHOOK_SHARED_SECRET` com constant-time compare e fail-closed
- **`pg_cron` rodando a cada 15min** scaneia pacientes em `pos_op_ativo` e cria alertas pendentes deduplicados por `patient_id:template_name`
- **Keyword check clinico:** 25+ palavras-chave (`sangramento`, `febre`, `hematoma`, etc.) em mensagens inbound disparam alerta critico ao medico
- **Politica de migracao Baileys → 360dialog** documentada em `docs/whatsapp-architecture-decision.md` (gatilhos: 2º tenant, ≥300 msgs/dia, ban do chip)

### Autenticacao

- Email/senha via Supabase Auth (sem magic links)
- Registro com validacao de senha forte (8+ chars, 1 maiuscula, 1 numero)
- Indicador visual de forca da senha (4 niveis)
- Recuperacao de senha por email
- Rotas protegidas com redirect automatico
- Perfil criado automaticamente via trigger no banco

### AI + Skills (Fase 4)

Sistema de agentes autonomos para automatizacao clinica:

- **MessageAgent:** gera mensagens de acompanhamento personalizadas
- **ResponseAnalyzer:** classifica sentimento, urgencia e intencao em respostas de pacientes
- **DocumentGenerator:** gera TCIs (Termos de Consentimento Informado) personalizados
- **HarnessRunner:** orquestrador com 8 fases fixas (imutaveis)
- **agent_logs:** tabela de auditoria imutavel (apenas INSERT)
- **Interface Skills:** aba "AI Skills" na Settings para criar/testar skills customizadas
- **Edge Function `process-agent`:** executa agentes via pg_cron ou manual

### NPS e Referrals (Fase 5)

Sistema de satisfacao e indicação ativa:

- **Formulario NPS digital:** pagina publica `/nps-survey?token=XXX` (token seguro)
- **NPSAnalyzer:** calcula score (-100 a +100), categoriza promotores/passivos/detratores
- **Protocolo de indicação ativa:** NPS ≥ 9 cria referral automaticamente
- **Tabela referrals:** rastreamento de indicações com status (pendente, contatado, agendado, convertido, nao_convertido)
- **Dashboard NPS:** 4 cards de metricas (NPS, taxa conversão, total indicações, resposta rate)
- **WhatsApp integration:** link de survey enviado automaticamente em pos-operatorio

### Billing (Fase 6)

Sistema de cobrança integrado:

- **Stripe:** 3 planos (Starter, Professional, Enterprise)
- **Precos:** R$97/mês (Starter), R$297/mês (Professional), R$697/mês (Enterprise)
- **Overage:** R$15 por procedimento extra (alem dos incluidos no plano)
- **Trial 14 dias:** sem cartao de credito, acesso completo
- **Landing page publica:** `/pricing` com toggle mensal/anual (-17%)
- **Aba Billing na Settings:** gestao de assinatura, faturas, upgrade/downgrade
- **Edge Functions:** `stripe-checkout` (cria sessao), `stripe-webhook` (processa eventos)

---

## Telas

| Rota | Descricao |
|---|---|
| `/login` | Autenticacao com layout split-screen (branding + stats a esquerda, formulario a direita) |
| `/register` | Cadastro com nome, email, CRM, senha com indicador de forca |
| `/forgot-password` | Recuperacao de senha com confirmacao visual |
| `/onboarding` | Criacao de organizacao (clinica) apos primeiro login |
| `/dashboard` | 4 metricas (pacientes, avaliacoes, pendentes, score medio), tabela de recentes, grafico de distribuicao |
| `/patients` | Lista paginada (10/pg) com busca por nome/CPF, filtro por classificacao, ordenacao |
| `/patients/new` | Cadastro com 4 secoes: dados pessoais, contato, endereco (27 estados BR), historico medico |
| `/patients/:id` | Detalhe com `StatusActions` (stepper do pipeline + botoes de avanco) acima de 8 tabs (Visao Geral, Avaliacoes, Agendamentos, Documentos, Checklists, Exames, Cirurgias, NPS) |
| `/patients/:id/edit` | Edicao do prontuario existente |
| `/evaluations` | Lista centralizada de todas as avaliacoes com status e scores |
| `/evaluations/new` | Wizard 5 etapas com score em tempo real e canvas anatomico |
| `/evaluations/:id` | Retomada de avaliacao em andamento |
| `/photos` | 5 viewports de upload com ferramentas de anotacao em canvas |
| `/analytics` | 4 graficos: linha (avaliacoes/mes), pizza (distribuicao), barras (scores/criterio), cards de metricas |
| `/settings` | 5 tabs: Perfil, Clinica, Membros, Telegram, AI Skills, Billing |
| `/help` | FAQ em accordion pesquisavel (6 secoes) + contato de suporte |
| `/reference` | Cartao de referencia rapida com protocolo completo (10 fases) e keywords criticas para WhatsApp |
| `/pricing` | Landing page publica com planos Stripe (trial 14 dias) |
| `/nps-survey` | Formulario NPS publico (acesso via token) |
| `/referrals` | Gestao de indicações de pacientes |

---

## Banco de Dados - Arquitetura Multi-tenancy

**16 tabelas** com Row Level Security ativo em todas (organizacoes + dados + alertas):

| Tabela | Descricao | Politica RLS |
|---|---|---|
| `organizations` | Clinicas/unidades (nome, CNPJ, timezone) | Usuario le/edita apenas se org_id = current_org_id() |
| `profiles` | Perfil do profissional com org_id + role | CRUD restrito ao seu org_id |
| `patients` | Prontuarios com `workflow_status` (12 estados) | CRUD restrito ao seu org_id |
| `evaluations` | Avaliacoes SPE-M com score | CRUD restrito ao seu org_id |
| `evaluation_criteria` | Respostas individuais por criterio | CRUD restrito ao seu org_id |
| `patient_photos` | Fotos com anotacoes JSONB | CRUD restrito ao seu org_id |
| `patient_documents` | TCIs, contratos, protocolos | CRUD restrito ao seu org_id |
| `checklists` | Liberacao cirurgica, OMS, alta anestesica | CRUD restrito ao seu org_id |
| `checklist_items` | Itens individuais de checklists | CRUD restrito ao seu org_id |
| `patient_appointments` | Agendamentos pre/pos operatorios | CRUD restrito ao seu org_id |
| `preop_exams` | Exames solicitados e resultados | CRUD restrito ao seu org_id |
| `surgical_records` | Registro de cirurgias (tecnica, tempo, complicacoes) | CRUD restrito ao seu org_id |
| `implant_records` | Implantes cirurgicos (volume, lote, lado) | CRUD restrito ao seu org_id |
| `satisfaction_surveys` | NPS e feedback pos-operatorio | CRUD restrito ao seu org_id |
| `alert_definitions` | Templates de alertas WhatsApp (Fase 3) | CRUD restrito ao seu org_id |
| `alert_logs` | Audit log de envios/recebimentos WhatsApp (Fase 3) | CRUD restrito ao seu org_id |

**Workflow States (Pipeline SC-04, forward-only):** `lead` → `consulta_agendada` → `consulta_realizada` → `decidiu_operar` → `pre_operatorio` → `cirurgia_agendada` → `cirurgia_realizada` → `pos_op_ativo` → `longo_prazo` → `encerrado`. Terminais: `cancelado`, `nao_convertido`.

**Gate clinico SC-12:** trigger SQL `check_spem_gate_on_patients` (`SECURITY DEFINER`) bloqueia transicao para `cirurgia_agendada` se a ultima avaliacao SPE-M concluida tem ratio `(total_score / max_score) < 0.6` (60%). A mensagem do erro carrega o percentual exato e e re-exibida pelo frontend num alert persistente.

**Storage:** Bucket `patient-photos` privado com signed URLs, path filtrado por org_id.

**Helper Functions:**
- `current_org_id()` — extrai org_id do JWT
- `current_app_role()` — extrai role (admin/doctor/reception) do JWT

**JWT Custom Hook:** `public.custom_access_token_hook` (`SECURITY DEFINER`) injeta org_id e role em app_metadata.

---

## Gerenciamento de Estado (Zustand)

| Store | Responsabilidade |
|---|---|
| `authStore` | Sessao, orgId, role (admin/doctor/reception), perfil, login/registro/logout, reset de senha, gestao de membros da org |
| `patientStore` | CRUD de pacientes com org_id, paginacao, filtros, `advanceWorkflow()` com SC-04 via `canTransition()` |
| `evaluationStore` | CRUD de avaliacoes com org_id, respostas por criterio, navegacao do wizard, calculo de score |
| `checklistStore` | CRUD de checklists (liberacao, OMS, alta) com org_id, gerencia de itens |
| `documentStore` | CRUD de documentos (TCIs, contratos) com org_id, `hasSignedAUI()` para gate de fotos |
| `surgicalStore` | CRUD de registros cirurgicos e implantes com org_id |
| `appointmentStore` | CRUD de agendamentos pre/pos operatorios com org_id, geracao de rotina pos-op |
| `preopExamStore` | CRUD de exames pre-operatorios com org_id, templates por procedimento |
| `surveyStore` | CRUD de pesquisas de satisfacao NPS com org_id |
| `alertStore` | CRUD de definicoes de alertas e logs WhatsApp com org_id (Fase 3) |
| `telegramStore` | Configuracao de alertas Telegram (bot token, chat id, tipos de alerta) |
| `aiAgentStore` | Gestao de skills AI, execucoes de agentes, metricas de uso |
| `npsStore` | Gestao de surveys NPS, referrals, metricas NPS |
| `billingStore` | Gestao de assinatura Stripe, planos, faturas, checkout |
| `themeStore` | Alternancia light/dark, persistencia em localStorage, respeita `prefers-color-scheme` |
| `uiStore` | Sidebar, toasts (auto-dismiss 4s com animacao de saida) |

---

## Harness e System Constraints

O projeto adota um harness minimo que separa **intencao**, **execucao** e **qualidade**:

| Camada | Tooling | Bloqueia commit? |
|---|---|---|
| Type safety | `tsc --noEmit -p tsconfig.app.json` | Sim, via husky pre-commit |
| Testes unitarios | Vitest (61 specs em `src/lib/**/*.test.ts`) | Sim, via husky pre-commit |
| Lint | ESLint v9 | Nao (informativo) |
| Constraints clinicos | `SYSTEM_CONSTRAINTS.md` (SC-01 a SC-13) | Enforcement no DB via triggers SQL |

**Constraints versionados:**
- **SC-04** — workflow forward-only (sem retorno). Validado em `patientPipeline.ts:canTransition()` e CHECK constraint no DB.
- **SC-12** — SPE-M score ≥ 60% antes de `cirurgia_agendada`. Enforcement via trigger; frontend re-exibe mensagem do Postgres.
- **SC-13** — `cirurgia_realizada` requer Sign Out do CIO assinado.

---

## Scripts

```bash
npm run dev        # Servidor de desenvolvimento (Vite)
npm run build      # Build de producao
npm run preview    # Preview do build local
npm run lint       # ESLint
npm run typecheck  # Verificacao de tipos TypeScript
npm test           # Vitest (61 testes)
```

---

## Fluxo de Onboarding Multi-tenancy

1. Usuario se registra via `/register` com email, nome, CRM e senha.
2. Apos login (sem org_id), redireciona para `/onboarding`.
3. Preenche nome da clinica e chama Edge Function `complete-onboarding` (deploy com `--no-verify-jwt`).
4. Edge function cria `organizations`, atualiza `profiles` com org_id + role='admin'.
5. Frontend chama `supabase.auth.refreshSession()` para recarregar JWT com org_id + role.
6. Guard verifica orgId e redireciona para `/dashboard`.

**Setup Manual Necessario:**
Registre o JWT hook no Dashboard Supabase:
- Auth → Hooks → Add → Custom Access Token
- Schema: `public` (Supabase hospedado bloqueia escrita no schema `auth`)
- Function: `custom_access_token_hook` (`SECURITY DEFINER`)

---

## Setup Manual em Novo Ambiente — Fase 3 (Alertas WhatsApp)

### 1. Habilitar extensoes Postgres

Dashboard Supabase → **Database → Extensions**:
- `pg_cron` (agendamento)
- `pg_net` (HTTP client)

### 2. Criar secret no Supabase Vault

```sql
SELECT vault.create_secret(
  'SUA_SERVICE_ROLE_KEY',
  'pg_cron_service_role_key',
  'Service role JWT usado pelo pg_cron para chamar Edge Functions'
);
```

> O nome deve ser exatamente `pg_cron_service_role_key`.

### 3. Configurar secret nas Edge Functions

```bash
npx supabase secrets set WHATSAPP_BRIDGE_URL="https://SEU_DOMINIO_OU_NGROK/send"
npx supabase secrets set STRIPE_SECRET_KEY="sk_live_..."
npx supabase secrets set STRIPE_WEBHOOK_SECRET="whsec_..."
```

### 4. Configurar o WhatsApp Bridge

No repo `spe-m-whatsapp-bridge/`, `.env`:

```
PORT=3002
SPEM_WEBHOOK_URL=https://SEU_PROJETO.supabase.co/functions/v1/webhook-whatsapp
SPEM_SERVICE_KEY=SUA_SERVICE_ROLE_KEY
```

Iniciar: `npm run dev`, escanear QR em `http://localhost:3002/qr`.

### 5. Validar setup

```sql
SELECT extname FROM pg_extension WHERE extname IN ('pg_cron', 'pg_net');
SELECT name FROM vault.secrets WHERE name = 'pg_cron_service_role_key';
SELECT jobname, schedule, active FROM cron.job WHERE jobname = 'process-alerts-every-15min';
```

---

## Palavras-chave Criticas para WhatsApp

A pagina `/reference` exibe 25+ palavras-chave que ativam alerta clinico:

**Frases:** "não consigo fechar o olho", "inchaço muito grande", "abriu a cirurgia", "perdendo sensação", "febre alta", "dor forte"

**Palavras:** sangramento, sangrando, hematoma, secreção, paralisia, sangue, febre, pus, abertura, hemorragia, desmaio, convulsão, infecção, necrose, cianose, isquemia, choque, taquicardia, falta de ar, taquipneia, pele azulada, hipotensão, edema agudo

---

## Idioma

Toda a interface esta em **Portugues Brasileiro (pt-BR)**.

---

## Status das Fases

| Fase | Status | Descricao |
|---|---|---|
| 1 — Core | ✅ COMPLETA | Auth + multi-tenancy, CRUD pacientes, pipeline 12 estados, dashboard |
| 2 — Documentos | ✅ COMPLETA | Ficha SPE-M, checklists, documentos, fotos (AUI gate), exames, implantes |
| 3 — Alertas WhatsApp | ✅ COMPLETA | Edge Functions, Bridge Baileys, pg_cron, Vault, keyword check (25+ keywords) |
| 4 — AI + Skills | ✅ COMPLETA | MessageAgent, ResponseAnalyzer, DocumentGenerator, HarnessRunner, agent_logs |
| 5 — NPS e Referrals | ✅ COMPLETA | Formulario NPS, NPSAnalyzer, referrals, dashboard KPIs |
| 6 — Billing | ✅ COMPLETA | Stripe (3 planos + overage), trial 14 dias, landing page `/pricing` |

---

## Branches Git

- `main` — codigo estavel
- `feature/fase-4-ai-skills` — Fase 4 AI (mergeada)
- `feature/fase-5-nps` — Fase 5 NPS (mergeada)
- `feature/fase-6-billing` — Fase 6 Billing (mergeada)

---

## Documentacao Adicional

- `CLAUDE.md` — Regras de arquitetura, coding standards, setup tecnico
- `CODE_REVIEW_REPORT.md` — Relatorio de revisao de codigo (issues, recomendacoes)
- `docs/whatsapp-architecture-decision.md` — Decisao de arquitetura WhatsApp
- `SYSTEM_CONSTRAINTS.md` — Constraints clinicas (SC-01 a SC-13)

---

*Projeto 100% funcional — 27/04/2026*
