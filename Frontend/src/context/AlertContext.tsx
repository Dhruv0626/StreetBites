import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Info,
  X,
  ShieldAlert,
} from 'lucide-react';

export type AlertType = 'success' | 'error' | 'warning' | 'info' | 'danger';

export interface AlertOptions {
  title?: string;
  message: string;
  type?: AlertType;
  confirmText?: string;
  cancelText?: string;
  isConfirm?: boolean;
  onConfirm?: () => void;
  onCancel?: () => void;
}

interface AlertContextType {
  showAlert: (options: AlertOptions | string, type?: AlertType) => Promise<boolean>;
  showConfirm: (options: AlertOptions | string) => Promise<boolean>;
  closeAlert: () => void;
  toast: {
    success: (message: string, title?: string) => void;
    error: (message: string, title?: string) => void;
    warning: (message: string, title?: string) => void;
    info: (message: string, title?: string) => void;
  };
}

interface ToastItem {
  id: string;
  message: string;
  title?: string;
  type: AlertType;
}

const AlertContext = createContext<AlertContextType | undefined>(undefined);

// Standalone global trigger holder
let globalShowAlert: ((options: AlertOptions | string, type?: AlertType) => Promise<boolean>) | null = null;
let globalShowConfirm: ((options: AlertOptions | string) => Promise<boolean>) | null = null;
let globalToast: AlertContextType['toast'] | null = null;

export const appAlert = (message: string, title?: string, type: AlertType = 'info') => {
  if (globalShowAlert) {
    return globalShowAlert({ message, title, type });
  }
  return Promise.resolve(true);
};

export const appConfirm = (message: string, title?: string, type: AlertType = 'warning') => {
  if (globalShowConfirm) {
    return globalShowConfirm({ message, title, type, isConfirm: true });
  }
  return Promise.resolve(window.confirm(message));
};

export const appToast = {
  success: (msg: string, title?: string) => globalToast?.success(msg, title),
  error: (msg: string, title?: string) => globalToast?.error(msg, title),
  warning: (msg: string, title?: string) => globalToast?.warning(msg, title),
  info: (msg: string, title?: string) => globalToast?.info(msg, title),
};

