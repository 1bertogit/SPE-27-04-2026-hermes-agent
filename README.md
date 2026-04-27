# SPE-M -- Sistema de Planejamento e Avaliacao Cirurgica

Plataforma web medica para avaliacao pre-operatoria estruturada com score de precisao em tempo real. Desenvolvida para profissionais de saude que necessitam conduzir avaliacoes clinicas sistematizadas em 5 etapas, gerenciar prontuarios de pacientes, registrar fotos clinicas com anotacoes e acompanhar metricas de desempenho.

---

## Stack Tecnologica

| Camada | Tecnologia |
|---|---|
| Framework | React 18 + TypeScript + Vite 5 |
| Estilizacao | Tailwind CSS 3 (design system editorial com dark mode) |
| Componentes UI | Radix UI (Dialog, Tabs, Accordion, Select, Tooltip, Popover, Progress, Radio Group, Dropdown Menu) |
| Icones | Lucide React |
| Gerenciamento de Estado | Zustand 5 (5 stores: auth, patient, evaluation, theme, ui) |
| Formularios | React Hook Form + Zod 4 |
| Graficos | Recharts 3 |
| Backend | Supabase (PostgreSQL + Auth + Storage) |
| Manipulacao de Datas | date-fns (pt-BR) |
| Roteamento | React Router DOM 7 |

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
|---|---|---|---|
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

### Canvas Anatomico

Disponivel na etapa de Classificacao de Risco do wizard:
- Desenho sobre diagrama corporal (cabeca, torso, membros)
- Ferramentas: caneta, borracha, 5 cores, 3 larguras
- Undo/Redo completo e responsivo ao container

### Autenticacao

- Email/senha via Supabase Auth (sem magic links)
- Registro com validacao de senha forte (8+ chars, 1 maiuscula, 1 numero)
- Indicador visual de forca da senha (4 niveis)
- Recuperacao de senha por email
- Rotas protegidas com redirect automatico
- Perfil criado automaticamente via trigger no banco

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
| `/patients/:id` | Detalhe com tabs (Visao Geral + Historico de avaliacoes), acoes rapidas |
| `/patients/:id/edit` | Edicao do prontuario existente |
| `/evaluations` | Lista centralizada de todas as avaliacoes com status e scores |
| `/evaluations/new` | Wizard 5 etapas com score em tempo real e canvas anatomico |
| `/evaluations/:id` | Retomada de avaliacao em andamento |
| `/photos` | 5 viewports de upload com ferramentas de anotacao em canvas |
| `/analytics` | 4 graficos: linha (avaliacoes/mes), pizza (distribuicao), barras (scores/criterio), cards de metricas |
| `/settings` | Tabs: Perfil (nome, CRM, especialidade, telefone) e Clinica (nome, endereco) |
| `/help` | FAQ em accordion pesquisavel (6 secoes) + contato de suporte |
| `/reference` | Cartao de referencia rapida com protocolo completo (10 fases) e keywords criticas para WhatsApp |

---

## Banco de Dados - Arquitetura Multi-tenancy

12 tabelas com Row Level Security ativo em todas (organizacoes + dados):

| Tabela | Descricao | Politica RLS |
|---|---|---|
| `organizations` | Clinicas/unidades (nome, CNPJ, timezone) | Usuario le/edita apenas se org_id = current_org_id() |
| `profiles` | Perfil do profissional com org_id + role | CRUD restrito ao seu org_id |
| `patients` | Prontuarios com status de workflow (11 estados) | CRUD restrito ao seu org_id |
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

**Workflow States:** `lead` → `consulta_agendada` → `consulta_realizada` → `decidiu_operar` → `pre_operatorio` → `cirurgia_agendada` → `cirurgia_realizada` → `pos_op_ativo` → `longo_prazo` → `encerrado` (com terminais: `cancelado`, `nao_convertido`)

**Storage:** Bucket `patient-photos` com path filtrado por org_id (primeiro nivel de pasta)

**Funcoes Helper:**
- `current_org_id()` — extrai org_id do JWT
- `current_app_role()` — extrai role (admin/doctor/reception) do JWT

