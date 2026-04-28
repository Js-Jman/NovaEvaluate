'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { ReactNode } from 'react';

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'default';
  loading?: boolean;
  children?: ReactNode;
}

export default function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'default',
  loading = false,
}: ConfirmDialogProps) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="absolute inset-0 bg-[#1a1033]/20 backdrop-blur-sm"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
          <motion.div
            className="relative w-full max-w-md rounded-2xl border border-[#e2ddf0] bg-white p-6 shadow-2xl"
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          >
            <h3 className="text-lg font-semibold text-[#1a1033]">{title}</h3>
            <p className="mt-2 text-sm text-[#4a3d6e] leading-relaxed">{message}</p>
            <div className="mt-6 flex justify-end gap-3">
              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={onClose}
                className="rounded-xl px-4 py-2 text-sm font-medium text-[#4a3d6e] border border-[#e2ddf0] bg-white hover:bg-[#f5f3ff] transition-colors">
                {cancelText}
              </motion.button>
              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={onConfirm} disabled={loading}
                className={`rounded-xl px-4 py-2 text-sm font-semibold text-white transition-all disabled:opacity-50 ${
                  variant === 'danger'
                    ? 'bg-gradient-to-r from-[#ef4444] to-[#dc2626] hover:shadow-lg hover:shadow-red-500/20'
                    : 'bg-gradient-to-r from-[#ec4899] via-[#8b5cf6] to-[#3b82f6] hover:shadow-lg hover:shadow-violet-500/20'
                }`}>
                {loading ? 'Please wait...' : confirmText}
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
