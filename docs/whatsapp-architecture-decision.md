# ADR: Arquitetura WhatsApp — Baileys (hoje) vs 360dialog (futuro)

**Data**: 2026-04-17
**Status**: Aceito
**Decisão**: Manter Baileys. Migrar para 360dialog quando qualquer um dos 5 gatilhos listados disparar.

---

## 1. Estado atual (factual)

- 1 bridge Node+Baileys v7 rodando localmente (porta 3002), 1 chip (`5531983096545`), 1 tenant
- 3 fluxos de alerta MVP implementados, 15 pendentes
- 6 templates de mensagem hard-coded em `supabase/functions/send-whatsapp/index.ts:16-29`
- Webhook já recebe payload no shape Meta-compatible (forward da bridge mimetizando 360dialog intencionalmente)
- Exposição via ngrok temporário

## 2. Comparação técnica

| Dimensão | Baileys | 360dialog |
|---|---|---|
| Status | Unofficial, reverse-engineered | BSP Meta oficial |
| Custo fixo | Só chip (~R$50/mês) | ~€49/mês base |
| Custo variável | Zero | Per-conversation (Meta 2024+) |
| Risco de ban | Alto — heurísticas antispam | Zero |
| Liberdade de texto | Total (qualquer mensagem) | Templates pré-aprovados fora da janela de 24h após última msg do paciente |
| Iteração de mensagem | Editar código → redeploy → enviar (minutos) | Submit à Meta → review 24-72h |
| Infra | Processo Node 24/7 local | Chamada HTTP stateless |
| Multi-tenancy | 1 chip por tenant ⇒ N processos bridge | 1 API key por tenant |
| Compliance LGPD/CFM | Cinza — API não oficial em contexto médico | Forte — trilha oficial auditável |

## 3. Gatilhos de migração

A migração dispara no primeiro **evento**, não em data-calendário:

1. **Onboarding do 2º tenant** — duas clínicas num mesmo chip = branding misturado + violação implícita de LGPD (paciente da clínica A recebe do número da B).
2. **≥300 mensagens outbound/dia no chip** — zona empírica onde ban de chips novos escala (varia por reputação; considere ajustar pra baixo até o chip "amadurecer").
3. **≥50 pacientes simultâneos em `pos_op_ativo`** — volume cruza patamar onde o custo de um ban vira incidente clínico (alertas críticos param de sair por dias).
4. **Primeiro cliente pagante com SLA contratualizado** — SLA sobre API não oficial é passivo jurídico. Breach = risco contratual.
5. **Incidente de ban no chip atual** — qualquer suspensão força migração imediata.

## 4. Por que **não** migrar agora

- **Custo de iteração**: 15 fluxos pendentes ainda vão mudar copy, timing, params. Templates 360dialog exigem aprovação Meta (24-72h por template × N revisões). Baileys = ciclo de minutos.
- **Forma ainda desconhecida**: templates lockam estrutura de mensagem. Committar antes de descobrir como os fluxos se comportam em produção é prematuro.
- **Custo monetário zero do Baileys** até o volume justificar billing 360dialog.

Baileys hoje é **protótipo pago em risco** — trade velocidade por estabilidade enquanto se descobre o produto.

## 5. Deltas de código na migração

| Arquivo / artefato | Mudança | Esforço |
|---|---|---|
| `send-whatsapp/index.ts` | Substituir catálogo local `MESSAGE_TEMPLATES` por nomes de templates 360dialog. Trocar `buildMessage()` por payload estruturado `components.[].parameters[]`. POST para `https://waba-v2.360dialog.io/messages` com header `D360-API-KEY`. | **Alto** — reescreve função inteira |
| `webhook-whatsapp/index.ts` | Parse do body intacto (shape já compatível). Trocar validação Bearer por verificação HMAC conforme docs 360dialog. | **Baixo** — ~30 linhas |
| `process-alerts/index.ts` | Nenhuma. | **Zero** |
| `alert_definitions.template_name` | Dados na tabela precisam casar nomes exatos dos templates aprovados na Meta. | **Baixo** — migration de data |
| 15 templates operacionais | Formalizar copy em estrutura 360dialog (header/body/vars numeradas). Submit + aprovação Meta. | **Médio** — operacional |
| Bridge `~/Dev/projetos/spe-m-whatsapp-bridge/` | Desativar processo, arquivar repo. | Trivial |
| Env / secrets | `+D360_API_KEY`, `−WEBHOOK_SHARED_SECRET`, `−WHATSAPP_BRIDGE_URL`. | Trivial |

**Total estimado**: 1-2 dias de dev + 3-7 dias calendário em aprovação Meta.

## 6. Pontos de atenção

- **`keyword_critical_alert` vai para o médico**, que nunca iniciou conversa com o chip — sempre fora da janela 24h → sempre template. Templatizável sem perda.
- **AI-generated (Fase 4)**: templates conflitam com "mensagem livre gerada por LLM". Duas saídas: (a) AI preenche apenas variáveis de template estruturado; (b) AI só opera na janela 24h. Decisão de produto que precisa ser feita em Fase 4, não agora.
- **Pacientes que não respondem**: nunca entram na janela 24h → toda comunicação fora dela é template obrigatoriamente.
- **Portabilidade do chip**: `5531983096545` no Baileys pode ser rejeitado pela Meta em onboarding 360dialog por histórico "suspeito". Considerar um chip novo dedicado quando migrar.

## 7. Ações complementares que preservam o investimento futuro

- Escrever copy dos 15 fluxos restantes já usando variáveis indexadas `{0}`, `{1}` mesmo quando desnecessário. Texto escrito assim é "template-ready" — migração vira mecânica.
- Criar conta 360dialog em sandbox (gratuito) pra ter API keys prontas. Quando um gatilho disparar, dev começa a migração na mesma hora, sem fricção de onboarding comercial.
- Todo fluxo novo desenhado deve considerar: "consegue virar template 360dialog sem perda semântica?" Se não, repensar.

## 8. Pushback flags — onde a recomendação pode estar errada

- **Risco de ban já agora**: se o chip já está em uso com pacientes reais (não só testes), a probabilidade de ban não é tão baixa quanto assumido. Subir prioridade.
- **Auditoria regulatória agendada**: se há auditoria CFM/LGPD prevista, Baileys é red flag. Verificar.
- **Chip já é Business**: se `5531983096545` está registrado como WhatsApp Business (não personal), Baileys tem risco extra de detecção.

---

## Referências

- Bridge Baileys: `~/Dev/projetos/spe-m-whatsapp-bridge/`
- Edge Functions WhatsApp: `supabase/functions/send-whatsapp/`, `webhook-whatsapp/`, `process-alerts/`
- Política operacional dos gatilhos: `CLAUDE.md` → "Política de migração WhatsApp"
