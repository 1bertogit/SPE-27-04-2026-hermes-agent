import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { AuthLayout } from '../components/layout/AuthLayout';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { forgotPasswordSchema, type ForgotPasswordFormData } from '../lib/validation';
import { useAuthStore } from '../stores/authStore';
import { useUIStore } from '../stores/uiStore';

export default function ForgotPassword() {
  const { resetPassword, loading } = useAuthStore();
  const showToast = useUIStore((s) => s.showToast);
  const [sent, setSent] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = async (data: ForgotPasswordFormData) => {
    const { error } = await resetPassword(data.email);
    if (error) {
      showToast(error, 'error');
    } else {
      setSent(true);
    }
  };

  return (
    <AuthLayout>
      <div>
        <Link
          to="/login"
          className="inline-flex items-center gap-1.5 text-sm text-editorial-muted hover:text-editorial-navy dark:hover:text-editorial-cream transition-colors mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar ao login
        </Link>

        {sent ? (
          <div className="text-center py-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-editorial-sage-light mb-4">
              <CheckCircle2 className="h-8 w-8 text-editorial-sage" />
            </div>
            <h2 className="text-2xl font-bold font-serif text-editorial-navy dark:text-editorial-cream mb-2">E-mail Enviado</h2>
            <p className="text-sm text-editorial-muted max-w-sm mx-auto">
              Verifique sua caixa de entrada para redefinir sua senha. O link expira em 24 horas.
            </p>
            <Link to="/login">
              <Button variant="secondary" className="mt-6">
                Voltar ao Login
              </Button>
            </Link>
          </div>
        ) : (
          <>
            <h2 className="text-2xl font-bold font-serif text-editorial-navy dark:text-editorial-cream mb-1">Recuperar Senha</h2>
            <p className="text-sm text-editorial-muted mb-8">
              Informe seu e-mail para receber o link de recuperação
            </p>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <Input
                label="E-mail"
                type="email"
                placeholder="seu@email.com"
                icon={<Mail className="h-4 w-4" />}
                error={errors.email?.message}
                {...register('email')}
              />

              <Button type="submit" loading={loading} className="w-full">
                Enviar Link de Recuperação
              </Button>
            </form>
          </>
        )}
      </div>
    </AuthLayout>
  );
}
