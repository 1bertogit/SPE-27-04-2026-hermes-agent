import { useEffect, useState } from 'react';
import { FlaskConical, Plus, CheckCircle2, Clock, AlertTriangle, Trash2, Zap } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { Select, Input } from '../ui/Input';
import { EmptyState } from '../ui/EmptyState';
import { usePreopExamStore } from '../../stores/preopExamStore';
import { useUIStore } from '../../stores/uiStore';
import { formatDate } from '../../lib/utils';
import { PROCEDURE_TYPES, BASE_PREOP_EXAMS } from '../../data/procedures';
import type { PreopExam, ExamStatus } from '../../lib/types';

function getExamStatusStyle(status: ExamStatus) {
  switch (status) {
    case 'Normal': return 'bg-editorial-sage/10 text-editorial-sage border-editorial-sage/20';
    case 'Alterado': return 'bg-editorial-rose/10 text-editorial-rose border-editorial-rose/20';
    case 'Realizado': return 'bg-editorial-navy/8 text-editorial-navy border-editorial-navy/15';
    case 'Solicitado': return 'bg-editorial-gold/10 text-editorial-gold-dark border-editorial-gold/20';
    default: return 'bg-editorial-cream/60 text-editorial-muted border-editorial-warm/30';
  }
}

function getExamIcon(status: ExamStatus) {
  switch (status) {
    case 'Normal': return <CheckCircle2 className="h-4 w-4 text-editorial-sage" />;
    case 'Alterado': return <AlertTriangle className="h-4 w-4 text-editorial-rose" />;
    case 'Realizado': return <CheckCircle2 className="h-4 w-4 text-editorial-navy/60 dark:text-editorial-cream/60" />;
    default: return <Clock className="h-4 w-4 text-editorial-gold" />;
  }
}

interface Props {
  patientId: string;
}

