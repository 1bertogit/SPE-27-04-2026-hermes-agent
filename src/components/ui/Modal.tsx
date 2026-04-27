import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import type { ReactNode } from 'react';

interface ModalProps {
  open: boolean;
  onOpenChange?: (open: boolean) => void;
  onClose?: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  maxWidth?: string;
}

export function Modal({
  open,
  onOpenChange,
  onClose,
  title,
  description,
  children,
  footer,
  maxWidth = 'max-w-lg',
}: ModalProps) {
  const handleOpenChange = (val: boolean) => {
    if (onOpenChange) onOpenChange(val);
    if (!val && onClose) onClose();
  };
  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-editorial-navy/30 backdrop-blur-sm z-50 animate-fade-in" />
        <Dialog.Content
          className={`fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 ${maxWidth} w-[calc(100%-2rem)] bg-editorial-light dark:bg-editorial-navy border border-editorial-cream dark:border-editorial-navy-light/20 rounded-xl p-6 shadow-lg z-50 animate-slide-up focus:outline-none`}
        >
          <div className="flex items-start justify-between mb-4">
            <div>
              <Dialog.Title className="text-lg font-semibold font-serif text-editorial-navy dark:text-editorial-cream">
                {title}
              </Dialog.Title>
              {description && (
                <Dialog.Description className="text-sm text-editorial-muted mt-1">
                  {description}
                </Dialog.Description>
              )}
            </div>
            <Dialog.Close className="text-editorial-muted hover:text-editorial-navy dark:hover:text-editorial-cream transition-colors focus-ring rounded-lg p-1">
              <X className="h-5 w-5" />
            </Dialog.Close>
          </div>
          {children}
          {footer && <div className="mt-4">{footer}</div>}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
