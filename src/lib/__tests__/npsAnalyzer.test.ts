import { describe, it, expect } from 'vitest';
import {
  calculateNPS,
  shouldCreateReferral,
  getNPSCategory,
  getNPSColor,
  calculateResponseRate,
  generateNPSTrend
} from '../npsAnalyzer';
import type { SatisfactionSurvey } from '../types';

describe('calculateNPS', () => {
  it('returns zero for empty surveys', () => {
    const result = calculateNPS([]);
    expect(result).toEqual({ promoters: 0, passives: 0, detractors: 0, total: 0, npsScore: 0 });
  });

  it('correctly calculates NPS with mixed scores', () => {
    const surveys: Partial<SatisfactionSurvey>[] = [
      { nps_score: 10 },
      { nps_score: 9 },
      { nps_score: 8 },
      { nps_score: 7 },
      { nps_score: 6 },
      { nps_score: 5 },
      { nps_score: 0 }
    ];
    const result = calculateNPS(surveys as SatisfactionSurvey[]);
    expect(result.promoters).toBe(2);
    expect(result.passives).toBe(2);
    expect(result.detractors).toBe(3);
    expect(result.total).toBe(7);
    expect(result.npsScore).toBeCloseTo(-14.29, 1);
  });

  it('returns 100 for all promoters', () => {
    const surveys: Partial<SatisfactionSurvey>[] = [
      { nps_score: 10 },
      { nps_score: 9 },
      { nps_score: 10 }
    ];
    const result = calculateNPS(surveys as SatisfactionSurvey[]);
    expect(result.npsScore).toBe(100);
    expect(result.promoters).toBe(3);
  });

  it('returns -100 for all detractors', () => {
    const surveys: Partial<SatisfactionSurvey>[] = [
      { nps_score: 6 },
      { nps_score: 3 },
      { nps_score: 0 }
    ];
    const result = calculateNPS(surveys as SatisfactionSurvey[]);
    expect(result.npsScore).toBe(-100);
    expect(result.detractors).toBe(3);
  });

  it('ignores surveys without nps_score', () => {
    const surveys: Partial<SatisfactionSurvey>[] = [
      { nps_score: 10 },
      { nps_score: null },
      { nps_score: 9 }
    ];
    const result = calculateNPS(surveys as SatisfactionSurvey[]);
    expect(result.total).toBe(2);
    expect(result.npsScore).toBe(100);
  });
});

describe('shouldCreateReferral', () => {
  it('returns true for promoters (9-10)', () => {
    expect(shouldCreateReferral(9)).toBe(true);
    expect(shouldCreateReferral(10)).toBe(true);
  });

  it('returns false for passives (7-8)', () => {
    expect(shouldCreateReferral(7)).toBe(false);
    expect(shouldCreateReferral(8)).toBe(false);
  });

  it('returns false for detractors (0-6)', () => {
    expect(shouldCreateReferral(6)).toBe(false);
    expect(shouldCreateReferral(0)).toBe(false);
  });
});

describe('getNPSCategory', () => {
  it('returns promoter for 9-10', () => {
    expect(getNPSCategory(9)).toBe('promoter');
    expect(getNPSCategory(10)).toBe('promoter');
  });

  it('returns passive for 7-8', () => {
    expect(getNPSCategory(7)).toBe('passive');
    expect(getNPSCategory(8)).toBe('passive');
  });

  it('returns detractor for 0-6', () => {
    expect(getNPSCategory(6)).toBe('detractor');
    expect(getNPSCategory(0)).toBe('detractor');
  });
});

describe('getNPSColor', () => {
  it('returns sage for promoters', () => {
    expect(getNPSColor(9)).toBe('#6B7F6B');
    expect(getNPSColor(10)).toBe('#6B7F6B');
  });

  it('returns gold for passives', () => {
    expect(getNPSColor(7)).toBe('#C5A059');
    expect(getNPSColor(8)).toBe('#C5A059');
  });

  it('returns rose for detractors', () => {
    expect(getNPSColor(6)).toBe('#9B4D4D');
    expect(getNPSColor(0)).toBe('#9B4D4D');
  });
});

describe('calculateResponseRate', () => {
  it('returns 0 when no surveys sent', () => {
    expect(calculateResponseRate(0, 0)).toBe(0);
  });

  it('calculates correct percentage', () => {
    expect(calculateResponseRate(100, 50)).toBe(50);
    expect(calculateResponseRate(100, 25)).toBe(25);
    expect(calculateResponseRate(4, 1)).toBe(25);
  });

  it('handles 100% response rate', () => {
    expect(calculateResponseRate(10, 10)).toBe(100);
  });
});

describe('generateNPSTrend', () => {
  it('returns empty array when no surveys', () => {
    const trend = generateNPSTrend([], 30);
    expect(trend).toEqual([]);
  });

  it('groups surveys by date', () => {
    const today = new Date().toISOString();
    const surveys: Partial<SatisfactionSurvey>[] = [
      { nps_score: 10, created_at: today },
      { nps_score: 9, created_at: today },
      { nps_score: 5, created_at: today }
    ];
    const trend = generateNPSTrend(surveys as SatisfactionSurvey[], 30);
    expect(trend.length).toBeGreaterThan(0);
    expect(trend[0].responseCount).toBe(3);
  });
});
