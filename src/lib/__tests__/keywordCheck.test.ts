import { describe, it, expect } from 'vitest';
import {
  normaliseForMatch,
  checkCriticalKeywords,
  getCriticalKeywords,
} from '../keywordCheck';

describe('normaliseForMatch', () => {
  it('lowercases and trims', () => {
    expect(normaliseForMatch('  HELLO  ')).toBe('hello');
  });

  it('strips accents', () => {
    expect(normaliseForMatch('infecção')).toBe('infeccao');
    expect(normaliseForMatch('convulsão')).toBe('convulsao');
  });

  it('collapses multiple spaces', () => {
    expect(normaliseForMatch('febre   alta')).toBe('febre alta');
  });
});

describe('checkCriticalKeywords — phrases', () => {
  it('detects "não consigo fechar o olho" with accents', () => {
    const r = checkCriticalKeywords('Doutor, não consigo fechar o olho direito');
    expect(r.critical).toBe(true);
    expect(r.keyword).toBe('não consigo fechar o olho');
  });

  it('detects "febre alta"', () => {
    const r = checkCriticalKeywords('Estou com febre alta desde ontem');
    expect(r.critical).toBe(true);
    expect(r.keyword).toBe('febre alta');
  });

  it('detects "dor forte"', () => {
    const r = checkCriticalKeywords('Sinto dor forte no local');
    expect(r.critical).toBe(true);
    expect(r.keyword).toBe('dor forte');
  });

  it('detects "inchaço muito grande"', () => {
    const r = checkCriticalKeywords('Tenho um inchaço muito grande');
    expect(r.critical).toBe(true);
    expect(r.keyword).toBe('inchaço muito grande');
  });
});

describe('checkCriticalKeywords — single words', () => {
  it('detects "sangramento"', () => {
    const r = checkCriticalKeywords('Tive um sangramento agora');
    expect(r.critical).toBe(true);
    expect(r.keyword).toBe('sangramento');
  });

  it('detects "pus"', () => {
    const r = checkCriticalKeywords('Está saindo pus da ferida');
    expect(r.critical).toBe(true);
    expect(r.keyword).toBe('pus');
  });

  it('detects "hematoma" with surrounding text', () => {
    const r = checkCriticalKeywords('Apareceu um hematoma no rosto');
    expect(r.critical).toBe(true);
    expect(r.keyword).toBe('hematoma');
  });

  it('detects accented word "secreção"', () => {
    const r = checkCriticalKeywords('Tem secreção amarelada');
    expect(r.critical).toBe(true);
    expect(r.keyword).toBe('secreção');
  });

  it('does not false-positive on substring match', () => {
    const r = checkCriticalKeywords('O choquei contra a mesa');
    expect(r.critical).toBe(false);
  });
});

describe('checkCriticalKeywords — safe messages', () => {
  it('returns false for normal message', () => {
    const r = checkCriticalKeywords('Está tudo bem, obrigado doutor');
    expect(r.critical).toBe(false);
    expect(r.keyword).toBeNull();
  });

  it('returns false for empty string', () => {
    const r = checkCriticalKeywords('');
    expect(r.critical).toBe(false);
  });
});

describe('getCriticalKeywords', () => {
  it('returns a frozen sorted array', () => {
    const keywords = getCriticalKeywords();
    expect(Array.isArray(keywords)).toBe(true);
    expect(Object.isFrozen(keywords)).toBe(true);
    expect(keywords.length).toBeGreaterThan(20);
  });

  it('includes both phrase and word keywords', () => {
    const keywords = getCriticalKeywords();
    expect(keywords).toContain('sangramento');
    expect(keywords).toContain('febre alta');
    expect(keywords).toContain('edema agudo');
  });
});
