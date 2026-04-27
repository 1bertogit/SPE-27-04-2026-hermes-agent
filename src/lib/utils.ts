import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function formatDate(dateStr: string | null): string {
  if (!dateStr) return '---';
  try {
    return format(parseISO(dateStr), 'dd/MM/yyyy', { locale: ptBR });
  } catch {
    return '---';
  }
}

export function formatDateTime(dateStr: string | null): string {
  if (!dateStr) return '---';
  try {
    return format(parseISO(dateStr), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
  } catch {
    return '---';
  }
}

export function formatCPF(cpf: string): string {
  const digits = cpf.replace(/\D/g, '');
  if (digits.length !== 11) return cpf;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

export function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return phone;
}

export function classNames(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ');
}

export function getScoreColor(score: number, maxScore: number): string {
  if (maxScore === 0) return 'text-editorial-muted';
  const pct = (score / maxScore) * 100;
  if (pct >= 80) return 'text-editorial-sage';
  if (pct >= 50) return 'text-editorial-gold';
  return 'text-editorial-rose';
}

export function getScoreBgColor(score: number, maxScore: number): string {
  if (maxScore === 0) return 'bg-editorial-cream';
  const pct = (score / maxScore) * 100;
  if (pct >= 80) return 'bg-editorial-sage/20';
  if (pct >= 50) return 'bg-editorial-gold/20';
  return 'bg-editorial-rose/20';
}

export function getStatusColor(status: string): string {
  switch (status) {
    case 'Concluído':
      return 'bg-editorial-sage-light text-editorial-sage border-editorial-sage/20';
    case 'Em Andamento':
      return 'bg-editorial-gold/10 text-editorial-gold-dark border-editorial-gold/20';
    case 'Pendente':
      return 'bg-editorial-rose-light text-editorial-rose border-editorial-rose/20';
    case 'Ativo':
      return 'bg-editorial-sage-light text-editorial-sage border-editorial-sage/20';
    case 'Inativo':
      return 'bg-editorial-cream/60 text-editorial-muted border-editorial-warm/30';
    default:
      return 'bg-editorial-cream/60 text-editorial-muted border-editorial-warm/30';
  }
}

export function getClassificationColor(cls: string): string {
  switch (cls) {
    case 'I':
      return 'bg-editorial-sage-light text-editorial-sage border-editorial-sage/20';
    case 'II':
      return 'bg-editorial-navy/8 text-editorial-navy border-editorial-navy/15';
    case 'III':
      return 'bg-editorial-gold/10 text-editorial-gold-dark border-editorial-gold/20';
    case 'IV':
      return 'bg-editorial-rose-light text-editorial-rose border-editorial-rose/20';
    default:
      return 'bg-editorial-cream/60 text-editorial-muted border-editorial-warm/30';
  }
}

export function generateInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase();
}
