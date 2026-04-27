import type { SatisfactionSurvey } from './types';

export interface NPSBreakdown {
  promoters: number;
  passives: number;
  detractors: number;
  total: number;
  npsScore: number;
}

export interface NPSTrend {
  date: string;
  npsScore: number;
  responseCount: number;
}

export function calculateNPS(surveys: SatisfactionSurvey[]): NPSBreakdown {
  const validSurveys = surveys.filter(s => s.nps_score !== null);
  
  if (validSurveys.length === 0) {
    return { promoters: 0, passives: 0, detractors: 0, total: 0, npsScore: 0 };
  }

  const promoters = validSurveys.filter(s => s.nps_score! >= 9).length;
  const detractors = validSurveys.filter(s => s.nps_score! <= 6).length;
  const passives = validSurveys.filter(s => s.nps_score! >= 7 && s.nps_score! <= 8).length;
  const total = validSurveys.length;

  const npsScore = ((promoters - detractors) / total) * 100;

  return {
    promoters,
    passives,
    detractors,
    total,
    npsScore: Math.round(npsScore * 100) / 100
  };
}

export function shouldCreateReferral(npsScore: number): boolean {
  return npsScore >= 9;
}

export function getNPSCategory(score: number): 'promoter' | 'passive' | 'detractor' {
  if (score >= 9) return 'promoter';
  if (score <= 6) return 'detractor';
  return 'passive';
}

export function getNPSColor(score: number): string {
  if (score >= 9) return '#6B7F6B'; // sage
  if (score <= 6) return '#9B4D4D'; // rose
  return '#C5A059'; // gold
}

export function calculateResponseRate(sent: number, completed: number): number {
  if (sent === 0) return 0;
  return Math.round((completed / sent) * 100 * 100) / 100;
}

export function generateNPSTrend(
  surveys: SatisfactionSurvey[],
  days: number = 30
): NPSTrend[] {
  const today = new Date();
  const trend: NPSTrend[] = [];

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];

    const daySurveys = surveys.filter(s => {
      if (!s.created_at) return false;
      const sDate = new Date(s.created_at).toISOString().split('T')[0];
      return sDate === dateStr && s.nps_score !== null;
    });

    if (daySurveys.length > 0) {
      const breakdown = calculateNPS(daySurveys);
      trend.push({
        date: dateStr,
        npsScore: breakdown.npsScore,
        responseCount: daySurveys.length
      });
    }
  }

  return trend;
}