**JWT Custom Hook:** `auth.custom_access_token_hook` injeta org_id e role em app_metadata

**Indexes:** `org_id`, `user_id`, `patient_id`, `status`, `classification`, `created_at DESC` em tabelas relevantes.

---

## Gerenciamento de Estado (Zustand)

| Store | Responsabilidade |
|---|---|
| `authStore` | Sessao, orgId, role (admin/doctor/reception), perfil, login/registro/logout, reset de senha |
| `patientStore` | CRUD de pacientes com org_id, paginacao, filtros (busca, classificacao, status, ordenacao) |
| `evaluationStore` | CRUD de avaliacoes com org_id, respostas por criterio, navegacao do wizard, calculo de score |
| `checklistStore` | CRUD de checklists (liberacao, OMS, alta) com org_id, gerencia de itens |
| `documentStore` | CRUD de documentos (TCIs, contratos) com org_id |
| `surgicalStore` | CRUD de registros cirurgicos e implantes com org_id |
| `appointmentStore` | CRUD de agendamentos pre/pos operatorios com org_id, geracao de rotina pos-op |
| `preopExamStore` | CRUD de exames pre-operatorios com org_id, templates por procedimento |
| `surveyStore` | CRUD de pesquisas de satisfacao NPS com org_id |
| `themeStore` | Alternancia light/dark, persistencia em localStorage, respeita `prefers-color-scheme` |
| `uiStore` | Sidebar, toasts (auto-dismiss 4s com animacao de saida) |

---

## Validacao (Zod)

| Schema | Campos Validados |
|---|---|
| `loginSchema` | Email, senha (min 6) |
| `registerSchema` | Nome, email, CRM, senha forte (8+ chars, maiuscula, numero), confirmacao |
| `forgotPasswordSchema` | Email |
| `patientSchema` | Nome, CPF (11-14 chars), nascimento, genero, telefone, email, endereco, classificacao (I-IV), historico medico |
| `profileSchema` | Nome, CRM, especialidade, telefone, dados da clinica |

---

## Estrutura do Projeto

```
src/
├── components/
│   ├── evaluation/
│   │   ├── AnatomicalCanvas.tsx    # Canvas HTML5 com diagrama corporal
│   │   ├── CriterionQuestion.tsx   # Radio group por criterio
│   │   ├── EvalScoreSidebar.tsx    # Score em tempo real + breakdown
│   │   └── EvalStepper.tsx         # Indicador visual de etapas
│   ├── layout/
│   │   ├── AppLayout.tsx           # Layout principal com Navbar + Outlet
│   │   ├── AuthLayout.tsx          # Layout split-screen para login/registro
│   │   └── Navbar.tsx              # Navegacao responsiva + dropdown de perfil + theme toggle
│   └── ui/
│       ├── Avatar.tsx              # Imagem ou iniciais (sm/md/lg/xl)
│       ├── Badge.tsx               # 5 variantes (success/warning/error/info/neutral)
│       ├── Button.tsx              # 5 variantes + loading spinner
│       ├── Card.tsx                # Container com header/title/description
│       ├── EmptyState.tsx          # Estado vazio com icone e CTA
│       ├── Input.tsx               # Input, Textarea, Select com validacao
│       ├── Modal.tsx               # Dialog Radix com backdrop blur
│       ├── Skeleton.tsx            # Card/Table/Page skeletons com pulse
│       └── Toast.tsx               # Notificacoes com auto-dismiss
├── data/
│   ├── constants.ts                # Estados brasileiros, especialidades medicas
│   └── evaluationCriteria.ts       # 22 criterios em 5 etapas (config completa)
├── lib/
│   ├── supabase.ts                 # Cliente Supabase (singleton)
│   ├── types.ts                    # Interfaces TypeScript (Profile, Patient, Evaluation, etc.)
│   ├── utils.ts                    # Formatacao (data, CPF, telefone), cores por score/status
│   └── validation.ts              # Schemas Zod (login, registro, paciente, perfil)
├── pages/                          # 13 paginas (uma por rota)
├── stores/                         # 5 Zustand stores
├── index.css                       # Design system editorial (dark mode, scrollbar, focus ring, glass)
├── main.tsx                        # Entry point
└── App.tsx                         # Rotas protegidas/publicas

supabase/
├── migrations/                     # 11 migracoes SQL
│   ├── create_profiles_table.sql
│   ├── create_patients_table.sql
│   ├── create_evaluations_table.sql
│   ├── create_patient_photos_table.sql
│   ├── add_evaluation_criteria_unique_constraint.sql
│   ├── create_patient_photos_storage_bucket.sql
│   ├── add_procedures_and_clinical_workflow.sql
│   ├── add_foreign_key_indexes.sql
│   ├── optimize_rls_policies.sql
│   ├── add_leads_and_bioestimuladores.sql
│   └── add_organizations_multitenant.sql
└── functions/
    └── complete-onboarding/
        └── index.ts                # Edge Function para criar organizacao e injetar JWT
```

