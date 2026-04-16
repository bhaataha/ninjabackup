'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

type ToastKind = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: string;
  kind: ToastKind;
  message: string;
  /** Optional second line (e.g. the server's error detail). */
  detail?: string;
  /** Milliseconds before auto-dismiss; 0 = sticky until clicked. */
  duration?: number;
}

interface ToastContext {
  push: (t: Omit<Toast, 'id'>) => void;
  success: (message: string, detail?: string) => void;
  error: (message: string, detail?: string) => void;
  info: (message: string, detail?: string) => void;
  warning: (message: string, detail?: string) => void;
}

const ToastCtx = createContext<ToastContext | null>(null);

export function useToast(): ToastContext {
  const ctx = useContext(ToastCtx);
  if (!ctx) {
    // Graceful fallback so components that forget <ToastProvider> don't crash
    // in prod — they just noop with a console warning.
    return {
      push: (t) => console.warn('[toast]', t),
      success: (m, d) => console.log('[toast:success]', m, d),
      error: (m, d) => console.error('[toast:error]', m, d),
      info: (m, d) => console.log('[toast:info]', m, d),
      warning: (m, d) => console.warn('[toast:warning]', m, d),
    };
  }
  return ctx;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const remove = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const push = useCallback(
    (t: Omit<Toast, 'id'>) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const toast: Toast = { duration: 5000, ...t, id };
      setToasts((prev) => [...prev, toast]);
      if (toast.duration && toast.duration > 0) {
        timers.current.set(
          id,
          setTimeout(() => remove(id), toast.duration),
        );
      }
    },
    [remove],
  );

  useEffect(() => {
    const ref = timers.current;
    return () => {
      ref.forEach((t) => clearTimeout(t));
      ref.clear();
    };
  }, []);

  const value: ToastContext = {
    push,
    success: (message, detail) => push({ kind: 'success', message, detail }),
    error: (message, detail) => push({ kind: 'error', message, detail, duration: 7000 }),
    info: (message, detail) => push({ kind: 'info', message, detail }),
    warning: (message, detail) => push({ kind: 'warning', message, detail, duration: 6000 }),
  };

  return (
    <ToastCtx.Provider value={value}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={remove} />
    </ToastCtx.Provider>
  );
}

function ToastViewport({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: string) => void }) {
  if (toasts.length === 0) return null;
  return (
    <div
      style={{
        position: 'fixed',
        top: 20,
        right: 20,
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        maxWidth: 360,
        pointerEvents: 'none',
      }}
    >
      {toasts.map((t) => (
        <ToastCard key={t.id} toast={t} onDismiss={() => onDismiss(t.id)} />
      ))}
    </div>
  );
}

function ToastCard({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  const { icon, color, bg, border } = styleFor(toast.kind);
  return (
    <div
      role="status"
      style={{
        pointerEvents: 'auto',
        background: 'var(--bg-card-solid, #1a1a2e)',
        border: `1px solid ${border}`,
        borderLeft: `4px solid ${color}`,
        borderRadius: 'var(--radius-md, 10px)',
        padding: '12px 14px',
        boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
        display: 'flex',
        gap: 10,
        animation: 'toast-in 0.25s ease',
        minWidth: 280,
      }}
    >
      <div style={{ fontSize: '1.1rem', lineHeight: 1.1 }}>{icon}</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--text-primary, #e5e7eb)' }}>{toast.message}</div>
        {toast.detail && (
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted, #9ca3af)', marginTop: 2, lineHeight: 1.4 }}>
            {toast.detail}
          </div>
        )}
      </div>
      <button
        onClick={onDismiss}
        aria-label="Dismiss"
        style={{
          background: 'transparent',
          border: 'none',
          color: 'var(--text-muted, #9ca3af)',
          cursor: 'pointer',
          fontSize: '1rem',
          padding: 0,
          lineHeight: 1,
        }}
      >
        ×
      </button>
      <style jsx>{`
        @keyframes toast-in {
          from {
            opacity: 0;
            transform: translateX(20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
      `}</style>
    </div>
  );
}

function styleFor(kind: ToastKind) {
  switch (kind) {
    case 'success':
      return {
        icon: '✓',
        color: 'var(--accent-success, #10b981)',
        bg: 'rgba(16, 185, 129, 0.1)',
        border: 'rgba(16, 185, 129, 0.3)',
      };
    case 'error':
      return {
        icon: '✕',
        color: 'var(--accent-danger, #ef4444)',
        bg: 'rgba(239, 68, 68, 0.1)',
        border: 'rgba(239, 68, 68, 0.3)',
      };
    case 'warning':
      return {
        icon: '⚠',
        color: 'var(--accent-warning, #f59e0b)',
        bg: 'rgba(245, 158, 11, 0.1)',
        border: 'rgba(245, 158, 11, 0.3)',
      };
    default:
      return {
        icon: 'ℹ',
        color: 'var(--accent-primary, #3b82f6)',
        bg: 'rgba(59, 130, 246, 0.1)',
        border: 'rgba(59, 130, 246, 0.3)',
      };
  }
}
