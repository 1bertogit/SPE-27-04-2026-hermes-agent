import { describe, expect, it } from 'vitest';
import { analyzePatientResponse } from '../../../supabase/functions/_shared/response-analyzer';

describe('analyzePatientResponse', () => {
  it('classifica keyword critica como alerta bloqueado para resposta automatica', () => {
    const result = analyzePatientResponse({
      message: 'Doutor, estou com febre alta e saindo pus da ferida',
    });

    expect(result.urgency).toBe('critical');
    expect(result.intent).toBe('alert');
    expect(result.sentiment).toBe('negative');
    expect(result.suggested_action).toBe('escalate_to_doctor');
    expect(result.clinical_guardrail.blocked).toBe(true);
    expect(result.clinical_guardrail.automated_response_allowed).toBe(false);
    expect(result.matched_keywords).toContain('febre alta');
  });

  it('classifica sintoma nao critico como urgente com revisao humana', () => {
    const result = analyzePatientResponse({
      message: 'Estou com bastante náusea depois do remédio',
    });

    expect(result.urgency).toBe('urgent');
    expect(result.intent).toBe('alert');
    expect(result.suggested_action).toBe('create_alert');
    expect(result.clinical_guardrail.require_human_review).toBe(true);
    expect(result.topics).toContain('náusea');
    expect(result.topics).toContain('medicação');
  });

  it('classifica agradecimento sem sintomas como positivo e sem bloqueio', () => {
    const result = analyzePatientResponse({
      message: 'Obrigado, está tudo ótimo e melhorou bastante',
    });

    expect(result.urgency).toBe('normal');
    expect(result.intent).toBe('gratitude');
    expect(result.sentiment).toBe('positive');
    expect(result.suggested_action).toBe('none');
    expect(result.clinical_guardrail.blocked).toBe(false);
  });

  it('classifica pergunta operacional como orientacao sem alerta clinico', () => {
    const result = analyzePatientResponse({
      message: 'Quando posso voltar para o retorno?',
    });

    expect(result.urgency).toBe('normal');
    expect(result.intent).toBe('question');
    expect(result.suggested_action).toBe('reply_with_guidance');
    expect(result.topics).toContain('agendamento');
  });
});
