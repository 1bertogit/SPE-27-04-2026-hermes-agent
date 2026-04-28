-- Fase 4: metadados de skills e seed dos protocolos clinicos convertidos de DOCX.

BEGIN;

ALTER TABLE public.ai_skills
  ADD COLUMN IF NOT EXISTS skill_version TEXT NOT NULL DEFAULT '1.0',
  ADD COLUMN IF NOT EXISTS procedure_scope TEXT NOT NULL DEFAULT 'all',
  ADD COLUMN IF NOT EXISTS task TEXT,
  ADD COLUMN IF NOT EXISTS content_markdown TEXT,
  ADD COLUMN IF NOT EXISTS source_kind TEXT NOT NULL DEFAULT 'manual';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ai_skills_source_kind_check'
      AND conrelid = 'public.ai_skills'::regclass
  ) THEN
    ALTER TABLE public.ai_skills
      ADD CONSTRAINT ai_skills_source_kind_check
      CHECK (source_kind IN ('system_seed', 'tenant_override', 'manual', 'imported_docx'));
  END IF;
END $$;

UPDATE public.ai_skills
SET source_kind = CASE
  WHEN is_system = true THEN 'system_seed'
  WHEN org_id IS NOT NULL THEN 'tenant_override'
  ELSE source_kind
END
WHERE source_kind = 'manual';

CREATE UNIQUE INDEX IF NOT EXISTS idx_ai_skills_system_slug
  ON public.ai_skills (slug)
  WHERE is_system = true;

CREATE INDEX IF NOT EXISTS idx_ai_skills_active_agent_slug
  ON public.ai_skills (agent_type, slug)
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_ai_skills_procedure_scope
  ON public.ai_skills (procedure_scope);

INSERT INTO public.ai_skills (
  is_system,
  name,
  slug,
  description,
  skill_version,
  procedure_scope,
  task,
  source_kind,
  agent_type,
  system_prompt,
  user_prompt_template,
  content_markdown,
  model_config,
  available_tools,
  priority
)
SELECT
  true,
  'Protocolo Operacional',
  'protocolo_operacional',
  'Orientar o MessageAgent no fluxo operacional padrão da clínica',
  '1.0',
  'all',
  'Orientar o MessageAgent no fluxo operacional padrão da clínica',
  'imported_docx',
  'MessageAgent',
  'Voce e o MessageAgent do SPE-M usando a skill protocolo_operacional.
Use o conteudo em content_markdown como fonte clinica/operacional primaria.
Nao invente orientacoes, riscos, documentos ou prazos que nao estejam no protocolo.
Gere mensagens em portugues do Brasil, com tom profissional, claro e empatico.',
  'Gere uma mensagem usando a skill protocolo_operacional.
Tipo de mensagem: {{message_type}}.
Paciente: {{patient_name}}.
Etapa do workflow: {{workflow_stage}}.
Procedimento: {{procedure_type}}.
Contexto adicional: {{context}}.',
  '# skill: protocolo_operacional
# version: 1.0
# procedure_scope: all
# task: Orientar o MessageAgent no fluxo operacional padrão da clínica

## Conteúdo

| MODERN FACE INSTITUTE<br>CRM-[UF]: _______________ \| Tel: _______________ |
| --- |

| PROTOCOLO OPERACIONAL — FLUXO DE DOCUMENTOS<br>Cod: POD-MFI-01 \| Versao: 1.0 \| Data de aprovacao: ___/___/______ |
| --- |

Este protocolo define, para cada fase da jornada do paciente no Modern Face Institute, quais documentos devem ser utilizados, por qual profissional, em qual momento e como devem ser arquivados. O cumprimento deste protocolo e obrigatorio para todos os membros da equipe.

| Azul: Acao do medico | Cinza: Acao da recepcao | CRITICO: Item nao pode ser pulado |
| --- | --- | --- |

| Fase | Titulo e Timing | Documentos | Arquivamento |
| --- | --- | --- | --- |
| 01<br>RECEPCAO | CAPTACAO E PRIMEIRO CONTATO<br>Antes de agendar a consulta<br>Atencao: Agendar consulta somente apos qualificacao minima: procedimento, historico cirurgico e prazo desejado. | FPC-MFI-01<br>Ficha de Pre-Cadastro<br>Recepcao: Preencher no primeiro contato (WhatsApp, telefone, Instagram DM) | Arquivo:<br>CRM ou planilha de leads com campo de origem (UTM/canal) obrigatorio |
| 02<br>MEDICO | CONSULTA MEDICA<br>Durante a consulta<br>Atencao: TCI deve ser especifico para o procedimento discutido. Nunca usar TCI generico para todos os procedimentos. | FSPE-EM-01 / FAV-XX-01<br>Ficha de Avaliacao Pre-Operatoria<br>Medico: Preencher durante o exame fisico — especifica por procedimento<br>TCI-[XX]-01 CRITICO<br>Termo de Consentimento Informado<br>Medico + Recepcao: Medico explica, paciente assina. Especifico por procedimento.<br>AUI-MFI-01<br>Autorizacao de Uso de Imagem<br>Recepcao: Entregar junto ao TCI — assinada na mesma consulta | Arquivo:<br>Prontuario eletronico — TCI e AUI digitalizados e anexados no mesmo dia da consulta |
| 03<br>RECEPCAO | DECISAO DE OPERAR / AGENDAMENTO CIRURGICO<br>Quando o paciente confirma a data da cirurgia<br>Atencao: Data cirurgica bloqueada somente apos confirmacao de pagamento ou aprovacao de financiamento. | CPS-MFI-01 CRITICO<br>Contrato de Prestacao de Servicos<br>Recepcao: Assinar antes de bloquear a data cirurgica<br>PPO-[XX]-01<br>Guia de Preparo Pre-Operatorio<br>Recepcao: Entregar impresso ao paciente — ele leva para casa | Arquivo:<br>Contrato: 2 vias — uma no prontuario e uma com o paciente. PPO: via unica para o paciente. |
| 04<br>RECEPCAO | 48 HORAS ANTES — CONFIRMACAO FINAL<br>2 dias antes da cirurgia<br>Nota: Se exame pendente ou resultado alterado: acionar o medico imediatamente para decisao de adiar ou prosseguir. | —<br>Ligacao de confirmacao (sem documento especifico)<br>Recepcao: Verificar: jejum, exames prontos, saude geral, acompanhante confirmado, pagamento | Arquivo:<br>Registro da ligacao no prontuario: data, hora, resultado e pendencias identificadas |
| 05<br>MEDICO + RECEPCAO | DIA DA CIRURGIA — CHECK-IN<br>Na chegada do paciente ao centro cirurgico<br>Atencao: Qualquer item critico (marcado em vermelho) pendente no checklist = cirurgia adiada. Sem excecoes. | CPO-[XX]-01 CRITICO<br>Checklist Pre-Operatorio<br>Recepcao + Medico: Verificar todos os itens na chegada do paciente — antes de qualquer procedimento<br>TCI-[XX]-01 CRITICO<br>TCI (conferencia)<br>Medico: Confirmar no prontuario que esta assinado e arquivado | Arquivo:<br>Checklist assinado + copia dos exames do dia arquivados no prontuario |
| 06<br>MEDICO | PROCEDIMENTO CIRURGICO<br>Em sala cirurgica<br>Atencao: Sign In, Time Out e Sign Out sao obrigatorios e devem ser feitos com toda a equipe — sem excecao. | CIO-[XX]-01 CRITICO<br>Checklist Intraoperatorio<br>Medico + Equipe cirurgica: Preencher em tempo real — Sign In antes da anestesia, Time Out antes da incisao, Sign Out antes do fechamento | Arquivo:<br>Checklist + relatorio cirurgico completo no prontuario no mesmo dia da cirurgia |
| 07<br>MEDICO + RECEPCAO | ALTA HOSPITALAR<br>Antes do paciente sair do centro cirurgico<br>Atencao: Paciente nao pode receber alta sem acompanhante adulto. Retorno de 24–48h deve estar agendado antes de sair. | PPO-[XX]-01<br>Guia de Preparo (orientacoes de alta)<br>Medico: Revisar sinais de alerta, medicacao e cuidados com paciente E acompanhante<br>CPP-[XX]-01 CRITICO<br>Checklist Pos-Operatorio (agendar 1o retorno)<br>Recepcao: Agendar retorno de 24–48h antes do paciente sair | Arquivo:<br>Registro de alta no prontuario: hora, condicao clinica, medicacao prescrita, data do proximo retorno |
| 08<br>MEDICO | POS-OPERATORIO — RETORNOS<br>24–48h / 7 dias / 30 dias<br>Nota: Contato ativo da clinica nos dias 2, 7 e 30 via WhatsApp: registrar resposta do paciente no prontuario. | CPP-[XX]-01<br>Checklist Pos-Operatorio<br>Medico: Preencher uma vez em cada consulta de retorno — fases I, II, III conforme janela temporal | Arquivo:<br>Uma linha de evolucao no prontuario por retorno: data, achados clinicos, conduta e data do proximo retorno |
| 09<br>MEDICO + RECEPCAO | RETORNO DE 3 A 6 MESES — NPS E IMAGEM<br>Entre 3 e 6 meses pos-operatorio<br>Nota: Momento ideal para o protocolo de indicacao ativa: paciente no pico de satisfacao com resultado consolidado. | NPS-MFI-01<br>Pesquisa de Satisfacao NPS<br>Recepcao: Entregar na chegada ao retorno — recolher antes do paciente sair<br>AUI-MFI-01<br>Autorizacao de Uso de Imagem (resultado)<br>Medico + Recepcao: Solicitar autorizacao especifica para fotos de resultado e depoimento | Arquivo:<br>NPS: banco de dados (planilha ou CRM) com data e procedimento. Fotos: pasta do paciente com data e versao |
| 10<br>MEDICO | FECHAMENTO DO CASO — 12 MESES<br>Retorno de 12 meses<br>Nota: Ativar CRM de retencao: aniversario do paciente, aniversario da cirurgia (12 meses), comunicacoes sobre novos procedimentos. | CPP-[XX]-01<br>Checklist Pos-Operatorio (retorno final)<br>Medico: Registrar resultado definitivo, fotos finais e fechamento formal do caso | Arquivo:<br>Prontuario: evolucao final marcada como ''Caso encerrado — XX/XX/XXXX''. Fotos finais arquivadas. |

| LEGENDA DE CODIGOS DE DOCUMENTOS |
| --- |

| Codigo | Documento | Arquivo |
| --- | --- | --- |
| FPC-MFI-01 | Ficha de Pre-Cadastro | MFI_06_Ficha_Precadastro.docx |
| TCI-EM-01 | TCI — Endomidface / Brow Lift | MFI_01_Endomidface_BrowLift.docx |
| TCI-DN-01 | TCI — Deep Neck | MFI_02_DeepNeck.docx |
| TCI-DP-01 | TCI — Deep Plane | MFI_03_DeepPlane.docx |
| FSPE-EM-01 | Ficha SPE-M — Endomidface / Brow Lift | MFI_01_Endomidface_BrowLift.docx |
| FAV-DN-01 | Ficha de Avaliacao — Deep Neck | MFI_02_DeepNeck.docx |
| FAV-DP-01 | Ficha de Avaliacao — Deep Plane | MFI_03_DeepPlane.docx |
| CPO-XX-01 | Checklist Pre-Operatorio (por procedimento) | MFI_01/02/03 — seccao correspondente |
| CIO-XX-01 | Checklist Intraoperatorio (por procedimento) | MFI_01/02/03 — seccao correspondente |
| CPP-XX-01 | Checklist Pos-Operatorio (por procedimento) | MFI_01/02/03 — seccao correspondente |
| CPS-MFI-01 | Contrato de Prestacao de Servicos | MFI_04_Contrato_Prestacao_Servicos.docx |
| AUI-MFI-01 | Autorizacao de Uso de Imagem | MFI_05_Autorizacao_Uso_Imagem.docx |
| PPO-XX-01 | Guia de Preparo Pre-Operatorio (por procedimento) | MFI_07_Preparo_PreOperatorio.docx |
| NPS-MFI-01 | Pesquisa de Satisfacao NPS | MFI_08_Pesquisa_Satisfacao_NPS.docx |

Este protocolo deve ser revisado semestralmente ou sempre que houver alteracao de procedimento, equipe ou ferramenta de prontuario. Versoes anteriores devem ser arquivadas com data de descontinuacao.

| Elaborado por:<br>_______________________________<br>Data: ___/___/______ | Revisado por:<br>_______________________________<br>Data: ___/___/______ | Aprovado por:<br>_______________________________<br>Data: ___/___/______ |
| --- | --- | --- |
',
  '{"model":"claude-sonnet-4-6","temperature":0.45,"max_tokens":2048,"top_p":0.9}'::jsonb,
  ARRAY['send_whatsapp', 'schedule_appointment']::text[],
  20
WHERE NOT EXISTS (
  SELECT 1 FROM public.ai_skills WHERE is_system = true AND slug = 'protocolo_operacional'
);

INSERT INTO public.ai_skills (
  is_system,
  name,
  slug,
  description,
  skill_version,
  procedure_scope,
  task,
  source_kind,
  agent_type,
  system_prompt,
  user_prompt_template,
  content_markdown,
  model_config,
  available_tools,
  priority
)
SELECT
  true,
  'Ficha de Pre-cadastro',
  'ficha_precadastro',
  'Apoiar mensagens de primeiro contato e coleta de pré-cadastro',
  '1.0',
  'all',
  'Apoiar mensagens de primeiro contato e coleta de pré-cadastro',
  'imported_docx',
  'MessageAgent',
  'Voce e o MessageAgent do SPE-M usando a skill ficha_precadastro.
Use o conteudo em content_markdown como fonte clinica/operacional primaria.
Nao invente orientacoes, riscos, documentos ou prazos que nao estejam no protocolo.
Gere mensagens em portugues do Brasil, com tom profissional, claro e empatico.',
  'Gere uma mensagem usando a skill ficha_precadastro.
Tipo de mensagem: {{message_type}}.
Paciente: {{patient_name}}.
Etapa do workflow: {{workflow_stage}}.
Procedimento: {{procedure_type}}.
Contexto adicional: {{context}}.',
  '# skill: ficha_precadastro
# version: 1.0
# procedure_scope: all
# task: Apoiar mensagens de primeiro contato e coleta de pré-cadastro

## Conteúdo

| MODERN FACE INSTITUTE<br>CRM-[UF]: _______________ \| Tel: _______________ \| @modernfaceinstitute |
| --- |

| FICHA DE PRE-CADASTRO — ATENDIMENTO<br>Cod: FPC-MFI-01 \| Versao: 1.0 \| Data: ___/___/______ |
| --- |

| Data: ___/___/______ | Hora: ____________ | Atendente: ______________________ |
| --- | --- | --- |

| I. DADOS PESSOAIS |
| --- |

| Nome completo: _______________________________ | Data de nascimento: _______________________________ |
| --- | --- |
| CPF: _______________________________ | Cidade / Estado: _______________________________ |
| Telefone / WhatsApp: _______________________________ | E-mail: _______________________________ |

| Indicado por (nome): ____________________________ | Profissao: ______________ | Idade: ____ |
| --- | --- | --- |

| II. INTERESSE CLINICO |
| --- |

Procedimento(s) de interesse:

| ☐ | Endomidface |
| --- | --- |
| ☐ | Brow Lift |
| ☐ | Deep Neck (pescoco) |
| ☐ | Deep Plane (lifting facial) |
| ☐ | Rinoplastia |
| ☐ | Outros: ___________________________________________ |

| Ja realizou cirurgia plastica antes?<br>[ ] Nao [ ] Sim — Qual: ________________________ | Tem medico assistente / clinico geral?<br>[ ] Nao [ ] Sim — Nome: ________________________ |
| --- | --- |

Prazo / urgencia desejada:

| ☐ | Sem prazo definido — apenas pesquisando |
| --- | --- |
| ☐ | Dentro de 3 meses |
| ☐ | Entre 3 e 6 meses |
| ☐ | Em mais de 6 meses |
| ☐ | Urgencia (reoperacao ou motivo especifico): __________________________ |

| III. ORIGEM DO CONTATO |
| --- |

Como soube do Modern Face Institute?

