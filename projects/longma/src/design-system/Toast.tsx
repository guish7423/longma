import { useState, useEffect, useCallback, createContext, useContext } from 'react';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
  id: number;
  type: ToastType;
  text: string;
  leaving?: boolean;
}

interface ToastContextType {
  showToast: (text: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType>({ showToast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

let nextId = 0;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((text: string, type: ToastType = 'info') => {
    const id = nextId++;
    setToasts(prev => [...prev, { id, type, text }]);
  }, []);

  const dismissToast = useCallback((id: number) => {
    setToasts(prev => prev.map(t => t.id === id ? { ...t, leaving: true } : t));
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 250);
  }, []);

  useEffect(() => {
    if (toasts.length === 0) return;
    const lastToast = toasts[toasts.length - 1];
    if (!lastToast.leaving) {
      const timer = setTimeout(() => dismissToast(lastToast.id), 3500);
      return () => clearTimeout(timer);
    }
  }, [toasts, dismissToast]);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div style={{
        position: 'fixed',
        top: 16,
        right: 16,
        zIndex: 10000,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        pointerEvents: 'none',
      }}>
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={toast.leaving ? 'toast-leave' : 'toast-enter'}
            style={{
              pointerEvents: 'auto',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '10px 16px',
              borderRadius: 10,
              background: 'var(--glass-bg)',
              border: `1px solid ${toastBorder(toast.type)}`,
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              boxShadow: `0 4px 20px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.05)`,
              minWidth: 280,
              maxWidth: 400,
              fontSize: 13,
              color: 'var(--text-primary)',
              fontWeight: 500,
              position: 'relative',
              overflow: 'hidden',
            }}
            onClick={() => dismissToast(toast.id)}
          >
            {/* Progress bar */}
            <div style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              height: 2,
              background: toastColor(toast.type),
              opacity: 0.5,
              animation: `toastProgress 3.5s linear`,
            }} />
            {/* Icon */}
            <span style={{ fontSize: 14, flexShrink: 0 }}>
              {toastIcon(toast.type)}
            </span>
            <span style={{ flex: 1 }}>{toast.text}</span>
            <button
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                padding: 2,
                fontSize: 14,
                lineHeight: 1,
                opacity: 0.6,
              }}
              onClick={(e) => { e.stopPropagation(); dismissToast(toast.id); }}
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function toastColor(type: ToastType): string {
  switch (type) {
    case 'success': return 'var(--success)';
    case 'error': return 'var(--error)';
    case 'warning': return 'var(--warning)';
    case 'info': return 'var(--info)';
  }
}

function toastBorder(type: ToastType): string {
  switch (type) {
    case 'success': return 'rgba(63, 185, 80, 0.3)';
    case 'error': return 'rgba(248, 81, 73, 0.3)';
    case 'warning': return 'rgba(210, 153, 34, 0.3)';
    case 'info': return 'rgba(79, 111, 255, 0.3)';
  }
}

function toastIcon(type: ToastType): string {
  switch (type) {
    case 'success': return '✓';
    case 'error': return '✕';
    case 'warning': return '⚠';
    case 'info': return 'ℹ';
  }
}
