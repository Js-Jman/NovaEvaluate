'use client';

import { createContext, useContext, useState, useCallback, useRef, ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
  createdAt: number;
}

interface ToastContextType {
  toast: {
    success: (msg: string) => void;
    error: (msg: string) => void;
    info: (msg: string) => void;
    warning: (msg: string) => void;
  };
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

const COLORS: Record<ToastType, { bg: string; border: string; icon: string; text: string }> = {
  success: { bg: '#f0fdf4', border: '#22c55e', icon: '✓', text: '#166534' },
  error: { bg: '#fef2f2', border: '#ef4444', icon: '✕', text: '#991b1b' },
  info: { bg: '#f0f4ff', border: '#8b5cf6', icon: 'ℹ', text: '#3b1f8b' },
  warning: { bg: '#fffbeb', border: '#f59e0b', icon: '⚠', text: '#92400e' },
};

const AUTO_DISMISS_MS = 4000;
const MAX_TOASTS = 5;
const DEDUP_WINDOW_MS = 500;

export default function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const recentRef = useRef<Map<string, number>>(new Map());

  const addToast = useCallback((type: ToastType, message: string) => {
    const dedupKey = `${type}:${message}`;
    const now = Date.now();
    const lastSeen = recentRef.current.get(dedupKey);
    if (lastSeen && now - lastSeen < DEDUP_WINDOW_MS) return;
    recentRef.current.set(dedupKey, now);

    const id = `${now}-${Math.random().toString(36).slice(2)}`;
    setToasts((prev) => {
      const next = [...prev, { id, type, message, createdAt: now }];
      return next.slice(-MAX_TOASTS);
    });

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, AUTO_DISMISS_MS);
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = {
    success: (msg: string) => addToast('success', msg),
    error: (msg: string) => addToast('error', msg),
    info: (msg: string) => addToast('info', msg),
    warning: (msg: string) => addToast('warning', msg),
  };

  return (
    <ToastContext.Provider value={{ toast, dismiss }}>
      {children}
      <div className="fixed top-4 right-4 z-[100] flex flex-col gap-3 pointer-events-none">
        <AnimatePresence mode="popLayout">
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              layout
              initial={{ x: 120, opacity: 0, scale: 0.9 }}
              animate={{ x: 0, opacity: 1, scale: 1 }}
              exit={{ x: 120, opacity: 0, scale: 0.9 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              className="pointer-events-auto relative overflow-hidden rounded-xl border px-4 py-3 pr-10 shadow-lg min-w-[320px] max-w-[420px]"
              style={{
                background: COLORS[t.type].bg,
                borderColor: COLORS[t.type].border + '30',
              }}
            >
              <div className="flex items-start gap-3">
                <span
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold"
                  style={{
                    background: COLORS[t.type].border + '18',
                    color: COLORS[t.type].border,
                  }}
                >
                  {COLORS[t.type].icon}
                </span>
                <p className="text-sm font-medium leading-relaxed" style={{ color: COLORS[t.type].text }}>{t.message}</p>
              </div>
              <button
                onClick={() => dismiss(t.id)}
                className="absolute top-2 right-2 text-[#8b7faa] hover:text-[#4a3d6e] transition-colors p-1"
              >
                ✕
              </button>
              {/* Progress bar */}
              <motion.div
                className="absolute bottom-0 left-0 h-0.5"
                style={{ background: COLORS[t.type].border }}
                initial={{ width: '100%' }}
                animate={{ width: '0%' }}
                transition={{ duration: AUTO_DISMISS_MS / 1000, ease: 'linear' }}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}