| ☐ | Instagram — post organico |
| --- | --- |
| ☐ | Instagram — anuncio pago |
| ☐ | Google — pesquisa organica |
| ☐ | Google — anuncio pago |
| ☐ | Indicacao de paciente — Nome: _________________________________ |
| ☐ | Indicacao de medico / profissional de saude — Nome: _______________ |
| ☐ | YouTube |
| ☐ | Site da clinica |
| ☐ | Outro: _________________________________ |

UTM / campanha (preencher se disponivel — para equipe de marketing):
___________________________________________________________________________

| USO INTERNO — QUALIFICACAO DE LEAD |
| --- |

| Perfil financeiro (uso restrito — nao mostrar ao paciente):<br>[tabela aninhada omitida] | Status do lead:<br>[tabela aninhada omitida] |
| --- | --- |

| Data consulta agendada: ___/___/______ | Horario: _____________ | Responsavel: _______________ |
| --- | --- | --- |

Observacoes:
___________________________________________________________________________
___________________________________________________________________________

| IV. CONSENTIMENTO LGPD |
| --- |

Ao preencher esta ficha, o paciente AUTORIZA o Modern Face Institute a coletar e armazenar os dados fornecidos para fins de agendamento, contato e gestao clinica, conforme a Lei 13.709/2018 (LGPD). Os dados nao serao compartilhados com terceiros sem consentimento. Para revogar ou solicitar exclusao, contate: [e-mail da clinica].

| Assinatura do paciente:<br>_______________________________________ | Data: ___/___/______ |
| --- | --- |
',
  '{"model":"claude-sonnet-4-6","temperature":0.45,"max_tokens":2048,"top_p":0.9}'::jsonb,
  ARRAY['send_whatsapp', 'schedule_appointment']::text[],
  30
WHERE NOT EXISTS (
  SELECT 1 FROM public.ai_skills WHERE is_system = true AND slug = 'ficha_precadastro'
);

INSERT INTO public.ai_skills (
  is_system,
  name,
  slug,
  description,
  skill_version,
  procedure_scope,
  task,
  source_kind,
  agent_type,
  system_prompt,
  user_prompt_template,
  content_markdown,
  model_config,
  available_tools,
  priority
)
SELECT
  true,
  'Preparo Pre-operatorio',
  'preparo_preoperatorio',
  'Gerar orientações de preparo pré-operatório para pacientes',
  '1.0',
  'all',
  'Gerar orientações de preparo pré-operatório para pacientes',
  'imported_docx',
  'MessageAgent',
  'Voce e o MessageAgent do SPE-M usando a skill preparo_preoperatorio.
Use o conteudo em content_markdown como fonte clinica/operacional primaria.
Nao invente orientacoes, riscos, documentos ou prazos que nao estejam no protocolo.
Gere mensagens em portugues do Brasil, com tom profissional, claro e empatico.',
  'Gere uma mensagem usando a skill preparo_preoperatorio.
Tipo de mensagem: {{message_type}}.
Paciente: {{patient_name}}.
Etapa do workflow: {{workflow_stage}}.
Procedimento: {{procedure_type}}.
Contexto adicional: {{context}}.',
  '# skill: preparo_preoperatorio
# version: 1.0
# procedure_scope: all
# task: Gerar orientações de preparo pré-operatório para pacientes

## Conteúdo

| MODERN FACE INSTITUTE<br>CRM-[UF]: _______________ \| Tel: _______________ \| @modernfaceinstitute |
| --- |

| GUIA DE PREPARO PRE-OPERATORIO<br>ENDOMIDFACE / BROW LIFT<br>Cod: PPO-EM-01 \| Modern Face Institute |
| --- |

Este guia foi preparado especialmente para voce. Siga todas as orientacoes com atencao — elas sao fundamentais para a sua seguranca e para o melhor resultado da sua cirurgia.

| MEDICAMENTOS A SUSPENDER |
| --- |

Informe seu cirurgiao sobre TODOS os medicamentos que voce usa antes de suspender qualquer um.

! AAS (Aspirina, Bufferin) — suspender 14 dias antes
! Anticoagulantes (Warfarina, Clexane, Xarelto) — conforme orientacao medica
• Anti-inflamatorios (Ibuprofeno, Diclofenaco, Nimesulida) — suspender 7 dias antes
• Omega-3, Vitamina E, Ginkgo biloba, Alcaçuz — suspender 14 dias antes
• Anticoncepcional oral combinado — discutir com o medico (risco de trombose)

| Em caso de duvida sobre qualquer medicamento, LIGUE para a clinica antes de suspender. Nunca suspenda medicamentos para doencas cronicas (pressao, diabetes) sem orientacao medica. |
| --- |

| TABAGISMO E ALCOOL |
| --- |

! PARAR DE FUMAR pelo menos 30 dias antes e 30 dias apos a cirurgia
O cigarro reduz a circulacao e pode causar necrose da pele, infeccao e cicatriz ruim. Esta e uma das orientacoes mais importantes.

• Evitar bebidas alcoolicas nos 7 dias anteriores a cirurgia

| ALIMENTACAO E JEJUM |
| --- |

| NO DIA ANTERIOR:<br>• Refeicoes leves<br>• Nada muito gorduroso, frituras ou bebidas alcoolicas<br>• Boa noite de sono | DIA DA CIRURGIA — JEJUM OBRIGATORIO:<br>! 8 horas de jejum para alimentos solidos<br>! 6 horas para leite e derivados<br>• Agua ou suco de fruta claro (sem polpa): ate 2 horas antes<br>• Medicamentos de uso continuo: tomar com minimo de agua, conforme orientacao |
| --- | --- |

| CUIDADOS COM O CORPO |
| --- |

• Banho completo e higiene dos cabelos NA MANHA do dia da cirurgia
• Nao use creme, hidratante, maquiagem ou protetor solar no rosto no dia
• Unhas sem esmalte ou gel — o anestesista precisa ver a coloracao das unhas
• Nao use joias, piercings, alianca ou relogio
• Use roupas confortaveis e largas, de preferencia com abertura frontal (camisa)
• Nao use lentes de contato — leve os oculos se necessario
• Lave bem o cabelo — a incisao e feita no couro cabeludo
• Nao use spray, gel ou qualquer produto no cabelo no dia da cirurgia

| O QUE TRAZER NO DIA |
| --- |

• Documento de identidade com foto (RG ou CNH)
• Todos os exames solicitados — impressos ou no celular
• Lista de medicamentos que voce usa
• Roupas confortaveis para a alta
✔ Um acompanhante adulto responsavel — OBRIGATORIO
• Numero de contato do acompanhante anotado

| ACOMPANHANTE OBRIGATORIO: Voce nao podera ir para casa sozinho(a) apos a cirurgia. Providencie um acompanhante adulto que fique com voce pelas primeiras 24 horas. |
| --- |

| LIGUE IMEDIATAMENTE SE... |
| --- |

! Febre acima de 37,8°C nas 24h anteriores a cirurgia
! Qualquer sintoma de gripe, resfriado, infeccao ou herpes
! Menstruacao inesperada (para alguns procedimentos pode afetar o planejamento)
! Qualquer duvida sobre as orientacoes — ligue antes, nao deixe para o dia

| CONTATO DA CLINICA:<br>Tel: _______________________ WhatsApp: _______________________<br>Em caso de emergencia pos-operatoria: ___________________________________ |
| --- |

Paciente: ___________________________________ Data da cirurgia: ___/___/______
Orientacoes fornecidas por: ___________________________ Assinatura: ___________

| MODERN FACE INSTITUTE<br>CRM-[UF]: _______________ \| Tel: _______________ \| @modernfaceinstitute |
| --- |

| GUIA DE PREPARO PRE-OPERATORIO<br>DEEP NECK (Cirurgia do Pescoco)<br>Cod: PPO-DN-01 \| Modern Face Institute |
| --- |

Este guia foi preparado especialmente para voce. Siga todas as orientacoes com atencao — elas sao fundamentais para a sua seguranca e para o melhor resultado da sua cirurgia.

| MEDICAMENTOS A SUSPENDER |
| --- |

Informe seu cirurgiao sobre TODOS os medicamentos que voce usa antes de suspender qualquer um.

! AAS (Aspirina, Bufferin) — suspender 14 dias antes
! Anticoagulantes (Warfarina, Clexane, Xarelto) — conforme orientacao medica
• Anti-inflamatorios (Ibuprofeno, Diclofenaco, Nimesulida) — suspender 7 dias antes
• Omega-3, Vitamina E, Ginkgo biloba, Alcaçuz — suspender 14 dias antes
• Anticoncepcional oral combinado — discutir com o medico (risco de trombose)

| Em caso de duvida sobre qualquer medicamento, LIGUE para a clinica antes de suspender. Nunca suspenda medicamentos para doencas cronicas (pressao, diabetes) sem orientacao medica. |
| --- |

| TABAGISMO E ALCOOL |
| --- |

! PARAR DE FUMAR pelo menos 30 dias antes e 30 dias apos a cirurgia
O cigarro reduz a circulacao e pode causar necrose da pele, infeccao e cicatriz ruim. Esta e uma das orientacoes mais importantes.

• Evitar bebidas alcoolicas nos 7 dias anteriores a cirurgia

| ALIMENTACAO E JEJUM |
| --- |

| NO DIA ANTERIOR:<br>• Refeicoes leves<br>• Nada muito gorduroso, frituras ou bebidas alcoolicas<br>• Boa noite de sono | DIA DA CIRURGIA — JEJUM OBRIGATORIO:<br>! 8 horas de jejum para alimentos solidos<br>! 6 horas para leite e derivados<br>• Agua ou suco de fruta claro (sem polpa): ate 2 horas antes<br>• Medicamentos de uso continuo: tomar com minimo de agua, conforme orientacao |
| --- | --- |

| CUIDADOS COM O CORPO |
| --- |

• Banho completo e higiene dos cabelos NA MANHA do dia da cirurgia
• Nao use creme, hidratante, maquiagem ou protetor solar no rosto no dia
• Unhas sem esmalte ou gel — o anestesista precisa ver a coloracao das unhas
• Nao use joias, piercings, alianca ou relogio
• Use roupas confortaveis e largas, de preferencia com abertura frontal (camisa)
• Nao use lentes de contato — leve os oculos se necessario
• Nao use colar, corrente ou qualquer joia no pescoco
• Evite cremes ou hidratantes no pescoco e queixo no dia da cirurgia
• Prepare o quarto: tenha travesseiros extras para elevar a cabeca durante a recuperacao

| O QUE TRAZER NO DIA |
| --- |

• Documento de identidade com foto (RG ou CNH)
• Todos os exames solicitados — impressos ou no celular
• Lista de medicamentos que voce usa
• Roupas confortaveis para a alta
✔ Um acompanhante adulto responsavel — OBRIGATORIO
• Numero de contato do acompanhante anotado

| ACOMPANHANTE OBRIGATORIO: Voce nao podera ir para casa sozinho(a) apos a cirurgia. Providencie um acompanhante adulto que fique com voce pelas primeiras 24 horas. |
| --- |

| LIGUE IMEDIATAMENTE SE... |
| --- |

! Febre acima de 37,8°C nas 24h anteriores a cirurgia
! Qualquer sintoma de gripe, resfriado, infeccao ou herpes
! Menstruacao inesperada (para alguns procedimentos pode afetar o planejamento)
! Qualquer duvida sobre as orientacoes — ligue antes, nao deixe para o dia

| CONTATO DA CLINICA:<br>Tel: _______________________ WhatsApp: _______________________<br>Em caso de emergencia pos-operatoria: ___________________________________ |
| --- |

Paciente: ___________________________________ Data da cirurgia: ___/___/______
Orientacoes fornecidas por: ___________________________ Assinatura: ___________

| MODERN FACE INSTITUTE<br>CRM-[UF]: _______________ \| Tel: _______________ \| @modernfaceinstitute |
| --- |

| GUIA DE PREPARO PRE-OPERATORIO<br>DEEP PLANE (Lifting Facial)<br>Cod: PPO-DP-01 \| Modern Face Institute |
| --- |

Este guia foi preparado especialmente para voce. Siga todas as orientacoes com atencao — elas sao fundamentais para a sua seguranca e para o melhor resultado da sua cirurgia.

| MEDICAMENTOS A SUSPENDER |
| --- |

Informe seu cirurgiao sobre TODOS os medicamentos que voce usa antes de suspender qualquer um.

! AAS (Aspirina, Bufferin) — suspender 14 dias antes
! Anticoagulantes (Warfarina, Clexane, Xarelto) — conforme orientacao medica
• Anti-inflamatorios (Ibuprofeno, Diclofenaco, Nimesulida) — suspender 7 dias antes
• Omega-3, Vitamina E, Ginkgo biloba, Alcaçuz — suspender 14 dias antes
• Anticoncepcional oral combinado — discutir com o medico (risco de trombose)
• Hipertensao arterial: verificar pressao nos 3 dias anteriores — registrar os valores
! Pressao acima de 160/100 no dia da cirurgia pode levar ao adiamento — controle e fundamental

| Em caso de duvida sobre qualquer medicamento, LIGUE para a clinica antes de suspender. Nunca suspenda medicamentos para doencas cronicas (pressao, diabetes) sem orientacao medica. |
| --- |

| TABAGISMO E ALCOOL |
| --- |

! PARAR DE FUMAR pelo menos 30 dias antes e 30 dias apos a cirurgia
O cigarro reduz a circulacao e pode causar necrose da pele, infeccao e cicatriz ruim. Esta e uma das orientacoes mais importantes.

• Evitar bebidas alcoolicas nos 7 dias anteriores a cirurgia

| ALIMENTACAO E JEJUM |
| --- |

| NO DIA ANTERIOR:<br>• Refeicoes leves<br>• Nada muito gorduroso, frituras ou bebidas alcoolicas<br>• Boa noite de sono | DIA DA CIRURGIA — JEJUM OBRIGATORIO:<br>! 8 horas de jejum para alimentos solidos<br>! 6 horas para leite e derivados<br>• Agua ou suco de fruta claro (sem polpa): ate 2 horas antes<br>• Medicamentos de uso continuo: tomar com minimo de agua, conforme orientacao |
| --- | --- |

| CUIDADOS COM O CORPO |
| --- |

• Banho completo e higiene dos cabelos NA MANHA do dia da cirurgia
• Nao use creme, hidratante, maquiagem ou protetor solar no rosto no dia
• Unhas sem esmalte ou gel — o anestesista precisa ver a coloracao das unhas
• Nao use joias, piercings, alianca ou relogio
• Use roupas confortaveis e largas, de preferencia com abertura frontal (camisa)
• Nao use lentes de contato — leve os oculos se necessario
• Lave bem o cabelo — as incisoes sao peri-auriculares
• Nao use brincos, alianca ou qualquer joia
• Prepare a casa: cabeceira elevada, comidas leves preparadas, acompanhante disponivel por 48h

| O QUE TRAZER NO DIA |
| --- |

• Documento de identidade com foto (RG ou CNH)
• Todos os exames solicitados — impressos ou no celular
• Lista de medicamentos que voce usa
• Roupas confortaveis para a alta
✔ Um acompanhante adulto responsavel — OBRIGATORIO
• Numero de contato do acompanhante anotado

| ACOMPANHANTE OBRIGATORIO: Voce nao podera ir para casa sozinho(a) apos a cirurgia. Providencie um acompanhante adulto que fique com voce pelas primeiras 24 horas. |
| --- |

| LIGUE IMEDIATAMENTE SE... |
| --- |

! Febre acima de 37,8°C nas 24h anteriores a cirurgia
! Qualquer sintoma de gripe, resfriado, infeccao ou herpes
! Menstruacao inesperada (para alguns procedimentos pode afetar o planejamento)
! Qualquer duvida sobre as orientacoes — ligue antes, nao deixe para o dia

| CONTATO DA CLINICA:<br>Tel: _______________________ WhatsApp: _______________________<br>Em caso de emergencia pos-operatoria: ___________________________________ |
| --- |

Paciente: ___________________________________ Data da cirurgia: ___/___/______
Orientacoes fornecidas por: ___________________________ Assinatura: ___________
',
  '{"model":"claude-sonnet-4-6","temperature":0.45,"max_tokens":2048,"top_p":0.9}'::jsonb,
  ARRAY['send_whatsapp', 'schedule_appointment']::text[],
  30
WHERE NOT EXISTS (
  SELECT 1 FROM public.ai_skills WHERE is_system = true AND slug = 'preparo_preoperatorio'
);

