import { useEffect, useState } from 'react';
import { Calendar, Plus, CheckCircle2, Clock, XCircle, RefreshCw, Zap, Trash2 } from 'lucide-react';
import { format, parseISO, isToday, isTomorrow, isPast } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { Select, Input } from '../ui/Input';
import { EmptyState } from '../ui/EmptyState';
import { useAppointmentStore } from '../../stores/appointmentStore';
import { useUIStore } from '../../stores/uiStore';
import { PROCEDURE_TYPES } from '../../data/procedures';
import type { PatientAppointment, AppointmentType } from '../../lib/types';

const APPOINTMENT_TYPES: AppointmentType[] = [
  'Consulta Inicial', 'Pré-operatório', 'Pós-op 24-48h', 'Pós-op 7 dias',
  'Pós-op 30 dias', 'Pós-op 3-6 meses', 'Pós-op 12 meses', 'Retorno',
];

function getStatusIcon(status: string, size = 'h-4 w-4') {
  switch (status) {
    case 'Realizado': return <CheckCircle2 className={`${size} text-editorial-sage`} />;
    case 'Cancelado': return <XCircle className={`${size} text-editorial-rose`} />;
    case 'Remarcado': return <RefreshCw className={`${size} text-editorial-gold`} />;
    default: return <Clock className={`${size} text-editorial-navy/60 dark:text-editorial-cream/60`} />;
  }
}

