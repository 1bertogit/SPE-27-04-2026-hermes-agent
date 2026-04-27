import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthLayout } from '../components/layout/AuthLayout';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';

export default function Onboarding() {
  const navigate = useNavigate();
  const [clinicName, setClinicName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('complete-onboarding', {
        body: { orgName: clinicName }
      });

      if (fnError || !data?.success) {
        throw new Error(data?.error || fnError?.message || 'Erro ao criar organização');
      }

      await supabase.auth.refreshSession();
      await useAuthStore.getState().fetchProfile();

      navigate('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <div className="w-full max-w-md">
        <div className="mb-8">
          <h1 className="text-4xl font-serif font-bold text-editorial-navy dark:text-editorial-cream mb-2">
            Bem-vindo
          </h1>
          <p className="text-editorial-muted dark:text-editorial-warm">
            Configure sua clínica para começar
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="clinicName" className="block text-sm font-medium text-editorial-navy dark:text-editorial-cream mb-2">
              Nome da Clínica
            </label>
            <Input
              id="clinicName"
              type="text"
              placeholder="Ex: Clínica de Estética São Paulo"
              value={clinicName}
              onChange={(e) => setClinicName(e.target.value)}
              disabled={loading}
              required
              minLength={2}
            />
          </div>

          {error && (
            <div className="p-3 bg-editorial-rose/10 dark:bg-editorial-rose/20 rounded-lg border border-editorial-rose/30 dark:border-editorial-rose/40">
              <p className="text-sm text-editorial-rose dark:text-editorial-rose">{error}</p>
            </div>
          )}

          <Button
            type="submit"
            disabled={loading || clinicName.trim().length < 2}
            className="w-full"
          >
            {loading ? 'Criando...' : 'Criar Organização'}
          </Button>
        </form>
      </div>
    </AuthLayout>
  );
}