INSERT INTO public.ai_skills (
  is_system,
  name,
  slug,
  description,
  skill_version,
  procedure_scope,
  task,
  source_kind,
  agent_type,
  system_prompt,
  user_prompt_template,
  content_markdown,
  model_config,
  available_tools,
  priority
)
SELECT
  true,
  'Pesquisa de Satisfacao NPS',
  'nps',
  'Gerar mensagens de pesquisa NPS, satisfação e indicação',
  '1.0',
  'all',
  'Gerar mensagens de pesquisa NPS, satisfação e indicação',
  'imported_docx',
  'MessageAgent',
  'Voce e o MessageAgent do SPE-M usando a skill nps.
Use o conteudo em content_markdown como fonte clinica/operacional primaria.
Nao invente orientacoes, riscos, documentos ou prazos que nao estejam no protocolo.
Gere mensagens em portugues do Brasil, com tom profissional, claro e empatico.',
  'Gere uma mensagem usando a skill nps.
Tipo de mensagem: {{message_type}}.
Paciente: {{patient_name}}.
Etapa do workflow: {{workflow_stage}}.
Procedimento: {{procedure_type}}.
Contexto adicional: {{context}}.',
  '# skill: nps
# version: 1.0
# procedure_scope: all
# task: Gerar mensagens de pesquisa NPS, satisfação e indicação

## Conteúdo

| MODERN FACE INSTITUTE<br>CRM-[UF]: _______________ \| Tel: _______________ \| @modernfaceinstitute |
| --- |

| PESQUISA DE SATISFACAO — MODERN FACE INSTITUTE<br>Cod: NPS-MFI-01 \| Versao: 1.0 \| Data: ___/___/______ |
| --- |

Sua opiniao e fundamental para que possamos continuar melhorando. Esta pesquisa e anonima e leva menos de 5 minutos. Agradecemos a honestidade.

| Procedimento realizado: ______________________________ | Mes/Ano da cirurgia: _______________ |
| --- | --- |

| 1. RECOMENDACAO (NPS) |
| --- |

Em uma escala de 0 a 10, qual a probabilidade de voce recomendar o Modern Face Institute a um amigo ou familiar?

| 0<br>☐ | 1<br>☐ | 2<br>☐ | 3<br>☐ | 4<br>☐ | 5<br>☐ | 6<br>☐ | 7<br>☐ | 8<br>☐ | 9<br>☐ | 10<br>☐ |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |

| 0–6 = Detrator | 7–8 = Neutro | 9–10 = Promotor |
| --- | --- | --- |

| 2. AVALIACAO POR ETAPA (1 = Ruim \| 5 = Excelente) |
| --- |

| Criterio | Ruim | 2 | 3 | 4 | Excelente |
| --- | --- | --- | --- | --- | --- |
| Primeiro contato (WhatsApp / telefone / Instagram) | 1 ☐ | 2 ☐ | 3 ☐ | 4 ☐ | 5 ☐ |
| Atendimento da recepção / secretária | 1 ☐ | 2 ☐ | 3 ☐ | 4 ☐ | 5 ☐ |
| Consulta medica — clareza das informacoes | 1 ☐ | 2 ☐ | 3 ☐ | 4 ☐ | 5 ☐ |
| Alinhamento de expectativas pelo medico | 1 ☐ | 2 ☐ | 3 ☐ | 4 ☐ | 5 ☐ |
| Organizacao e pontualidade da clinica | 1 ☐ | 2 ☐ | 3 ☐ | 4 ☐ | 5 ☐ |
| Conforto e estrutura fisica da clinica | 1 ☐ | 2 ☐ | 3 ☐ | 4 ☐ | 5 ☐ |
| Atendimento no dia da cirurgia | 1 ☐ | 2 ☐ | 3 ☐ | 4 ☐ | 5 ☐ |
| Cuidados e acompanhamento pos-operatorio | 1 ☐ | 2 ☐ | 3 ☐ | 4 ☐ | 5 ☐ |
| Resultado estetico do procedimento | 1 ☐ | 2 ☐ | 3 ☐ | 4 ☐ | 5 ☐ |
| Relacao custo-beneficio | 1 ☐ | 2 ☐ | 3 ☐ | 4 ☐ | 5 ☐ |

| 3. SEU RESULTADO |
| --- |

Como voce descreveria seu resultado em uma palavra?
___________________________________________________________________________

O resultado atendeu as suas expectativas?

| [ ] Superou | [ ] Atendeu | [ ] Atendeu parcialmente | [ ] Nao atendeu |
| --- | --- | --- | --- |

| 4. COMENTARIOS ABERTOS |
| --- |

O que voce mais gostou na sua experiencia no Modern Face Institute?
___________________________________________________________________________
___________________________________________________________________________
___________________________________________________________________________

O que poderia ser melhorado?
___________________________________________________________________________
___________________________________________________________________________
___________________________________________________________________________

Ha algum profissional que gostaria de mencionar pelo nome (positivo ou construtivo)?
___________________________________________________________________________

| 5. DEPOIMENTO E INDICACAO |
| --- |

Voce autoriza o Modern Face Institute a utilizar seu depoimento (anonimizado ou com seu nome, conforme sua escolha)?

| [ ] Sim, com meu nome | [ ] Sim, anonimamente | [ ] Nao autorizo |
| --- | --- | --- |

Voce indicaria alguem que poderia se beneficiar de uma consulta?

| Nome: _____________________________________ | WhatsApp: ________________________________ |
| --- | --- |

| Obrigado pela sua confianca e por dedicar seu tempo a esta pesquisa.<br>Modern Face Institute \| contato@modernfaceinstitute.com.br |
| --- |
',
  '{"model":"claude-sonnet-4-6","temperature":0.45,"max_tokens":2048,"top_p":0.9}'::jsonb,
  ARRAY['send_whatsapp', 'schedule_appointment']::text[],
  30
WHERE NOT EXISTS (
  SELECT 1 FROM public.ai_skills WHERE is_system = true AND slug = 'nps'
);

INSERT INTO public.ai_skills (
  is_system,
  name,
  slug,
  description,
  skill_version,
  procedure_scope,
  task,
  source_kind,
  agent_type,
  system_prompt,
  user_prompt_template,
  content_markdown,
  model_config,
  available_tools,
  priority
)
SELECT
  true,
  'Contrato de Prestacao de Servicos',
  'contrato',
  'Gerar e revisar comunicações sobre contrato de prestação de serviços',
  '1.0',
  'all',
  'Gerar e revisar comunicações sobre contrato de prestação de serviços',
  'imported_docx',
  'MessageAgent',
  'Voce e o MessageAgent do SPE-M usando a skill contrato.
Use o conteudo em content_markdown como fonte clinica/operacional primaria.
Nao invente orientacoes, riscos, documentos ou prazos que nao estejam no protocolo.
Gere mensagens em portugues do Brasil, com tom profissional, claro e empatico.',
  'Gere uma mensagem usando a skill contrato.
Tipo de mensagem: {{message_type}}.
Paciente: {{patient_name}}.
Etapa do workflow: {{workflow_stage}}.
Procedimento: {{procedure_type}}.
Contexto adicional: {{context}}.',
  '# skill: contrato
# version: 1.0
# procedure_scope: all
# task: Gerar e revisar comunicações sobre contrato de prestação de serviços

## Conteúdo

| MODERN FACE INSTITUTE<br>CNPJ: _______________ \| CRM-[UF]: _______________ \| Tel: _______________ |
| --- |

| CONTRATO DE PRESTACAO DE SERVICOS MEDICOS<br>Cod: CPS-MFI-01 \| Versao: 1.0 \| Data: ___/___/______ |
| --- |

| 01 | QUALIFICACAO DAS PARTES |
| --- | --- |

CONTRATADO (Prestador de Servico):

| Razao Social: _______________________________ | CNPJ: ___________________________ | CRM-[UF]: ______________________ |
| --- | --- | --- |
| Endereco: _______________________________ | Cidade/UF: __________________________ | CEP: _____________________________ |

CONTRATANTE (Paciente):

| Nome: _______________________________________ | Data de Nascimento: ________________________ |
| --- | --- |
| CPF: __________________________________________ | RG: ___________________________________________ |
| Telefone: _____________________________________ | E-mail: _____________________________________ |
| Endereco: _____________________________________ | Cidade/UF/CEP: _______________________ |

Responsavel legal (se menor ou incapaz):

| Nome: _______________________________________ | CPF: _________________________________________ |
| --- | --- |

| 02 | OBJETO DO CONTRATO |
| --- | --- |

O presente contrato tem por objeto a prestacao de servicos medicos especializados em Cirurgia Plastica pelo CONTRATADO ao CONTRATANTE, compreendendo a realizacao do(s) procedimento(s) descrito(s) abaixo, bem como os retornos pos-operatorios previstos no protocolo da clinica.

| Procedimento | Data prevista | Local |
| --- | --- | --- |
| ________________________________ | ___/___/______ | ________________ |
| ________________________________ | ___/___/______ | ________________ |

Os procedimentos serao realizados pelo Dr(a). _________________________, inscrito(a) no CRM-[UF] sob o no _____________, podendo contar com o auxilio de profissionais medicos devidamente habilitados, sob sua supervisao e responsabilidade.

| 03 | HONORARIOS E FORMA DE PAGAMENTO |
| --- | --- |

Composicao do valor total:

| Item | Valor (R$) |
| --- | --- |
| Honorarios medicos | R$ _________________ |
| Anestesiologista | R$ _________________ |
| Taxa de uso de sala / hospital-dia | R$ _________________ |
| Material cirurgico / OPME | R$ _________________ |
| Exames pre-operatorios (se aplicavel) | R$ _________________ |
| VALOR TOTAL | R$ _________________ |

Forma de pagamento:

| Modalidade:<br>[ ] A vista [ ] Parcelado [ ] Financiamento | No de parcelas:<br>_________________________ | Vencimento 1a parcela:<br>___/___/______ |
| --- | --- | --- |

| O inicio do procedimento fica condicionado ao pagamento ou a comprovacao de aprovacao de financiamento. O CONTRATANTE declara estar ciente de que os valores referentes a anestesia e hospital-dia sao de responsabilidade do respectivo prestador e podem variar. |
| --- |

| 04 | POLITICA DE CANCELAMENTO E REAGENDAMENTO |
| --- | --- |

O cancelamento ou reagendamento do procedimento esta sujeito as seguintes condicoes:

| Situacao | Condicao |
| --- | --- |
| Cancelamento pelo paciente com >15 dias de antecedencia | Reembolso integral dos valores pagos, deduzidos custos administrativos ja incorridos (exames, reserva de sala) |
| Cancelamento pelo paciente entre 8 e 14 dias | Retencao de 20% do valor pago a titulo de custos de cancelamento |
| Cancelamento pelo paciente entre 3 e 7 dias | Retencao de 40% do valor pago |
| Cancelamento com menos de 72h ou nao comparecimento (no-show) | Retencao de 50% do valor pago, ressalvadas situacoes de forca maior devidamente comprovadas |
| Cancelamento por indicacao medica (contraindicacao clinica) | Reembolso integral no prazo de ate 10 dias uteis |
| Reagendamento pelo paciente (1a solicitacao) | Sem custo, mediante disponibilidade de agenda, com minimo de 72h de antecedencia |
| Reagendamento pelo paciente (2a solicitacao ou mais) | Taxa administrativa de R$ _________ por reagendamento |

O reembolso sera realizado pelo mesmo meio de pagamento utilizado pelo CONTRATANTE, no prazo de ate 10 (dez) dias uteis apos formalizacao do pedido de cancelamento.

| 05 | OBRIGACOES DO CONTRATADO |
| --- | --- |

O CONTRATADO obriga-se a:

Clausula 1: Realizar o(s) procedimento(s) contratado(s) com toda a diligencia, pericia e tecnica exigiveis da especialidade, observando os principios eticos e as normas do Conselho Federal de Medicina (CFM);
Clausula 2: Fornecer ao CONTRATANTE todas as informacoes necessarias sobre o procedimento, seus riscos e alternativas, antes da realizacao;
Clausula 3: Garantir a disponibilidade para atendimento de urgencia decorrente de complicacoes relacionadas ao procedimento pelo periodo de 30 (trinta) dias apos a cirurgia;
Clausula 4: Realizar os retornos pos-operatorios conforme o cronograma previsto no protocolo da clinica (24-48h, 7 dias, 30 dias, 3 meses e 12 meses), sem custo adicional;
Clausula 5: Manter o sigilo sobre as informacoes do CONTRATANTE, em cumprimento ao Codigo de Etica Medica e a Lei 13.709/2018 (LGPD);
Clausula 6: Documentar adequadamente todos os atos medicos no prontuario eletronico.

| 06 | OBRIGACOES DO CONTRATANTE |
| --- | --- |

O CONTRATANTE obriga-se a:

Clausula 1: Fornecer informacoes verdadeiras e completas sobre seu historico de saude, medicamentos em uso, alergias e cirurgias anteriores, sendo responsavel pelas consequencias de informacoes omitidas ou incorretas;
Clausula 2: Seguir rigorosamente as orientacoes pre e pos-operatorias fornecidas pelo CONTRATADO, incluindo suspensao de medicamentos, cuidados com a ferida operatoria e restricoes de atividade;
Clausula 3: Comparecer a todos os retornos agendados. A ausencia injustificada em retornos pos-operatorios exime o CONTRATADO de responsabilidade por complicacoes que poderiam ter sido identificadas e tratadas precocemente;
Clausula 4: Comunicar imediatamente ao CONTRATADO qualquer intercorrencia, alteracao de saude ou sintoma incomum durante o periodo pos-operatorio;
Clausula 5: Efetuar o pagamento nos prazos e condicoes acordados;
Clausula 6: Cumprir a cessacao do tabagismo pelo periodo determinado, ciente de que o descumprimento aumenta significativamente o risco de complicacoes e pode comprometer o resultado.

| 07 | NATUREZA DO SERVICO E LIMITACOES |
| --- | --- |

As partes declaram estar cientes de que os procedimentos de cirurgia plastica estetica sao classificados como obrigacao de resultado, nos termos do entendimento majoritario do Superior Tribunal de Justica (STJ). Contudo, o resultado esta condicionado a fatores individuais como cicatrizacao, anatomia, aderencia ao tratamento pos-operatorio e intercorrencias biologicas imprevisiveis.

O CONTRATANTE declara compreender que:
1. Fotografias de outros pacientes tem carater ilustrativo e nao representam garantia de resultado identico;
2. Resultados podem variar conforme anatomia individual, qualidade da pele, processo de cicatrizacao e fatores geneticos;
3. O resultado definitivo e avaliado apos 6 a 12 meses do procedimento;
4. Eventuais ajustes ou retoques, quando tecnicamente indicados pelo cirurgiao, serao avaliados individualmente quanto a necessidade de custo adicional.

| Qualquer procedimento de retoque ou revisao sera avaliado individualmente pelo cirurgiao. Retoques por insatisfacao estetica subjetiva, sem indicacao tecnica, podem implicar custos adicionais. |
| --- |

| 08 | RESPONSABILIDADE CIVIL |
| --- | --- |

O CONTRATADO responde pelos danos causados ao CONTRATANTE decorrentes de negligencia, imprudencia ou imprudencia no exercicio da atividade profissional, nos termos do art. 951 do Codigo Civil e art. 14 do Codigo de Defesa do Consumidor.

O CONTRATADO nao se responsabiliza por complicacoes decorrentes de: (a) informacoes falsas ou omissoes do CONTRATANTE; (b) descumprimento das orientacoes pre e pos-operatorias; (c) ausencia injustificada aos retornos; (d) intercorrencias clinicas imprevisíveis nao relacionadas ao procedimento.

| 09 | PROTECAO DE DADOS — LGPD |
| --- | --- |

O CONTRATADO declara que os dados pessoais e sensíveis do CONTRATANTE — incluindo informacoes de saude, fotografias clinicas e dados de identificacao — serao tratados exclusivamente para as finalidades previstas neste contrato e no prontuario medico, em conformidade com a Lei 13.709/2018 (Lei Geral de Protecao de Dados).

Os dados serao armazenados pelo prazo minimo de 20 (vinte) anos, conforme Resolucao CFM 1638/2002, e nao serao compartilhados com terceiros sem o consentimento expresso do CONTRATANTE, salvo por determinacao legal.

O CONTRATANTE pode, a qualquer momento, solicitar acesso, correcao ou exclusao de seus dados (observado o prazo legal de retencao de prontuarios), mediante solicitacao formal ao CONTRATADO.