function getStatusStyle(status: string) {
  switch (status) {
    case 'Realizado': return 'text-editorial-sage';
    case 'Cancelado': return 'text-editorial-rose';
    case 'Remarcado': return 'text-editorial-gold';
    default: return 'text-editorial-navy/70 dark:text-editorial-cream/70';
  }
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return 'Sem data';
  try {
    const d = parseISO(dateStr);
    if (isToday(d)) return `Hoje, ${format(d, 'HH:mm')}`;
    if (isTomorrow(d)) return `Amanhã, ${format(d, 'HH:mm')}`;
    return format(d, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
  } catch { return '---'; }
}

function isOverdue(a: PatientAppointment) {
  return a.status === 'Agendado' && !!a.scheduled_date && isPast(parseISO(a.scheduled_date));
}

interface Props {
  patientId: string;
}

export function AppointmentsTab({ patientId }: Props) {
  const { appointments, loading, fetchAppointments, createAppointment, updateAppointment, deleteAppointment, generatePostopSchedule } = useAppointmentStore();
  const showToast = useUIStore((s) => s.showToast);
  const [modalOpen, setModalOpen] = useState(false);
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    appointment_type: 'Retorno' as AppointmentType,
    scheduled_date: '',
    scheduled_time: '09:00',
    status: 'Agendado' as PatientAppointment['status'],
    notes: '',
    procedure_type: '',
  });

  const [scheduleForm, setScheduleForm] = useState({ procedure_type: '', surgery_date: '' });

  useEffect(() => {
    fetchAppointments(patientId);
  }, [patientId, fetchAppointments]);

  const patientAppts = appointments.filter((a) => a.patient_id === patientId);

  const openCreate = () => {
    setEditingId(null);
    setForm({ appointment_type: 'Retorno', scheduled_date: '', scheduled_time: '09:00', status: 'Agendado', notes: '', procedure_type: '' });
    setModalOpen(true);
  };

  const openEdit = (appt: PatientAppointment) => {
    setEditingId(appt.id);
    const dateStr = appt.scheduled_date ? format(parseISO(appt.scheduled_date), 'yyyy-MM-dd') : '';
    const timeStr = appt.scheduled_date ? format(parseISO(appt.scheduled_date), 'HH:mm') : '09:00';
    setForm({ appointment_type: appt.appointment_type, scheduled_date: dateStr, scheduled_time: timeStr, status: appt.status, notes: appt.notes ?? '', procedure_type: appt.procedure_type ?? '' });
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    const scheduledDate = form.scheduled_date ? `${form.scheduled_date}T${form.scheduled_time}:00` : null;

    if (editingId) {
      const { error } = await updateAppointment(editingId, {
        appointment_type: form.appointment_type, scheduled_date: scheduledDate,
        status: form.status, notes: form.notes || null, procedure_type: form.procedure_type || null,
      });
      if (error) showToast(error, 'error');
      else { showToast('Agendamento atualizado', 'success'); setModalOpen(false); }
    } else {
      const { error } = await createAppointment({
        patient_id: patientId, evaluation_id: null,
        appointment_type: form.appointment_type, scheduled_date: scheduledDate,
        completed_date: null, status: form.status, notes: form.notes || null, procedure_type: form.procedure_type || null,
      });
      if (error) showToast(error, 'error');
      else { showToast('Agendamento criado', 'success'); setModalOpen(false); }
    }
    setSubmitting(false);
  };

  const handleGenerate = async () => {
    if (!scheduleForm.procedure_type || !scheduleForm.surgery_date) {
      showToast('Preencha procedimento e data da cirurgia', 'error'); return;
    }
    setSubmitting(true);
    const { error } = await generatePostopSchedule(patientId, scheduleForm.procedure_type, new Date(scheduleForm.surgery_date));
    if (error) showToast(error, 'error');
    else { showToast('Cronograma pós-op gerado', 'success'); setScheduleModalOpen(false); }
    setSubmitting(false);
  };

  const handleMarkDone = async (id: string) => {
    const { error } = await updateAppointment(id, { status: 'Realizado', completed_date: new Date().toISOString() });
    if (error) showToast(error, 'error');
    else showToast('Marcado como realizado', 'success');
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-sm text-editorial-muted">{patientAppts.length} agendamento{patientAppts.length !== 1 ? 's' : ''}</p>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="ghost" onClick={() => setScheduleModalOpen(true)}>
            <Zap className="h-3.5 w-3.5" />
            Gerar pós-op
          </Button>
          <Button size="sm" variant="outline" onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Agendar
          </Button>
        </div>
      </div>

      {patientAppts.length === 0 && !loading ? (
        <EmptyState
          icon={<Calendar className="h-10 w-10 text-editorial-warm" />}
          title="Nenhum agendamento"
          description="Agende retornos ou gere o cronograma de pós-operatório automaticamente."
          action={
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={() => setScheduleModalOpen(true)}>
                <Zap className="h-4 w-4" />
                Gerar pós-op
              </Button>
              <Button size="sm" onClick={openCreate}><Plus className="h-4 w-4" />Agendar</Button>
            </div>
          }
        />
      ) : (
        <Card padding={false}>
          <div className="divide-y divide-editorial-cream dark:divide-editorial-navy-light/20">
            {patientAppts.map((appt) => {
              const overdue = isOverdue(appt);
              return (
                <div key={appt.id} className="flex items-center gap-3 px-4 py-3.5 hover:bg-editorial-cream/30 dark:hover:bg-white/5 transition-colors group">
                  <div className="flex-shrink-0">{getStatusIcon(appt.status)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-editorial-navy dark:text-editorial-cream">{appt.appointment_type}</span>
                      {appt.procedure_type && <span className="text-xs text-editorial-muted">— {appt.procedure_type}</span>}
                      {overdue && <span className="text-xs font-medium text-editorial-rose bg-editorial-rose/10 px-1.5 py-0.5 rounded-full">Atrasado</span>}
                    </div>
                    <div className={`text-xs mt-0.5 ${getStatusStyle(appt.status)}`}>{formatDate(appt.scheduled_date)}</div>
                    {appt.notes && <p className="text-xs text-editorial-muted mt-0.5 truncate">{appt.notes}</p>}
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    {appt.status === 'Agendado' && (
                      <Button size="sm" variant="ghost" onClick={() => handleMarkDone(appt.id)} className="text-xs">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    <button onClick={() => openEdit(appt)} className="p-1.5 rounded text-editorial-muted hover:text-editorial-navy dark:hover:text-editorial-cream hover:bg-editorial-cream/50 transition-colors">
                      <Calendar className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => deleteAppointment(appt.id)} className="p-1.5 rounded text-editorial-muted hover:text-editorial-rose hover:bg-editorial-rose/10 transition-colors">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? 'Editar Agendamento' : 'Novo Agendamento'}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button loading={submitting} onClick={handleSubmit}>{editingId ? 'Salvar' : 'Criar'}</Button>
          </div>
        }
      >
        <div className="space-y-4">
          <Select label="Tipo" options={APPOINTMENT_TYPES.map((t) => ({ label: t, value: t }))} value={form.appointment_type} onChange={(e) => setForm((f) => ({ ...f, appointment_type: e.target.value as AppointmentType }))} />
          <Select label="Procedimento" options={[{ label: 'Não especificado', value: '' }, ...PROCEDURE_TYPES.map((p) => ({ label: p, value: p }))]} value={form.procedure_type} onChange={(e) => setForm((f) => ({ ...f, procedure_type: e.target.value }))} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Data" type="date" value={form.scheduled_date} onChange={(e) => setForm((f) => ({ ...f, scheduled_date: e.target.value }))} />
            <Input label="Hora" type="time" value={form.scheduled_time} onChange={(e) => setForm((f) => ({ ...f, scheduled_time: e.target.value }))} />
          </div>
          <Select label="Status" options={[{ label: 'Agendado', value: 'Agendado' }, { label: 'Realizado', value: 'Realizado' }, { label: 'Cancelado', value: 'Cancelado' }, { label: 'Remarcado', value: 'Remarcado' }]} value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as PatientAppointment['status'] }))} />
          <div>
            <label className="block text-xs font-medium text-editorial-navy/70 dark:text-editorial-cream/70 uppercase tracking-wider mb-1.5">Observações</label>
            <textarea className="w-full rounded-lg border border-editorial-cream dark:border-editorial-navy-light/30 bg-white dark:bg-editorial-navy/40 text-sm text-editorial-navy dark:text-editorial-cream px-3 py-2.5 resize-none h-16 focus:outline-none focus:border-editorial-gold/60 transition-colors" value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
          </div>
        </div>
      </Modal>

      <Modal
        open={scheduleModalOpen}
        onClose={() => setScheduleModalOpen(false)}
        title="Gerar Cronograma Pós-operatório"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setScheduleModalOpen(false)}>Cancelar</Button>
            <Button loading={submitting} onClick={handleGenerate}>Gerar Cronograma</Button>
          </div>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-editorial-muted">
            Serão gerados automaticamente os retornos de 24-48h, 7 dias, 30 dias, 3-6 meses e 12 meses a partir da data da cirurgia.
          </p>
          <Select label="Procedimento" options={[{ label: 'Selecione...', value: '' }, ...PROCEDURE_TYPES.map((p) => ({ label: p, value: p }))]} value={scheduleForm.procedure_type} onChange={(e) => setScheduleForm((f) => ({ ...f, procedure_type: e.target.value }))} />
          <Input label="Data da Cirurgia" type="date" value={scheduleForm.surgery_date} onChange={(e) => setScheduleForm((f) => ({ ...f, surgery_date: e.target.value }))} />
        </div>
      </Modal>
    </div>
  );
}
