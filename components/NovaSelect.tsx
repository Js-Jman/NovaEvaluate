'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Option {
  value: string;
  label: string;
  subtitle?: string;
}

interface NovaSelectProps {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
}

export default function NovaSelect({ options, value, onChange, placeholder = 'Select...', label }: NovaSelectProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const selected = options.find((o) => o.value === value);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  if (!options || options.length === 0) return null;

  return (
    <div ref={ref} className="relative w-full">
      {label && <label className="block text-xs font-semibold text-[#8b5cf6] uppercase tracking-wider mb-2">{label}</label>}
      <motion.button
        type="button"
        onClick={() => setOpen(!open)}
        whileTap={{ scale: 0.995 }}
        className={`w-full flex items-center justify-between gap-3 rounded-2xl px-5 py-4 text-left transition-all duration-200 ${
          open
            ? 'bg-white ring-2 ring-[#8b5cf6]/30 shadow-lg shadow-violet-500/10'
            : 'bg-white/80 border border-black/[0.06] shadow-sm hover:shadow-md hover:border-[#c4b5fd]'
        }`}
      >
        <span className={`text-[0.925rem] font-medium truncate ${selected ? 'text-[#0f172a]' : 'text-[#94a3b8]'}`}>
          {selected ? selected.label : placeholder}
        </span>
        <motion.svg
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="w-4 h-4 text-[#94a3b8] shrink-0"
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </motion.svg>
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 4, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="absolute z-50 mt-1 w-full max-h-[280px] overflow-y-auto rounded-2xl bg-white border border-black/[0.06] shadow-xl shadow-violet-500/10 py-1.5"
          >
            {options.map((opt, idx) => {
              const isActive = opt.value === value;
              return (
                <motion.button
                  key={opt.value}
                  type="button"
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.02 }}
                  onClick={() => { onChange(opt.value); setOpen(false); }}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                    isActive
                      ? 'bg-gradient-to-r from-[#ec4899]/10 via-[#8b5cf6]/10 to-[#3b82f6]/10'
                      : 'hover:bg-[#f8fafc]'
                  }`}
                >
                  {/* Selection indicator */}
                  <span className={`w-2 h-2 rounded-full shrink-0 transition-all ${
                    isActive
                      ? 'bg-gradient-to-r from-[#ec4899] to-[#8b5cf6] scale-100'
                      : 'bg-transparent scale-0'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm truncate ${isActive ? 'font-semibold text-[#0f172a]' : 'font-medium text-[#475569]'}`}>
                      {opt.label}
                    </p>
                    {opt.subtitle && (
                      <p className="text-xs text-[#94a3b8] mt-0.5">{opt.subtitle}</p>
                    )}
                  </div>
                  {isActive && (
                    <motion.svg
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="w-4 h-4 text-[#8b5cf6] shrink-0"
                      fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </motion.svg>
                  )}
                </motion.button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
