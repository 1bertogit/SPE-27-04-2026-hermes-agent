import { describe, it, expect } from 'vitest';
import {
  PIPELINE_ORDER,
  TERMINAL_STATUSES,
  getNextStatuses,
  canTransition,
  checkSPEMBlock,
  checkCIOBlock,
  checkClinicalBlocks,
} from '../patientPipeline';

describe('PIPELINE_ORDER', () => {
  it('starts with lead and ends with encerrado', () => {
    expect(PIPELINE_ORDER[0]).toBe('lead');
    expect(PIPELINE_ORDER[PIPELINE_ORDER.length - 1]).toBe('encerrado');
  });

  it('has 10 states', () => {
    expect(PIPELINE_ORDER).toHaveLength(10);
  });
});

describe('TERMINAL_STATUSES', () => {
  it('contains cancelado, encerrado, nao_convertido', () => {
    expect(TERMINAL_STATUSES.has('cancelado')).toBe(true);
    expect(TERMINAL_STATUSES.has('encerrado')).toBe(true);
    expect(TERMINAL_STATUSES.has('nao_convertido')).toBe(true);
  });

  it('does not contain non-terminal states', () => {
    expect(TERMINAL_STATUSES.has('lead')).toBe(false);
    expect(TERMINAL_STATUSES.has('pos_op_ativo')).toBe(false);
  });
});

describe('getNextStatuses', () => {
  it('returns consulta_agendada + cancelado from lead', () => {
    const next = getNextStatuses('lead');
    expect(next).toContain('consulta_agendada');
    expect(next).toContain('cancelado');
    expect(next).toHaveLength(2);
  });

  it('returns nao_convertido + cancelado from consulta_realizada', () => {
    const next = getNextStatuses('consulta_realizada');
    expect(next).toContain('decidiu_operar');
    expect(next).toContain('nao_convertido');
    expect(next).toContain('cancelado');
  });

  it('returns empty array from cancelado', () => {
    expect(getNextStatuses('cancelado')).toEqual([]);
  });

  it('treats null as lead', () => {
    expect(getNextStatuses(null)).toEqual(getNextStatuses('lead'));
  });

  it('does not include cancelado for terminal states', () => {
    const next = getNextStatuses('encerrado');
    expect(next).not.toContain('cancelado');
  });
});

describe('canTransition — SC-04 forward only', () => {
  it('allows lead → consulta_agendada', () => {
    expect(canTransition('lead', 'consulta_agendada').allowed).toBe(true);
  });

  it('blocks backwards: consulta_realizada → lead', () => {
    const r = canTransition('consulta_realizada', 'lead');
    expect(r.allowed).toBe(false);
    expect(r.reason).toBeDefined();
  });

  it('blocks skipping: lead → decidiu_operar', () => {
    const r = canTransition('lead', 'decidiu_operar');
    expect(r.allowed).toBe(false);
  });

  it('allows any non-terminal → cancelado', () => {
    expect(canTransition('lead', 'cancelado').allowed).toBe(true);
    expect(canTransition('pos_op_ativo', 'cancelado').allowed).toBe(true);
  });

  it('blocks transition from terminal state (encerrado)', () => {
    const r = canTransition('encerrado', 'lead');
    expect(r.allowed).toBe(false);
    expect(r.reason).toContain('terminal');
  });

  it('treats null as lead', () => {
    expect(canTransition(null, 'consulta_agendada').allowed).toBe(true);
  });
});

describe('checkSPEMBlock — SC-12', () => {
  it('blocks when score is null', () => {
    const r = checkSPEMBlock(null, null);
    expect(r.allowed).toBe(false);
    expect(r.reason).toContain('SPE-M');
  });

  it('blocks when ratio < 60%', () => {
    const r = checkSPEMBlock(30, 64); // ~47%
    expect(r.allowed).toBe(false);
    expect(r.reason).toContain('SC-12');
    expect(r.reason).toContain('47%');
  });

  it('allows when ratio >= 60%', () => {
    expect(checkSPEMBlock(40, 64).allowed).toBe(true); // 62.5%
    expect(checkSPEMBlock(64, 64).allowed).toBe(true); // 100%
  });

  it('blocks when maxScore is 0', () => {
    const r = checkSPEMBlock(10, 0);
    expect(r.allowed).toBe(false);
    expect(r.reason).toContain('SPE-M');
  });
});

describe('checkCIOBlock — SC-13', () => {
  it('blocks when CIO not signed out', () => {
    const r = checkCIOBlock(false);
    expect(r.allowed).toBe(false);
    expect(r.reason).toContain('SC-13');
  });

  it('allows when CIO signed out', () => {
    expect(checkCIOBlock(true).allowed).toBe(true);
  });
});

describe('checkClinicalBlocks', () => {
  it('blocks pre_operatorio → cirurgia_agendada even with valid score (stub)', () => {
    const r = checkClinicalBlocks(
      { spemTotalScore: 50, spemMaxScore: 64, cioSignedOut: false },
      'pre_operatorio',
      'cirurgia_agendada',
    );
    expect(r.allowed).toBe(false);
    expect(r.reason).toContain('TCI');
  });

  it('blocks pre_operatorio → cirurgia_agendada when score is null (SPE-M first)', () => {
    const r = checkClinicalBlocks(
      { spemTotalScore: null, spemMaxScore: null, cioSignedOut: false },
      'pre_operatorio',
      'cirurgia_agendada',
    );
    expect(r.allowed).toBe(false);
    expect(r.reason).toContain('SPE-M');
  });

  it('blocks cirurgia_agendada → cirurgia_realizada without CIO', () => {
    const r = checkClinicalBlocks(
      { spemTotalScore: 50, spemMaxScore: 64, cioSignedOut: false },
      'cirurgia_agendada',
      'cirurgia_realizada',
    );
    expect(r.allowed).toBe(false);
    expect(r.reason).toContain('SC-13');
  });

  it('allows cirurgia_agendada → cirurgia_realizada with CIO', () => {
    const r = checkClinicalBlocks(
      { spemTotalScore: 50, spemMaxScore: 64, cioSignedOut: true },
      'cirurgia_agendada',
      'cirurgia_realizada',
    );
    expect(r.allowed).toBe(true);
  });

  it('allows transitions with no clinical blocks', () => {
    const r = checkClinicalBlocks(
      { spemTotalScore: null, spemMaxScore: null, cioSignedOut: false },
      'lead',
      'consulta_agendada',
    );
    expect(r.allowed).toBe(true);
  });
});
