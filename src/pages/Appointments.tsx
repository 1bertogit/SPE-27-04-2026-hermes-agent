import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar,
  Plus,
  CheckCircle2,
  Clock,
  XCircle,
  RefreshCw,
  ChevronRight,
  Stethoscope,
  AlertCircle,
} from 'lucide-react';
import { format, isToday, isTomorrow, isPast, parseISO, isThisWeek } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { Select, Input } from '../components/ui/Input';
import { EmptyState } from '../components/ui/EmptyState';
import { PageSkeleton } from '../components/ui/Skeleton';
import { useAppointmentStore } from '../stores/appointmentStore';
import { usePatientStore } from '../stores/patientStore';
import { useUIStore } from '../stores/uiStore';
import { PROCEDURE_TYPES } from '../data/procedures';
import type { PatientAppointment, AppointmentType } from '../lib/types';

const APPOINTMENT_TYPES: AppointmentType[] = [
  'Consulta Inicial',
  'Pré-operatório',
  'Pós-op 24-48h',
  'Pós-op 7 dias',
  'Pós-op 30 dias',
  'Pós-op 3-6 meses',
  'Pós-op 12 meses',
  'Retorno',
];

function getStatusIcon(status: string) {
  switch (status) {
    case 'Realizado': return <CheckCircle2 className="h-4 w-4 text-editorial-sage" />;
    case 'Cancelado': return <XCircle className="h-4 w-4 text-editorial-rose" />;
    case 'Remarcado': return <RefreshCw className="h-4 w-4 text-editorial-gold" />;
    default: return <Clock className="h-4 w-4 text-editorial-navy/60" />;
  }
}

function getStatusColor(status: string) {
  switch (status) {
    case 'Realizado': return 'bg-editorial-sage/10 text-editorial-sage border-editorial-sage/20';
    case 'Cancelado': return 'bg-editorial-rose/10 text-editorial-rose border-editorial-rose/20';
    case 'Remarcado': return 'bg-editorial-gold/10 text-editorial-gold-dark border-editorial-gold/20';
    default: return 'bg-editorial-navy/8 text-editorial-navy border-editorial-navy/15';
  }
}

