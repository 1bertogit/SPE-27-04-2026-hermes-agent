/**
 * Detecção de palavras-chave críticas em mensagens de pacientes (pós-operatório).
 * Cobertura 100% obrigatória — segurança clínica.
 */

export interface KeywordCheckResult {
  critical: boolean;
  keyword: string | null;
  normalised: string;
}

function stripAccents(s: string): string {
  return s.normalize('NFD').replace(/\p{M}/gu, '');
}

export function normaliseForMatch(text: string): string {
  return stripAccents(text)
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

const CRITICAL_PHRASES: readonly [string, string][] = [
  ['nao consigo fechar o olho', 'não consigo fechar o olho'],
  ['inchaco muito grande', 'inchaço muito grande'],
  ['abriu a cirurgia', 'abriu a cirurgia'],
  ['perdendo sensacao', 'perdendo sensação'],
  ['febre alta', 'febre alta'],
  ['dor forte', 'dor forte'],
];

const CRITICAL_WORDS: readonly [string, string][] = [
  ['sangramento', 'sangramento'],
  ['sangrando', 'sangrando'],
  ['hematoma', 'hematoma'],
  ['secrecao', 'secreção'],
  ['paralisia', 'paralisia'],
  ['sangue', 'sangue'],
  ['febre', 'febre'],
  ['pus', 'pus'],
  ['abertura', 'abertura'],
  ['hemorragia', 'hemorragia'],
  ['desmaio', 'desmaio'],
  ['convulsao', 'convulsão'],
  ['infeccao', 'infecção'],
  ['necrose', 'necrose'],
  ['cianose', 'cianose'],
  ['isquemia', 'isquemia'],
  ['choque', 'choque'],
  ['taquicardia', 'taquicardia'],
];

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function checkCriticalKeywords(text: string): KeywordCheckResult {
  const normalised = normaliseForMatch(text);

  for (const [key, display] of CRITICAL_PHRASES) {
    if (normalised.includes(key)) {
      return { critical: true, keyword: display, normalised };
    }
  }

  const words = [...CRITICAL_WORDS].sort((a, b) => b[0].length - a[0].length);
  for (const [key, display] of words) {
    const re = new RegExp(`(^|[^a-z0-9])${escapeRe(key)}([^a-z0-9]|$)`);
    if (re.test(normalised)) {
      return { critical: true, keyword: display, normalised };
    }
  }

  return { critical: false, keyword: null, normalised };
}

export function getCriticalKeywords(): readonly string[] {
  const out = new Set<string>();
  for (const [, k] of CRITICAL_PHRASES) out.add(k);
  for (const [, k] of CRITICAL_WORDS) out.add(k);
  out.add('falta de ar');
  out.add('taquipneia');
  out.add('pele azulada');
  out.add('hipotensao');
  out.add('edema agudo');
  return Object.freeze([...out].sort((a, b) => a.localeCompare(b, 'pt')));
}