export function PreopExamsTab({ patientId }: Props) {
  const { exams, loading, fetchExams, createExam, updateExam, deleteExam, generateBaseExams } = usePreopExamStore();
  const showToast = useUIStore((s) => s.showToast);
  const [modalOpen, setModalOpen] = useState(false);
  const [generateModalOpen, setGenerateModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [generateProcedure, setGenerateProcedure] = useState('');

  const [form, setForm] = useState({
    exam_name: '',
    exam_type: 'Base' as PreopExam['exam_type'],
    procedure_type: '',
    status: 'Solicitado' as ExamStatus,
    result_value: '',
    notes: '',
    is_altered: false,
  });

  useEffect(() => {
    fetchExams(patientId);
  }, [patientId, fetchExams]);

  const openCreate = () => {
    setEditingId(null);
    setForm({ exam_name: '', exam_type: 'Base', procedure_type: '', status: 'Solicitado', result_value: '', notes: '', is_altered: false });
    setModalOpen(true);
  };

  const openEdit = (exam: PreopExam) => {
    setEditingId(exam.id);
    setForm({
      exam_name: exam.exam_name,
      exam_type: exam.exam_type,
      procedure_type: exam.procedure_type ?? '',
      status: exam.status,
      result_value: exam.result_value ?? '',
      notes: exam.notes ?? '',
      is_altered: exam.is_altered,
    });
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.exam_name.trim()) { showToast('Informe o nome do exame', 'error'); return; }
    setSubmitting(true);

    if (editingId) {
      const { error } = await updateExam(editingId, {
        exam_name: form.exam_name,
        exam_type: form.exam_type,
        procedure_type: form.procedure_type || null,
        status: form.status,
        result_value: form.result_value || null,
        result_at: form.status === 'Normal' || form.status === 'Alterado' ? new Date().toISOString() : null,
        notes: form.notes || null,
        is_altered: form.status === 'Alterado',
      });
      if (error) showToast(error, 'error');
      else { showToast('Exame atualizado', 'success'); setModalOpen(false); }
    } else {
      const { error } = await createExam({
        patient_id: patientId,
        evaluation_id: null,
        exam_name: form.exam_name,
        exam_type: form.exam_type,
        procedure_type: form.procedure_type || null,
        status: 'Solicitado',
        requested_at: new Date().toISOString(),
        result_at: null,
        result_value: null,
        is_altered: false,
        is_mandatory: false,
        notes: form.notes || null,
      });
      if (error) showToast(error, 'error');
      else { showToast('Exame adicionado', 'success'); setModalOpen(false); }
    }
    setSubmitting(false);
  };

  const handleGenerate = async () => {
    if (!generateProcedure) { showToast('Selecione o procedimento', 'error'); return; }
    setSubmitting(true);
    const { error } = await generateBaseExams(patientId, generateProcedure);
    if (error) showToast(error, 'error');
    else { showToast('Protocolo de exames gerado', 'success'); setGenerateModalOpen(false); }
    setSubmitting(false);
  };

  const altered = exams.filter((e) => e.is_altered).length;
  const pending = exams.filter((e) => e.status === 'Solicitado').length;
  const normal = exams.filter((e) => e.status === 'Normal').length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          {altered > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-editorial-rose/10 border border-editorial-rose/20">
              <AlertTriangle className="h-3.5 w-3.5 text-editorial-rose" />
              <span className="text-xs font-medium text-editorial-rose">{altered} alterado{altered > 1 ? 's' : ''}</span>
            </div>
          )}
          {pending > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-editorial-gold/10 border border-editorial-gold/20">
              <Clock className="h-3.5 w-3.5 text-editorial-gold" />
              <span className="text-xs font-medium text-editorial-gold-dark">{pending} pendente{pending > 1 ? 's' : ''}</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="ghost" onClick={() => setGenerateModalOpen(true)}>
            <Zap className="h-3.5 w-3.5" />
            Gerar protocolo
          </Button>
          <Button size="sm" variant="outline" onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Adicionar
          </Button>
        </div>
      </div>

      {exams.length === 0 && !loading ? (
        <EmptyState
          icon={<FlaskConical className="h-10 w-10 text-editorial-warm" />}
          title="Nenhum exame registrado"
          description="Adicione exames pré-operatórios ou gere o protocolo padrão para o procedimento."
          action={
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={() => setGenerateModalOpen(true)}>
                <Zap className="h-4 w-4" />
                Gerar protocolo
              </Button>
              <Button size="sm" onClick={openCreate}><Plus className="h-4 w-4" />Adicionar exame</Button>
            </div>
          }
        />
      ) : (
        <Card padding={false}>
          <div className="p-3 border-b border-editorial-cream dark:border-editorial-navy-light/20 flex gap-4 text-xs text-editorial-muted">
            <span><span className="font-medium text-editorial-sage">{normal}</span> normais</span>
            <span><span className="font-medium text-editorial-gold-dark">{pending}</span> pendentes</span>
            <span><span className="font-medium text-editorial-rose">{altered}</span> alterados</span>
            <span><span className="font-medium text-editorial-navy dark:text-editorial-cream">{exams.length}</span> total</span>
          </div>
          <div className="divide-y divide-editorial-cream dark:divide-editorial-navy-light/20">
            {exams.map((exam) => (
              <div key={exam.id} className="flex items-center gap-4 px-4 py-3.5 hover:bg-editorial-cream/30 dark:hover:bg-white/5 transition-colors group">
                {getExamIcon(exam.status)}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-editorial-navy dark:text-editorial-cream truncate">{exam.exam_name}</span>
                    {exam.is_mandatory && (
                      <span className="text-xs px-1.5 py-0.5 rounded bg-editorial-navy/8 text-editorial-muted border border-editorial-cream flex-shrink-0">Obrigatório</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-editorial-muted">{exam.exam_type}</span>
                    {exam.procedure_type && <span className="text-xs text-editorial-muted">· {exam.procedure_type}</span>}
                    {exam.result_value && <span className="text-xs text-editorial-muted">· Resultado: {exam.result_value}</span>}
                    {exam.result_at && <span className="text-xs text-editorial-muted">· {formatDate(exam.result_at)}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${getExamStatusStyle(exam.status)}`}>{exam.status}</span>
                  <button
                    onClick={() => openEdit(exam)}
                    className="p-1.5 rounded text-editorial-muted hover:text-editorial-navy dark:hover:text-editorial-cream hover:bg-editorial-cream/50 transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <FlaskConical className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => deleteExam(exam.id)}
                    className="p-1.5 rounded text-editorial-muted hover:text-editorial-rose hover:bg-editorial-rose/10 transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? 'Editar Exame' : 'Novo Exame'}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button loading={submitting} onClick={handleSubmit}>{editingId ? 'Salvar' : 'Adicionar'}</Button>
          </div>
        }
      >
        <div className="space-y-4">
          {!editingId ? (
            <Select
              label="Exame"
              options={[{ label: 'Outro (digitar)', value: '' }, ...BASE_PREOP_EXAMS.map((e) => ({ label: e, value: e }))]}
              onChange={(e) => setForm((f) => ({ ...f, exam_name: e.target.value }))}
            />
          ) : null}
          <Input
            label={editingId ? 'Nome do Exame' : 'Ou digite o nome'}
            placeholder="Ex: Hemograma Completo"
            value={form.exam_name}
            onChange={(e) => setForm((f) => ({ ...f, exam_name: e.target.value }))}
          />
          <Select
            label="Tipo"
            options={[
              { label: 'Base', value: 'Base' },
              { label: 'Específico do Procedimento', value: 'Específico do Procedimento' },
              { label: 'Complementar', value: 'Complementar' },
            ]}
            value={form.exam_type}
            onChange={(e) => setForm((f) => ({ ...f, exam_type: e.target.value as PreopExam['exam_type'] }))}
          />
          <Select
            label="Procedimento"
            options={[{ label: 'Não especificado', value: '' }, ...PROCEDURE_TYPES.map((p) => ({ label: p, value: p }))]}
            value={form.procedure_type}
            onChange={(e) => setForm((f) => ({ ...f, procedure_type: e.target.value }))}
          />
          {editingId && (
            <>
              <Select
                label="Status"
                options={[
                  { label: 'Solicitado', value: 'Solicitado' },
                  { label: 'Realizado', value: 'Realizado' },
                  { label: 'Normal', value: 'Normal' },
                  { label: 'Alterado', value: 'Alterado' },
                ]}
                value={form.status}
                onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as ExamStatus }))}
              />
              <Input
                label="Valor / Resultado"
                placeholder="Ex: 14,5 g/dL"
                value={form.result_value}
                onChange={(e) => setForm((f) => ({ ...f, result_value: e.target.value }))}
              />
            </>
          )}
          <div>
            <label className="block text-xs font-medium text-editorial-navy/70 dark:text-editorial-cream/70 uppercase tracking-wider mb-1.5">Observações</label>
            <textarea
              className="w-full rounded-lg border border-editorial-cream dark:border-editorial-navy-light/30 bg-white dark:bg-editorial-navy/40 text-sm text-editorial-navy dark:text-editorial-cream px-3 py-2.5 resize-none h-16 focus:outline-none focus:border-editorial-gold/60 transition-colors"
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            />
          </div>
        </div>
      </Modal>

      <Modal
        open={generateModalOpen}
        onClose={() => setGenerateModalOpen(false)}
        title="Gerar Protocolo de Exames"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setGenerateModalOpen(false)}>Cancelar</Button>
            <Button loading={submitting} onClick={handleGenerate}>Gerar Exames</Button>
          </div>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-editorial-muted">
            Serão gerados os exames base + específicos do procedimento selecionado automaticamente.
          </p>
          <Select
            label="Procedimento"
            options={[{ label: 'Selecione o procedimento', value: '' }, ...PROCEDURE_TYPES.map((p) => ({ label: p, value: p }))]}
            value={generateProcedure}
            onChange={(e) => setGenerateProcedure(e.target.value)}
          />
        </div>
      </Modal>
    </div>
  );
}