| 10 | RESCISAO |
| --- | --- |

Este contrato podera ser rescindido: (a) por mutuo acordo entre as partes; (b) pelo CONTRATANTE, mediante comunicacao escrita com antecedencia minima de 72h, observada a politica de cancelamento da Clausula 04; (c) pelo CONTRATADO, em caso de descumprimento das obrigacoes do CONTRATANTE que comprometa a seguranca ou o resultado do procedimento.

| 11 | FORO E DISPOSICOES GERAIS |
| --- | --- |

Fica eleito o foro da Comarca de _________________________ / [UF] para dirimir eventuais controversias decorrentes do presente contrato, com renúncia a qualquer outro, por mais privilegiado que seja.

Este contrato e regido pelo Codigo Civil Brasileiro (Lei 10.406/2002), pelo Codigo de Defesa do Consumidor (Lei 8.078/1990), pelo Codigo de Etica Medica (Res. CFM 2217/2018) e pelas demais normas aplicaveis.

E lavrado em 2 (duas) vias de igual teor e forma, ficando uma via com cada parte.

| Contratante / Paciente | Contratado / Medico<br>CRM: ___________ | Testemunha 1<br>CPF: ___________ |
| --- | --- | --- |

Local e Data: _____________________________ Hora: _______

Testemunha 2: _________________________________ CPF: _____________________
',
  '{"model":"claude-sonnet-4-6","temperature":0.45,"max_tokens":2048,"top_p":0.9}'::jsonb,
  ARRAY['send_whatsapp', 'schedule_appointment']::text[],
  40
WHERE NOT EXISTS (
  SELECT 1 FROM public.ai_skills WHERE is_system = true AND slug = 'contrato'
);

INSERT INTO public.ai_skills (
  is_system,
  name,
  slug,
  description,
  skill_version,
  procedure_scope,
  task,
  source_kind,
  agent_type,
  system_prompt,
  user_prompt_template,
  content_markdown,
  model_config,
  available_tools,
  priority
)
SELECT
  true,
  'Autorizacao de Uso de Imagem',
  'aui',
  'Gerar e revisar comunicações sobre autorização de uso de imagem',
  '1.0',
  'all',
  'Gerar e revisar comunicações sobre autorização de uso de imagem',
  'imported_docx',
  'MessageAgent',
  'Voce e o MessageAgent do SPE-M usando a skill aui.
Use o conteudo em content_markdown como fonte clinica/operacional primaria.
Nao invente orientacoes, riscos, documentos ou prazos que nao estejam no protocolo.
Gere mensagens em portugues do Brasil, com tom profissional, claro e empatico.',
  'Gere uma mensagem usando a skill aui.
Tipo de mensagem: {{message_type}}.
Paciente: {{patient_name}}.
Etapa do workflow: {{workflow_stage}}.
Procedimento: {{procedure_type}}.
Contexto adicional: {{context}}.',
  '# skill: aui
# version: 1.0
# procedure_scope: all
# task: Gerar e revisar comunicações sobre autorização de uso de imagem

## Conteúdo

| MODERN FACE INSTITUTE<br>CNPJ: _______________ \| CRM-[UF]: _______________ \| Tel: _______________ |
| --- |

| AUTORIZACAO DE USO DE IMAGEM E MATERIAL CLINICO<br>Cod: AUI-MFI-01 \| Versao: 1.0 \| Data: ___/___/______ |
| --- |

DADOS DO TITULAR DA IMAGEM:

| Nome completo: _____________________________ | Data de nascimento: ____________________ |
| --- | --- |
| CPF: __________________________________________ | Telefone: ___________________________________ |
| Procedimento realizado: _____________________ | Data do procedimento: ___________________ |

Eu, _______________________________________, portador(a) do CPF no _________________________, pelo presente instrumento e na melhor forma de direito, AUTORIZO o uso de minhas imagens clinicas (fotografias e videos antes, durante e apos o procedimento cirurgico) pelo MODERN FACE INSTITUTE e pelo Dr(a). _____________________________, CRM-[UF] no _____________, nos termos e condicoes descritos a seguir.

| 01 | ESCOPO DA AUTORIZACAO |
| --- | --- |

Marque todos os usos autorizados:

| [ ] | Prontuario medico — Armazenamento das imagens no prontuario da clinica para fins de documentacao clinica e acompanhamento do tratamento. Esta autorizacao e obrigatoria para todos os pacientes.<br>Imagens de prontuario sao protegidas pelo sigilo medico e pela LGPD — acesso restrito a equipe medica. |
| --- | --- |
| [ ] | Publicacoes cientificas — Uso em artigos, teses, monografias, congressos medicos e publicacoes academicas<br>Identidade sera sempre preservada: rosto obscurecido ou dados suprimidos conforme padroes editoriais. |
| [ ] | Ensino e treinamento medico — Uso em aulas, cursos, workshops e treinamentos de profissionais de saude<br>Acesso restrito a ambiente de ensino — imagens nao serao publicadas na internet. |
| [ ] | Material de marketing — sem identificacao facial — Uso em comunicacoes institucionais (site, redes sociais, anuncios) com rosto obscurecido ou sem identificacao<br>Resolucao CFM 2336/2023: e vedado exibir imagens identificaveis em publicidade medica. |
| [ ] | Material de marketing — com identificacao facial — Uso em comunicacoes publicas com rosto visivelmente identificavel<br>Uso restrito mediante autorizacao expletamente assinada aqui. Voce pode revogar a qualquer momento. |
| [ ] | Palestras e apresentacoes publicas — Uso em apresentacoes em eventos medicos, congressos e conferencias<br>Identidade sera preservada a menos que o paciente autorize o uso nominal explicitamente abaixo. |

[ ] AUTORIZACAO NOMINAL: Autorizo que meu nome seja mencionado juntamente com as imagens nos contextos autorizados acima.

| 02 | RESTRICOES E GARANTIAS |
| --- | --- |

• As imagens NAO poderao ser cedidas, vendidas ou transferidas a terceiros sem nova autorizacao escrita do titular;
• As imagens NAO poderao ser utilizadas de forma que cause dano a imagem, honra ou reputacao do titular;
• Em materiais de acesso publico, as imagens serao utilizadas de forma que preserve o anonimato do titular, salvo autorizacao nominal expressa;
• O uso respeita integralmente a Lei 9.610/1998 (Direitos Autorais), a Lei 13.709/2018 (LGPD) e o Codigo de Etica Medica (Res. CFM 2217/2018);
• A autorizacao e concedida a titulo gratuito, sem que o titular faca jus a qualquer remuneracao por uso das imagens.

| 03 | REVOGACAO |
| --- | --- |

Esta autorizacao podera ser revogada a qualquer momento, mediante comunicacao escrita ao MODERN FACE INSTITUTE. A revogacao nao afetara os usos ja realizados anteriormente a data do recebimento da solicitacao de revogacao.

Para revogar esta autorizacao, enviar solicitacao escrita para: [e-mail da clinica] ou comparecer pessoalmente com documento de identificacao.

| 04 | ARMAZENAMENTO E SEGURANCA |
| --- | --- |

As imagens serao armazenadas em sistema seguro com acesso restrito, criptografadas e com backup regular. O prazo de retencao e de no minimo 20 (vinte) anos, conforme Resolucao CFM 1638/2002, podendo ser estendido para fins de documentacao clinica de longo prazo.

Em caso de encerramento das atividades da clinica, as imagens serao transferidas para a guarda do medico responsavel pelo prontuario ou destruidas de forma segura, mediante comunicacao previa ao titular.

Li e compreendi todas as condicoes desta autorizacao e assino de forma livre e esclarecida:

| Paciente / Titular da Imagem | Medico Responsavel<br>CRM: ___________ |
| --- | --- |

Local e Data: _____________________________ Hora: _______

Responsavel legal (se aplicavel): _________________________________ CPF: _____________________

Documento emitido em conformidade com: Lei 9.610/1998, Lei 13.709/2018 (LGPD), Res. CFM 2217/2018 e Res. CFM 2336/2023.
',
  '{"model":"claude-sonnet-4-6","temperature":0.45,"max_tokens":2048,"top_p":0.9}'::jsonb,
  ARRAY['send_whatsapp', 'schedule_appointment']::text[],
  40
WHERE NOT EXISTS (
  SELECT 1 FROM public.ai_skills WHERE is_system = true AND slug = 'aui'
);

INSERT INTO public.ai_skills (
  is_system,
  name,
  slug,
  description,
  skill_version,
  procedure_scope,
  task,
  source_kind,
  agent_type,
  system_prompt,
  user_prompt_template,
  content_markdown,
  model_config,
  available_tools,
  priority
)
SELECT
  true,
  'TCI Procedimentos Cirurgia Plastica',
  'tci',
  'Gerar e revisar comunicações sobre TCI de procedimentos de cirurgia plástica',
  '1.0',
  'all',
  'Gerar e revisar comunicações sobre TCI de procedimentos de cirurgia plástica',
  'imported_docx',
  'MessageAgent',
  'Voce e o MessageAgent do SPE-M usando a skill tci.
Use o conteudo em content_markdown como fonte clinica/operacional primaria.
Nao invente orientacoes, riscos, documentos ou prazos que nao estejam no protocolo.
Gere mensagens em portugues do Brasil, com tom profissional, claro e empatico.',
  'Gere uma mensagem usando a skill tci.
Tipo de mensagem: {{message_type}}.
Paciente: {{patient_name}}.
Etapa do workflow: {{workflow_stage}}.
Procedimento: {{procedure_type}}.
Contexto adicional: {{context}}.',
  '# skill: tci
# version: 1.0
# procedure_scope: all
# task: Gerar e revisar comunicações sobre TCI de procedimentos de cirurgia plástica

## Conteúdo

| [NOME DA CLINICA]<br>CNPJ: ________________ \| CRM-[UF]: ________________ \| Tel: ________________ |
| --- |

| TERMO DE CONSENTIMENTO INFORMADO<br>LIFTING FACIAL — DEEP PLANE (Ritidoplastia em Plano Profundo)<br>Codigo: TCI-LF-01 \| Versao: 1.0 \| Data: ___/___/______ |
| --- |

1. IDENTIFICACAO DO PACIENTE

| Nome completo: ________________________________ | Data de nascimento: ________________________________ |
| --- | --- |
| CPF: ________________________________ | RG: ________________________________ |
| Telefone: ________________________________ | E-mail: ________________________________ |
| Responsavel legal (se menor): ________________________________ | CPF do responsavel: ________________________________ |

2. DESCRICAO DO PROCEDIMENTO

O lifting facial em Plano Profundo (Deep Plane) e uma cirurgia de rejuvenescimento facial que reposiciona os tecidos da face — pele, tecido subcutaneo e a camada muscular aponeurótica superficial (SMAS) — para restabelecer a aparencia jovial de maneira natural e duradoura.

Diferente das tecnicas superficiais, o Deep Plane realiza a disseccao em planos anatomicos mais profundos, com liberacao de ligamentos de retencao facial. Isso permite reposicionar os tecidos ao inves de apenas traciona-los, resultando em aspecto mais natural, menor tensao nas cicatrizes e resultado mais duradouro.

Incisoes: As incisoes sao realizadas na regiao pré-auricular (na frente da orelha), contornando o lobulo auricular e estendendo-se para a regiao retroauricular e couro cabeludo, sendo posicionadas de forma a ficarem ocultas nas dobras naturais da pele.

Duracao estimada: 3 a 5 horas, a depender da extensao do procedimento.

Internacao: Geralmente 1 dia (procedimento ambulatorial em hospital-dia ou clinica com estrutura adequada).

3. RISCOS GERAIS DA ANESTESIA GERAL

Este procedimento e realizado sob anestesia geral ou sedacao, com acompanhamento de medico anestesiologista. Os riscos gerais da anestesia incluem:

Reacoes alergicas a medicamentos anestesicos
Nauseas e vomitos no pos-operatorio imediato
Dor de garganta por intubacao orotraqueal
Dificuldade respiratoria ou broncoespasmo
Alteracoes cardiovasculares (arritmias, variacao de pressao arterial)
Em casos muito raros: complicacoes neurologicas, anafilaxia grave ou risco a vida

O risco anestesico individual sera avaliado e discutido pelo medico anestesiologista em consulta pre-operatoria obrigatoria.

4. RISCOS E COMPLICACOES ESPECIFICOS

As frequencias indicadas sao aproximadas e baseadas na literatura medica. Casos individuais podem variar.

| Complicacao / Risco | Frequencia | Gravidade |
| --- | --- | --- |
| Hematoma (acumulo de sangue sob a pele) | 3-5% | Moderada |
| Seroma (acumulo de liquido) | 1-3% | Leve |
| Infeccao superficial ou profunda | <2% | Moderada |
| Lesao transitoria de ramo do nervo facial | 1-2% | Moderada |
| Lesao permanente de ramo do nervo facial (rara) | <0,5% | Grave |
| Alopecia (perda de cabelo nas cicatrizes) | 1-3% | Moderada |
| Necrose cutanea (risco aumentado em tabagistas) | <2% | Grave |
| Cicatriz hipertrofica ou queloide | 1-3% | Moderada |
| Assimetria facial residual | 2-5% | Moderada |
| Alteracao de sensibilidade cutanea (hipoestesia) | 5-15% | Leve |
| Deiscencia de sutura | <2% | Leve |
| Resultado insatisfatorio com necessidade de retoque | 3-8% | Moderada |
| Tromboembolismo venoso (TVP/TEP) | <0,5% | Grave |

| FATORES QUE AUMENTAM O RISCO: Tabagismo (suspender minimo 30 dias antes e apos), uso de AAS ou anticoagulantes, diabetes nao controlada, hipertensao arterial mal controlada, doencas autoimunes, tendencia a queloides. |
| --- |

5. ALTERNATIVAS E POS-OPERATORIO

Alternativas ao procedimento cirurgico:
Procedimentos minimamente invasivos: fios de sustentacao, toxina botulinica, preenchimentos — efeito menos intenso e nao duradouro
Bioestimuladores de colageno — efeito progressivo e limitado
Nao realizar qualquer procedimento — evolucao natural do envelhecimento

Cuidados pos-operatorios essenciais:
Uso de curativo compressivo por 24-48 horas
Drenos de aspiracao removidos em 24-48 horas (quando utilizados)
Repouso relativo por 7-10 dias, evitar atividades que elevem a pressao arterial
Retornar para revisao em 24-48h, 7 dias, 30 dias, 3 meses e 12 meses
Evitar exposicao solar direta por minimo 3 meses
Resultado definitivo avaliado apos 6-12 meses

6. DECLARACOES DO PACIENTE

Declaro que:
Li e compreendi todas as informacoes contidas neste Termo de Consentimento Informado.
Tive a oportunidade de fazer perguntas ao medico responsavel e todas foram respondidas de forma clara e satisfatoria.
Fui informado(a) sobre os riscos, complicacoes possiveis e alternativas ao procedimento proposto.
Compreendo que o resultado estetico nao pode ser garantido e depende de fatores individuais de cicatrizacao e anatomia.
Autorizo o registro fotografico e videografico antes, durante e apos o procedimento, para fins de documentacao do prontuario medico.
Estou ciente de que posso retirar este consentimento a qualquer momento ANTES da realizacao do procedimento, sem qualquer penalidade.
As informacoes prestadas sobre meu historico de saude sao verdadeiras e completas.
Fui orientado(a) a comunicar qualquer alteracao no meu estado de saude, uso de novos medicamentos ou outras cirurgias realizadas no periodo entre a consulta e a data do procedimento.

Duvidas registradas durante a consulta:

_____________________________________________________________________________________________
_____________________________________________________________________________________________
_____________________________________________________________________________________________

| ATENCAO: A assinatura deste termo confirma que o paciente recebeu, compreendeu e concordou com todas as informacoes acima. Em caso de menor de idade ou incapacidade legal, o responsavel legal deve assinar. |
| --- |

| Assinatura do Paciente |  | Assinatura do Médico |  | Testemunha |
| --- | --- | --- | --- | --- |

| Nome por extenso |  | CRM: ___________ |  | CPF: ___________ |
| --- | --- | --- | --- | --- |

Local e Data: ___________________________________ Hora: _________

Este documento foi elaborado em conformidade com o Codigo de Etica Medica (CFM Res. 2217/2018), a Resolucao CFM 1931/2009 e a Lei Geral de Protecao de Dados (Lei n. 13.709/2018).
Documento gerado em 2 (duas) vias: uma para o prontuario da clinica e uma para o paciente.

