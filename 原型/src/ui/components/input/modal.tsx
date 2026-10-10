// 简单的浮层：盖住整页，点背景或按 Esc 关上。看大图、写公式用。
import { XIcon } from 'lucide-react';
import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';
import { W } from '@/wording';

export function Modal(props: {
  onClose: () => void;
  children: ReactNode;
  className?: string;
  label: string;
}) {
  const { onClose } = props;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={props.label}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={cn(
          'bg-background relative max-h-full overflow-auto rounded-2xl p-4 shadow-xl',
          props.className,
        )}
      >
        <button
          type="button"
          aria-label={W.close}
          className="text-muted-foreground hover:text-foreground absolute top-2 right-2 rounded-md p-1"
          onClick={onClose}
        >
          <XIcon className="size-4" />
        </button>
        {props.children}
      </div>
    </div>,
    document.body,
  );
}

/** 看大图：原图原样显示。 */
export function ImageViewer(props: { src: string; alt: string; onClose: () => void }) {
  return (
    <Modal onClose={props.onClose} label={props.alt} className="p-2 pt-9">
      <img src={props.src} alt={props.alt} className="max-h-[85vh] max-w-[90vw] object-contain" />
    </Modal>
  );
}
