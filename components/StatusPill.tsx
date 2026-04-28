'use client';

import { motion } from 'framer-motion';

interface StatusPillProps {
  status: string;
  className?: string;
}

const STATUS_CONFIG: Record<string, { bg: string; text: string; dot: string; label: string }> = {
  pending: { bg: 'bg-[#f3f1f9]', text: 'text-[#6b5a85]', dot: 'bg-[#8b7faa]', label: 'Pending' },
  processing: { bg: 'bg-[#fffbeb]', text: 'text-[#92400e]', dot: 'bg-[#f59e0b]', label: 'Processing' },
  done: { bg: 'bg-[#f0fdf4]', text: 'text-[#166534]', dot: 'bg-[#22c55e]', label: 'Done' },
  graded: { bg: 'bg-[#f0fdf4]', text: 'text-[#166534]', dot: 'bg-[#22c55e]', label: 'Graded' },
  failed: { bg: 'bg-[#fef2f2]', text: 'text-[#991b1b]', dot: 'bg-[#ef4444]', label: 'Failed' },
  active: { bg: 'bg-[#eff6ff]', text: 'text-[#1e40af]', dot: 'bg-[#3b82f6]', label: 'Active' },
  draft: { bg: 'bg-[#f3f1f9]', text: 'text-[#6b5a85]', dot: 'bg-[#8b7faa]', label: 'Draft' },
  closed: { bg: 'bg-[#f5f3ff]', text: 'text-[#5b21b6]', dot: 'bg-[#8b5cf6]', label: 'Closed' },
  'not graded': { bg: 'bg-[#f3f1f9]', text: 'text-[#6b5a85]', dot: 'bg-[#8b7faa]', label: 'Not Graded' },
  grading: { bg: 'bg-[#fffbeb]', text: 'text-[#92400e]', dot: 'bg-[#f59e0b]', label: 'Grading' },
};

export default function StatusPill({ status, className = '' }: StatusPillProps) {
  const config = STATUS_CONFIG[status.toLowerCase()] || STATUS_CONFIG.pending;

  return (
    <motion.span
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 500, damping: 25 }}
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${config.bg} ${config.text} ${className}`}
    >
      <motion.span
        className={`h-1.5 w-1.5 rounded-full ${config.dot}`}
        animate={
          status === 'processing' || status === 'grading'
            ? { scale: [1, 1.5, 1], opacity: [1, 0.5, 1] }
            : {}
        }
        transition={{ duration: 1.5, repeat: Infinity }}
      />
      {config.label}
    </motion.span>
  );
}