---

## Design System Editorial

### Paleta de Cores

| Token | Valor | Uso |
|---|---|---|
| `editorial-navy` | `#1A2B48` | Texto principal, superficies dark |
| `editorial-navy-light` | `#2A3F62` | Bordas e destaques dark |
| `editorial-navy-dark` | `#111D33` | Background dark mode |
| `editorial-gold` | `#C5A059` | Cor de destaque primaria |
| `editorial-gold-light` | `#D4B574` | Hover/accent gold |
| `editorial-gold-dark` | `#A8873D` | Texto sobre fundo gold |
| `editorial-paper` | `#F2F2F0` | Background principal light |
| `editorial-cream` | `#E8E6E1` | Bordas e divisores |
| `editorial-warm` | `#D4CFC5` | Texto sutil |
| `editorial-muted` | `#8A8477` | Texto secundario |
| `editorial-light` | `#FAF9F7` | Superficie de cards |
| `editorial-sage` | `#6B7F6B` | Semantica: sucesso/aprovado |
| `editorial-rose` | `#9B4D4D` | Semantica: erro/risco |
| `editorial-slate` | `#3D5A80` | Semantica: informacao |

### Tipografia

| Fonte | Uso | Pesos |
|---|---|---|
| Inter | Corpo, UI, labels | 300, 400, 500, 600, 700 |
| Playfair Display | Headings, branding | 400, 500, 600, 700 |

### Dark Mode

- Estrategia: classe CSS (`darkMode: 'class'`)
- Persistencia: localStorage (`spe-theme`)
- Fallback: respeita `prefers-color-scheme` na primeira visita
- Flash prevention: script inline no `<head>` aplica a classe antes do React carregar
- Toggle: botao Sun/Moon na Navbar com transicao animada

### Utilitarios CSS

| Classe | Descricao |
|---|---|
| `.card` | Superficie de card com borda e sombra (light/dark) |
| `.glass` | Efeito vidro com backdrop-blur |
| `.glass-editorial` | Vidro com toque dourado na borda |
| `.focus-ring` | Anel de foco acessivel (gold) |
| `.editorial-grid` | Grid decorativo de fundo |

### Animacoes

| Nome | Duracao | Descricao |
|---|---|---|
| `fade-in` | 0.4s | Aparecimento gradual |
| `slide-up` | 0.4s | Entrada de baixo para cima |
| `slide-down` | 0.4s | Entrada de cima para baixo |
| `pulse-slow` | 3s | Pulso lento ciclico |

---

## Scripts

```bash
npm run dev        # Servidor de desenvolvimento (Vite)
npm run build      # Build de producao
npm run preview    # Preview do build local
npm run lint       # ESLint
npm run typecheck  # Verificacao de tipos TypeScript
```

---

## Fluxo de Onboarding Multi-tenancy

### 1. Novo Registro
Usuario se registra via `/register` com email, nome, CRM e senha.

### 2. Redirect para Onboarding
Apos login (com session mas sem org_id), guard em App.tsx redireciona para `/onboarding`.

### 3. Criacao de Organizacao
Usuario preenche nome da clinica e chama Edge Function `complete-onboarding` que:
- Valida JWT do usuario
- Cria registro em tabela `organizations`
- Atualiza `profiles` com org_id e role='admin'
- Retorna sucesso

