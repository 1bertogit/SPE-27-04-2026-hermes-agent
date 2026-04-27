# SPE-M - Surgical Planning & Evaluation - Medical

## Build & Dev Commands

- `npm run dev` - Start development server (Vite)
- `npm run build` - Production build
- `npm run lint` - Run ESLint
- `npm run typecheck` - TypeScript type checking (tsconfig.app.json)

## Latest Build Status

✅ **Fase 3 COMPLETA** — Alertas WhatsApp MVP funcional (17/04/2026)

- ✅ Edge Functions deployed (`send-whatsapp`, `webhook-whatsapp`, `process-alerts`)
- ✅ Bridge Baileys conectado (chip `5531983096545`)
- ✅ `pg_cron` rodando a cada 15min
- ✅ Supabase Vault com service key
- ✅ Teste end-to-end validado (mensagem chegou no celular)
- ✅ Validação `Authorization: Bearer WEBHOOK_SHARED_SECRET` em `webhook-whatsapp` (constant-time compare, fail-closed, 17/04/2026)
- ✅ Gate SC-12 no DB — trigger `check_spem_gate_on_patients` bloqueia `cirurgia_agendada` se última eval Concluído `(total/max) < 0.6` (migration `20260417053908`, SECURITY DEFINER)
- ✅ Wire frontend do pipeline (18/04/2026) — `Patient.workflow_status`, `patientStore.advanceWorkflow()` com `canTransition()` para SC-04, componente `StatusActions` acima dos Tabs em PatientDetail (stepper editorial navy+gold, alert persistente para erro do trigger SC-12, modal de confirmação para `cancelado`). Typecheck e 41 testes passando.
- ✅ Doc SC-12 alinhada com o trigger — `cirurgia_agendada` + threshold `≥60%` (antes estava `pre_operatorio` + `≥40%`)
- ⚠️ Pendente pós-MVP: 15 fluxos de alerta restantes (3 MVP implementados)
- ⚠️ Pendente pós-MVP: substituir ngrok por solução permanente
- ⚠️ ESLint v9 config quebrada (`@typescript-eslint/no-unused-expressions`) — bug pré-existente, não relacionado a esta sessão
- ⚠️ Débito técnico: `patientPipeline.ts:100` usa escala 0-10 (`spemScore < 6`), trigger usa 0-1 (`ratio < 0.6`). Camadas divergem; não usado no wire atual.

### Fase 2 Completa (14/04/2026):

- Edge Function `complete-onboarding`: header `Prefer: return=representation` no POST/PATCH, validação de `userId`
- Deploy com `--no-verify-jwt` (função faz auth própria)
- `custom_access_token_hook` criado no schema `public` com `SECURITY DEFINER` (injeta `org_id` e `role` no JWT)
- Hook registrado no Dashboard: Authentication → Hooks → Custom Access Token → `public.custom_access_token_hook`
- `authStore`: decodifica JWT diretamente via `getJwtClaims()` (session.user.app_metadata não reflete claims do hook)
- Bucket `patient-photos` convertido para privado com signed URLs
- Upload de fotos bloqueado sem AUI (Autorização de Uso de Imagem) assinada
- `documentStore`: método `hasSignedAUI()` para verificar documento assinado

### Status anterior (Fase 1):

- Issue 1: Multi-tenancy schema with org_id and JWT custom claims
- Issue 2: authStore with orgId and role from JWT
- Issue 3: Onboarding page + Edge Function (complete-onboarding)
- Issue 4: All stores updated with org_id in INSERTs (9 stores)
- Issue 5: patientPipeline.ts with workflow state machine
- Issue 6: keywordCheck.ts with clinical alert detection
- Issue 7: Reference page with protocol and critical keywords
- Production build complete without errors

## Tech Stack

