'use client';

import { motion } from 'framer-motion';
import StatusPill from './StatusPill';
import Link from 'next/link';

interface ExamCardProps {
  exam: {
    id: number;
    title: string;
    subject?: string | null;
    totalMarks: number;
    status: string;
    createdAt: string;
    _count: { students: number };
  };
  onDelete: (id: number) => void;
  index?: number;
}

export default function ExamCard({ exam, onDelete, index = 0 }: ExamCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      transition={{ duration: 0.4, delay: index * 0.08, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      whileTap={{ scale: 0.98 }}
      className="group relative overflow-hidden nova-card"
    >
      {/* Gradient top border */}
      <div className="h-1 w-full bg-gradient-to-r from-[#ec4899] via-[#8b5cf6] to-[#3b82f6]" />

      <div className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-[#1a1033] truncate">{exam.title}</h3>
            {exam.subject && (
              <p className="mt-1 text-sm text-[#94a3b8]">{exam.subject}</p>
            )}
          </div>
          <StatusPill status={exam.status} />
        </div>

        <div className="mt-4 flex items-center gap-4 text-sm text-[#4a3d6e]">
          <span className="flex items-center gap-1.5">
            <span className="text-[#8b5cf6]">◈</span>
            {exam.totalMarks} marks
          </span>
          <span className="flex items-center gap-1.5">
            <span className="text-[#ec4899]">◉</span>
            {exam._count.students} student{exam._count.students !== 1 ? 's' : ''}
          </span>
        </div>

        <div className="mt-5 flex items-center gap-2">
          <Link href={`/exams/${exam.id}`} className="flex-1">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="nova-btn-primary w-full py-2.5 shadow-none"
            >
              View Exam
            </motion.button>
          </Link>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onDelete(exam.id)}
            className="nova-btn-secondary px-3 py-2.5 text-[#ef4444] hover:text-[#dc2626] hover:border-[#fca5a5] hover:bg-[#fef2f2]"
          >
            🗑️
          </motion.button>
        </div>

        <p className="mt-3 text-[10px] text-[#94a3b8]">
          {new Date(exam.createdAt).toLocaleDateString('en-US', {
            month: 'short', day: 'numeric', year: 'numeric',
          })}
        </p>
      </div>
    </motion.div>
  );
}