### 4. JWT Refresh
Frontend chama `supabase.auth.refreshSession()` para recarregar JWT com org_id + role injetados.

### 5. Acesso ao Dashboard
Guard verifica se orgId existe e redireciona para `/dashboard`.

### 6. RLS Automatico
Todas as queries ficam automaticamente filtradas por org_id via funcao `current_org_id()` do banco.

**Setup Manual Necessario:**
Registre o JWT hook no Dashboard Supabase:
- Auth → Hooks → Add → Custom Access Token
- Function: `auth.custom_access_token_hook`
- Save

---

## Setup Manual em Novo Ambiente — Fase 3 (Alertas WhatsApp)

A migration `20260417050001_vault_service_role_secret.sql` esta **gitignored** (contem a service role key hardcoded). Ao configurar um novo ambiente do zero, os passos abaixo sao obrigatorios:

### 1. Habilitar extensoes Postgres

Dashboard Supabase → **Database → Extensions**, habilitar:
- `pg_cron` (agendamento de jobs)
- `pg_net` (HTTP client no banco)

### 2. Criar o secret no Supabase Vault

SQL Editor do Supabase, rodar uma vez:

```sql
SELECT vault.create_secret(
  'SUA_SERVICE_ROLE_KEY',
  'pg_cron_service_role_key',
  'Service role JWT usado pelo pg_cron para chamar Edge Functions'
);
```

> **Importante:** o nome do secret deve ser exatamente `pg_cron_service_role_key` — as migrations que agendam o cron referenciam esse nome via `vault.decrypted_secrets WHERE name = 'pg_cron_service_role_key'`. Alterar o nome quebra a autenticacao do cron silenciosamente.

A service role key esta em Supabase Dashboard → Settings → API → `service_role`.

### 3. Configurar secret `WHATSAPP_BRIDGE_URL` nas Edge Functions

```bash
npx supabase secrets set WHATSAPP_BRIDGE_URL="https://SEU_DOMINIO_OU_NGROK/send"
```

A URL deve apontar para o endpoint `POST /send` do `spe-m-whatsapp-bridge` (repo separado).

### 4. Configurar o WhatsApp Bridge

No repo `spe-m-whatsapp-bridge/`, arquivo `.env`:

```
PORT=3002
SPEM_WEBHOOK_URL=https://SEU_PROJETO.supabase.co/functions/v1/webhook-whatsapp
SPEM_SERVICE_KEY=SUA_SERVICE_ROLE_KEY
```

Iniciar bridge (`npm run dev`), escanear QR em `http://localhost:3002/qr` com chip WhatsApp dedicado, e expor via ngrok ou tunnel permanente.

### 5. Validar setup

```sql
-- Verificar extensoes
SELECT extname FROM pg_extension WHERE extname IN ('pg_cron', 'pg_net');

-- Verificar secret
SELECT name FROM vault.secrets WHERE name = 'pg_cron_service_role_key';

-- Verificar cron job
SELECT jobname, schedule, active FROM cron.job WHERE jobname = 'process-alerts-every-15min';
```

---

## Palavras-chave Criticas para WhatsApp

A pagina `/reference` exibe 25+ palavras-chave que ativam alerta clinico em mensagens de pacientes pos-operatorios:

**Frases:**
- "não consigo fechar o olho", "inchaço muito grande", "abriu a cirurgia", "perdendo sensação", "febre alta", "dor forte"

**Palavras:**
- sangramento, sangrando, hematoma, secreção, paralisia, sangue, febre, pus, abertura, hemorragia, desmaio, convulsão, infecção, necrose, cianose, isquemia, choque, taquicardia, falta de ar, taquipneia, pele azulada, hipotensão, edema agudo

## Idioma

Toda a interface esta em **Portugues Brasileiro (pt-BR)**, incluindo labels de formularios, mensagens de erro, nomes de etapas, tooltips e textos de ajuda. Formatacoes de data, CPF e telefone seguem o padrao brasileiro.
