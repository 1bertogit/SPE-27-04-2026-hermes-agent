import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate } from 'react-router-dom';
import { LogIn, Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { AuthLayout } from '../components/layout/AuthLayout';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { loginSchema, type LoginFormData } from '../lib/validation';
import { useAuthStore } from '../stores/authStore';
import { useUIStore } from '../stores/uiStore';

export default function Login() {
  const navigate = useNavigate();
  const { signIn, loading } = useAuthStore();
  const showToast = useUIStore((s) => s.showToast);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    const { error } = await signIn(data.email, data.password);
    if (error) {
      showToast(error, 'error');
    } else {
      navigate('/dashboard');
    }
  };

  return (
    <AuthLayout>
      <div>
        <h2 className="text-2xl font-bold font-serif text-editorial-navy dark:text-editorial-cream mb-1">Entrar</h2>
        <p className="text-sm text-editorial-muted mb-8">
          Acesse sua conta para continuar
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

          <div className="relative">
            <Input
              label="Senha"
              type={showPassword ? 'text' : 'password'}
              placeholder="Sua senha"
              icon={<Lock className="h-4 w-4" />}
              error={errors.password?.message}
              {...register('password')}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-[38px] text-editorial-muted hover:text-editorial-navy dark:hover:text-editorial-cream transition-colors"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>

          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                className="w-4 h-4 rounded border-editorial-cream dark:border-editorial-navy-light/30 bg-white text-editorial-gold focus:ring-editorial-gold focus:ring-offset-0"
              />
              <span className="text-sm text-editorial-muted">Lembrar-me</span>
            </label>
            <Link
              to="/forgot-password"
              className="text-sm text-editorial-gold hover:text-editorial-gold-dark transition-colors"
            >
              Esqueceu a senha?
            </Link>
          </div>

          <Button type="submit" loading={loading} className="w-full">
            <LogIn className="h-4 w-4" />
            Entrar
          </Button>
        </form>

        <p className="text-center text-sm text-editorial-muted mt-6">
          Não tem uma conta?{' '}
          <Link to="/register" className="text-editorial-gold hover:text-editorial-gold-dark transition-colors font-medium">
            Criar conta
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}