| [NOME DA CLINICA]<br>CNPJ: ________________ \| CRM-[UF]: ________________ \| Tel: ________________ |
| --- |

| TERMO DE CONSENTIMENTO INFORMADO<br>LIFTING DE PESCOCO — DEEP NECK (Cervicoplastia em Plano Profundo)<br>Codigo: TCI-DN-01 \| Versao: 1.0 \| Data: ___/___/______ |
| --- |

1. IDENTIFICACAO DO PACIENTE

| Nome completo: ________________________________ | Data de nascimento: ________________________________ |
| --- | --- |
| CPF: ________________________________ | RG: ________________________________ |
| Telefone: ________________________________ | E-mail: ________________________________ |
| Responsavel legal (se menor): ________________________________ | CPF do responsavel: ________________________________ |

2. DESCRICAO DO PROCEDIMENTO

O Deep Neck e um procedimento cirurgico de rejuvenescimento do pescoco que atua em planos anatomicos profundos. Ele corrige a flacidez da pele cervical, o excesso de gordura subplatismal, a ptose das glandulas submandibulares e as bandas do musculo platisma — responsaveis pelo chamado ''pescoco de peru''.

A abordagem em plano profundo permite trabalhar diretamente sobre as estruturas responsaveis pelo envelhecimento cervical, sem apenas tracionar a pele superficialmente, o que garante resultados mais naturais, duradouros e com menor risco de aspecto artificial.

Incisoes: O acesso e realizado por pequena incisao submentoniana (embaixo do queixo) e/ou retroauricular (atras da orelha), de acordo com o planejamento cirurgico individualizado.

Duracao estimada: 2 a 4 horas. Pode ser realizado isoladamente ou em combinacao com lifting facial.

Internacao: Procedimento em regime de hospital-dia ou internacao de 1 dia.

3. RISCOS GERAIS DA ANESTESIA GERAL

Este procedimento e realizado sob anestesia geral ou sedacao, com acompanhamento de medico anestesiologista. Os riscos gerais da anestesia incluem:

Reacoes alergicas a medicamentos anestesicos
Nauseas e vomitos no pos-operatorio imediato
Dor de garganta por intubacao orotraqueal
Dificuldade respiratoria ou broncoespasmo
Alteracoes cardiovasculares (arritmias, variacao de pressao arterial)
Em casos muito raros: complicacoes neurologicas, anafilaxia grave ou risco a vida

O risco anestesico individual sera avaliado e discutido pelo medico anestesiologista em consulta pre-operatoria obrigatoria.

4. RISCOS E COMPLICACOES ESPECIFICOS

A regiao cervical e proxima a estruturas nervosas e vasculares importantes. O medico cirurgiao adota tecnica de disseccao com visao direta das estruturas anatomicas para minimizar o risco de lesoes.

| Complicacao / Risco | Frequencia | Gravidade |
| --- | --- | --- |
| Hematoma (mais frequente nas primeiras 12-24h) | 3-6% | Moderada |
| Seroma | 2-4% | Leve |
| Infeccao | <2% | Moderada |
| Lesao do nervo marginal mandibular (assimetria do sorriso) | 0,5-1% | Grave |
| Lesao do nervo auricular magno (anestesia do lobulo da orelha) | 1-3% | Moderada |
| Lesao do nervo motor do platisma | <0,5% | Grave |
| Cicatriz visivel submentoniana | 1-3% | Moderada |
| Disfagia transitoria (dificuldade de deglutição) | 1-2% | Leve |
| Assimetria cervical residual | 2-5% | Moderada |
| Alteracao de sensibilidade da regiao cervical | 5-10% | Leve |
| Recidiva de bandas platismais | 3-8% | Moderada |
| Lesao de glandula salivar submandibular | <0,5% | Grave |
| Tromboembolismo venoso | <0,5% | Grave |

| ATENCAO ESPECIAL: A lesao do nervo marginal mandibular, embora rara, pode causar queda do angulo da boca e assimetria do sorriso. Na maioria dos casos e transitoria; a recuperacao ocorre em semanas a meses. Lesoes permanentes sao muito raras com tecnica adequada. |
| --- |

5. ALTERNATIVAS E POS-OPERATORIO

Alternativas ao procedimento:
Lipoaspiracao cervical isolada — indicada em casos com excesso de gordura sem flacidez de pele
Procedimentos nao cirurgicos: ultrassom microfocado (HIFU), radiofrequencia, fios — efeito limitado e temporario
Nao realizar o procedimento — evolucao natural do envelhecimento cervical

Cuidados pos-operatorios:
Curativo compressivo cervical por 48-72 horas
Cabeceira elevada a 45 graus por 5-7 dias
Evitar movimentacao brusca do pescoco por 15 dias
Drenos removidos em 24-48 horas quando utilizados
Restrição a atividades fisicas por 30 dias
Retornos: 24-48h, 7 dias, 30 dias, 3 meses e 12 meses
Resultado definitivo avaliado apos 6-12 meses

6. DECLARACOES DO PACIENTE

Declaro que:
Li e compreendi todas as informacoes contidas neste Termo de Consentimento Informado.
Tive a oportunidade de fazer perguntas ao medico responsavel e todas foram respondidas de forma clara e satisfatoria.
Fui informado(a) sobre os riscos, complicacoes possiveis e alternativas ao procedimento proposto.
Compreendo que o resultado estetico nao pode ser garantido e depende de fatores individuais de cicatrizacao e anatomia.
Autorizo o registro fotografico e videografico antes, durante e apos o procedimento, para fins de documentacao do prontuario medico.
Estou ciente de que posso retirar este consentimento a qualquer momento ANTES da realizacao do procedimento, sem qualquer penalidade.
As informacoes prestadas sobre meu historico de saude sao verdadeiras e completas.
Fui orientado(a) a comunicar qualquer alteracao no meu estado de saude, uso de novos medicamentos ou outras cirurgias realizadas no periodo entre a consulta e a data do procedimento.

Duvidas registradas durante a consulta:

_____________________________________________________________________________________________
_____________________________________________________________________________________________
_____________________________________________________________________________________________

| ATENCAO: A assinatura deste termo confirma que o paciente recebeu, compreendeu e concordou com todas as informacoes acima. Em caso de menor de idade ou incapacidade legal, o responsavel legal deve assinar. |
| --- |

| Assinatura do Paciente |  | Assinatura do Médico |  | Testemunha |
| --- | --- | --- | --- | --- |

| Nome por extenso |  | CRM: ___________ |  | CPF: ___________ |
| --- | --- | --- | --- | --- |

Local e Data: ___________________________________ Hora: _________

Este documento foi elaborado em conformidade com o Codigo de Etica Medica (CFM Res. 2217/2018), a Resolucao CFM 1931/2009 e a Lei Geral de Protecao de Dados (Lei n. 13.709/2018).
Documento gerado em 2 (duas) vias: uma para o prontuario da clinica e uma para o paciente.

| [NOME DA CLINICA]<br>CNPJ: ________________ \| CRM-[UF]: ________________ \| Tel: ________________ |
| --- |

| TERMO DE CONSENTIMENTO INFORMADO<br>BROWLIFT (Lifting da Sobrancelha e Terco Superior da Face)<br>Codigo: TCI-BL-01 \| Versao: 1.0 \| Data: ___/___/______ |
| --- |

1. IDENTIFICACAO DO PACIENTE

| Nome completo: ________________________________ | Data de nascimento: ________________________________ |
| --- | --- |
| CPF: ________________________________ | RG: ________________________________ |
| Telefone: ________________________________ | E-mail: ________________________________ |
| Responsavel legal (se menor): ________________________________ | CPF do responsavel: ________________________________ |

2. DESCRICAO DO PROCEDIMENTO

O Browlift — tambem chamado de lifting de sobrancelha ou lifting frontal — e uma cirurgia de rejuvenescimento do terco superior da face. O procedimento reposiciona as sobrancelhas ptóticas (caidas) para uma posicao mais jovem e harmônica, e suaviza as rugas horizontais da testa e as rugas verticais da regiao glabelar (entre as sobrancelhas).

Tecnica utilizada: O procedimento pode ser realizado por via endoscópica (pequenas incisoes no couro cabeludo com camara) ou por via aberta (incisao coronal ou ao longo da linha capilar). A tecnica sera escolhida pelo cirurgiao conforme a anatomia individual do paciente e o resultado desejado.

O lifting de sobrancelha frequentemente e realizado em conjunto com blefaroplastia (cirurgia das palpebras) e/ou lifting facial para um resultado harmonioso de todo o terco superior e medio da face.

Duracao estimada: 1,5 a 3 horas.

Internacao: Procedimento ambulatorial em hospital-dia.

3. RISCOS GERAIS DA ANESTESIA GERAL

Este procedimento e realizado sob anestesia geral ou sedacao, com acompanhamento de medico anestesiologista. Os riscos gerais da anestesia incluem:

Reacoes alergicas a medicamentos anestesicos
Nauseas e vomitos no pos-operatorio imediato
Dor de garganta por intubacao orotraqueal
Dificuldade respiratoria ou broncoespasmo
Alteracoes cardiovasculares (arritmias, variacao de pressao arterial)
Em casos muito raros: complicacoes neurologicas, anafilaxia grave ou risco a vida

O risco anestesico individual sera avaliado e discutido pelo medico anestesiologista em consulta pre-operatoria obrigatoria.

4. RISCOS E COMPLICACOES ESPECIFICOS

A regiao frontal concentra ramos nervosos sensitivos e motores importantes. A abordagem cirurgica e planejada para minimizar o risco de lesoes.

| Complicacao / Risco | Frequencia | Gravidade |
| --- | --- | --- |
| Hipoestesia/anestesia da testa e couro cabeludo | 5-15% | Leve |
| Alopecia nas incisoes (perda de cabelo) | 2-5% | Moderada |
| Hematoma | 1-3% | Moderada |
| Assimetria das sobrancelhas | 3-8% | Moderada |
| Supercorrecao (sobrancelha elevada demais) | 2-5% | Moderada |
| Subcorrecao (resultado insuficiente) | 3-8% | Moderada |
| Lagoftalmo transitorio (dificuldade de fechar o olho) | 1-3% | Moderada |
| Lesao do ramo frontal do nervo facial | <1% | Grave |
| Lesao dos nervos supraorbital/supratroclear | 1-2% | Moderada |
| Recidiva da ptose das sobrancelhas | 3-10% | Leve |
| Cicatriz visivel ou alargada | 1-3% | Moderada |
| Infeccao | <1% | Moderada |
| Dor cronica na regiao frontal | <1% | Leve |

| IMPORTANTE: A hipoestesia (reducao de sensibilidade) do couro cabeludo e da testa e frequente e geralmente transitoria, podendo durar semanas a meses. O lagoftalmo transitorio (olho que nao fecha completamente) e uma complicacao que exige acompanhamento com uso de lubrificantes oculares e resolucao geralmente em 2 a 6 semanas. |
| --- |

5. ALTERNATIVAS E POS-OPERATORIO

Alternativas ao procedimento:
Toxina botulinica (Botox) — eleva levemente a sobrancelha e suaviza rugas, efeito temporario (3-6 meses)
Fios de sustentacao para sobrancelha — resultado limitado e menos duradouro
Procedimentos nao invasivos (HIFU, radiofrequencia) — efeito modesto
Nao realizar o procedimento

Cuidados pos-operatorios:
Cabeceira elevada a 30-45 graus por 5-7 dias para reducao do edema
Compressas geladas na regiao frontal e perioculares nas primeiras 48 horas
Lavar o cabelo apos 3-5 dias conforme orientacao medica
Evitar exposicao solar direta por 3 meses
Restrição a atividades fisicas intensas por 30 dias
Oculos com armacao pesada devem ser evitados por 4-6 semanas (apoiam no nariz, nao na testa)
Retornos: 48h, 7 dias, 30 dias, 3 meses e 12 meses
Resultado definitivo avaliado apos 6-12 meses

6. DECLARACOES DO PACIENTE

Declaro que:
Li e compreendi todas as informacoes contidas neste Termo de Consentimento Informado.
Tive a oportunidade de fazer perguntas ao medico responsavel e todas foram respondidas de forma clara e satisfatoria.
Fui informado(a) sobre os riscos, complicacoes possiveis e alternativas ao procedimento proposto.
Compreendo que o resultado estetico nao pode ser garantido e depende de fatores individuais de cicatrizacao e anatomia.
Autorizo o registro fotografico e videografico antes, durante e apos o procedimento, para fins de documentacao do prontuario medico.
Estou ciente de que posso retirar este consentimento a qualquer momento ANTES da realizacao do procedimento, sem qualquer penalidade.
As informacoes prestadas sobre meu historico de saude sao verdadeiras e completas.
Fui orientado(a) a comunicar qualquer alteracao no meu estado de saude, uso de novos medicamentos ou outras cirurgias realizadas no periodo entre a consulta e a data do procedimento.

Duvidas registradas durante a consulta:

_____________________________________________________________________________________________
_____________________________________________________________________________________________
_____________________________________________________________________________________________

| ATENCAO: A assinatura deste termo confirma que o paciente recebeu, compreendeu e concordou com todas as informacoes acima. Em caso de menor de idade ou incapacidade legal, o responsavel legal deve assinar. |
| --- |

| Assinatura do Paciente |  | Assinatura do Médico |  | Testemunha |
| --- | --- | --- | --- | --- |

| Nome por extenso |  | CRM: ___________ |  | CPF: ___________ |
| --- | --- | --- | --- | --- |

Local e Data: ___________________________________ Hora: _________

Este documento foi elaborado em conformidade com o Codigo de Etica Medica (CFM Res. 2217/2018), a Resolucao CFM 1931/2009 e a Lei Geral de Protecao de Dados (Lei n. 13.709/2018).
Documento gerado em 2 (duas) vias: uma para o prontuario da clinica e uma para o paciente.
',
  '{"model":"claude-sonnet-4-6","temperature":0.45,"max_tokens":2048,"top_p":0.9}'::jsonb,
  ARRAY['send_whatsapp', 'schedule_appointment']::text[],
  40
WHERE NOT EXISTS (
  SELECT 1 FROM public.ai_skills WHERE is_system = true AND slug = 'tci'
);

INSERT INTO public.ai_skills (
  is_system,
  name,
  slug,
  description,
  skill_version,
  procedure_scope,
  task,
  source_kind,
  agent_type,
  system_prompt,
  user_prompt_template,
  content_markdown,
  model_config,
  available_tools,
  priority
)
SELECT
  true,
  'Endomidface/Brow Lift',
  'endomidface_browlift',
  'Orientar mensagens e protocolos clínicos relacionados a Endomidface/Brow Lift',
  '1.0',
  'endomidface_browlift',
  'Orientar mensagens e protocolos clínicos relacionados a Endomidface/Brow Lift',
  'imported_docx',
  'MessageAgent',
  'Voce e o MessageAgent do SPE-M usando a skill endomidface_browlift.
Use o conteudo em content_markdown como fonte clinica/operacional primaria.
Nao invente orientacoes, riscos, documentos ou prazos que nao estejam no protocolo.
Gere mensagens em portugues do Brasil, com tom profissional, claro e empatico.',
  'Gere uma mensagem usando a skill endomidface_browlift.
Tipo de mensagem: {{message_type}}.
Paciente: {{patient_name}}.
Etapa do workflow: {{workflow_stage}}.
Procedimento: {{procedure_type}}.
Contexto adicional: {{context}}.',
  '# skill: endomidface_browlift
# version: 1.0
# procedure_scope: endomidface_browlift
# task: Orientar mensagens e protocolos clínicos relacionados a Endomidface/Brow Lift

## Conteúdo

| MODERN FACE INSTITUTE<br>CRM-[UF]: _______________ \| Tel: _______________ \| www.modernfaceinstitute.com.br |
| --- |

| TERMO DE CONSENTIMENTO INFORMADO<br>ENDOMIDFACE / BROW LIFT<br>Cod: TCI-EM-01 \| Versao: 1.0 \| Data: ___/___/______ |
| --- |

1. IDENTIFICACAO DO PACIENTE

| Nome completo: ________________________________ | Data de nascimento: ________________________________ |
| --- | --- |
| CPF: ________________________________ | RG: ________________________________ |
| Telefone: ________________________________ | E-mail: ________________________________ |
| Responsavel legal (se menor): ________________________________ | CPF do responsavel: ________________________________ |

