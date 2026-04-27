import { EVALUATION_STEPS, getTotalMaxScore } from '../../data/evaluationCriteria';
import { getScoreColor } from '../../lib/utils';

interface EvalScoreSidebarProps {
  getTotalScore: () => number;
  getStepScore: (stepId: number) => number;
  getStepMaxScore: (stepId: number) => number;
}

export function EvalScoreSidebar({ getTotalScore, getStepScore, getStepMaxScore }: EvalScoreSidebarProps) {
  const totalScore = getTotalScore();
  const totalMax = getTotalMaxScore();
  const percentage = totalMax > 0 ? Math.round((totalScore / totalMax) * 100) : 0;

  const getRiskLabel = (pct: number): { label: string; color: string } => {
    if (pct >= 80) return { label: 'Risco Baixo - Apto', color: 'text-editorial-sage' };
    if (pct >= 60) return { label: 'Risco Moderado - Avaliar', color: 'text-editorial-gold' };
    if (pct >= 40) return { label: 'Risco Alto - Cautela', color: 'text-editorial-gold-dark' };
    return { label: 'Risco Elevado - Contraindicado', color: 'text-editorial-rose' };
  };

  const risk = getRiskLabel(percentage);

  const circumference = 2 * Math.PI * 45;
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;
  const strokeColor =
    percentage >= 80
      ? '#6B7F6B'
      : percentage >= 60
      ? '#C5A059'
      : percentage >= 40
      ? '#A8873D'
      : '#9B4D4D';

  return (
    <div className="bg-editorial-light dark:bg-editorial-navy/60 border border-editorial-cream dark:border-editorial-navy-light/20 rounded-lg p-6 space-y-6 sticky top-24">
      <div>
        <h3 className="text-sm font-semibold font-serif text-editorial-navy-light uppercase tracking-wider mb-4">
          Score Total
        </h3>
        <div className="flex justify-center">
          <div className="relative w-32 h-32">
            <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="45" fill="none" stroke="#E8E6E1" strokeWidth="6" />
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke={strokeColor}
                strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray={strokeDasharray}
                strokeDashoffset={strokeDashoffset}
                className="transition-all duration-500"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-bold font-serif text-editorial-navy dark:text-editorial-cream">{percentage}%</span>
              <span className="text-xs text-editorial-muted">{totalScore}/{totalMax}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-editorial-cream dark:border-editorial-navy-light/20 pt-4">
        <p className={`text-sm font-medium ${risk.color}`}>{risk.label}</p>
      </div>

      <div className="border-t border-editorial-cream dark:border-editorial-navy-light/20 pt-4 space-y-3">
        <h4 className="text-xs font-semibold text-editorial-muted uppercase tracking-wider">
          Detalhamento por Etapa
        </h4>
        {EVALUATION_STEPS.map((step) => {
          const score = getStepScore(step.id);
          const max = getStepMaxScore(step.id);
          const pct = max > 0 ? (score / max) * 100 : 0;

          return (
            <div key={step.id}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-editorial-muted">{step.title}</span>
                <span className={`text-xs font-medium ${getScoreColor(score, max)}`}>
                  {score}/{max}
                </span>
              </div>
              <div className="h-1.5 bg-editorial-cream dark:bg-editorial-navy-light/30 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${pct}%`,
                    backgroundColor: pct >= 80 ? '#6B7F6B' : pct >= 50 ? '#C5A059' : '#9B4D4D',
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
