'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

type Toast = {
  id: string;
  title?: string;
  message: string;
  kind?: 'success' | 'error' | 'info';
};

type ToastContextValue = {
  toast: (t: Omit<Toast, 'id'>) => void;
};

const ToastContext = React.createContext<ToastContextValue | undefined>(undefined);

function tone(kind: Toast['kind']) {
  if (kind === 'success') return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400';
  if (kind === 'error') return 'border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400';
  return 'border-border bg-card text-foreground';
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<Toast[]>([]);

  const toast = React.useCallback((t: Omit<Toast, 'id'>) => {
    const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const next: Toast = { id, kind: 'info', ...t };
    setToasts((prev) => [next, ...prev].slice(0, 3));
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((x) => x.id !== id));
    }, 2600);
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed right-4 top-20 z-[60] space-y-2">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25 }}
              className={`w-[320px] max-w-[calc(100vw-2rem)] rounded-xl border p-4 shadow-lg shadow-black/10 dark:shadow-black/40 ${tone(
                t.kind
              )}`}
            >
              {t.title && <div className="text-sm font-semibold">{t.title}</div>}
              <div className="text-sm opacity-90">{t.message}</div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = React.useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