2. DESCRICAO DO PROCEDIMENTO

O ENDOMIDFACE e um procedimento minimamente invasivo de rejuvenescimento do terco medio facial. Por meio de incisao intracapilar de 5cm — seguindo a linha imaginaria do canto lateral do olho ao canto lateral do nariz — o cirurgiao acessa os espacos pre-zigomatico e pre-maxilar promovendo a mobilizacao ascendente dos tecidos. O procedimento de BROW LIFT e frequentemente realizado na mesma abordagem, reposicionando a cauda da sobrancelha.
Incisao: intracapilar ~5cm, invisivel apos cicatrizacao. Duracao: 1,5–2,5h. Regime: ambulatorio cirurgico.

3. OBJETIVOS ESPERADOS

• Melhora do inicio do sulco nasogeniano
• Reducao do comprimento vertical da palpebra inferior
• Elevacao harmonica da cauda da sobrancelha
• Melhora de esclerochor e palpebra inferior secundaria
• Resultado natural com cicatriz intracapilar

| LIMITACAO IMPORTANTE: O ENDOMIDFACE NAO corrige jowls (flacidez mandibular) nem flacidez cervical. Essas condicoes requerem procedimentos complementares (Deep Neck, Deep Plane) — NAO incluidos neste consentimento. |
| --- |

RISCOS GERAIS DA ANESTESIA

Procedimento realizado sob anestesia geral ou sedacao com monitoramento de anestesiologista. Riscos gerais:

• Reacoes alergicas a medicamentos anestesicos
• Nauseas e vomitos no pos-operatorio imediato
• Dor de garganta por intubacao orotraqueal
• Alteracoes cardiovasculares transitorieas
• Em casos muito raros: complicacoes neurologicas ou risco a vida

Risco anestesico individual avaliado em consulta pre-operatoria obrigatoria com o anestesiologista.

5. RISCOS E COMPLICACOES ESPECIFICOS

| Complicacao / Risco | Frequencia | Gravidade |
| --- | --- | --- |
| Edema periorbitario prolongado | 5–15% | Leve |
| Equimose / quimose conjuntival | 5–20% | Leve |
| Hematoma | 1–3% | Moderada |
| Assimetria residual das sobrancelhas | 3–8% | Moderada |
| Lesao transitoria do ramo frontal do facial | <1% | Moderada |
| Hipoestesia do couro cabeludo | 5–10% | Leve |
| Alopecia na linha de incisao | 1–3% | Moderada |
| Recidiva (perda do resultado) | 3–10% | Moderada |
| Infeccao | <1% | Moderada |
| Resultado insatisfatorio | 2–5% | Moderada |

6. ALTERNATIVAS

• Toxina botulinica (Botox) — elevacao leve, temporaria 3–6 meses
• Fios de sustentacao — efeito limitado e temporario
• Procedimentos nao invasivos (HIFU, radiofrequencia) — efeito modesto
• Nao realizar qualquer procedimento

DECLARACOES DO PACIENTE

Declaro que:
• Li e compreendi todas as informacoes deste Termo.
• Tive oportunidade de formular perguntas e recebi respostas satisfatorias.
• Fui informado(a) sobre riscos, complicacoes possiveis e alternativas.
• Compreendo que resultados esteticos nao podem ser garantidos.
• Autorizo o registro fotografico para fins de documentacao do prontuario medico.
• Posso retirar este consentimento a qualquer momento ANTES do procedimento.
• Todas as informacoes sobre meu historico de saude sao verdadeiras.

Duvidas registradas durante a consulta:

_____________________________________________________________________________________
_____________________________________________________________________________________

| Assinatura do Paciente | Assinatura do Medico<br>CRM: ___________ | Testemunha<br>CPF: ___________ |
| --- | --- | --- |

Local e Data: _________________________________ Hora: _________

Documento em 2 vias: prontuario da clinica e paciente. Conforme CFM Res. 2217/2018 e LGPD (Lei 13.709/2018).

| MODERN FACE INSTITUTE<br>CRM-[UF]: _______________ \| Tel: _______________ \| www.modernfaceinstitute.com.br |
| --- |

| FICHA SPE-M DE AVALIACAO PRE-OPERATORIA<br>ENDOMIDFACE / BROW LIFT<br>Cod: FSPE-EM-01 \| Versao: 1.0 \| Data: ___/___/______ |
| --- |

I. IDENTIFICACAO

| Nome: _______________________________________ | Data Nasc.: __________ Idade: ___ |
| --- | --- |
| Telefone: __________________________________ | Data Consulta: ______________________ |

II. HISTORIA CLINICA

Queixa principal e expectativas:
___________________________________________________________________________
___________________________________________________________________________

Objetivos (marcar todos que se aplicam):

| ☐ | Lifting associado ao brow lifting |
| --- | --- |
| ☐ | Tratamento do terco medio facial |
| ☐ | Melhora da cauda da sobrancelha |
| ☐ | Reforco da palpebra inferior |
| ☐ | Melhora da linha da mandibula (regiao temporal) |
| ☐ | Outros: ___________________________________ |

Historico medico:

| Doencas pre-existentes:<br>_________________________________<br>_________________________________ | Medicacoes em uso:<br>_________________________________<br>_________________________________ |
| --- | --- |
| Alergias:<br>_________________________________ | Cirurgias previas (faciais/oftalmologicas):<br>_________________________________ |

| ☐ | Tabagismo — suspender 30 dias antes e apos<br>Interfere diretamente na cicatrizacao |
| --- | --- |
| ☐ | Historia de edema prolongado na palpebra inferior |
| ☐ | Historia de quimose recorrente |
| ☐ | Uso de anticoagulantes ou AAS |

III. EXAME FISICO FACIAL

| Tipo de Face:<br>[tabela aninhada omitida] | Qualidade da Pele:<br>[tabela aninhada omitida] | Grau de Flacidez:<br>[tabela aninhada omitida]<br>Face flacida: lig. zigomatico palpavel |
| --- | --- | --- |

Regiao frontal / periorbital:

| Palpebra Inferior:<br>[tabela aninhada omitida] | Cauda da Sobrancelha:<br>[tabela aninhada omitida]<br>Glabela:<br>[tabela aninhada omitida] |
| --- | --- |

Terco medio:

| ☐ | Arco zigomatico palpavel |
| --- | --- |
| ☐ | Ligamento zigomatico palpavel — borda inferior do zigoma (face flacida) |
| ☐ | Sulco nasogeniano: ausente \| leve \| moderado \| acentuado |
| ☐ | Comprimento vertical palpebra inferior aumentado — Endomidface promove encurtamento |

| JOWLS (flacidez mandibular): [ ] Ausente [ ] Leve [ ] Moderado [ ] Acentuado Endomidface NAO corrige Jowls. Se presente, considerar tecnica complementar e orientar o paciente. |
| --- |

Regiao temporal:

| ☐ | Cabelo suficiente na borda anterior da futura incisao |
| --- | --- |
| ☐ | Crista temporal palpavel \| nao palpavel |
| ☐ | Musculo temporal espesso \| delgado |

IV. PLANO CIRURGICO

| Procedimento:<br>[tabela aninhada omitida] | Vetor preferencial:<br>[tabela aninhada omitida]<br>Ponto de fixacao: quanto mais baixo, melhor resultado. |
| --- | --- |

Observacoes do cirurgiao:
___________________________________________________________________________
___________________________________________________________________________

Cirurgiao: _________________________ CRM: _____________ Data: ___/___/______

| MODERN FACE INSTITUTE<br>CRM-[UF]: _______________ \| Tel: _______________ \| www.modernfaceinstitute.com.br |
| --- |

| CHECKLIST PRE-OPERATORIO<br>ENDOMIDFACE / BROW LIFT<br>Cod: CPO-EM-01 \| Versao: 1.0 \| Data: ___/___/______ |
| --- |

| Paciente: _______________________ | Data Cirurgia: _______________________ | Cirurgiao: _______________________ |
| --- | --- | --- |

| Todos os itens criticos (marcados em vermelho) devem estar OK antes do dia da cirurgia. Itens pendentes podem resultar no adiamento do procedimento. |
| --- |

| FASE I | Avaliacao e Planejamento<br>Completar antes do dia da cirurgia |
| --- | --- |
| ☐ | Ficha SPE-M completa e assinada (FSPE-EM-01) |
| ☐ | Exame fisico facial documentado — flacidez, sobrancelha, palpebra |
| ☐ | Alinhamento de expectativas documentado — limitacoes explicadas (jowls, pescoco) |
| ☐ | TCI assinado (TCI-EM-01) |
| ☐ | Registro fotografico padronizado<br>Frontal, perfis D/E, obliqua, vista superior — fundo neutro |
| ☐ | Exames laboratoriais revisados<br>Hemograma, coagulograma, funcao renal, ECG se >40 anos |
| ☐ | Avaliacao anestesiologica realizada |
| FASE II | Orientacoes ao Paciente<br>1 a 2 semanas antes |
| ☐ | Suspensao de AAS e anticoagulantes — 7 a 14 dias antes |
| ☐ | Suspensao de fitoterapicos (omega-3, ginkgo, vitamina E) — 14 dias antes |
| ☐ | Suspensao de anti-inflamatorios — 7 dias antes |
| ☐ | Cessacao do tabagismo — minimo 30 dias antes |
| ☐ | Protocolo de preparo entregue por escrito ao paciente |
| ☐ | Acompanhante confirmado para alta e primeiras 48h |
| FASE III | Confirmacoes Finais<br>48h antes |
| ☐ | Contato de confirmacao — exames, saude e jejum |
| ☐ | Jejum confirmado: 8h solidos, 2h liquidos claros |
| ☐ | Pagamento ou financiamento aprovado confirmado |
| ☐ | Centro cirurgico e anestesiologista confirmados |
| ☐ | Kit instrumental especifico disponivel<br>Descoladores (reto curto, reto, bastao) + agulhas Reverdin/Casagrande |
| ☐ | Microporagem disponivel para pos-operatorio imediato |

Responsavel: _________________________ Data: ___/___/______

| MODERN FACE INSTITUTE<br>CRM-[UF]: _______________ \| Tel: _______________ \| www.modernfaceinstitute.com.br |
| --- |

| CHECKLIST INTRAOPERATORIO<br>ENDOMIDFACE / BROW LIFT<br>Cod: CIO-EM-01 \| Versao: 1.0 \| Data: ___/___/______ |
| --- |

| Paciente: _______________ | Data: ___/___/______ | Cirurgiao: _______________ | Auxiliar: ________________ |
| --- | --- | --- | --- |

| FASE I | SIGN IN — Antes da Anestesia<br>Protocolo OMS |
| --- | --- |
| ☐ | Identidade do paciente: nome + data nascimento confirmados |
| ☐ | Procedimento e lateralidade confirmados com toda a equipe |
| ☐ | TCI presente no prontuario |
| ☐ | Alergias e medicamentos revisados |
| ☐ | Risco de via aerea dificil avaliado pelo anestesiologista |
| FASE II | TIME OUT — Antes da Incisao<br>Protocolo OMS |
| ☐ | Toda a equipe: paciente, procedimento e sitio confirmados |
| ☐ | Profilaxia antibiotica administrada — hora e dose registradas |
| ☐ | Marcacoes pre-operatorias visiveis e confirmadas<br>Linha 5cm, crista temporal, pontos de fixacao |
| ☐ | Kit instrumental especifico esteril e disponivel<br>Descoladores reto curto / reto / bastao + agulhas Reverdin/Casagrande |
| ☐ | Iluminacao principal e afastadores iluminados verificados |
| FASE III | Procedimento — Incisao e Preparacao |
| ☐ | Incisao de 5cm — linha canto lateral olho ao canto lateral nariz |
| ☐ | Divulsao inicial com compressa e pinca — hemostasia pequenos vasos |
| ☐ | Retalho de fixacao confeccionado (0,5 a 1,0 cm) |
| FASE IV | Disseccao Temporal — Brow Lift |
| ☐ | Abertura fascia temporal superficial ate plano da fascia profunda |
| ☐ | Inicio descolamento posterior — descolador reto curto a 45° (seguranca) |
| ☐ | Liberacao completa da crista temporal posterior |
| ☐ | Liberacao aderencia temporal superior anterior |
| ☐ | Descolamento do arco zigomatico — descolador reto |
| ☐ | Disseccao subperiostal regiao malar — preservar nervo zigomatico-facial |
| FASE V | Fixacao Endomidface e Fechamento |
| ☐ | Pontos 1, 2 e 3 de fixacao executados — simetria bilateral verificada |
| ☐ | Hemostasia final conferida |
| ☐ | Fechamento por planos |
| ☐ | Microporagem aplicada |
| ☐ | Curativo aplicado |
| FASE VI | SIGN OUT<br>Protocolo OMS |
| ☐ | Contagem de compressas, agulhas e instrumentais — OK |
| ☐ | Relatorio cirurgico iniciado no prontuario |

Intercorrencias:
___________________________________________________________________________

Cirurgiao: ______________ Inicio: ______ Termino: ______ Data: ___/___/______

| MODERN FACE INSTITUTE<br>CRM-[UF]: _______________ \| Tel: _______________ \| www.modernfaceinstitute.com.br |
| --- |

| CHECKLIST POS-OPERATORIO<br>ENDOMIDFACE / BROW LIFT<br>Cod: CPP-EM-01 \| Versao: 1.0 \| Data: ___/___/______ |
| --- |

| Paciente: ___________________ | Data Cirurgia: ___/___/______ | Retorno: ___/___/______ ( )dia |
| --- | --- | --- |

| FASE I | Alta e Primeiras 48 Horas |
| --- | --- |
| ☐ | Prescricao de analgesia em horario fixo — primeiras 48h<br>Individualizar conforme historico do paciente |
| ☐ | Microporagem — manter minimo 48h<br>Fundamental para resultado e prevencao de edema |
| ☐ | Cabeceira elevada 30–45 graus durante o sono |
| ☐ | Compressas frias periorbitarias<br>20min aplicacao / 40min pausa — proteger pele com tecido fino |
| ☐ | Vigilancia de hematoma explicada ao paciente e acompanhante<br>Inchazo subito, dor intensa = retornar imediatamente |
| ☐ | Sinais de alerta por escrito: febre, secrecao, alteracoes visuais |
| ☐ | Contato de emergencia 24h fornecido |
| ☐ | Retorno 24–48h agendado |
| FASE II | Primeira Semana<br>Ate o 7o dia |
| ☐ | Evolucao de edema e equimose avaliada |
| ☐ | Quimose conjuntival — pode persistir 30–45 dias |
| ☐ | Microporagem e cuidados com incisao verificados |
| ☐ | Restricoes de atividade fisica reforcadas |
| ☐ | Assimetria precoce de sobrancelhas avaliada |
| ☐ | Retirada de pontos — 7 a 10 dias |
| FASE III | Primeiro Mes<br>30 dias |
| ☐ | Registro fotografico de resultado parcial |
| ☐ | Cicatriz intracapilar avaliada |
| ☐ | Resultado: posicao das sobrancelhas, terco medio |
| ☐ | Liberacao para atividades fisicas leves |
| ☐ | Discussao de expectativa: resultado definitivo em 6–12 meses |
| FASE IV | Seguimento |
| ☐ | Retorno 3 meses — resultado mais consolidado |
| ☐ | Retorno 6 meses — registro fotografico comparativo |
| ☐ | Retorno 12 meses — fechamento do caso, NPS, autorizacao de imagem |

Observacoes:
___________________________________________________________________________

Medico: ___________________ Data: ___/___/______ Assinatura: ___________________
',
  '{"model":"claude-sonnet-4-6","temperature":0.45,"max_tokens":2048,"top_p":0.9}'::jsonb,
  ARRAY['send_whatsapp', 'schedule_appointment']::text[],
  50
WHERE NOT EXISTS (
  SELECT 1 FROM public.ai_skills WHERE is_system = true AND slug = 'endomidface_browlift'
);

INSERT INTO public.ai_skills (
  is_system,
  name,
  slug,
  description,
  skill_version,
  procedure_scope,
  task,
  source_kind,
  agent_type,
  system_prompt,
  user_prompt_template,
  content_markdown,
  model_config,
  available_tools,
  priority
)
SELECT
  true,
  'Deep Neck',
  'deep_neck',
  'Orientar mensagens e protocolos clínicos relacionados a Deep Neck',
  '1.0',
  'deep_neck',
  'Orientar mensagens e protocolos clínicos relacionados a Deep Neck',
  'imported_docx',
  'MessageAgent',
  'Voce e o MessageAgent do SPE-M usando a skill deep_neck.
