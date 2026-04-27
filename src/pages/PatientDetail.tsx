import { useCallback, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import * as Tabs from '@radix-ui/react-tabs';
import {
  ArrowLeft,
  Pencil,
  ClipboardList,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Stethoscope,
  Pill,
  AlertTriangle,
  FileText,
  CheckSquare,
  FlaskConical,
  Scissors,
  Star,
  CalendarDays,
  Scale,
  Cigarette,
  Users,
  Target,
} from 'lucide-react';
import { Card, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge, getClassificationBadgeVariant, getStatusBadgeVariant } from '../components/ui/Badge';
import { Avatar } from '../components/ui/Avatar';
import { PageSkeleton } from '../components/ui/Skeleton';
import { DocumentsTab } from '../components/patient/DocumentsTab';
import { ChecklistsTab } from '../components/patient/ChecklistsTab';
import { PreopExamsTab } from '../components/patient/PreopExamsTab';
import { SurgicalTab } from '../components/patient/SurgicalTab';
import { AppointmentsTab } from '../components/patient/AppointmentsTab';
import { SurveysTab } from '../components/patient/SurveysTab';
import { StatusActions } from '../components/patient/StatusActions';
import { usePatientStore } from '../stores/patientStore';
import { useEvaluationStore } from '../stores/evaluationStore';
import { useUIStore } from '../stores/uiStore';
import { formatCPF, formatPhone, formatDate } from '../lib/utils';
import type { Patient, Evaluation } from '../lib/types';

function calcBMI(weight: number | null, height: number | null): string {
  if (!weight || !height) return '---';
  const bmi = weight / Math.pow(height / 100, 2);
  return bmi.toFixed(1);
}

function getBMICategory(bmi: string): string {
  const v = parseFloat(bmi);
  if (isNaN(v)) return '';
  if (v < 18.5) return 'Abaixo do peso';
  if (v < 25) return 'Normal';
  if (v < 30) return 'Sobrepeso';
  return 'Obesidade';
}

export default function PatientDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { fetchPatientById } = usePatientStore();
  const { fetchEvaluations, evaluations, startEvaluation } = useEvaluationStore();
  const showToast = useUIStore((s) => s.showToast);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);

  const loadPatient = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    const [p] = await Promise.all([fetchPatientById(id), fetchEvaluations(id)]);
    setPatient(p);
    setLoading(false);
  }, [id, fetchPatientById, fetchEvaluations]);

  useEffect(() => {
    loadPatient();
  }, [loadPatient]);

  const refreshPatient = useCallback(async () => {
    if (!id) return;
    const p = await fetchPatientById(id);
    setPatient(p);
  }, [id, fetchPatientById]);

  const handleNewEvaluation = async () => {
    if (!id) return;
    setStarting(true);
    const { id: evalId, error } = await startEvaluation(id);
    setStarting(false);
    if (evalId) navigate(`/evaluations/${evalId}`);
    else if (error) showToast(error, 'error');
  };

  if (loading) return <PageSkeleton />;
  if (!patient) {
    return (
      <div className="text-center py-20">
        <p className="text-editorial-muted">Paciente não encontrado</p>
        <Button variant="secondary" className="mt-4" onClick={() => navigate('/patients')}>Voltar</Button>
      </div>
    );
  }

  const patientEvals = evaluations.filter((e) => e.patient_id === id);
  const bmi = calcBMI(patient.weight_kg, patient.height_cm);

  const tabs = [
    { value: 'overview', label: 'Visão Geral', icon: FileText },
    { value: 'history', label: 'Avaliações', icon: ClipboardList },
    { value: 'appointments', label: 'Agendamentos', icon: CalendarDays },
    { value: 'documents', label: 'Documentos', icon: FileText },
    { value: 'checklists', label: 'Checklists', icon: CheckSquare },
    { value: 'exams', label: 'Exames', icon: FlaskConical },
    { value: 'surgical', label: 'Cirurgias', icon: Scissors },
    { value: 'surveys', label: 'NPS', icon: Star },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/patients')} className="p-2 rounded-lg text-editorial-muted hover:text-editorial-navy hover:bg-editorial-cream/40 dark:hover:bg-white/5 transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-4">
            <Avatar name={patient.full_name} size="xl" />
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-bold font-serif text-editorial-navy dark:text-editorial-cream">{patient.full_name}</h1>
                <Badge variant={getClassificationBadgeVariant(patient.classification)}>Classe {patient.classification}</Badge>
                <Badge variant={getStatusBadgeVariant(patient.status)}>{patient.status}</Badge>
              </div>
              <div className="flex items-center gap-3 mt-1 flex-wrap">
                <p className="text-sm text-editorial-muted font-mono">{formatCPF(patient.cpf)}</p>
                {patient.procedure_interest && (
                  <span className="flex items-center gap-1 text-xs text-editorial-gold-dark bg-editorial-gold/10 px-2 py-0.5 rounded-full border border-editorial-gold/20">
                    <Target className="h-3 w-3" />
                    {patient.procedure_interest}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate(`/patients/${id}/edit`)}>
              <Pencil className="h-4 w-4" />
              Editar
            </Button>
            <Button size="sm" loading={starting} onClick={handleNewEvaluation}>
              <ClipboardList className="h-4 w-4" />
              Nova Avaliação
            </Button>
          </div>
        </div>
      </div>

      <StatusActions patient={patient} onAdvance={refreshPatient} />

      <Tabs.Root defaultValue="overview" className="space-y-4">
        <Tabs.List className="flex gap-0.5 border-b border-editorial-cream dark:border-editorial-navy-light/20 overflow-x-auto pb-px">
          {tabs.map((tab) => (
            <Tabs.Trigger
              key={tab.value}
              value={tab.value}
              className="flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium text-editorial-muted border-b-2 border-transparent transition-colors data-[state=active]:text-editorial-gold data-[state=active]:border-editorial-gold hover:text-editorial-navy/80 dark:hover:text-editorial-cream/80 focus-ring rounded-t-lg whitespace-nowrap flex-shrink-0"
            >
              <tab.icon className="h-3.5 w-3.5" />
              {tab.label}
            </Tabs.Trigger>
          ))}
        </Tabs.List>

        <Tabs.Content value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardTitle className="text-base font-serif">Informações Pessoais</CardTitle>
              <div className="mt-4 space-y-3">
                <InfoRow icon={<Calendar className="h-4 w-4" />} label="Nascimento" value={formatDate(patient.date_of_birth)} />
                <InfoRow icon={<FileText className="h-4 w-4" />} label="Gênero" value={patient.gender} />
                <InfoRow icon={<Phone className="h-4 w-4" />} label="Telefone" value={formatPhone(patient.phone)} />
                {patient.email && <InfoRow icon={<Mail className="h-4 w-4" />} label="E-mail" value={patient.email} />}
                {patient.how_found_clinic && <InfoRow icon={<Users className="h-4 w-4" />} label="Como nos encontrou" value={patient.how_found_clinic} />}
              </div>
            </Card>

            <Card>
              <CardTitle className="text-base font-serif">Dados Clínicos</CardTitle>
              <div className="mt-4 space-y-3">
                {(patient.weight_kg || patient.height_cm) && (
                  <>
                    {patient.height_cm && <InfoRow icon={<Scale className="h-4 w-4" />} label="Altura" value={`${patient.height_cm} cm`} />}
                    {patient.weight_kg && <InfoRow icon={<Scale className="h-4 w-4" />} label="Peso" value={`${patient.weight_kg} kg`} />}
                    {bmi !== '---' && (
                      <InfoRow
                        icon={<Scale className="h-4 w-4" />}
                        label="IMC"
                        value={`${bmi} — ${getBMICategory(bmi)}`}
                        highlight={parseFloat(bmi) >= 30}
                      />
                    )}
                  </>
                )}
                <InfoRow
                  icon={<Cigarette className="h-4 w-4" />}
                  label="Tabagismo"
                  value={patient.smoker ? (patient.smoking_cessation_date ? `Cessou em ${formatDate(patient.smoking_cessation_date)}` : 'Sim — ativo') : 'Não'}
                  highlight={patient.smoker && !patient.smoking_cessation_date}
                />
              </div>
            </Card>

            <Card>
              <CardTitle className="text-base font-serif">Endereço</CardTitle>
              <div className="mt-4 space-y-3">
                <InfoRow icon={<MapPin className="h-4 w-4" />} label="Rua" value={patient.street || '---'} />
                <InfoRow icon={<MapPin className="h-4 w-4" />} label="Cidade" value={[patient.city, patient.state].filter(Boolean).join(' / ') || '---'} />
                <InfoRow icon={<MapPin className="h-4 w-4" />} label="CEP" value={patient.zip_code || '---'} />
              </div>
            </Card>

            <Card>
              <CardTitle className="text-base font-serif">Histórico Médico</CardTitle>
              <div className="mt-4 space-y-4">
                <InfoBlock icon={<Stethoscope className="h-4 w-4" />} label="Histórico" text={patient.medical_history || 'Nenhum histórico registrado'} />
                <InfoBlock icon={<AlertTriangle className="h-4 w-4" />} label="Alergias" text={patient.allergies || 'Nenhuma alergia registrada'} />
                <InfoBlock icon={<Pill className="h-4 w-4" />} label="Medicamentos" text={patient.medications || 'Nenhum medicamento registrado'} />
                {patient.family_history && <InfoBlock icon={<Users className="h-4 w-4" />} label="Histórico Familiar" text={patient.family_history} />}
              </div>
            </Card>

            {patient.notes && (
              <Card className="md:col-span-2">
                <CardTitle className="text-base font-serif">Observações</CardTitle>
                <p className="mt-3 text-sm text-editorial-navy/80 dark:text-editorial-cream/80">{patient.notes}</p>
              </Card>
            )}
          </div>
        </Tabs.Content>

        <Tabs.Content value="history">
          <Card padding={false}>
            {patientEvals.length === 0 ? (
              <div className="text-center py-12">
                <ClipboardList className="h-10 w-10 text-editorial-warm mx-auto mb-3" />
                <p className="text-sm text-editorial-muted">Nenhuma avaliação realizada</p>
                <Button size="sm" className="mt-4" loading={starting} onClick={handleNewEvaluation}>Iniciar Avaliação</Button>
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-editorial-cream dark:border-editorial-navy-light/20">
                    <th className="text-left text-xs font-medium text-editorial-muted uppercase tracking-wider px-6 py-3">Data</th>
                    <th className="text-left text-xs font-medium text-editorial-muted uppercase tracking-wider px-6 py-3">Procedimento</th>
                    <th className="text-left text-xs font-medium text-editorial-muted uppercase tracking-wider px-6 py-3">Status</th>
                    <th className="text-right text-xs font-medium text-editorial-muted uppercase tracking-wider px-6 py-3">Score</th>
                  </tr>
                </thead>
                <tbody>
                  {patientEvals.map((ev: Evaluation) => (
                    <tr key={ev.id} className="border-b border-editorial-cream/50 dark:border-editorial-navy-light/10 hover:bg-editorial-cream/40 dark:hover:bg-white/5 transition-colors cursor-pointer" onClick={() => navigate(`/evaluations/${ev.id}`)}>
                      <td className="px-6 py-3 text-sm text-editorial-navy/80 dark:text-editorial-cream/80">{formatDate(ev.created_at)}</td>
                      <td className="px-6 py-3 text-sm text-editorial-muted">{ev.procedure_type || '---'}</td>
                      <td className="px-6 py-3">
                        <Badge variant={getStatusBadgeVariant(ev.status)}>{ev.status}</Badge>
                      </td>
                      <td className="px-6 py-3 text-right">
                        {ev.status === 'Concluído' ? (
                          <span className="text-sm font-semibold text-editorial-navy dark:text-editorial-cream">
                            {ev.max_score > 0 ? Math.round((ev.total_score / ev.max_score) * 100) : 0}%
                          </span>
                        ) : <span className="text-sm text-editorial-warm">---</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>
        </Tabs.Content>

        <Tabs.Content value="appointments">
          <AppointmentsTab patientId={id!} />
        </Tabs.Content>

        <Tabs.Content value="documents">
          <DocumentsTab patientId={id!} />
        </Tabs.Content>

        <Tabs.Content value="checklists">
          <ChecklistsTab patientId={id!} />
        </Tabs.Content>

        <Tabs.Content value="exams">
          <PreopExamsTab patientId={id!} />
        </Tabs.Content>

        <Tabs.Content value="surgical">
          <SurgicalTab patientId={id!} />
        </Tabs.Content>

        <Tabs.Content value="surveys">
          <SurveysTab patientId={id!} />
        </Tabs.Content>
      </Tabs.Root>
    </div>
  );
}

function InfoRow({ icon, label, value, highlight }: { icon: React.ReactNode; label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div className="text-editorial-warm">{icon}</div>
      <div className="flex-1 flex items-center justify-between">
        <span className="text-sm text-editorial-muted">{label}</span>
        <span className={`text-sm ${highlight ? 'text-editorial-rose font-medium' : 'text-editorial-navy dark:text-editorial-cream'}`}>{value}</span>
      </div>
    </div>
  );
}

function InfoBlock({ icon, label, text }: { icon: React.ReactNode; label: string; text: string }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-1.5">
        <div className="text-editorial-warm">{icon}</div>
        <span className="text-sm font-medium text-editorial-muted">{label}</span>
      </div>
      <p className="text-sm text-editorial-navy/80 dark:text-editorial-cream/80 pl-6">{text}</p>
    </div>
  );
}
