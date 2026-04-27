import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Loader2 } from 'lucide-react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'destructive' | 'outline';
type Size = 'sm' | 'md' | 'lg' | 'icon';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  children: ReactNode;
}

const variantStyles: Record<Variant, string> = {
  primary: 'bg-editorial-navy text-white hover:bg-editorial-navy-light active:bg-editorial-navy-dark border border-editorial-navy dark:bg-editorial-cream dark:text-editorial-navy-dark dark:border-editorial-cream dark:hover:bg-white dark:active:bg-editorial-warm',
  secondary: 'bg-transparent text-editorial-navy border border-editorial-navy/30 hover:bg-editorial-navy hover:text-white dark:text-editorial-cream dark:border-editorial-cream/30 dark:hover:bg-editorial-cream dark:hover:text-editorial-navy-dark',
  ghost: 'bg-transparent text-editorial-muted hover:bg-editorial-cream/60 hover:text-editorial-navy dark:hover:bg-white/5 dark:hover:text-editorial-cream',
  destructive: 'bg-editorial-rose-light text-editorial-rose hover:bg-editorial-rose/10 border border-editorial-rose/20',
  outline: 'bg-transparent text-editorial-gold border border-editorial-gold/40 hover:bg-editorial-gold/10 hover:border-editorial-gold',
};

const sizeStyles: Record<Size, string> = {
  sm: 'h-8 px-4 text-[0.65rem] gap-1.5 tracking-editorial uppercase',
  md: 'h-10 px-5 text-xs gap-2 tracking-editorial uppercase',
  lg: 'h-12 px-7 text-sm gap-2 tracking-editorial uppercase',
  icon: 'h-10 w-10 p-0 justify-center',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', loading, children, className = '', disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={`inline-flex items-center justify-center rounded font-medium transition-all duration-200 focus-ring disabled:opacity-50 disabled:pointer-events-none ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
        {...props}
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
