import { useEffect } from 'react';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastAction {
  label: string;
  onClick: () => void;
}

interface ToastProps {
  message: string;
  type: ToastType;
  onClose: () => void;
  duration?: number; // Duration in milliseconds, 0 = no auto-close
  action?: ToastAction; // Optional action button
}

export function Toast({ message, type, onClose, duration = 3000, action }: ToastProps) {
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
    warning: <AlertTriangle className="h-5 w-5" />,
  };

  const alertClasses = {
    success: 'alert-success',
    error: 'alert-error',
    info: 'alert-info',
    warning: 'alert-warning',
  };

  return (
    <div className={`alert ${alertClasses[type]} shadow-lg flex items-center gap-2`}>
      {icons[type]}
      <span className="flex-1">{message}</span>
      {action && (
        <button
          className="btn btn-sm btn-ghost"
          onClick={() => {
            action.onClick();
            onClose();
          }}
          aria-label={action.label}
        >
          {action.label}
        </button>
      )}
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
