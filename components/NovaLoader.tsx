'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

interface NovaLoaderProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  text?: string;
  fullPage?: boolean;
}

const sizeMap = {
  sm: { container: 24, dot: 4 },
  md: { container: 40, dot: 6 },
  lg: { container: 64, dot: 10 },
  xl: { container: 96, dot: 14 },
};

const DOT_ANGLES = [0, 120, 240];
const DOT_COLORS = ['#ec4899', '#8b5cf6', '#3b82f6'];
const DOT_DELAYS = [0, 0.2, 0.4];

export default function NovaLoader({ size = 'md', text, fullPage = false }: NovaLoaderProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const s = sizeMap[size];

  if (!mounted) {
    return (
      <div className="flex flex-col items-center gap-3">
        <div
          className="rounded-full bg-[#8b5cf6]"
          style={{ width: s.dot * 2, height: s.dot * 2, opacity: 0.4 }}
        />
        {text && <p className="text-sm font-medium text-[#8b7faa]">{text}</p>}
      </div>
    );
  }

  const radius = s.container / 2 - s.dot;

  const spinner = (
    <div className="flex flex-col items-center gap-3">
      <motion.div
        className="relative"
        style={{ width: s.container, height: s.container }}
        animate={{ rotate: 360 }}
        transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
      >
        {DOT_ANGLES.map((angleDeg, i) => {
          const angle = (angleDeg * Math.PI) / 180;
          const x = Math.round(radius * Math.cos(angle) + s.container / 2 - s.dot / 2);
          const y = Math.round(radius * Math.sin(angle) + s.container / 2 - s.dot / 2);
          const glowSize = s.dot * 2;

          return (
            <motion.div
              key={i}
              className="absolute rounded-full"
              style={{
                width: `${s.dot}px`,
                height: `${s.dot}px`,
                left: `${x}px`,
                top: `${y}px`,
                background: DOT_COLORS[i],
                boxShadow: `0 0 ${glowSize}px ${DOT_COLORS[i]}50`,
              }}
              animate={{
                scale: [1, 1.4, 1],
                opacity: [0.7, 1, 0.7],
              }}
              transition={{
                duration: 1,
                repeat: Infinity,
                delay: DOT_DELAYS[i],
              }}
            />
          );
        })}
      </motion.div>
      {text && (
        <motion.p
          className="text-sm font-medium text-[#8b7faa]"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          {text}
        </motion.p>
      )}
    </div>
  );

  if (fullPage) {
    return (
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        {spinner}
      </motion.div>
    );
  }

  return spinner;
}
