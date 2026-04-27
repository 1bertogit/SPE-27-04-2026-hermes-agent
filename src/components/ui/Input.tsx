import { forwardRef, type InputHTMLAttributes, type TextareaHTMLAttributes, type SelectHTMLAttributes, type ReactNode } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, icon, className = '', ...props }, ref) => {
    return (
      <div className="space-y-1.5">
        {label && (
          <label className="block text-sm font-medium text-editorial-navy dark:text-editorial-cream">
            {label}
          </label>
        )}
        <div className="relative">
          {icon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-editorial-muted">
              {icon}
            </div>
          )}
          <input
            ref={ref}
            className={`w-full h-10 rounded border border-editorial-cream dark:border-editorial-navy-light/30 bg-white dark:bg-editorial-navy/40 text-editorial-navy dark:text-editorial-cream text-sm placeholder:text-editorial-warm dark:placeholder:text-editorial-muted focus:outline-none focus:ring-2 focus:ring-editorial-gold/40 focus:border-editorial-gold transition-colors ${
              icon ? 'pl-10 pr-3' : 'px-3'
            } ${error ? 'border-editorial-rose focus:ring-editorial-rose/40' : ''} ${className}`}
            {...props}
          />
        </div>
        {error && <p className="text-xs text-editorial-rose">{error}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, className = '', ...props }, ref) => {
    return (
      <div className="space-y-1.5">
        {label && (
          <label className="block text-sm font-medium text-editorial-navy dark:text-editorial-cream">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          className={`w-full rounded border border-editorial-cream dark:border-editorial-navy-light/30 bg-white dark:bg-editorial-navy/40 text-editorial-navy dark:text-editorial-cream text-sm placeholder:text-editorial-warm dark:placeholder:text-editorial-muted focus:outline-none focus:ring-2 focus:ring-editorial-gold/40 focus:border-editorial-gold transition-colors px-3 py-2 min-h-[80px] resize-y ${
            error ? 'border-editorial-rose focus:ring-editorial-rose/40' : ''
          } ${className}`}
          {...props}
        />
        {error && <p className="text-xs text-editorial-rose">{error}</p>}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { label: string; value: string }[];
  placeholder?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, options, placeholder, className = '', ...props }, ref) => {
    return (
      <div className="space-y-1.5">
        {label && (
          <label className="block text-sm font-medium text-editorial-navy dark:text-editorial-cream">
            {label}
          </label>
        )}
        <select
          ref={ref}
          className={`w-full h-10 rounded border border-editorial-cream dark:border-editorial-navy-light/30 bg-white dark:bg-editorial-navy/40 text-editorial-navy dark:text-editorial-cream text-sm focus:outline-none focus:ring-2 focus:ring-editorial-gold/40 focus:border-editorial-gold transition-colors px-3 ${
            error ? 'border-editorial-rose focus:ring-editorial-rose/40' : ''
          } ${className}`}
          {...props}
        >
          {placeholder && (
            <option value="" className="text-editorial-muted">
              {placeholder}
            </option>
          )}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {error && <p className="text-xs text-editorial-rose">{error}</p>}
      </div>
    );
  }
);

Select.displayName = 'Select';
