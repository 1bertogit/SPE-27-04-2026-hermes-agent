import { useState } from 'react';
import { AlertCircle, CheckCircle2, ChevronRight, X } from 'lucide-react';
import { Card, CardTitle } from '../ui/Card';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { usePatientStore } from '../../stores/patientStore';
import { useUIStore } from '../../stores/uiStore';
import { PIPELINE_ORDER, TERMINAL_STATUSES, getNextStatuses } from '../../lib/patientPipeline';
import type { Patient, WorkflowStatus } from '../../lib/types';

const STATUS_LABELS: Record<WorkflowStatus, string> = {
  lead: 'Lead',
  consulta_agendada: 'Consulta agendada',
  consulta_realizada: 'Consulta realizada',
  decidiu_operar: 'Decidiu operar',
  pre_operatorio: 'Pré-operatório',
  cirurgia_agendada: 'Cirurgia agendada',
  cirurgia_realizada: 'Cirurgia realizada',
  pos_op_ativo: 'Pós-op ativo',
  longo_prazo: 'Longo prazo',
  encerrado: 'Encerrado',
  nao_convertido: 'Não convertido',
  cancelado: 'Cancelado',
};

const ACTION_LABELS: Record<WorkflowStatus, string> = {
  lead: 'Voltar para lead',
  consulta_agendada: 'Agendar consulta',
  consulta_realizada: 'Consulta realizada',
  decidiu_operar: 'Decidiu operar',
  pre_operatorio: 'Entrar em pré-op',
  cirurgia_agendada: 'Agendar cirurgia',
  cirurgia_realizada: 'Registrar cirurgia',
  pos_op_ativo: 'Iniciar pós-op',
  longo_prazo: 'Ir para longo prazo',
  encerrado: 'Encerrar jornada',
  nao_convertido: 'Marcar não convertido',
  cancelado: 'Cancelar jornada',
};

interface StatusActionsProps {
  patient: Patient;
  onAdvance: () => void;
}

export function StatusActions({ patient, onAdvance }: StatusActionsProps) {
  const advanceWorkflow = usePatientStore((s) => s.advanceWorkflow);
  const showToast = useUIStore((s) => s.showToast);
  const [loading, setLoading] = useState<WorkflowStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingCancel, setPendingCancel] = useState(false);

  const current = patient.workflow_status;
  const isTerminal = TERMINAL_STATUSES.has(current);
  const nexts = getNextStatuses(current) as WorkflowStatus[];
  const currentIdx = PIPELINE_ORDER.indexOf(current as typeof PIPELINE_ORDER[number]);

  const run = async (toStatus: WorkflowStatus) => {
    setLoading(toStatus);
    setError(null);
    const { error: err } = await advanceWorkflow(patient.id, toStatus);
    setLoading(null);
    if (err) {
      setError(err);
      showToast('Transição bloqueada', 'error');
      return;
    }
    showToast(`Status atualizado: ${STATUS_LABELS[toStatus]}`, 'success');
    onAdvance();
  };

  const handleClick = (toStatus: WorkflowStatus) => {
    if (toStatus === 'cancelado') {
      setPendingCancel(true);
      return;
    }
    run(toStatus);
  };

  const confirmCancel = async () => {
    setPendingCancel(false);
    await run('cancelado');
  };

  return (
    <>
      <Card>
        <div className="flex items-start justify-between gap-4 mb-4 flex-wrap">
          <div>
            <CardTitle className="text-base">Status do paciente</CardTitle>
            <p className="mt-1 text-[0.65rem] uppercase tracking-editorial text-editorial-muted">
              Jornada clínica · Pipeline SC-04
            </p>
          </div>
          <div className="text-right">
            <div className="text-[0.65rem] uppercase tracking-editorial text-editorial-muted">Atual</div>
            <div className="mt-0.5 text-lg font-serif text-editorial-navy dark:text-editorial-cream">
              {STATUS_LABELS[current]}
            </div>
          </div>
        </div>

        {!isTerminal && currentIdx !== -1 && (
          <div className="mb-5 -mx-1 px-1 overflow-x-auto">
            <div className="flex items-center gap-1 min-w-max">
              {PIPELINE_ORDER.map((step, idx) => {
                const isPast = idx < currentIdx;
                const isCurrent = idx === currentIdx;
                return (
                  <div key={step} className="flex items-center gap-1">
                    <div
                      className={`h-2.5 w-2.5 rounded-full transition-colors ${
                        isCurrent
                          ? 'bg-editorial-gold ring-4 ring-editorial-gold/20'
                          : isPast
                            ? 'bg-editorial-navy/60 dark:bg-editorial-cream/60'
                            : 'bg-editorial-cream dark:bg-editorial-navy-light/30'
                      }`}
                      title={STATUS_LABELS[step as WorkflowStatus]}
                    />
                    {idx < PIPELINE_ORDER.length - 1 && (
                      <div
                        className={`h-px w-5 ${
                          isPast
                            ? 'bg-editorial-navy/40 dark:bg-editorial-cream/40'
                            : 'bg-editorial-cream dark:bg-editorial-navy-light/20'
                        }`}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {isTerminal && (
          <div className="flex items-center gap-2 p-3 rounded-md bg-editorial-cream/60 dark:bg-editorial-navy-light/10 border border-editorial-cream dark:border-editorial-navy-light/20 mb-4">
            <CheckCircle2 className="h-4 w-4 text-editorial-muted flex-shrink-0" />
            <p className="text-sm text-editorial-muted">
              Jornada encerrada em <strong>{STATUS_LABELS[current]}</strong>. Nenhuma transição disponível.
            </p>
          </div>
        )}

        {error && (
          <div className="flex items-start gap-2 p-3 rounded-md bg-editorial-rose-light border border-editorial-rose/20 mb-4">
            <AlertCircle className="h-4 w-4 text-editorial-rose flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-[0.65rem] uppercase tracking-editorial text-editorial-rose font-medium mb-1">
                Transição bloqueada
              </p>
              <p className="text-sm text-editorial-rose break-words">{error}</p>
            </div>
            <button
              onClick={() => setError(null)}
              className="text-editorial-rose/70 hover:text-editorial-rose focus-ring rounded p-0.5"
              aria-label="Dispensar aviso"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {nexts.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {nexts.map((nextStatus) => {
              const isCancel = nextStatus === 'cancelado';
              return (
                <Button
                  key={nextStatus}
                  size="sm"
                  variant={isCancel ? 'destructive' : 'primary'}
                  loading={loading === nextStatus}
                  disabled={loading !== null && loading !== nextStatus}
                  onClick={() => handleClick(nextStatus)}
                >
                  {!isCancel && <ChevronRight className="h-3.5 w-3.5" />}
                  {ACTION_LABELS[nextStatus]}
                </Button>
              );
            })}
          </div>
        )}
      </Card>

      <Modal
        open={pendingCancel}
        onClose={() => setPendingCancel(false)}
        title="Cancelar jornada do paciente?"
        description="Esta ação é irreversível (SC-04). O paciente ficará marcado como cancelado e não poderá retornar ao pipeline."
        footer={
          <div className="flex items-center justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setPendingCancel(false)}>
              Manter status
            </Button>
            <Button variant="destructive" size="sm" onClick={confirmCancel}>
              Confirmar cancelamento
            </Button>
          </div>
        }
      >
        <p className="text-sm text-editorial-navy/80 dark:text-editorial-cream/80">
          Status atual: <strong className="font-serif">{STATUS_LABELS[current]}</strong>
        </p>
      </Modal>
    </>
  );
}
