import type { ReactNode } from 'react';
import { Activity } from 'lucide-react';

interface AuthLayoutProps {
  children: ReactNode;
}

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex lg:w-[55%] relative bg-editorial-navy items-center justify-center overflow-hidden">
        <svg
          className="absolute inset-0 w-full h-full"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(197,160,89,0.06)" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>

        <div className="absolute bottom-0 right-0 font-serif text-[30vw] leading-none text-white/[0.03] select-none pointer-events-none">
          S
        </div>

        <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-editorial-gold/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/3 right-1/4 w-56 h-56 bg-editorial-gold/3 rounded-full blur-3xl" />

        <div className="relative z-10 text-center px-12 max-w-lg">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-white/5 border border-editorial-gold/20 mb-8">
            <Activity className="h-10 w-10 text-editorial-gold" />
          </div>
          <h1 className="text-4xl font-bold font-serif text-white mb-4 tracking-tight">
            SPE-M
          </h1>
          <p className="text-lg text-white/60 leading-relaxed">
            Surgical Planning & Evaluation - Medical
          </p>
          <p className="text-sm text-white/40 mt-4 leading-relaxed">
            Plataforma de avaliação médica para planejamento cirúrgico com scoring em tempo real e visualização anatômica.
          </p>

          <div className="mt-12 grid grid-cols-3 gap-6">
            {[
              { value: '2.4k+', label: 'Avaliações' },
              { value: '99.8%', label: 'Uptime' },
              { value: '350+', label: 'Cirurgiões' },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-2xl font-bold font-serif text-editorial-gold">{stat.value}</div>
                <div className="text-xs text-white/40 mt-1 uppercase tracking-editorial">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-6 lg:p-12 bg-editorial-paper dark:bg-editorial-navy-dark transition-colors duration-300">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-lg bg-editorial-gold/10 border border-editorial-gold/20 flex items-center justify-center">
              <Activity className="h-5 w-5 text-editorial-gold" />
            </div>
            <span className="text-xl font-bold font-serif text-editorial-navy dark:text-editorial-cream">SPE-M</span>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
