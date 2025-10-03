import { useEffect } from 'react';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

interface ToastProps {
  message: string;
  type: ToastType;
  onClose: () => void;
  duration?: number; // Duration in milliseconds, 0 = no auto-close
}

export function Toast({ message, type, onClose, duration = 3000 }: ToastProps) {
  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);

  const icons = {
    success: <CheckCircle className="h-5 w-5" />,
    error: <AlertCircle className="h-5 w-5" />,
    info: <Info className="h-5 w-5" />,
  };

  const alertClasses = {
    success: 'alert-success',
    error: 'alert-error',
    info: 'alert-info',
  };

  return (
    <div className={`alert ${alertClasses[type]} shadow-lg flex items-center gap-2`}>
      {icons[type]}
      <span className="flex-1">{message}</span>
      <button
        className="btn btn-ghost btn-xs btn-circle"
        onClick={onClose}
        aria-label="Close notification"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
