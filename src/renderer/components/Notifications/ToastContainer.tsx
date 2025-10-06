import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { Toast, ToastType, ToastAction } from './Toast';
import { TIMING_CONFIG } from '../../../shared/config/timing';

interface ToastMessage {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
  action?: ToastAction;
}

interface ToastContextValue {
  showToast: (message: string, type: ToastType, duration?: number, action?: ToastAction) => void;
  showSuccess: (message: string, duration?: number) => void;
  showError: (message: string, duration?: number, action?: ToastAction) => void;
  showInfo: (message: string, duration?: number) => void;
  showWarning: (message: string, duration?: number) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
}

interface ToastProviderProps {
  children: ReactNode;
}

export function ToastProvider({ children }: ToastProviderProps) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = useCallback((message: string, type: ToastType, duration?: number, action?: ToastAction) => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { id, message, type, duration, action }]);
  }, []);

  const showSuccess = useCallback((message: string, duration = TIMING_CONFIG.TOAST_DURATION.SUCCESS_MS) => {
    showToast(message, 'success', duration);
  }, [showToast]);

  const showError = useCallback((message: string, duration = TIMING_CONFIG.TOAST_DURATION.ERROR_MS, action?: ToastAction) => {
    showToast(message, 'error', duration, action);
  }, [showToast]);

  const showInfo = useCallback((message: string, duration = TIMING_CONFIG.TOAST_DURATION.INFO_MS) => {
    showToast(message, 'info', duration);
  }, [showToast]);

  const showWarning = useCallback((message: string, duration = TIMING_CONFIG.TOAST_DURATION.WARNING_MS) => {
    showToast(message, 'warning', duration);
  }, [showToast]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast, showSuccess, showError, showInfo, showWarning }}>
      {children}

      {/* Toast Container */}
      {toasts.length > 0 && (
        <div className="toast toast-end toast-top z-50">
          {toasts.map((toast) => (
            <Toast
              key={toast.id}
              message={toast.message}
              type={toast.type}
              duration={toast.duration}
              action={toast.action}
              onClose={() => removeToast(toast.id)}
            />
          ))}
        </div>
      )}
    </ToastContext.Provider>
  );
}
