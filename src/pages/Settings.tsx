import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as Tabs from '@radix-ui/react-tabs';
import { Save, User, Building2, Users, Send } from 'lucide-react';
import OrgMembersTab from '../components/settings/OrgMembersTab';
import TelegramSettingsTab from '../components/settings/TelegramSettingsTab';
import { Card, CardTitle, CardDescription } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input, Textarea, Select } from '../components/ui/Input';
import { profileSchema, type ProfileFormData } from '../lib/validation';
import { Avatar } from '../components/ui/Avatar';
import { PageSkeleton } from '../components/ui/Skeleton';
import { useAuthStore } from '../stores/authStore';
import { useUIStore } from '../stores/uiStore';
import { SPECIALTIES } from '../data/constants';

export default function Settings() {
  const { profile, loading, updateProfile } = useAuthStore();
  const showToast = useUIStore((s) => s.showToast);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
  });

  useEffect(() => {
    if (profile) {
      reset({
        full_name: profile.full_name,
        crm_number: profile.crm_number ?? '',
        specialty: profile.specialty ?? '',
        phone: profile.phone ?? '',
        clinic_name: profile.clinic_name ?? '',
        clinic_address: profile.clinic_address ?? '',
      });
    }
  }, [profile, reset]);

  const onSubmit = async (data: ProfileFormData) => {
    const { error } = await updateProfile(data);
    if (error) {
      showToast(error, 'error');
    } else {
      showToast('Configuracoes salvas com sucesso', 'success');
    }
  };

  if (loading || !profile) return <PageSkeleton />;

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold font-serif text-editorial-navy dark:text-editorial-cream">Configuracoes</h1>
        <p className="text-sm text-editorial-muted mt-1">Gerencie seu perfil e configuracoes da clinica</p>
      </div>

      <Tabs.Root defaultValue="profile">
        <Tabs.List className="flex gap-1 border-b border-editorial-cream dark:border-editorial-navy-light/20 pb-px mb-6">
          <Tabs.Trigger
            value="profile"
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-editorial-muted border-b-2 border-transparent transition-colors data-[state=active]:text-editorial-gold data-[state=active]:border-editorial-gold hover:text-editorial-navy dark:hover:text-editorial-cream focus-ring rounded-t-lg"
          >
            <User className="h-4 w-4" />
            Perfil
          </Tabs.Trigger>
          <Tabs.Trigger
            value="clinic"
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-editorial-muted border-b-2 border-transparent transition-colors data-[state=active]:text-editorial-gold data-[state=active]:border-editorial-gold hover:text-editorial-navy dark:hover:text-editorial-cream focus-ring rounded-t-lg"
          >
            <Building2 className="h-4 w-4" />
            Clinica
          </Tabs.Trigger>
          <Tabs.Trigger
            value="members"
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-editorial-muted border-b-2 border-transparent transition-colors data-[state=active]:text-editorial-gold data-[state=active]:border-editorial-gold hover:text-editorial-navy dark:hover:text-editorial-cream focus-ring rounded-t-lg"
          >
            <Users className="h-4 w-4" />
            Membros
          </Tabs.Trigger>
          <Tabs.Trigger
            value="telegram"
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-editorial-muted border-b-2 border-transparent transition-colors data-[state=active]:text-editorial-gold data-[state=active]:border-editorial-gold hover:text-editorial-navy dark:hover:text-editorial-cream focus-ring rounded-t-lg"
          >
            <Send className="h-4 w-4" />
            Telegram
          </Tabs.Trigger>
        </Tabs.List>

        <form onSubmit={handleSubmit(onSubmit)}>
          <Tabs.Content value="profile" className="space-y-6">
            <Card>
              <div className="flex items-center gap-4 mb-6">
                <Avatar name={profile.full_name ?? 'U'} size="xl" />
                <div>
                  <p className="text-lg font-semibold text-editorial-navy dark:text-editorial-cream">{profile.full_name}</p>
                  <p className="text-sm text-editorial-muted">{profile.email}</p>
                </div>
              </div>

              <CardTitle className="text-base font-serif">Informacoes Pessoais</CardTitle>
              <CardDescription>Seus dados profissionais</CardDescription>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                <Input
                  label="Nome Completo"
                  error={errors.full_name?.message}
                  {...register('full_name')}
                />
                <Input
                  label="CRM"
                  placeholder="CRM/SP 123456"
                  error={errors.crm_number?.message}
                  {...register('crm_number')}
                />
                <Select
                  label="Especialidade"
                  options={SPECIALTIES.map((s) => ({ label: s, value: s }))}
                  placeholder="Selecione"
                  error={errors.specialty?.message}
                  {...register('specialty')}
                />
                <Input
                  label="Telefone"
                  placeholder="(11) 99999-9999"
                  error={errors.phone?.message}
                  {...register('phone')}
                />
              </div>
            </Card>

            <div className="flex justify-end">
              <Button type="submit" loading={isSubmitting}>
                <Save className="h-4 w-4" />
                Salvar Alteracoes
              </Button>
            </div>
          </Tabs.Content>

          <Tabs.Content value="clinic" className="space-y-6">
            <Card>
              <CardTitle className="text-base font-serif">Dados da Clinica</CardTitle>
              <CardDescription>Informacoes do local de atendimento</CardDescription>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                <div className="sm:col-span-2">
                  <Input
                    label="Nome da Clinica"
                    placeholder="Clinica Exemplo"
                    {...register('clinic_name')}
                  />
                </div>
                <div className="sm:col-span-2">
                  <Textarea
                    label="Endereco Completo"
                    placeholder="Rua, numero, bairro, cidade, estado, CEP"
                    {...register('clinic_address')}
                  />
                </div>
              </div>
            </Card>

            <div className="flex justify-end">
              <Button type="submit" loading={isSubmitting}>
                <Save className="h-4 w-4" />
                Salvar Alteracoes
              </Button>
            </div>
          </Tabs.Content>
        </form>

        <Tabs.Content value="members" className="space-y-6">
          <OrgMembersTab />
        </Tabs.Content>

        <Tabs.Content value="telegram" className="space-y-6">
          <TelegramSettingsTab />
        </Tabs.Content>
      </Tabs.Root>
    </div>
  );
}