function formatAppointmentDate(dateStr: string | null): string {
  if (!dateStr) return 'Sem data';
  try {
    const d = parseISO(dateStr);
    if (isToday(d)) return `Hoje, ${format(d, 'HH:mm')}`;
    if (isTomorrow(d)) return `Amanhã, ${format(d, 'HH:mm')}`;
    return format(d, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
  } catch {
    return '---';
  }
}

function isOverdue(appt: PatientAppointment): boolean {
  if (appt.status !== 'Agendado' || !appt.scheduled_date) return false;
  return isPast(parseISO(appt.scheduled_date));
}

interface AppointmentFormData {
  patient_id: string;
  appointment_type: AppointmentType;
  scheduled_date: string;
  scheduled_time: string;
  status: PatientAppointment['status'];
  notes: string;
  procedure_type: string;
}

export default function Appointments() {
  const navigate = useNavigate();
  const { appointments, loading, fetchAllAppointments, createAppointment, updateAppointment, deleteAppointment } = useAppointmentStore();
  const { patients, fetchPatients } = usePatientStore();
  const showToast = useUIStore((s) => s.showToast);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterType, setFilterType] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState<AppointmentFormData>({
    patient_id: '',
    appointment_type: 'Consulta Inicial',
    scheduled_date: '',
    scheduled_time: '09:00',
    status: 'Agendado',
    notes: '',
    procedure_type: '',
  });

  useEffect(() => {
    fetchAllAppointments();
    fetchPatients();
  }, [fetchAllAppointments, fetchPatients]);

  const openCreate = () => {
    setEditingId(null);
    setForm({ patient_id: '', appointment_type: 'Consulta Inicial', scheduled_date: '', scheduled_time: '09:00', status: 'Agendado', notes: '', procedure_type: '' });
    setModalOpen(true);
  };

  const openEdit = (appt: PatientAppointment) => {
    setEditingId(appt.id);
    const dateStr = appt.scheduled_date ? format(parseISO(appt.scheduled_date), 'yyyy-MM-dd') : '';
    const timeStr = appt.scheduled_date ? format(parseISO(appt.scheduled_date), 'HH:mm') : '09:00';
    setForm({
      patient_id: appt.patient_id,
      appointment_type: appt.appointment_type,
      scheduled_date: dateStr,
      scheduled_time: timeStr,
      status: appt.status,
      notes: appt.notes ?? '',
      procedure_type: appt.procedure_type ?? '',
    });
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.patient_id) { showToast('Selecione um paciente', 'error'); return; }
    setSubmitting(true);

    const scheduledDate = form.scheduled_date
      ? `${form.scheduled_date}T${form.scheduled_time}:00`
      : null;

    if (editingId) {
      const { error } = await updateAppointment(editingId, {
        appointment_type: form.appointment_type,
        scheduled_date: scheduledDate,
        status: form.status,
        notes: form.notes || null,
        procedure_type: form.procedure_type || null,
      });
      if (error) showToast(error, 'error');
      else { showToast('Agendamento atualizado', 'success'); setModalOpen(false); }
    } else {
      const { error } = await createAppointment({
        patient_id: form.patient_id,
        evaluation_id: null,
        appointment_type: form.appointment_type,
        scheduled_date: scheduledDate,
        completed_date: null,
        status: form.status,
        notes: form.notes || null,
        procedure_type: form.procedure_type || null,
      });
      if (error) showToast(error, 'error');
      else { showToast('Agendamento criado', 'success'); setModalOpen(false); }
    }
    setSubmitting(false);
  };

  const handleMarkDone = async (id: string) => {
    const { error } = await updateAppointment(id, {
      status: 'Realizado',
      completed_date: new Date().toISOString(),
    });
    if (error) showToast(error, 'error');
    else showToast('Agendamento marcado como realizado', 'success');
  };

  const handleDelete = async (id: string) => {
    const { error } = await deleteAppointment(id);
    if (error) showToast(error, 'error');
    else showToast('Agendamento removido', 'success');
  };

  const filtered = appointments.filter((a) => {
    if (filterStatus && a.status !== filterStatus) return false;
    if (filterType && a.appointment_type !== filterType) return false;
    return true;
  });

  const thisWeekPending = appointments.filter(
    (a) => a.status === 'Agendado' && a.scheduled_date && isThisWeek(parseISO(a.scheduled_date))
  ).length;

  const overdue = appointments.filter(isOverdue).length;
  const done = appointments.filter((a) => a.status === 'Realizado').length;

  if (loading && appointments.length === 0) return <PageSkeleton />;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-serif text-editorial-navy dark:text-editorial-cream">Agendamentos</h1>
          <p className="text-sm text-editorial-muted mt-0.5">Consultas, pré-op e retornos pós-operatórios</p>
        </div>
        <Button size="sm" onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Novo Agendamento
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-editorial-navy/8 flex items-center justify-center flex-shrink-0">
            <Calendar className="h-5 w-5 text-editorial-navy dark:text-editorial-cream" />
          </div>
          <div>
            <p className="text-2xl font-bold text-editorial-navy dark:text-editorial-cream">{thisWeekPending}</p>
            <p className="text-xs text-editorial-muted">Esta semana</p>
          </div>
        </Card>
        <Card className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-editorial-rose/10 flex items-center justify-center flex-shrink-0">
            <AlertCircle className="h-5 w-5 text-editorial-rose" />
          </div>
          <div>
            <p className="text-2xl font-bold text-editorial-rose">{overdue}</p>
            <p className="text-xs text-editorial-muted">Atrasados</p>
          </div>
        </Card>
        <Card className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-editorial-sage/10 flex items-center justify-center flex-shrink-0">
            <CheckCircle2 className="h-5 w-5 text-editorial-sage" />
          </div>
          <div>
            <p className="text-2xl font-bold text-editorial-sage">{done}</p>
            <p className="text-xs text-editorial-muted">Realizados</p>
          </div>
        </Card>
      </div>

      <Card padding={false}>
        <div className="p-4 border-b border-editorial-cream dark:border-editorial-navy-light/20 flex flex-wrap gap-3">
          <Select
            options={[
              { label: 'Todos os status', value: '' },
              { label: 'Agendado', value: 'Agendado' },
              { label: 'Realizado', value: 'Realizado' },
              { label: 'Cancelado', value: 'Cancelado' },
              { label: 'Remarcado', value: 'Remarcado' },
            ]}
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="w-40"
          />
          <Select
            options={[{ label: 'Todos os tipos', value: '' }, ...APPOINTMENT_TYPES.map((t) => ({ label: t, value: t }))]}
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="w-52"
          />
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            icon={<Calendar className="h-10 w-10 text-editorial-warm" />}
            title="Nenhum agendamento encontrado"
            description="Crie o primeiro agendamento para um paciente."
            action={<Button size="sm" onClick={openCreate}><Plus className="h-4 w-4" />Novo Agendamento</Button>}
          />
        ) : (
          <div className="divide-y divide-editorial-cream dark:divide-editorial-navy-light/20">
            {filtered.map((appt) => {
              const overdueMark = isOverdue(appt);
              const patient = appt.patient;
              return (
                <div key={appt.id} className="flex items-center gap-4 px-5 py-4 hover:bg-editorial-cream/30 dark:hover:bg-white/5 transition-colors">
                  <div className="flex-shrink-0">{getStatusIcon(appt.status)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-editorial-navy dark:text-editorial-cream">{appt.appointment_type}</span>
                      {appt.procedure_type && (
                        <span className="text-xs text-editorial-muted">— {appt.procedure_type}</span>
                      )}
                      {overdueMark && (
                        <span className="text-xs font-medium text-editorial-rose bg-editorial-rose/10 px-2 py-0.5 rounded-full">Atrasado</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5">
                      {patient && (
                        <button
                          onClick={() => navigate(`/patients/${appt.patient_id}`)}
                          className="text-xs text-editorial-gold hover:underline flex items-center gap-1"
                        >
                          <Stethoscope className="h-3 w-3" />
                          {patient.full_name}
                        </button>
                      )}
                      <span className="text-xs text-editorial-muted">{formatAppointmentDate(appt.scheduled_date)}</span>
                    </div>
                    {appt.notes && <p className="text-xs text-editorial-muted mt-1 truncate">{appt.notes}</p>}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Badge className={`text-xs border ${getStatusColor(appt.status)}`}>{appt.status}</Badge>
                    {appt.status === 'Agendado' && (
                      <Button size="sm" variant="ghost" onClick={() => handleMarkDone(appt.id)} className="text-xs">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Realizado
                      </Button>
                    )}
                    <button
                      onClick={() => openEdit(appt)}
                      className="p-1.5 rounded text-editorial-muted hover:text-editorial-navy dark:hover:text-editorial-cream hover:bg-editorial-cream/50 transition-colors"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? 'Editar Agendamento' : 'Novo Agendamento'}
        footer={
          <div className="flex justify-end gap-2">
            {editingId && (
              <Button variant="ghost" className="text-editorial-rose mr-auto" onClick={() => { handleDelete(editingId); setModalOpen(false); }}>
                Excluir
              </Button>
            )}
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button loading={submitting} onClick={handleSubmit}>
              {editingId ? 'Salvar' : 'Criar'}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          {!editingId && (
            <Select
              label="Paciente"
              options={[{ label: 'Selecione um paciente', value: '' }, ...patients.map((p) => ({ label: p.full_name, value: p.id }))]}
              value={form.patient_id}
              onChange={(e) => setForm((f) => ({ ...f, patient_id: e.target.value }))}
            />
          )}
          <Select
            label="Tipo de Retorno"
            options={APPOINTMENT_TYPES.map((t) => ({ label: t, value: t }))}
            value={form.appointment_type}
            onChange={(e) => setForm((f) => ({ ...f, appointment_type: e.target.value as AppointmentType }))}
          />
          <Select
            label="Procedimento"
            options={[{ label: 'Não especificado', value: '' }, ...PROCEDURE_TYPES.map((p) => ({ label: p, value: p }))]}
            value={form.procedure_type}
            onChange={(e) => setForm((f) => ({ ...f, procedure_type: e.target.value }))}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Data"
              type="date"
              value={form.scheduled_date}
              onChange={(e) => setForm((f) => ({ ...f, scheduled_date: e.target.value }))}
            />
            <Input
              label="Hora"
              type="time"
              value={form.scheduled_time}
              onChange={(e) => setForm((f) => ({ ...f, scheduled_time: e.target.value }))}
            />
          </div>
          <Select
            label="Status"
            options={[
              { label: 'Agendado', value: 'Agendado' },
              { label: 'Realizado', value: 'Realizado' },
              { label: 'Cancelado', value: 'Cancelado' },
              { label: 'Remarcado', value: 'Remarcado' },
            ]}
            value={form.status}
            onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as PatientAppointment['status'] }))}
          />
          <div>
            <label className="block text-xs font-medium text-editorial-navy/70 dark:text-editorial-cream/70 uppercase tracking-wider mb-1.5">
              Observações
            </label>
            <textarea
              className="w-full rounded-lg border border-editorial-cream dark:border-editorial-navy-light/30 bg-white dark:bg-editorial-navy/40 text-sm text-editorial-navy dark:text-editorial-cream px-3 py-2.5 resize-none h-20 focus:outline-none focus:border-editorial-gold/60 transition-colors"
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              placeholder="Observações sobre este agendamento..."
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