Use o conteudo em content_markdown como fonte clinica/operacional primaria.
Nao invente orientacoes, riscos, documentos ou prazos que nao estejam no protocolo.
Gere mensagens em portugues do Brasil, com tom profissional, claro e empatico.',
  'Gere uma mensagem usando a skill deep_neck.
Tipo de mensagem: {{message_type}}.
Paciente: {{patient_name}}.
Etapa do workflow: {{workflow_stage}}.
Procedimento: {{procedure_type}}.
Contexto adicional: {{context}}.',
  '# skill: deep_neck
# version: 1.0
# procedure_scope: deep_neck
# task: Orientar mensagens e protocolos clínicos relacionados a Deep Neck

## Conteúdo

| MODERN FACE INSTITUTE<br>CRM-[UF]: _______________ \| Tel: _______________ \| www.modernfaceinstitute.com.br |
| --- |

| TERMO DE CONSENTIMENTO INFORMADO<br>DEEP NECK (Cervicoplastia em Plano Profundo)<br>Cod: TCI-DN-01 \| Versao: 1.0 \| Data: ___/___/______ |
| --- |

1. IDENTIFICACAO DO PACIENTE

| Nome completo: ________________________________ | Data de nascimento: ________________________________ |
| --- | --- |
| CPF: ________________________________ | RG: ________________________________ |
| Telefone: ________________________________ | E-mail: ________________________________ |
| Responsavel legal (se menor): ________________________________ | CPF do responsavel: ________________________________ |

2. DESCRICAO DO PROCEDIMENTO

O Deep Neck e um procedimento de rejuvenescimento cervical em plano profundo. Atua sobre excesso de pele, gordura subplatismal, musculo platisma, bandas cervicais e ptose das glandulas submandibulares. O acesso e realizado por incisao submentoniana e/ou retroauricular, posicionadas em areas de camuflagem natural.

A abordagem profunda permite reposicionar as estruturas responsaveis pelo envelhecimento cervical ao inves de apenas tracionar a pele, resultando em aparencia mais natural e resultado mais duradouro.

Duracao: 2 a 4h. Pode ser combinado com Deep Plane ou Endomidface. Internacao: 1 dia.

3. OBJETIVOS ESPERADOS

• Definicao da linha cervicofacial
• Reducao ou eliminacao de papada
• Correcao de bandas platismais (pescoco de peru)
• Melhora do angulo cervicofacial
• Reposicionamento de glandulas submandibulares ptóticas quando indicado

RISCOS GERAIS DA ANESTESIA

Procedimento realizado sob anestesia geral ou sedacao com monitoramento de anestesiologista. Riscos gerais:

• Reacoes alergicas a medicamentos anestesicos
• Nauseas e vomitos no pos-operatorio imediato
• Dor de garganta por intubacao orotraqueal
• Alteracoes cardiovasculares transitorieas
• Em casos muito raros: complicacoes neurologicas ou risco a vida

Risco anestesico individual avaliado em consulta pre-operatoria obrigatoria com o anestesiologista.

5. RISCOS E COMPLICACOES ESPECIFICOS

| Complicacao / Risco | Frequencia | Gravidade |
| --- | --- | --- |
| Hematoma (primeiras 12–24h) | 3–6% | Moderada |
| Seroma | 2–4% | Leve |
| Infeccao | <2% | Moderada |
| Lesao nervo marginal mandibular (assimetria do sorriso) | 0,5–1% | Grave |
| Lesao nervo auricular magno (anestesia do lobulo) | 1–3% | Moderada |
| Cicatriz submentoniana visivel | 1–3% | Moderada |
| Disfagia transitoria | 1–2% | Leve |
| Assimetria cervical residual | 2–5% | Moderada |
| Alteracao de sensibilidade cervical | 5–10% | Leve |
| Recidiva das bandas platismais | 3–8% | Moderada |
| Tromboembolismo venoso | <0,5% | Grave |

| ATENCAO: Lesao do nervo marginal mandibular pode causar queda do angulo da boca e assimetria do sorriso. Na maioria dos casos e transitoria (semanas a meses). Lesoes permanentes sao muito raras com tecnica adequada. |
| --- |

6. ALTERNATIVAS

• Lipoaspiracao cervical isolada — indicada apenas quando ha excesso de gordura sem flacidez de pele
• Procedimentos nao cirurgicos: HIFU, radiofrequencia, fios — efeito limitado e temporario
• Nao realizar o procedimento

DECLARACOES DO PACIENTE

Declaro que:
• Li e compreendi todas as informacoes deste Termo.
• Tive oportunidade de formular perguntas e recebi respostas satisfatorias.
• Fui informado(a) sobre riscos, complicacoes possiveis e alternativas.
• Compreendo que resultados esteticos nao podem ser garantidos.
• Autorizo o registro fotografico para fins de documentacao do prontuario medico.
• Posso retirar este consentimento a qualquer momento ANTES do procedimento.
• Todas as informacoes sobre meu historico de saude sao verdadeiras.

Duvidas registradas durante a consulta:

_____________________________________________________________________________________
_____________________________________________________________________________________

| Assinatura do Paciente | Assinatura do Medico<br>CRM: ___________ | Testemunha<br>CPF: ___________ |
| --- | --- | --- |

Local e Data: _________________________________ Hora: _________

Documento em 2 vias: prontuario da clinica e paciente. Conforme CFM Res. 2217/2018 e LGPD (Lei 13.709/2018).

| MODERN FACE INSTITUTE<br>CRM-[UF]: _______________ \| Tel: _______________ \| www.modernfaceinstitute.com.br |
| --- |

| FICHA DE AVALIACAO PRE-OPERATORIA<br>DEEP NECK<br>Cod: FAV-DN-01 \| Versao: 1.0 \| Data: ___/___/______ |
| --- |

I. IDENTIFICACAO

| Nome: ____________________________________ | Data Nasc.: _________ Idade: ___ |
| --- | --- |
| Telefone: ________________________________ | Data Consulta: ___________________ |

II. HISTORIA CLINICA

Queixa principal e expectativas:
___________________________________________________________________________
___________________________________________________________________________

| ☐ | HAS — pressao controlada? Medicamento: ________________________ |
| --- | --- |
| ☐ | Diabetes — HbA1c: _____ |
| ☐ | Cardiopatia — avaliacao cardiologica obrigatoria |
| ☐ | Uso de anticoagulantes / AAS — suspender conforme protocolo |
| ☐ | Tabagismo — suspender 30 dias antes e apos |
| ☐ | Radioterapia previa na regiao cervical<br>Aumenta risco de complicacoes — avaliar indicacao |
| ☐ | IMC >30 — risco aumentado<br>Avaliar indicacao e expectativa de resultado |
| ☐ | Cirurgias previas no pescoco ou face — descrever: ________________________ |

III. EXAME FISICO CERVICAL

Analise da pele:

| ☐ | Qualidade: boa \| moderada \| fina \| espessa |
| --- | --- |
| ☐ | Flacidez cervical: leve \| moderada \| acentuada |
| ☐ | Excesso de pele: ausente \| leve \| moderado \| acentuado |

Analise da gordura e estrutura:

| ☐ | Gordura subcutanea: ausente \| leve \| moderada \| acentuada |
| --- | --- |
| ☐ | Gordura subplatismal: ausente \| presente \| acentuada |
| ☐ | Ptose das glandulas submandibulares: ausente \| presente |
| ☐ | Bandas platismais: ausentes \| leves \| moderadas \| acentuadas |
| ☐ | Angulo cervicofacial: adequado \| obtuso \| muito obtuso |
| ☐ | Mento: adequado \| hipoplasico — avaliar mentoplastia complementar |
| ☐ | Linfadenopatia cervical: ausente \| presente — investigar |

IV. PLANO CIRURGICO

| ☐ | Via de acesso: submentoniana \| retroauricular \| ambas |
| --- | --- |
| ☐ | Lipoaspiracao cervical associada |
| ☐ | Plicatura do platisma em linha media |
| ☐ | Abordagem das glandulas submandibulares |
| ☐ | Combinacao com Deep Plane |
| ☐ | Combinacao com Endomidface |
| ☐ | Mentoplastia complementar |

Observacoes do cirurgiao:
___________________________________________________________________________
___________________________________________________________________________

Cirurgiao: _________________________ CRM: _____________ Data: ___/___/______

| MODERN FACE INSTITUTE<br>CRM-[UF]: _______________ \| Tel: _______________ \| www.modernfaceinstitute.com.br |
| --- |

| CHECKLIST PRE-OPERATORIO<br>DEEP NECK<br>Cod: CPO-DN-01 \| Versao: 1.0 \| Data: ___/___/______ |
| --- |

| Paciente: _______________________ | Data Cirurgia: _______________________ | Cirurgiao: _______________________ |
| --- | --- | --- |

| FASE I | Avaliacao Clinica<br>Completar antes do dia da cirurgia |
| --- | --- |
| ☐ | Ficha de avaliacao cervical (FAV-DN-01) completa |
| ☐ | Expectativas alinhadas e limitacoes explicadas |
| ☐ | TCI assinado (TCI-DN-01) |
| ☐ | Fotografias: frontal, perfis D/E, obliqua, perfil com cabeca elevada |
| ☐ | Exames: hemograma, coagulograma, funcao renal, ECG (>40 anos) |
| ☐ | Avaliacao anestesiologica realizada |
| FASE II | Preparacao<br>7 a 14 dias antes |
| ☐ | Suspensao AAS/anticoagulantes — 7 a 14 dias |
| ☐ | Suspensao fitoterapicos — 14 dias |
| ☐ | Cessacao do tabagismo — minimo 30 dias antes |
| ☐ | Orientacao: cabeceira elevada apos cirurgia |
| ☐ | Orientacao: evitar movimentos bruscos do pescoco por 15 dias |
| ☐ | Acompanhante confirmado para 48h pos-alta |
| FASE III | Confirmacoes Finais — 48h antes |
| ☐ | Contato de confirmacao — exames e saude |
| ☐ | Jejum confirmado: 8h solidos, 2h liquidos claros |
| ☐ | Pagamento ou financiamento confirmado |
| ☐ | Anestesiologista e centro cirurgico confirmados |
| ☐ | Cinta cervical compressiva disponivel para pos-operatorio |

Responsavel: _________________________ Data: ___/___/______

| MODERN FACE INSTITUTE<br>CRM-[UF]: _______________ \| Tel: _______________ \| www.modernfaceinstitute.com.br |
| --- |

| CHECKLIST INTRAOPERATORIO<br>DEEP NECK<br>Cod: CIO-DN-01 \| Versao: 1.0 \| Data: ___/___/______ |
| --- |

| Paciente: _______________ | Data: ___/___/______ | Cirurgiao: _______________ | Inicio: _____ Termino: ____ |
| --- | --- | --- | --- |

| FASE I | SIGN IN — Antes da Anestesia<br>Protocolo OMS |
| --- | --- |
| ☐ | Identidade: nome + data nascimento |
| ☐ | Procedimento confirmado com equipe |
| ☐ | TCI no prontuario |
| ☐ | Alergias e medicamentos revisados |
| ☐ | PA verificada — dentro da meta |
| FASE II | TIME OUT — Antes da Incisao<br>Protocolo OMS |
| ☐ | Equipe confirma paciente, procedimento e sitio |
| ☐ | Profilaxia antibiotica administrada |
| ☐ | Anticoagulacao profilatica (TEV) conforme protocolo |
| ☐ | Campos posicionados — exposicao adequada do pescoco |
| FASE III | Procedimento Cirurgico |
| ☐ | Marcacao submentoniana e/ou retroauricular — com paciente sentado |
| ☐ | Infiltracao anestesica local com vasoconstritor — aguardar 10min |
| ☐ | Incisao submentoniana — preservar ligamento mandibular |
| ☐ | Lipoaspiracao cervical (quando indicada) — uniformidade verificada |
| ☐ | Disseccao e identificacao das bandas platismais medianas |
| ☐ | Plicatura platismal em linha media |
| ☐ | Abordagem subplatismal — gordura e glandulas conforme plano |
| ☐ | Nervo marginal mandibular identificado e preservado |
| ☐ | Incisao retroauricular executada (quando indicada) |
| ☐ | Tracao e reposicionamento tecidual conforme plano |
| ☐ | Hemostasia meticulosa verificada antes do fechamento |
| FASE IV | SIGN OUT<br>Protocolo OMS |
| ☐ | Contagem de compressas, agulhas e instrumentais — OK |
| ☐ | Drenos posicionados quando indicados |
| ☐ | Fechamento por planos |
| ☐ | Cinta cervical aplicada |
| ☐ | Relatorio cirurgico iniciado no prontuario |

Intercorrencias:
___________________________________________________________________________

Cirurgiao: __________________ Assinatura: ______________ Data: ___/___/______

| MODERN FACE INSTITUTE<br>CRM-[UF]: _______________ \| Tel: _______________ \| www.modernfaceinstitute.com.br |
| --- |

| CHECKLIST POS-OPERATORIO<br>DEEP NECK<br>Cod: CPP-DN-01 \| Versao: 1.0 \| Data: ___/___/______ |
| --- |

| Paciente: ___________________ | Data Cirurgia: ___/___/______ | Retorno: ___/___/______ ( )dia |
| --- | --- | --- |

| FASE I | Alta e Primeiras 48 Horas |
| --- | --- |
| ☐ | Prescricao analgesia e antibiotico fornecidas |
| ☐ | Cinta cervical — uso continuo por 48–72h |
| ☐ | Cabeceira elevada 45 graus por 5–7 dias |
| ☐ | Evitar movimentacao brusca do pescoco por 15 dias<br>Orientar por escrito |
| ☐ | Vigilancia de hematoma expansivo explicada<br>Inchazo subito, dor intensa = retornar |
| ☐ | Verificar simetria do sorriso nas primeiras 48h — nervo marginal |
| ☐ | Cuidados com drenos (quando presentes) — volume e aspecto |
| ☐ | Contato de emergencia 24h fornecido |
| ☐ | Retorno 24–48h agendado |
| FASE II | Primeira Semana |
| ☐ | Retirada de drenos — 24 a 72h |
| ☐ | Avaliacao equimose e edema cervicofacial |
| ☐ | Verificacao simetria do sorriso |
| ☐ | Retirada de pontos submentonianos — 7 dias |
| ☐ | Cinta cervical — manter uso para dormir por mais 2 semanas |
| FASE III | Primeiro Mes |
| ☐ | Registro fotografico parcial |
| ☐ | Avaliacao do angulo cervicofacial |
| ☐ | Cicatriz submentoniana — iniciar tratamento se necessario |
| ☐ | Liberacao progressiva para atividades fisicas |
| FASE IV | Seguimento |
| ☐ | Retorno 3 meses — resultado consolidado |
| ☐ | Retorno 6 meses — registro fotografico comparativo |
| ☐ | Retorno 12 meses — fechamento do caso, NPS |

Observacoes:
___________________________________________________________________________

Medico: ___________________ Data: ___/___/______ Assinatura: ___________________
',
  '{"model":"claude-sonnet-4-6","temperature":0.45,"max_tokens":2048,"top_p":0.9}'::jsonb,
  ARRAY['send_whatsapp', 'schedule_appointment']::text[],
  50
WHERE NOT EXISTS (
  SELECT 1 FROM public.ai_skills WHERE is_system = true AND slug = 'deep_neck'
);

INSERT INTO public.ai_skills (
  is_system,
  name,
  slug,
  description,
  skill_version,
  procedure_scope,
  task,
  source_kind,
  agent_type,
  system_prompt,
  user_prompt_template,
  content_markdown,
  model_config,
  available_tools,
  priority
)
SELECT
  true,
  'Deep Plane',
  'deep_plane',
  'Orientar mensagens e protocolos clínicos relacionados a Deep Plane',
  '1.0',
  'deep_plane',
  'Orientar mensagens e protocolos clínicos relacionados a Deep Plane',
  'imported_docx',
  'MessageAgent',
  'Voce e o MessageAgent do SPE-M usando a skill deep_plane.