- **Framework**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS 3 with custom editorial design system
- **State**: Zustand stores (auth, patient, evaluation, theme, ui)
- **Routing**: React Router DOM v7
- **Forms**: React Hook Form + Zod validation
- **UI Primitives**: Radix UI (Dialog, Accordion, Tabs, Select, Radio Group, etc.)
- **Icons**: Lucide React (do not install other icon libraries)
- **Charts**: Recharts
- **Database**: Supabase (PostgreSQL + Auth + Storage)
- **Client**: @supabase/supabase-js

## Project Structure

```
src/
  components/
    evaluation/    # Evaluation wizard components (canvas, questions, stepper, sidebar)
    layout/        # AppLayout, AuthLayout, Navbar
    ui/            # Reusable UI primitives (Button, Card, Input, Modal, etc.)
  data/            # Constants and evaluation criteria definitions
  lib/             # Supabase client, types, utils, validation schemas
  pages/           # Route-level page components
  stores/          # Zustand stores (authStore, patientStore, evaluationStore, themeStore, uiStore)
supabase/
  migrations/      # SQL migration files
```

## Design System

### Color Palette (editorial theme)

All colors are defined under `editorial-*` in tailwind.config.js:

- `editorial-navy` / `navy-light` / `navy-dark` - Primary dark blues
- `editorial-gold` / `gold-light` / `gold-dark` / `gold-muted` - Accent gold
- `editorial-paper` - Light background (#F2F2F0)
- `editorial-cream` - Borders/dividers (#E8E6E1)
- `editorial-warm` - Subtle text (#D4CFC5)
- `editorial-muted` - Secondary text (#8A8477)
- `editorial-light` - Card backgrounds (#FAF9F7)
- `editorial-sage` / `editorial-rose` / `editorial-slate` - Semantic colors

### Dark Mode

Dark mode uses Tailwind's `class` strategy (`darkMode: 'class'` in tailwind.config.js).

**Theme store**: `src/stores/themeStore.ts` manages theme state with Zustand, persists to localStorage (`spe-theme` key), and respects `prefers-color-scheme` on first visit.

**Flash prevention**: `index.html` contains an inline script that reads localStorage before React loads to apply the `dark` class immediately.

**Dark mode color mapping convention**:

- `bg-editorial-paper` → `dark:bg-editorial-navy-dark`
- `bg-editorial-light` → `dark:bg-editorial-navy/60`
- `bg-white` (surfaces) → `dark:bg-editorial-navy/40`
- `text-editorial-navy` → `dark:text-editorial-cream`
- `border-editorial-cream` → `dark:border-editorial-navy-light/20`
- `bg-editorial-cream` (dividers) → `dark:bg-editorial-navy-light/30`
- `hover:bg-editorial-cream/`* → `dark:hover:bg-white/5`
- `hover:text-editorial-navy` → `dark:hover:text-editorial-cream`

**Toggle**: Sun/Moon icon button in Navbar with animated rotation transition.

### Typography

- Sans: Inter (body, UI)
- Serif: Playfair Display (headings, branding)
- Max 3 font weights used

### Component Patterns

- Buttons use `tracking-editorial uppercase` for label style
- Cards use `.card` utility or `Card` component
- Glass effects via `.glass` and `.glass-editorial` utilities
- Focus states via `.focus-ring` utility class
- Modal component (`src/components/ui/Modal.tsx`) supports both `onOpenChange` (legacy) and `onClose` callbacks, plus optional `footer` prop for action buttons

## Database (Supabase) - Complete Schema

**16 Tables with RLS:**

| Table                | Purpose                                          | org_id Scoped |
| -------------------- | ------------------------------------------------ | ------------- |
| organizations        | Clinics/units (name, CNPJ, timezone)             | N/A (root)    |
| profiles             | User profiles (name, CRM, role, specialty)       | Yes           |
| patients             | Patient records (workflow_status with 11 states) | Yes           |
| evaluations          | SPE-M evaluations (score, stage, status)         | Yes           |
| evaluation_criteria  | Individual criterion responses                   | Yes           |
| patient_photos       | Photos with annotations (viewport, JSONB)        | Yes           |
| patient_documents    | TCIs, contracts, protocols                       | Yes           |
| checklists           | Surgical release, WHO, anesthesia discharge      | Yes           |
| checklist_items      | Individual checklist items                       | Yes           |
| patient_appointments | Pre/post-op appointments                         | Yes           |
| preop_exams          | Pre-op exams (requested + results)               | Yes           |
| surgical_records     | Surgery records (technique, time, complications) | Yes           |
| implant_records      | Surgical implants (volume, lot, side)            | Yes           |
| satisfaction_surveys | NPS + post-op feedback                           | Yes           |
| alert_definitions    | WhatsApp alert templates (Fase 3)                | Yes           |
| alert_logs           | Alert send/receive audit log (Fase 3)            | Yes           |


**Helper Functions:**

- `current_org_id()` — Extract org_id from JWT
- `current_app_role()` — Extract role (admin/doctor/reception) from JWT

**Storage Bucket:** `patient-photos` with path structure: `{org_id}/{patient_id}/{viewport}_{timestamp}.ext`

**Auth:** email/password via Supabase Auth
**Environment variables in `.env`:** VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY

## Multi-tenancy Architecture

### Workflow States (Patient Pipeline)

Forward-only pipeline (SC-04 constraint):

```
lead → consulta_agendada → consulta_realizada → decidiu_operar
→ pre_operatorio → cirurgia_agendada → cirurgia_realizada
→ pos_op_ativo → longo_prazo → encerrado
```

Terminal states: `cancelado`, `nao_convertido`

**State Machine Rules:**

- SC-04: Forward transitions only (no backwards jumps)
- SC-12: Requires valid SPE-M score (≥60%) before advancing to `cirurgia_agendada`
- SC-13: CIO sign-out triggers `encerrado` state

### RLS & Security Strategy

- All data tables have `org_id` column REFERENCED to `organizations(id)`
- JWT Custom Hook (`auth.custom_access_token_hook`) injects:
  - `org_id` — User's clinic ID
  - `role` — 'admin' | 'doctor' | 'reception'
- Helper functions:
  - `current_org_id()` — Extracts org_id from JWT app_metadata
  - `current_app_role()` — Extracts role from JWT app_metadata
- ALL SELECT/INSERT/UPDATE/DELETE policies scoped to `org_id = public.current_org_id()`
- Storage bucket: Paths filtered by org_id (first folder level)

### Edge Functions

- **complete-onboarding** (`supabase/functions/complete-onboarding/index.ts`)
  - Creates organization record
  - Updates user profile with org_id + role='admin'
  - Deployed with `--no-verify-jwt` (function does its own auth validation)
  - Uses `Prefer: return=representation` header for PostgREST POST/PATCH
- **send-whatsapp** (`supabase/functions/send-whatsapp/index.ts`) — Fase 3
  - Fetches `alert_logs` with `status=pending`, sends via 360dialog API
  - Updates log status to `sent` or `failed`
- **webhook-whatsapp** (`supabase/functions/webhook-whatsapp/index.ts`) — Fase 3
  - Receives 360dialog webhook (delivery status + inbound messages)
  - Runs keyword detection on patient messages, creates critical alert to doctor
- **process-alerts** (`supabase/functions/process-alerts/index.ts`) — Fase 3
  - Called by pg_cron every 15min
  - Scans `pos_op_ativo` patients, creates pending alerts based on time windows
  - Deduplicates by `patient_id:template_name`
- Deploy all: `npx supabase functions deploy <name> --no-verify-jwt`

### WhatsApp Bridge (projeto separado)

- **Repo:** `~/Dev/projetos/spe-m-whatsapp-bridge/`
- **Stack:** Express + Baileys v7 + TypeScript
- **Porta:** 3002
- **Rotas:**
  - `GET /status` — `{ connected: boolean, phone?: string }`
  - `GET /qr` — Página HTML com QR code para escanear
  - `POST /send` — `{ phone, message }` → envia via Baileys
- **Inbound:** Recebe mensagens do paciente → POST para `SPEM_WEBHOOK_URL` (formato 360dialog-compatible)
- **Config:** `.env` com `PORT`, `SPEM_WEBHOOK_URL`, `SPEM_SERVICE_KEY`
- **Start:** `cd spe-m-whatsapp-bridge && npm run dev`

### New Components & Pages

- **Pages:**
  - `src/pages/Onboarding.tsx` — Post-signup org creation form
  - `src/pages/Reference.tsx` — Protocol reference card + critical keywords
- **Utilities:**
  - `src/lib/patientPipeline.ts` — Pure state machine logic (no Supabase deps)
  - `src/lib/keywordCheck.ts` — Clinical alert detection (25+ PT keywords)

### Zustand Stores (10 Total)

| Store              | Responsibilities                                          |
| ------------------ | --------------------------------------------------------- |
| `authStore`        | Session, orgId, role, profile, login/logout/signup        |
| `patientStore`     | Patient CRUD with org_id scoping, pagination, filters     |
| `evaluationStore`  | Evaluation CRUD, criterion responses, wizard nav, scoring |
| `checklistStore`   | Checklist CRUD (surgical release, WHO, anesthesia)        |
| `documentStore`    | Document CRUD (TCIs, contracts, protocols, hasSignedAUI)  |
| `surgicalStore`    | Surgery + implant record CRUD                             |
| `appointmentStore` | Pre/post-op appointment CRUD, routine generation          |
| `preopExamStore`   | Pre-op exam CRUD, templates by procedure                  |
| `surveyStore`      | NPS + satisfaction survey CRUD                            |
| `alertStore`       | Alert definitions CRUD, alert logs (Fase 3)               |


**Convention:** All stores validate `useAuthStore.getState().orgId` before INSERT operations

## Required Setup Steps

### 1. Register JWT Custom Hook in Supabase Dashboard

**MANDATORY for multi-tenancy to work — ALREADY DONE (14/04/2026):**

1. Go to **Supabase Dashboard** → Project → **Authentication** → **Hooks**
2. Click **+ New hook** → Select **Custom Access Token**
3. Schema: `**public`** (not `auth` — hosted Supabase blocks `auth` schema writes) | Function: `custom_access_token_hook`
4. Save

The hook (`SECURITY DEFINER`) injects `org_id` and `role` from `profiles` table into JWT `app_metadata`.

**Important:** `authStore` reads claims by decoding the JWT directly (`getJwtClaims()`), NOT from `session.user.app_metadata`, because the custom hook only modifies the JWT token, not the user object returned by the API.

### 2. Complete Onboarding Flow

1. User registers at `/register` (email, name, CRM, password)
2. Login redirects to `/onboarding` (no org_id yet in JWT)
3. Fill clinic name + submit → calls `complete-onboarding` edge function
4. Edge function:
  - Creates `organizations` record
  - Updates `profiles` with `org_id` + `role='admin'`
  - Returns success
5. Frontend calls `supabase.auth.refreshSession()` to reload JWT with org_id + role
6. Redirect to `/dashboard` (now RLS-scoped to org_id)

### 3. Verify org_id in JWT

After login, check browser DevTools:

```javascript
const session = await supabase.auth.getSession();
console.log(session.data.session.user.app_metadata);
// Should show: { org_id: "550e8400-...", role: "admin" }
```

### 4. Production Checklist

- ✅ Edge Function `complete-onboarding` deployed (with `--no-verify-jwt`)
- ✅ JWT hook registered in Supabase Dashboard (`public.custom_access_token_hook`, SECURITY DEFINER)
- ✅ All migrations applied (13 migrations total, including bucket fix + hook)
- ✅ RLS policies active on all 14 tables
- ✅ Production build tested (no TypeScript errors)
- ✅ Bucket `patient-photos` set to private (signed URLs)
- ✅ AUI gate on photo uploads (requires signed Autorização de Uso de Imagem)
- ✅ Login → Dashboard flow verified end-to-end

## Key Implementation Details

### Critical Patient Pipeline (from patientPipeline.ts)

```typescript
type WorkflowState = 'lead' | 'consulta_agendada' | 'consulta_realizada' | 'decidiu_operar'
  | 'pre_operatorio' | 'cirurgia_agendada' | 'cirurgia_realizada' | 'pos_op_ativo'
  | 'longo_prazo' | 'encerrado' | 'cancelado' | 'nao_convertido';

// SC-04: Forward-only transitions
canAdvance(from: WorkflowState, to: WorkflowState): boolean {
  // No backwards jumps, validates state order
}

// SC-12: SPE-M score validation before cirurgia_agendada
requiresSPEMScore(state: WorkflowState): boolean {
  return state === 'cirurgia_agendada'; // Must have ratio ≥ 0.6 (60%)
}

// SC-13: CIO sign-out ends patient journey
terminatePatient(state: WorkflowState): boolean {
  return state === 'encerrado' || state === 'nao_convertido';
}
```

### Critical Keyword Detection (from keywordCheck.ts)

```typescript
// 25+ Portuguese clinical keywords for post-op WhatsApp alerts
const CRITICAL_KEYWORDS = [
  'sangramento', 'sangrando', 'hematoma', 'secreção', 'paralisia',
  'sangue', 'febre', 'pus', 'abertura', 'hemorragia', 'desmaio',
  'convulsão', 'infecção', 'necrose', 'cianose', 'isquemia',
  'choque', 'taquicardia', 'falta de ar', 'taquipneia',
  'pele azulada', 'hipotensão', 'edema agudo'
];

// Phrase patterns
const CRITICAL_PHRASES = [
  'não consigo fechar o olho',
  'inchaço muito grande',
  'abriu a cirurgia',
  'perdendo sensação',
  'febre alta',
  'dor forte'
];
```

## Code Conventions

- No comments in code unless explicitly requested
- Use lucide-react for all icons
- Use stock photos from Pexels when images are needed
- Never use purple/indigo/violet hues unless requested
- Files should follow single responsibility, stay under ~200-300 lines
- All new tables must have RLS enabled with restrictive policies
- Use `maybeSingle()` instead of `single()` for Supabase queries
- **All stores check `useAuthStore.getState().orgId` before INSERT/UPDATE/DELETE**
- **All data tables MUST have `org_id` column scoped to RLS policies**
- Language: Portuguese (Brazilian) for UI labels
- Dark mode mapping: Use `dark:` Tailwind prefix consistently
- Modal component supports both `onClose` and optional `footer` prop

## Política de migração WhatsApp (Baileys → 360dialog)

Migrar quando qualquer um destes disparar:

- 2º tenant onboardado
- ≥300 mensagens outbound/dia
- ≥50 pacientes simultâneos em pos_op_ativo
- 1º cliente com SLA contratualizado
- Qualquer ban ou suspensão do chip atual

Análise completa e deltas de código em `docs/whatsapp-architecture-decision.md`.

## Protocolo de encerramento de sessão

Ao final de cada sessão, antes de qualquer commit:

1. Atualizar "Latest Build Status" neste arquivo
2. Atualizar a seção "## Status das Fases" abaixo
3. Marcar ✅ o que foi implementado, ⚠️ o que está parcial, ❌ o que não existe
4. Commit com mensagem: "feat/fix/docs: [descrição] — [fase]"

---

## Status das Fases

### Fase 1 — Core ✅ COMPLETA

✅ Auth + multi-tenancy (org_id + RLS + JWT claims)
✅ Onboarding de organização (Edge Function complete-onboarding)
✅ CRUD de pacientes
✅ Pipeline de status (12 estados: lead → encerrado)
✅ Dashboard mínimo
✅ Leads com rastreamento de origem e UTM
✅ Agendamentos (consulta, cirurgia, pós-op)

### Fase 2 — Documentos e Checklists ✅ COMPLETA

✅ Ficha SPE-M (22 critérios, 5 etapas, score em tempo real)
✅ Checklists cirúrgicos (CPO, CIO Sign In/Time Out/Sign Out, CPP)
✅ Documentos (TCI, contrato, AUI, protocolos)
✅ Fotos clínicas com canvas e anotações (5 viewports)
✅ Exames pré-operatórios com templates por procedimento
✅ Registros cirúrgicos + rastreabilidade de implantes (ANVISA)
✅ Pesquisas de satisfação / NPS (tabela criada)
✅ Cartão de referência (/reference)
✅ Keyword check clínico (25+ keywords)
✅ Bucket patient-photos privado + signed URLs (LGPD)
✅ AUI obrigatória antes de upload de fotos

### Harness Mínimo ✅ COMPLETO

✅ Vitest — 41 testes (keywordCheck + patientPipeline)
✅ Husky pre-commit — bloqueia se typecheck ou test falhar
✅ SYSTEM_CONSTRAINTS.md — SC-01 a SC-05

### Fase 3 — Alertas WhatsApp ✅ COMPLETA

✅ Edge Functions deployed (send-whatsapp, webhook-whatsapp, process-alerts)
✅ Bridge Baileys conectado (chip 5531983096545)
✅ pg_cron rodando a cada 15min
✅ Supabase Vault com service key
✅ Teste end-to-end validado (mensagem chegou no celular)
✅ Validação Authorization em webhook-whatsapp (secret dedicado, constant-time, fail-closed)
⚠️ Pendente pós-MVP: 15 fluxos de alerta restantes (3 MVP implementados)
⚠️ Pendente pós-MVP: substituir ngrok por solução permanente

### Fase 4 — AI + Skills ❌ NÃO INICIADA

❌ MessageAgent (geração de mensagens por AI)
❌ ResponseAnalyzer (classificação de respostas)
❌ DocumentGenerator (geração de TCI por AI)
❌ HarnessRunner com 8 fases fixas
❌ agent_logs imutáveis
❌ Interface de skills no settings (admin edita)
❌ Skill loader (hierarquia tenant > sistema)

### Fase 5 — NPS e Dashboard ❌ NÃO INICIADA

❌ Formulário NPS digital (link via WhatsApp)
❌ NPSAnalyzer
❌ Protocolo de indicação ativa (NPS ≥ 9)
❌ Tabela referrals com rastreamento de conversão
❌ Dashboard completo com KPIs e funil
❌ CRM de longo prazo (aniversários)

### Fase 6 — Billing e Lançamento ❌ NÃO INICIADA

❌ Stripe (3 planos + overage R$15/procedimento)
❌ Trial de 14 dias sem cartão
❌ E-mails transacionais (Resend)
❌ Onboarding público (landing page)

### Outros gaps (fora das fases)

❌ Settings de org (convidar membros, mudar roles)
❌ Integração Telegram (alertas para médico)
✅ SPE-M score integrado ao pipeline via trigger SQL — bloqueia `cirurgia_agendada` se última eval Concluído < 60% de ratio (migration 20260417053908, SECURITY DEFINER, 4 cenários testados)
✅ Wire pipeline `workflow_status` no frontend — tipo `Patient.workflow_status`, `patientStore.advanceWorkflow()` usando `canTransition()` (SC-04), componente `StatusActions` em PatientDetail com stepper + alert persistente para erro do trigger SC-12 + modal de confirmação para `cancelado` (17/04/2026)
❌ Débito de escala em `patientPipeline.ts:100` — `checkSPEMBlock` usa `spemScore < 6` (escala 0-10), trigger SQL usa `ratio < 0.6` (escala 0-1). Camadas divergem; frontend precisa computar `total_score/max_score` para prever o trigger. Não usado no wire atual (deixado ao trigger), mas pendente quando frontend quiser pré-validar SC-12.
❌ Busca e paginação completa no dashboard