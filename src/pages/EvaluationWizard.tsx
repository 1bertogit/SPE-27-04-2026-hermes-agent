import { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, Save } from 'lucide-react';
import { Card, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge, getClassificationBadgeVariant } from '../components/ui/Badge';
import { Avatar } from '../components/ui/Avatar';
import { Modal } from '../components/ui/Modal';
import { PageSkeleton } from '../components/ui/Skeleton';
import { EvalStepper } from '../components/evaluation/EvalStepper';
import { EvalScoreSidebar } from '../components/evaluation/EvalScoreSidebar';
import { CriterionQuestion } from '../components/evaluation/CriterionQuestion';
import { AnatomicalCanvas } from '../components/evaluation/AnatomicalCanvas';
import { useEvaluationStore } from '../stores/evaluationStore';
import { usePatientStore } from '../stores/patientStore';
import { useUIStore } from '../stores/uiStore';
import { EVALUATION_STEPS, getTotalMaxScore } from '../data/evaluationCriteria';
import { formatCPF } from '../lib/utils';
import type { Patient } from '../lib/types';

export default function EvaluationWizard() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const showToast = useUIStore((s) => s.showToast);
  const { fetchPatientById } = usePatientStore();
  const {
    currentEvaluation,
    answers,
    currentStep,
    loading,
    loadEvaluation,
    startEvaluation,
    setAnswer,
    setStep,
    saveProgress,
    completeEvaluation,
    getStepScore,
    getStepMaxScore,
    getTotalScore,
  } = useEvaluationStore();

  const [patient, setPatient] = useState<Patient | null>(null);
  const [showComplete, setShowComplete] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);

  useEffect(() => {
    async function init() {
      setPageLoading(true);
      if (id && id !== 'new') {
        await loadEvaluation(id);
      } else {
        const patientId = searchParams.get('patient');
        if (patientId) {
          const { id: evalId } = await startEvaluation(patientId);
          if (evalId) {
            navigate(`/evaluations/${evalId}`, { replace: true });
            return;
          }
        }
      }
      setPageLoading(false);
    }
    init();
  }, [id, searchParams, loadEvaluation, startEvaluation, navigate]);

  useEffect(() => {
    if (currentEvaluation?.patient_id) {
      fetchPatientById(currentEvaluation.patient_id).then((p) => {
        if (p) setPatient(p);
      });
    }
  }, [currentEvaluation?.patient_id, fetchPatientById]);

  const step = EVALUATION_STEPS[currentStep];

  const answeredSteps = new Set<number>();
  EVALUATION_STEPS.forEach((s, idx) => {
    const allAnswered = s.criteria.every((c) => answers[c.key]);
    if (allAnswered) answeredSteps.add(idx);
  });

  const handleNext = async () => {
    const { error } = await saveProgress();
    if (error) {
      showToast(error, 'error');
      return;
    }
    if (currentStep < EVALUATION_STEPS.length - 1) {
      setStep(currentStep + 1);
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) setStep(currentStep - 1);
  };

  const handleComplete = async () => {
    setCompleting(true);
    const { error } = await completeEvaluation();
    setCompleting(false);
    if (error) {
      showToast(error, 'error');
    } else {
      showToast('Avaliacao concluida com sucesso!', 'success');
      setShowComplete(false);
      if (patient) navigate(`/patients/${patient.id}`);
      else navigate('/evaluations');
    }
  };

  if (pageLoading || loading) return <PageSkeleton />;

  if (!currentEvaluation) {
    return (
      <div className="text-center py-20">
        <p className="text-editorial-muted">Avaliacao nao encontrada</p>
        <Button variant="secondary" className="mt-4" onClick={() => navigate('/evaluations')}>
          Voltar
        </Button>
      </div>
    );
  }

  const isLastStep = currentStep === EVALUATION_STEPS.length - 1;
  const allCurrentAnswered = step?.criteria.every((c) => answers[c.key]) ?? false;

  return (
    <div className="animate-fade-in">
      <div className="sticky top-16 z-30 bg-editorial-paper/95 dark:bg-editorial-navy-dark/95 backdrop-blur-sm -mx-4 lg:-mx-6 px-4 lg:px-6 py-4 border-b border-editorial-cream dark:border-editorial-navy-light/20 mb-6">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="p-2 rounded-lg text-editorial-muted hover:text-editorial-navy dark:hover:text-editorial-cream hover:bg-editorial-cream/40 dark:hover:bg-white/5 transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            {patient && (
              <div className="flex items-center gap-3">
                <Avatar name={patient.full_name} size="sm" />
                <div>
                  <p className="text-sm font-medium text-editorial-navy dark:text-editorial-cream">{patient.full_name}</p>
                  <p className="text-xs text-editorial-muted">{formatCPF(patient.cpf)}</p>
                </div>
                <Badge variant={getClassificationBadgeVariant(patient.classification)}>
                  Classe {patient.classification}
                </Badge>
              </div>
            )}
          </div>
          <Button variant="secondary" size="sm" onClick={async () => {
            const { error } = await saveProgress();
            if (error) showToast(error, 'error');
            else showToast('Progresso salvo', 'success');
          }}>
            <Save className="h-4 w-4" />
            <span className="hidden sm:inline">Salvar</span>
          </Button>
        </div>
        <EvalStepper
          currentStep={currentStep}
          onStepClick={setStep}
          answeredSteps={answeredSteps}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3 space-y-4">
          {step && (
            <>
              <div className="mb-4">
                <h2 className="text-xl font-bold font-serif text-editorial-navy dark:text-editorial-cream">{step.title}</h2>
                <p className="text-sm text-editorial-muted mt-1">{step.description}</p>
              </div>

              {step.criteria.map((criterion) => (
                <CriterionQuestion
                  key={criterion.key}
                  criterion={criterion}
                  selectedOption={answers[criterion.key]?.option ?? ''}
                  onSelect={(option, score) =>
                    setAnswer(criterion.key, option, score, criterion.maxScore, step.title, criterion.label, step.id)
                  }
                />
              ))}

              {currentStep === 3 && (
                <Card>
                  <CardTitle className="text-base mb-4">Diagrama Anatomico</CardTitle>
                  <AnatomicalCanvas />
                </Card>
              )}

              <div className="flex items-center justify-between pt-4 border-t border-editorial-cream dark:border-editorial-navy-light/20">
                <Button
                  variant="secondary"
                  onClick={handlePrev}
                  disabled={currentStep === 0}
                >
                  <ArrowLeft className="h-4 w-4" />
                  Anterior
                </Button>
                {isLastStep ? (
                  <Button
                    onClick={() => setShowComplete(true)}
                    disabled={!allCurrentAnswered}
                  >
                    <Check className="h-4 w-4" />
                    Concluir Avaliacao
                  </Button>
                ) : (
                  <Button onClick={handleNext}>
                    Proximo
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </>
          )}
        </div>

        <div className="lg:col-span-2">
          <EvalScoreSidebar
            getTotalScore={getTotalScore}
            getStepScore={getStepScore}
            getStepMaxScore={getStepMaxScore}
          />
        </div>
      </div>

      <Modal
        open={showComplete}
        onOpenChange={setShowComplete}
        title="Concluir Avaliacao"
        description="Revise o resumo antes de finalizar"
        maxWidth="max-w-xl"
      >
        <div className="space-y-4 mt-4">
          <div className="bg-editorial-cream/50 dark:bg-editorial-navy-light/20 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-editorial-muted">Score Total</span>
              <span className="text-2xl font-bold font-serif text-editorial-navy dark:text-editorial-cream">
                {getTotalMaxScore() > 0
                  ? Math.round((getTotalScore() / getTotalMaxScore()) * 100)
                  : 0}
                %
              </span>
            </div>
            <div className="text-sm text-editorial-muted">
              {getTotalScore()} de {getTotalMaxScore()} pontos
            </div>
          </div>

          {EVALUATION_STEPS.map((s) => {
            const score = getStepScore(s.id);
            const max = getStepMaxScore(s.id);
            return (
              <div key={s.id} className="flex items-center justify-between text-sm">
                <span className="text-editorial-muted">{s.title}</span>
                <span className="text-editorial-navy dark:text-editorial-cream font-medium">{score}/{max}</span>
              </div>
            );
          })}

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-editorial-cream dark:border-editorial-navy-light/20">
            <Button variant="secondary" onClick={() => setShowComplete(false)}>
              Revisar
            </Button>
            <Button loading={completing} onClick={handleComplete}>
              <Check className="h-4 w-4" />
              Confirmar e Salvar
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