Use o conteudo em content_markdown como fonte clinica/operacional primaria.
Nao invente orientacoes, riscos, documentos ou prazos que nao estejam no protocolo.
Gere mensagens em portugues do Brasil, com tom profissional, claro e empatico.',
  'Gere uma mensagem usando a skill deep_plane.
Tipo de mensagem: {{message_type}}.
Paciente: {{patient_name}}.
Etapa do workflow: {{workflow_stage}}.
Procedimento: {{procedure_type}}.
Contexto adicional: {{context}}.',
  '# skill: deep_plane
# version: 1.0
# procedure_scope: deep_plane
# task: Orientar mensagens e protocolos clínicos relacionados a Deep Plane

## Conteúdo

| MODERN FACE INSTITUTE<br>CRM-[UF]: _______________ \| Tel: _______________ \| www.modernfaceinstitute.com.br |
| --- |

| TERMO DE CONSENTIMENTO INFORMADO<br>LIFTING FACIAL — DEEP PLANE<br>Cod: TCI-DP-01 \| Versao: 1.0 \| Data: ___/___/______ |
| --- |

1. IDENTIFICACAO DO PACIENTE

| Nome completo: ________________________________ | Data de nascimento: ________________________________ |
| --- | --- |
| CPF: ________________________________ | RG: ________________________________ |
| Telefone: ________________________________ | E-mail: ________________________________ |
| Responsavel legal (se menor): ________________________________ | CPF do responsavel: ________________________________ |

2. DESCRICAO DO PROCEDIMENTO

O Lifting Facial em Plano Profundo (Deep Plane) e uma cirurgia de rejuvenescimento que repositiciona pele, tecido subcutaneo e SMAS com liberacao de ligamentos de retencao facial. Diferente de tecnicas superficiais, reposiciona os tecidos ao inves de apenas traciona-los — resultando em aparencia mais natural, menor tensao nas cicatrizes e resultado mais duradouro.

Incisoes: pré-auricular e retroauricular, ocultadas nas dobras naturais. Duracao: 3–5h. Internacao: 1 dia.

3. OBJETIVOS ESPERADOS

• Reducao de sulcos nasolabiais e flacidez do terco medio
• Melhora da linha mandibular (jowls)
• Reposicionamento natural do terco inferior da face
• Resultado duradouro com cicatrizes discritas

RISCOS GERAIS DA ANESTESIA

Procedimento realizado sob anestesia geral ou sedacao com monitoramento de anestesiologista. Riscos gerais:

• Reacoes alergicas a medicamentos anestesicos
• Nauseas e vomitos no pos-operatorio imediato
• Dor de garganta por intubacao orotraqueal
• Alteracoes cardiovasculares transitorieas
• Em casos muito raros: complicacoes neurologicas ou risco a vida

Risco anestesico individual avaliado em consulta pre-operatoria obrigatoria com o anestesiologista.

5. RISCOS E COMPLICACOES ESPECIFICOS

| Complicacao / Risco | Frequencia | Gravidade |
| --- | --- | --- |
| Hematoma (primeiras 24–48h) | 3–5% | Moderada |
| Seroma | 1–3% | Leve |
| Infeccao | <2% | Moderada |
| Lesao transitoria de ramo do nervo facial | 1–2% | Moderada |
| Lesao permanente de ramo do nervo facial | <0,5% | Grave |
| Alopecia nas cicatrizes | 1–3% | Moderada |
| Necrose cutanea | <2% | Grave |
| Cicatriz hipertrofica ou queloide | 1–3% | Moderada |
| Assimetria facial residual | 2–5% | Moderada |
| Alteracao de sensibilidade cutanea | 5–15% | Leve |
| Resultado insatisfatorio / necessidade de retoque | 3–8% | Moderada |
| Tromboembolismo venoso | <0,5% | Grave |

| FATORES DE RISCO: Tabagismo (suspender 30 dias antes e apos), HAS nao controlada, diabetes, uso de anticoagulantes, tendencia a queloides. Comunique qualquer uma dessas condicoes ao cirurgiao. |
| --- |

6. ALTERNATIVAS

• Tecnicas superficiais (SMAS) — efeito menor e menos duradouro
• Fios de sustentacao — efeito temporario e limitado
• Procedimentos nao invasivos (HIFU, radiofrequencia) — efeito modesto
• Nao realizar o procedimento

DECLARACOES DO PACIENTE

Declaro que:
• Li e compreendi todas as informacoes deste Termo.
• Tive oportunidade de formular perguntas e recebi respostas satisfatorias.
• Fui informado(a) sobre riscos, complicacoes possiveis e alternativas.
• Compreendo que resultados esteticos nao podem ser garantidos.
• Autorizo o registro fotografico para fins de documentacao do prontuario medico.
• Posso retirar este consentimento a qualquer momento ANTES do procedimento.
• Todas as informacoes sobre meu historico de saude sao verdadeiras.
• Fui informado(a) sobre o risco aumentado de complicacoes pelo tabagismo e concordo em manter a cessacao pelo periodo determinado.

Duvidas registradas durante a consulta:

_____________________________________________________________________________________
_____________________________________________________________________________________

| Assinatura do Paciente | Assinatura do Medico<br>CRM: ___________ | Testemunha<br>CPF: ___________ |
| --- | --- | --- |

Local e Data: _________________________________ Hora: _________

Documento em 2 vias: prontuario da clinica e paciente. Conforme CFM Res. 2217/2018 e LGPD (Lei 13.709/2018).

| MODERN FACE INSTITUTE<br>CRM-[UF]: _______________ \| Tel: _______________ \| www.modernfaceinstitute.com.br |
| --- |

| FICHA DE AVALIACAO PRE-OPERATORIA<br>DEEP PLANE (Lifting Facial)<br>Cod: FAV-DP-01 \| Versao: 1.0 \| Data: ___/___/______ |
| --- |

I. IDENTIFICACAO

| Nome: ____________________________________ | Data Nasc.: _________ Idade: ___ |
| --- | --- |
| Telefone: ________________________________ | Data Consulta: ___________________ |

II. HISTORIA CLINICA

Queixa principal e expectativas:
___________________________________________________________________________
___________________________________________________________________________

| ☐ | HAS — controlada? Medicamento: ____________________________ |
| --- | --- |
| ☐ | Diabetes — HbA1c: _____ |
| ☐ | Cardiopatia — avaliacao cardiologica pre-op obrigatoria |
| ☐ | Anticoagulantes / AAS |
| ☐ | Tabagismo — suspender 30 dias antes |
| ☐ | Cirurgias faciais previas — descrever: ____________________________ |
| ☐ | Tratamentos esteticos recentes (fios, preenchimento, toxina botulinica) |
| ☐ | Tendencia a queloides |

III. EXAME FISICO — ANALISE POR TERCOS

Terco superior:

| ☐ | Ptose frontal / sobrancelha: ausente \| leve \| moderada \| acentuada |
| --- | --- |
| ☐ | Sulcos frontais e glabelares: leves \| moderados \| acentuados |
| ☐ | Considerar Brow Lift ou Endomidface associado |

Terco medio:

| ☐ | Volume malar: adequado \| reduzido \| aumentado |
| --- | --- |
| ☐ | Sulco nasogeniano: ausente \| leve \| moderado \| acentuado |
| ☐ | Flacidez do terco medio: leve \| moderada \| acentuada |

Terco inferior / cervical:

| ☐ | Jowls: ausente \| leve \| moderado \| acentuado |
| --- | --- |
| ☐ | Flacidez cervical: ausente \| leve \| moderada — considerar Deep Neck associado |
| ☐ | Sulco labiomentual: leve \| moderado \| acentuado |

Pele e linha capilar:

| ☐ | Qualidade: boa \| moderada \| fina \| espessa \| fotodanificada |
| --- | --- |
| ☐ | Elasticidade: boa \| reduzida \| muito reduzida |
| ☐ | Linha capilar: preservada \| elevada \| recuo frontal |

IV. PLANO CIRURGICO

| ☐ | Deep Plane isolado |
| --- | --- |
| ☐ | Deep Plane + Deep Neck |
| ☐ | Deep Plane + Brow Lift |
| ☐ | Deep Plane + Endomidface |
| ☐ | Deep Plane + Blefaroplastia |
| ☐ | Lipoenxertia facial associada |
| ☐ | Outras associacoes: ________________________________ |

Vetor de tracao e observacoes:
___________________________________________________________________________
___________________________________________________________________________

Cirurgiao: _________________________ CRM: _____________ Data: ___/___/______

| MODERN FACE INSTITUTE<br>CRM-[UF]: _______________ \| Tel: _______________ \| www.modernfaceinstitute.com.br |
| --- |

| CHECKLIST PRE-OPERATORIO<br>DEEP PLANE (Lifting Facial)<br>Cod: CPO-DP-01 \| Versao: 1.0 \| Data: ___/___/______ |
| --- |

| Paciente: _______________________ | Data Cirurgia: _______________________ | Cirurgiao: _______________________ |
| --- | --- | --- |

| FASE I | Avaliacao e Planejamento |
| --- | --- |
| ☐ | Ficha de avaliacao (FAV-DP-01) completa |
| ☐ | Fotografias padronizadas: frontal, perfis D/E, obliqua D/E |
| ☐ | Expectativas alinhadas — resultado natural, nao artificial |
| ☐ | TCI assinado (TCI-DP-01) |
| ☐ | Exames: hemograma, coagulograma, funcao renal, glicemia, ECG |
| ☐ | Avaliacao cardiologica (HAS, cardiopatia ou >50 anos) |
| ☐ | Avaliacao anestesiologica realizada |
| FASE II | Preparacao<br>7 a 14 dias antes |
| ☐ | Suspensao AAS e anticoagulantes — 7 a 14 dias |
| ☐ | Suspensao fitoterapicos — 14 dias |
| ☐ | Suspensao anti-inflamatorios — 7 dias |
| ☐ | Cessacao do tabagismo — minimo 30 dias |
| ☐ | PA controlada — verificar medicamento vigente |
| ☐ | Acompanhante confirmado para 24–48h |
| FASE III | Confirmacoes Finais — 48h antes |
| ☐ | Contato de confirmacao — saude e exames |
| ☐ | Jejum: 8h solidos, 2h liquidos claros |
| ☐ | Pagamento / financiamento aprovado |
| ☐ | Centro cirurgico e anestesiologista confirmados |
| ☐ | Exames com resultados normais — liberar cirurgia |

Responsavel: _________________________ Data: ___/___/______

| MODERN FACE INSTITUTE<br>CRM-[UF]: _______________ \| Tel: _______________ \| www.modernfaceinstitute.com.br |
| --- |

| CHECKLIST INTRAOPERATORIO<br>DEEP PLANE (Lifting Facial)<br>Cod: CIO-DP-01 \| Versao: 1.0 \| Data: ___/___/______ |
| --- |

| Paciente: _______________ | Data: ___/___/______ | Cirurgiao: _______________ | Inicio: _____ Termino: ____ |
| --- | --- | --- | --- |

| FASE I | SIGN IN — Antes da Anestesia<br>Protocolo OMS |
| --- | --- |
| ☐ | Identidade: nome + data nascimento |
| ☐ | Procedimento e lateralidade confirmados |
| ☐ | TCI no prontuario |
| ☐ | Alergias e medicamentos revisados |
| ☐ | PA verificada — dentro da meta pre-operatoria |
| FASE II | TIME OUT — Antes da Incisao<br>Protocolo OMS |
| ☐ | Equipe confirma paciente, procedimento e sitio |
| ☐ | Profilaxia antibiotica administrada |
| ☐ | Anticoagulacao profilatica (TEV) |
| ☐ | Marcacao cirurgica visivel — realizada com paciente sentado |
| ☐ | Campos posicionados — exposicao adequada da face |
| FASE III | Procedimento — Fase Inicial |
| ☐ | Incisao pré-auricular — preservar tragus e linha capilar |
| ☐ | Disseccao subcutanea do retalho cutaneo |
| ☐ | Identificacao e preservacao do nervo auricular magno |
| FASE IV | Deep Plane — Fase Profunda |
| ☐ | Incisao do SMAS planejada |
| ☐ | Disseccao no plano sub-SMAS / pre-ligamentar |
| ☐ | Liberacao dos ligamentos retentores (malar, mandibular) |
| ☐ | Mobilizacao do retalho composto (pele + SMAS) |
| ☐ | Ramo zigomatico do nervo facial preservado |
| ☐ | Ramo bucal do nervo facial preservado |
| ☐ | Tracao na direcao planejada |
| ☐ | Fixacao do SMAS — sem tracao excessiva da pele |
| FASE V | SIGN OUT — Fechamento<br>Protocolo OMS |
| ☐ | Hemostasia — campo seco |
| ☐ | Resseccao do excesso cutaneo sem tensao na sutura |
| ☐ | Fechamento por planos |
| ☐ | Drenos posicionados (quando indicados) |
| ☐ | Curativo compressivo aplicado |
| ☐ | Contagem compressas e instrumentais — OK |
| ☐ | Relatorio cirurgico iniciado no prontuario |

Intercorrencias:
___________________________________________________________________________

Cirurgiao: __________________ Assinatura: ______________ Data: ___/___/______

| MODERN FACE INSTITUTE<br>CRM-[UF]: _______________ \| Tel: _______________ \| www.modernfaceinstitute.com.br |
| --- |

| CHECKLIST POS-OPERATORIO<br>DEEP PLANE (Lifting Facial)<br>Cod: CPP-DP-01 \| Versao: 1.0 \| Data: ___/___/______ |
| --- |

| Paciente: ___________________ | Data Cirurgia: ___/___/______ | Retorno: ___/___/______ ( )dia |
| --- | --- | --- |

| FASE I | Alta e Primeiras 48 Horas |
| --- | --- |
| ☐ | Prescricao analgesia, antibiotico e anti-inflamatorio |
| ☐ | Curativo compressivo — nao retirar por 24–48h |
| ☐ | Cabeceira 30–45 graus por 5–7 dias |
| ☐ | Evitar esforcos fisicos e atividades que elevem a PA |
| ☐ | Vigilancia de hematoma explicada<br>Inchazo subito, dor intensa, assimetria = retornar |
| ☐ | Sinais de alerta escritos: febre, secrecao, dor fora de controle |
| ☐ | Nao dirigir por 7 dias |
| ☐ | Evitar sol nas cicatrizes por 3 meses |
| ☐ | Contato de emergencia 24h fornecido |
| ☐ | Retorno 24–48h agendado |
| FASE II | Primeira Semana |
| ☐ | Retirada de drenos — 24 a 48h |
| ☐ | Edema, equimose e hematoma avaliados |
| ☐ | Incisoes sem infeccao ou deiscencia |
| ☐ | Retirada de pontos — 7 a 10 dias |
| ☐ | Alopecia transitoria na linha de incisao — orientar |
| FASE III | Primeiro Mes |
| ☐ | Registro fotografico parcial |
| ☐ | Assimetria residual avaliada |
| ☐ | Cicatrizes avaliadas — iniciar tratamento se necessario |
| ☐ | Liberacao para atividades fisicas leves |
| ☐ | Edema residual pode persistir ate 6 meses — orientar |
| FASE IV | Seguimento |
| ☐ | Retorno 3 meses — resultado mais definido |
| ☐ | Retorno 6 meses — registro fotografico |
| ☐ | Retorno 12 meses — resultado definitivo, NPS, autorizacao de imagem |

Observacoes:
___________________________________________________________________________

Medico: ___________________ Data: ___/___/______ Assinatura: ___________________
',
  '{"model":"claude-sonnet-4-6","temperature":0.45,"max_tokens":2048,"top_p":0.9}'::jsonb,
  ARRAY['send_whatsapp', 'schedule_appointment']::text[],
  50
WHERE NOT EXISTS (
  SELECT 1 FROM public.ai_skills WHERE is_system = true AND slug = 'deep_plane'
);

COMMENT ON COLUMN public.ai_skills.skill_version IS 'Versao declarada no cabecalho da skill.';
COMMENT ON COLUMN public.ai_skills.procedure_scope IS 'Escopo clinico da skill: all ou slug do procedimento.';
COMMENT ON COLUMN public.ai_skills.task IS 'Tarefa principal que o agente deve executar com esta skill.';
COMMENT ON COLUMN public.ai_skills.content_markdown IS 'Conteudo integral da skill convertido dos documentos fonte.';
COMMENT ON COLUMN public.ai_skills.source_kind IS 'Origem operacional da skill; nao substitui skill_source usado em agent_logs.';

COMMIT;
