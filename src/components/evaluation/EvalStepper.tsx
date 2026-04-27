import { Check } from 'lucide-react';
import { EVALUATION_STEPS } from '../../data/evaluationCriteria';

interface EvalStepperProps {
  currentStep: number;
  onStepClick: (step: number) => void;
  answeredSteps: Set<number>;
}

export function EvalStepper({ currentStep, onStepClick, answeredSteps }: EvalStepperProps) {
  return (
    <div className="flex items-center gap-1 overflow-x-auto pb-2">
      {EVALUATION_STEPS.map((step, index) => {
        const isActive = index === currentStep;
        const isCompleted = answeredSteps.has(index) && index !== currentStep;

        return (
          <div key={step.id} className="flex items-center">
            <button
              onClick={() => onStepClick(index)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors shrink-0 focus-ring ${
                isActive
                  ? 'bg-editorial-gold/10 text-editorial-gold border border-editorial-gold/30'
                  : isCompleted
                  ? 'bg-editorial-sage-light text-editorial-sage border border-editorial-sage/20'
                  : 'text-editorial-muted hover:text-editorial-navy-light hover:bg-editorial-cream/40 dark:hover:bg-white/5 border border-transparent'
              }`}
            >
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold font-serif shrink-0 ${
                  isActive
                    ? 'bg-editorial-gold text-white'
                    : isCompleted
                    ? 'bg-editorial-sage text-white'
                    : 'bg-editorial-cream dark:bg-editorial-navy-light/30 text-editorial-muted'
                }`}
              >
                {isCompleted ? <Check className="h-3.5 w-3.5" /> : index + 1}
              </div>
              <span className="hidden md:inline whitespace-nowrap">{step.title}</span>
            </button>
            {index < EVALUATION_STEPS.length - 1 && (
              <div
                className={`w-4 lg:w-8 h-px mx-0.5 shrink-0 ${
                  isCompleted ? 'bg-editorial-sage/40' : 'bg-editorial-cream dark:bg-editorial-navy-light/30'
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