export const AlertProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    options: AlertOptions;
    resolve?: (value: boolean) => void;
  }>({
    isOpen: false,
    options: { message: '' },
  });

  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const showAlert = useCallback(
    (options: AlertOptions | string, type: AlertType = 'info'): Promise<boolean> => {
      return new Promise<boolean>((resolve) => {
        const normalizedOptions: AlertOptions =
          typeof options === 'string'
            ? { message: options, type }
            : { type, ...options };

        setModalState({
          isOpen: true,
          options: normalizedOptions,
          resolve,
        });
      });
    },
    []
  );

  const showConfirm = useCallback(
    (options: AlertOptions | string): Promise<boolean> => {
      return new Promise<boolean>((resolve) => {
        const normalizedOptions: AlertOptions =
          typeof options === 'string'
            ? {
                message: options,
                title: 'Confirmation Needed',
                isConfirm: true,
                type: 'warning',
                confirmText: 'Confirm',
                cancelText: 'Cancel',
              }
            : {
                isConfirm: true,
                title: options.title || 'Confirmation Needed',
                confirmText: options.confirmText || 'Confirm',
                cancelText: options.cancelText || 'Cancel',
                type: options.type || 'warning',
                ...options,
              };

        setModalState({
          isOpen: true,
          options: normalizedOptions,
          resolve,
        });
      });
    },
    []
  );

  const closeAlert = useCallback(() => {
    if (modalState.resolve) {
      modalState.resolve(false);
    }
    setModalState((prev) => ({ ...prev, isOpen: false }));
  }, [modalState]);

  const handleConfirm = useCallback(() => {
    if (modalState.options.onConfirm) {
      modalState.options.onConfirm();
    }
    if (modalState.resolve) {
      modalState.resolve(true);
    }
    setModalState((prev) => ({ ...prev, isOpen: false }));
  }, [modalState]);

  const handleCancel = useCallback(() => {
    if (modalState.options.onCancel) {
      modalState.options.onCancel();
    }
    if (modalState.resolve) {
      modalState.resolve(false);
    }
    setModalState((prev) => ({ ...prev, isOpen: false }));
  }, [modalState]);

  // Toast handlers
  const addToast = useCallback((message: string, title?: string, type: AlertType = 'info') => {
    const id = `${Date.now()}_${Math.random()}`;
    setToasts((prev) => [...prev, { id, message, title, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = {
    success: (msg: string, title?: string) => addToast(msg, title, 'success'),
    error: (msg: string, title?: string) => addToast(msg, title, 'error'),
    warning: (msg: string, title?: string) => addToast(msg, title, 'warning'),
    info: (msg: string, title?: string) => addToast(msg, title, 'info'),
  };

  // Sync to global static holders
  useEffect(() => {
    globalShowAlert = showAlert;
    globalShowConfirm = showConfirm;
    globalToast = toast;

    // Optional override for standard window.alert & window.confirm
    const originalAlert = window.alert;
    const originalConfirm = window.confirm;

    window.alert = (msg: any) => {
      showAlert(String(msg || ''));
    };

    return () => {
      window.alert = originalAlert;
      window.confirm = originalConfirm;
    };
  }, [showAlert, showConfirm]);

  const { isOpen, options } = modalState;
  const currentType = options.type || (options.isConfirm ? 'warning' : 'info');

  const getIcon = () => {
    switch (currentType) {
      case 'success':
        return <CheckCircle2 className="w-8 h-8 text-emerald-600 stroke-[2.2]" />;
      case 'error':
      case 'danger':
        return <XCircle className="w-8 h-8 text-[#D94A38] stroke-[2.2]" />;
      case 'warning':
        return <AlertTriangle className="w-8 h-8 text-amber-600 stroke-[2.2]" />;
      case 'info':
      default:
        return <Info className="w-8 h-8 text-stone-700 stroke-[2.2]" />;
    }
  };

  const getIconContainerStyle = () => {
    switch (currentType) {
      case 'success':
        return 'bg-emerald-50 border-emerald-200 text-emerald-600';
      case 'error':
      case 'danger':
        return 'bg-[#FDE8E6] border-[#F8C8C4] text-[#D94A38]';
      case 'warning':
        return 'bg-amber-50 border-amber-200 text-amber-600';
      case 'info':
      default:
        return 'bg-stone-100 border-stone-200 text-stone-700';
    }
  };

  const getDefaultTitle = () => {
    if (options.title) return options.title;
    switch (currentType) {
      case 'success':
        return 'Success';
      case 'error':
      case 'danger':
        return 'Attention Needed';
      case 'warning':
        return 'Please Confirm';
      case 'info':
      default:
        return 'Information';
    }
  };

  return (
    <AlertContext.Provider value={{ showAlert, showConfirm, closeAlert, toast }}>
      {children}

      {/* Modern Global Toasts Container (Top-Right) */}
      {toasts.length > 0 && (
        <div className="fixed top-5 right-5 z-[9999] flex flex-col gap-3 max-w-sm w-full pointer-events-none px-4 sm:px-0">
          {toasts.map((t) => (
            <div
              key={t.id}
              className="pointer-events-auto bg-[#FAF7F2] border border-[#E7E2D9] rounded-2xl p-4 shadow-xl flex items-start gap-3 transform transition-all duration-300 animate-in slide-in-from-top-4 fade-in"
            >
              <div
                className={`p-2 rounded-xl shrink-0 border ${
                  t.type === 'success'
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-600'
                    : t.type === 'error' || t.type === 'danger'
                    ? 'bg-[#FDE8E6] border-[#F8C8C4] text-[#D94A38]'
                    : t.type === 'warning'
                    ? 'bg-amber-50 border-amber-200 text-amber-600'
                    : 'bg-stone-100 border-stone-200 text-stone-700'
                }`}
              >
                {t.type === 'success' && <CheckCircle2 className="w-5 h-5" />}
                {(t.type === 'error' || t.type === 'danger') && <XCircle className="w-5 h-5" />}
                {t.type === 'warning' && <AlertTriangle className="w-5 h-5" />}
                {t.type === 'info' && <Info className="w-5 h-5" />}
              </div>
              <div className="flex-1 min-w-0 pt-0.5">
                {t.title && <h4 className="text-xs font-bold text-stone-900 tracking-tight">{t.title}</h4>}
                <p className="text-xs text-stone-700 font-medium leading-relaxed break-words">{t.message}</p>
              </div>
              <button
                onClick={() => removeToast(t.id)}
                className="text-stone-400 hover:text-stone-700 p-1 rounded-lg transition-colors cursor-pointer shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Attractive Theme Alert & Confirmation Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
          {/* Glassmorphism Backdrop Overlay */}
          <div
            onClick={options.isConfirm ? undefined : closeAlert}
            className="absolute inset-0 bg-stone-950/60 backdrop-blur-sm transition-opacity duration-200 animate-in fade-in"
          />

          {/* Modal Card */}
          <div
            className="relative bg-[#FAF7F2] border border-[#EFE8DC] rounded-3xl shadow-2xl max-w-md w-full p-6 sm:p-7 overflow-hidden z-10 transform transition-all duration-200 animate-in zoom-in-95 fade-in"
            style={{
              backgroundImage: 'radial-gradient(circle at top right, rgba(217, 74, 56, 0.05) 0%, transparent 60%)',
            }}
          >
            {/* Top Close Button (for non-critical alerts) */}
            {!options.isConfirm && (
              <button
                onClick={closeAlert}
                className="absolute top-5 right-5 text-stone-400 hover:text-stone-700 p-1.5 rounded-xl hover:bg-stone-200/50 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}

            <div className="flex flex-col items-center text-center">
              {/* Animated Icon Badge */}
              <div
                className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4 border shadow-sm ${getIconContainerStyle()}`}
              >
                {getIcon()}
              </div>

              {/* Title */}
              <h3 className="text-lg sm:text-xl font-bold text-stone-900 tracking-tight font-sans mb-2">
                {getDefaultTitle()}
              </h3>

              {/* Message Body */}
              <p className="text-sm text-stone-600 font-medium font-sans leading-relaxed mb-6 whitespace-pre-line max-w-sm">
                {options.message}
              </p>

              {/* Actions */}
              <div className="flex items-center justify-center gap-3 w-full">
                {options.isConfirm && (
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="flex-1 py-3 px-5 rounded-xl text-sm font-bold text-stone-700 bg-white hover:bg-stone-100 border border-[#E7E2D9] transition-all shadow-sm active:scale-[0.98] cursor-pointer"
                  >
                    {options.cancelText || 'Cancel'}
                  </button>
                )}
                <button
                  type="button"
                  autoFocus
                  onClick={handleConfirm}
                  className={`flex-1 py-3 px-6 rounded-xl text-sm font-bold text-white transition-all shadow-md active:scale-[0.98] cursor-pointer ${
                    currentType === 'danger' || currentType === 'error'
                      ? 'bg-[#D94A38] hover:bg-[#C43D2E] hover:shadow-lg shadow-[#D94A38]/20'
                      : currentType === 'success'
                      ? 'bg-emerald-600 hover:bg-emerald-700 hover:shadow-lg shadow-emerald-600/20'
                      : 'bg-[#D94A38] hover:bg-[#C43D2E] hover:shadow-lg shadow-[#D94A38]/20'
                  }`}
                >
                  {options.confirmText || (options.isConfirm ? 'Confirm' : 'Got it')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AlertContext.Provider>
  );
};

export const useAlert = () => {
  const context = useContext(AlertContext);
  if (!context) {
    throw new Error('useAlert must be used within an AlertProvider');
  }
  return context;
};
