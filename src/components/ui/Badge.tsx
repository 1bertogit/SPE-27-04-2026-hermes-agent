import type { ReactNode } from 'react';

type BadgeVariant = 'success' | 'warning' | 'error' | 'info' | 'neutral';

interface BadgeProps {
  variant?: BadgeVariant;
  children: ReactNode;
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  success: 'bg-editorial-sage-light text-editorial-sage border-editorial-sage/20',
  warning: 'bg-editorial-gold/10 text-editorial-gold-dark border-editorial-gold/20',
  error: 'bg-editorial-rose-light text-editorial-rose border-editorial-rose/20',
  info: 'bg-editorial-navy/8 text-editorial-navy border-editorial-navy/15',
  neutral: 'bg-editorial-cream/60 text-editorial-muted border-editorial-warm/30',
};

export function Badge({ variant = 'neutral', children, className = '' }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${variantStyles[variant]} ${className}`}
    >
      {children}
    </span>
  );
}

export function getStatusBadgeVariant(status: string): BadgeVariant {
  switch (status) {
    case 'Concluído':
    case 'Ativo':
      return 'success';
    case 'Em Andamento':
      return 'warning';
    case 'Pendente':
      return 'error';
    case 'Inativo':
      return 'neutral';
    default:
      return 'neutral';
  }
}

export function getClassificationBadgeVariant(cls: string): BadgeVariant {
  switch (cls) {
    case 'I': return 'success';
    case 'II': return 'info';
    case 'III': return 'warning';
    case 'IV': return 'error';
    default: return 'neutral';
  }
}
