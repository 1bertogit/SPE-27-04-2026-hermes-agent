import type { ReactNode } from 'react';

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="text-editorial-warm mb-4">{icon}</div>
      <h3 className="text-lg font-semibold font-serif text-editorial-navy dark:text-editorial-cream mb-1">{title}</h3>
      <p className="text-sm text-editorial-muted max-w-sm mb-6">{description}</p>
      {action}
    </div>
  );
}
