'use client';

import { motion } from 'framer-motion';

interface SkeletonLoaderProps {
  variant?: 'card' | 'table-row' | 'text-line' | 'full-page';
  count?: number;
}

function ShimmerLine({ width = '100%', height = '14px' }: { width?: string; height?: string }) {
  return (
    <motion.div
      className="rounded-md"
      style={{
        width,
        height,
        background: 'linear-gradient(90deg, #f0ecfa 25%, #e2ddf0 50%, #f0ecfa 75%)',
        backgroundSize: '200% 100%',
      }}
      animate={{ backgroundPosition: ['200% 0', '-200% 0'] }}
      transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
    />
  );
}

function CardSkeleton() {
  return (
    <div className="rounded-2xl border border-[#e2ddf0] bg-white p-6 space-y-4">
      <ShimmerLine width="60%" height="20px" />
      <ShimmerLine width="40%" height="14px" />
      <div className="flex gap-3 pt-2">
        <ShimmerLine width="80px" height="28px" />
        <ShimmerLine width="80px" height="28px" />
      </div>
    </div>
  );
}

function TableRowSkeleton() {
  return (
    <div className="flex items-center gap-4 px-4 py-3 border-b border-[#e2ddf0]">
      <ShimmerLine width="40px" height="14px" />
      <ShimmerLine width="120px" height="14px" />
      <ShimmerLine width="200px" height="14px" />
      <ShimmerLine width="60px" height="24px" />
    </div>
  );
}

function TextLineSkeleton() {
  return <ShimmerLine width={`${60 + Math.random() * 30}%`} height="14px" />;
}

export default function SkeletonLoader({ variant = 'card', count = 1 }: SkeletonLoaderProps) {
  const items = Array.from({ length: count });

  if (variant === 'full-page') {
    return (
      <div className="space-y-6 p-8">
        <ShimmerLine width="300px" height="32px" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map((_, i) => <CardSkeleton key={i} />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((_, i) => (
        <motion.div key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.05 }}>
          {variant === 'card' && <CardSkeleton />}
          {variant === 'table-row' && <TableRowSkeleton />}
          {variant === 'text-line' && <TextLineSkeleton />}
        </motion.div>
      ))}
    </div>
  );
}
