import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, Save, Loader2, AlertTriangle } from 'lucide-react';
import { Card, CardTitle, CardDescription } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input, Textarea, Select } from '../components/ui/Input';
import { patientSchema, type PatientFormData } from '../lib/validation';
import { usePatientStore } from '../stores/patientStore';
import { useUIStore } from '../stores/uiStore';
import { BRAZILIAN_STATES } from '../data/constants';
import { PROCEDURE_TYPES, HOW_FOUND_CLINIC_OPTIONS } from '../data/procedures';
import { PageSkeleton } from '../components/ui/Skeleton';

export default function PatientForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { fetchPatientById, createPatient, updatePatient } = usePatientStore();
  const showToast = useUIStore((s) => s.showToast);
  const [pageLoading, setPageLoading] = useState(!!id);
  const [notFound, setNotFound] = useState(false);
  const isEdit = !!id;

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<PatientFormData>({
    resolver: zodResolver(patientSchema),
    defaultValues: {
      gender: 'Masculino',
      classification: 'I',
      smoker: false,
    },
  });

  const smoker = watch('smoker');

  useEffect(() => {
    if (id) {
      setPageLoading(true);
      fetchPatientById(id).then((patient) => {
        if (patient) {
          reset({
            full_name: patient.full_name,
            cpf: patient.cpf,
            date_of_birth: patient.date_of_birth ?? '',
            gender: patient.gender as PatientFormData['gender'],
            phone: patient.phone,
            email: patient.email ?? '',
            street: patient.street ?? '',
            city: patient.city ?? '',
            state: patient.state ?? '',
            zip_code: patient.zip_code ?? '',
            classification: patient.classification,
            medical_history: patient.medical_history ?? '',
            allergies: patient.allergies ?? '',
            medications: patient.medications ?? '',
            notes: patient.notes ?? '',
            weight_kg: patient.weight_kg?.toString() ?? '',
            height_cm: patient.height_cm?.toString() ?? '',
            smoker: patient.smoker ?? false,
            smoking_cessation_date: patient.smoking_cessation_date ?? '',
            how_found_clinic: patient.how_found_clinic ?? '',
            procedure_interest: patient.procedure_interest ?? '',
            family_history: patient.family_history ?? '',
          });
        } else {
          setNotFound(true);
        }
        setPageLoading(false);
      });
    }
  }, [id, fetchPatientById, reset]);

  const onSubmit = async (data: PatientFormData) => {
    const payload = {
      ...data,
      date_of_birth: data.date_of_birth || null,
      email: data.email || null,
      street: data.street || null,
      city: data.city || null,
      state: data.state || null,
      zip_code: data.zip_code || null,
      medical_history: data.medical_history || null,
      allergies: data.allergies || null,
      medications: data.medications || null,
      notes: data.notes || null,
      weight_kg: data.weight_kg ? parseFloat(data.weight_kg) : null,
      height_cm: data.height_cm ? parseFloat(data.height_cm) : null,
      smoker: data.smoker ?? false,
      smoking_cessation_date: data.smoking_cessation_date || null,
      how_found_clinic: data.how_found_clinic || null,
      procedure_interest: data.procedure_interest || null,
      family_history: data.family_history || null,
    };

    if (isEdit && id) {
      const { error } = await updatePatient(id, payload);
      if (error) {
        showToast(error, 'error');
      } else {
        showToast('Paciente atualizado com sucesso', 'success');
        navigate(`/patients/${id}`);
      }
    } else {
      const result = await createPatient({
        ...payload,
        status: 'Ativo',
      });
      if (result.error) {
        showToast(result.error, 'error');
      } else {
        showToast('Paciente cadastrado com sucesso', 'success');
        navigate(result.id ? `/patients/${result.id}` : '/patients');
      }
    }
  };

  if (pageLoading) return <PageSkeleton />;

  if (notFound) {
    return (
      <div className="text-center py-20 animate-fade-in">
        <AlertTriangle className="h-12 w-12 text-editorial-gold mx-auto mb-4" />
        <h2 className="text-lg font-semibold font-serif text-editorial-navy mb-1">Paciente não encontrado</h2>
        <p className="text-sm text-editorial-muted mb-6">O paciente solicitado não existe ou foi removido.</p>
        <Button variant="secondary" onClick={() => navigate('/patients')}>
          Voltar para Pacientes
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate(-1)}
          className="p-2 rounded-lg text-editorial-muted hover:text-editorial-navy hover:bg-editorial-cream/40 dark:hover:bg-white/5 transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold font-serif text-editorial-navy dark:text-editorial-cream">
            {isEdit ? 'Editar Paciente' : 'Novo Paciente'}
          </h1>
          <p className="text-sm text-editorial-muted mt-0.5">
            {isEdit ? 'Atualize os dados do paciente' : 'Preencha os dados para cadastrar'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardTitle className="font-serif">Dados Pessoais</CardTitle>
          <CardDescription>Informações básicas do paciente</CardDescription>
          <div className="grid grid-cols-12 gap-4 mt-4">
            <div className="col-span-12 sm:col-span-6">
              <Input label="Nome Completo" error={errors.full_name?.message} {...register('full_name')} />
            </div>
            <div className="col-span-12 sm:col-span-3">
              <Input label="CPF" placeholder="000.000.000-00" error={errors.cpf?.message} {...register('cpf')} />
            </div>
            <div className="col-span-12 sm:col-span-3">
              <Input label="Data de Nascimento" type="date" error={errors.date_of_birth?.message} {...register('date_of_birth')} />
            </div>
            <div className="col-span-12 sm:col-span-3">
              <Select
                label="Gênero"
                options={[
                  { label: 'Masculino', value: 'Masculino' },
                  { label: 'Feminino', value: 'Feminino' },
                  { label: 'Outro', value: 'Outro' },
                ]}
                error={errors.gender?.message}
                {...register('gender')}
              />
            </div>
            <div className="col-span-12 sm:col-span-3">
              <Select
                label="Classificação"
                options={[
                  { label: 'Classe I', value: 'I' },
                  { label: 'Classe II', value: 'II' },
                  { label: 'Classe III', value: 'III' },
                  { label: 'Classe IV', value: 'IV' },
                ]}
                error={errors.classification?.message}
                {...register('classification')}
              />
            </div>
            <div className="col-span-12 sm:col-span-6">
              <Select
                label="Como conheceu a clínica"
                options={[
                  { label: 'Não informado', value: '' },
                  ...HOW_FOUND_CLINIC_OPTIONS.map((o) => ({ label: o, value: o })),
                ]}
                {...register('how_found_clinic')}
              />
            </div>
            <div className="col-span-12 sm:col-span-6">
              <Select
                label="Procedimento de interesse"
                options={[
                  { label: 'Não informado', value: '' },
                  ...PROCEDURE_TYPES.map((p) => ({ label: p, value: p })),
                ]}
                {...register('procedure_interest')}
              />
            </div>
          </div>
        </Card>

        <Card>
          <CardTitle className="font-serif">Contato</CardTitle>
          <CardDescription>Telefone e e-mail do paciente</CardDescription>
          <div className="grid grid-cols-12 gap-4 mt-4">
            <div className="col-span-12 sm:col-span-4">
              <Input label="Telefone" placeholder="(11) 99999-9999" error={errors.phone?.message} {...register('phone')} />
            </div>
            <div className="col-span-12 sm:col-span-8">
              <Input label="E-mail" type="email" placeholder="paciente@email.com" error={errors.email?.message} {...register('email')} />
            </div>
          </div>
        </Card>

        <Card>
          <CardTitle className="font-serif">Endereço</CardTitle>
          <CardDescription>Endereço residencial do paciente</CardDescription>
          <div className="grid grid-cols-12 gap-4 mt-4">
            <div className="col-span-12 sm:col-span-6">
              <Input label="Rua" placeholder="Rua, número, complemento" {...register('street')} />
            </div>
            <div className="col-span-12 sm:col-span-3">
              <Input label="Cidade" {...register('city')} />
            </div>
            <div className="col-span-6 sm:col-span-1">
              <Select
                label="UF"
                options={BRAZILIAN_STATES.map((s) => ({ label: s, value: s }))}
                placeholder="UF"
                {...register('state')}
              />
            </div>
            <div className="col-span-6 sm:col-span-2">
              <Input label="CEP" placeholder="00000-000" {...register('zip_code')} />
            </div>
          </div>
        </Card>

        <Card>
          <CardTitle className="font-serif">Dados Clínicos</CardTitle>
          <CardDescription>Informações relevantes para planejamento cirúrgico e avaliação de risco</CardDescription>
          <div className="grid grid-cols-12 gap-4 mt-4">
            <div className="col-span-6 sm:col-span-3">
              <Input label="Peso (kg)" type="number" step="0.1" placeholder="68.5" {...register('weight_kg')} />
            </div>
            <div className="col-span-6 sm:col-span-3">
              <Input label="Altura (cm)" type="number" step="0.1" placeholder="165" {...register('height_cm')} />
            </div>
            <div className="col-span-12 sm:col-span-6 flex items-end pb-1.5">
              <label className="flex items-center gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  className="rounded border-editorial-cream w-4 h-4 accent-editorial-gold"
                  {...register('smoker')}
                />
                <span className="text-sm text-editorial-navy dark:text-editorial-cream">Fumante / Histórico de tabagismo</span>
              </label>
            </div>
            {smoker && (
              <div className="col-span-12 sm:col-span-6">
                <Input label="Data de Cessação do Tabagismo" type="date" {...register('smoking_cessation_date')} />
              </div>
            )}
            <div className="col-span-12">
              <Textarea label="Histórico Familiar Relevante" placeholder="Ex: histórico familiar de trombose, câncer de mama..." {...register('family_history')} />
            </div>
          </div>
        </Card>

        <Card>
          <CardTitle className="font-serif">Histórico Médico</CardTitle>
          <CardDescription>Informações clínicas relevantes</CardDescription>
          <div className="grid grid-cols-12 gap-4 mt-4">
            <div className="col-span-12">
              <Textarea label="Histórico Médico" placeholder="Descreva o histórico médico do paciente..." {...register('medical_history')} />
            </div>
            <div className="col-span-12 sm:col-span-6">
              <Textarea label="Alergias" placeholder="Liste as alergias conhecidas..." {...register('allergies')} />
            </div>
            <div className="col-span-12 sm:col-span-6">
              <Textarea label="Medicamentos" placeholder="Medicamentos de uso contínuo..." {...register('medications')} />
            </div>
            <div className="col-span-12">
              <Textarea label="Observações" placeholder="Observações adicionais..." {...register('notes')} />
            </div>
          </div>
        </Card>

        <div className="flex items-center justify-end gap-3">
          <Button variant="secondary" type="button" onClick={() => navigate(-1)}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {isEdit ? 'Salvar Alterações' : 'Cadastrar Paciente'}
          </Button>
        </div>
      </form>
    </div>
  );
}
