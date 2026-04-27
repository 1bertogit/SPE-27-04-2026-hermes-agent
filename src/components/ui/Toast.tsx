import { CheckCircle2, XCircle, Info, X } from 'lucide-react';
import { useUIStore } from '../../stores/uiStore';

const typeStyles = {
  success: 'border-l-editorial-sage text-editorial-sage',
  error: 'border-l-editorial-rose text-editorial-rose',
  info: 'border-l-editorial-gold text-editorial-gold-dark',
};

const typeIcons = {
  success: CheckCircle2,
  error: XCircle,
  info: Info,
};

export function ToastContainer() {
  const { toasts, dismissToast } = useUIStore();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[100] space-y-2">
      {toasts.map((toast) => {
        const Icon = typeIcons[toast.type];
        const styles = typeStyles[toast.type];
        return (
          <div
            key={toast.id}
            className={`flex items-center gap-3 px-4 py-3 rounded border border-editorial-cream dark:border-editorial-navy-light/20 bg-white dark:bg-editorial-navy shadow-lg min-w-[300px] border-l-[3px] transition-all duration-300 ${
              toast.dismissing
                ? 'opacity-0 translate-y-2'
                : 'opacity-100 translate-y-0 animate-slide-up'
            } ${styles}`}
          >
            <Icon className="h-5 w-5 shrink-0" />
            <span className="text-sm flex-1 text-editorial-navy dark:text-editorial-cream">{toast.message}</span>
            <button
              onClick={() => dismissToast(toast.id)}
              className="text-editorial-muted opacity-60 hover:opacity-100 transition-opacity"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
